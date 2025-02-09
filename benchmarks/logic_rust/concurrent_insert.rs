use scylla::SessionBuilder;
use std::sync::Arc;
use uuid::Uuid;

const ITER_CNT: usize = 100_000;
const CONCURRENCY: usize = 10;

async fn insert_data(
    session: Arc<scylla::Session>,
    start_index: usize,
) -> Result<(), Box<dyn std::error::Error>> {
    let insert_query = "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";
    let mut index = start_index;

    while index < ITER_CNT {
        let id = Uuid::new_v4();
        session.query_unpaged(insert_query, (id, 100)).await?;
        index += CONCURRENCY;
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let session = SessionBuilder::new()
        .known_node("172.17.0.2:9042")
        .build()
        .await?;

    session
        .query_unpaged(
            "CREATE KEYSPACE IF NOT EXISTS benchmarks WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1' }", 
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

    let mut handles = vec![];
    let session = Arc::new(session);

    for i in 0..CONCURRENCY {
        let session_clone = Arc::clone(&session);
        handles.push(tokio::spawn(async move {
            insert_data(session_clone, i).await.unwrap();
        }));
    }

    for handle in handles {
        handle.await?;
    }

    println!("Completed");
    Ok(())
}
