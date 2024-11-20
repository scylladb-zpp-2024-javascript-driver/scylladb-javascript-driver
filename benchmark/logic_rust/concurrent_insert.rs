use futures::future::join_all;
use scylla::client::session::Session;
use scylla::client::session_builder::SessionBuilder;
use scylla::statement::prepared::PreparedStatement;
use std::env;
use std::sync::Arc;
use uuid::Uuid;

const CONCURRENCY: usize = 2000;

async fn insert_data(
    session: Arc<Session>,
    start_index: usize,
    n: i32,
    insert_query: &PreparedStatement,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut index = start_index;

    while index < n as usize {
        let id = Uuid::new_v4();
        session.execute_unpaged(insert_query, (id, 100)).await?;
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

    let insert_query = session
        .prepare("INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)")
        .await?;

    let mut handles = vec![];
    let session = Arc::new(session);

    for i in 0..CONCURRENCY {
        let session_clone = Arc::clone(&session);
        let insert_query_clone = insert_query.clone();
        handles.push(tokio::spawn(async move {
            insert_data(session_clone, i, n, &insert_query_clone)
                .await
                .unwrap();
        }));
    }

    join_all(handles).await;

    let select_query = "SELECT COUNT(1) FROM benchmarks.basic USING TIMEOUT 120s;";

    assert!(
        session
            .query_unpaged(select_query, &[])
            .await?
            .into_rows_result()?
            .first_row::<(i64,)>()?
            .0
            == n.into()
    );

    Ok(())
}
