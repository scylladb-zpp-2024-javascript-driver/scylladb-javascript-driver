use futures::future::join_all;
use scylla::client::session::Session;
use scylla::client::session_builder::SessionBuilder;
use scylla::statement::prepared::PreparedStatement;
use std::env;
use std::sync::Arc;
use uuid::Uuid;

const CONCURRENCY: usize = 2000;

async fn select_data(
    session: Arc<Session>,
    start_index: usize,
    n: i32,
    select_query: &PreparedStatement,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut index = start_index;

    while index < n as usize {
        session.execute_unpaged(select_query, &[]).await?;
        index += CONCURRENCY;
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n: i32 = env::var("CNT")
        .ok()
        .and_then(|s: String| s.parse::<i32>().ok())
        .expect("CNT parameter is required.");

    let uri: String = env::var("SCYLLA_URI").unwrap_or_else(|_| "172.42.0.2:9042".to_string());

    let session = SessionBuilder::new().known_node(uri).build().await?;

    session
        .query_unpaged(
            "CREATE KEYSPACE IF NOT EXISTS benchmarks WITH replication = {'class': 'NetworkTopologyStrategy', 'replication_factor': '1' }", 
            &[],
        )
        .await?;

    session
        .query_unpaged("DROP TABLE IF EXISTS benchmarks.basic", &[])
        .await?;

    session
        .query_unpaged(
            "CREATE TABLE benchmarks.basic (id uuid, val int, PRIMARY KEY(id))",
            &[],
        )
        .await?;

    let insert_query = "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";
    for _ in 0..10 {
        let id = Uuid::new_v4();
        session.query_unpaged(insert_query, (id, 100)).await?;
    }

    let select_query = session.prepare("SELECT * FROM benchmarks.basic").await?;

    let mut handles = vec![];
    let session = Arc::new(session);

    for i in 0..CONCURRENCY {
        let session_clone = Arc::clone(&session);
        let select_query_clone = select_query.clone();
        handles.push(tokio::spawn(async move {
            select_data(session_clone, i, n, &select_query_clone)
                .await
                .unwrap();
        }));
    }

    join_all(handles).await;

    Ok(())
}
