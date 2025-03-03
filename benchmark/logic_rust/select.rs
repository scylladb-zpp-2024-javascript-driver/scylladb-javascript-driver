use scylla::SessionBuilder;
use uuid::Uuid;

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

    let insert_query = "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";
    for _ in 0..10 {
        let id = Uuid::new_v4();
        session.query_unpaged(insert_query, (id, 100)).await?;
    }

    let select_query = "SELECT * FROM benchmarks.basic";
    for _ in 0..10_000 {
        let _ = session.query_unpaged(select_query, &[]).await?;
    }

    println!("Completed");
    Ok(())
}
