use scylla::statement::Statement;
use std::env;
use uuid::Uuid;

mod common;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n: i32 = env::var("CNT")
        .ok()
        .and_then(|s: String| s.parse::<i32>().ok())
        .expect("CNT parameter is required.");

    let session = common::init_simple_table().await?;

    let insert_query = "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";
    for _ in 0..10 {
        // use CachingSession as it is used in the scylla-javascript-driver
        let statement: Statement = insert_query.into();
        let prepared = session.add_prepared_statement(&statement).await?;

        let id = Uuid::new_v4();
        session
            .get_session()
            .execute_unpaged(&prepared, (id, 100))
            .await?;
    }

    let select_query = "SELECT * FROM benchmarks.basic";
    for _ in 0..n {
        let _ = session.execute_unpaged(select_query, &[]).await?;
    }

    Ok(())
}
