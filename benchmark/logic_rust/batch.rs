use scylla::{
    client::{caching_session::CachingSession, session_builder::SessionBuilder},
    statement::batch::{Batch, BatchStatement},
};
use std::{cmp::min, env};
use uuid::Uuid;

const DEFAULT_CACHE_SIZE: u32 = 512;
// Empirically determined max batch size, that doesn't cause database error.
const STEP: i32 = 3971;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let n: i32 = env::var("CNT")
        .ok()
        .and_then(|s: String| s.parse::<i32>().ok())
        .expect("CNT parameter is required.");

    let uri: String = env::var("SCYLLA_URI").unwrap_or_else(|_| "172.42.0.2:9042".to_string());

    let session = SessionBuilder::new().known_node(uri).build().await?;

    let session: CachingSession = CachingSession::from(session, DEFAULT_CACHE_SIZE as usize);

    session
        .execute_unpaged(
            "CREATE KEYSPACE IF NOT EXISTS benchmarks WITH replication = {'class': 'NetworkTopologyStrategy', 'replication_factor': '1' }", 
            &[],
        )
        .await?;

    session
        .execute_unpaged("DROP TABLE IF EXISTS benchmarks.basic", &[])
        .await?;

    session
        .execute_unpaged(
            "CREATE TABLE benchmarks.basic (id uuid, val int, PRIMARY KEY(id))",
            &[],
        )
        .await?;

    let insert_query = "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";

    for i in 0..((n + STEP - 1) / STEP) {
        let c_len = min(n - (i * STEP), STEP);
        let insert_vec = vec![
            BatchStatement::Query(insert_query.into());
            // Always using small enough values so it doesn't overflow.
            c_len.try_into().unwrap()
        ];
        // use CachingSession as it is used in the scylla-javascript-driver
        let statement: Batch =
            Batch::new_with_statements(scylla::statement::batch::BatchType::Logged, insert_vec);

        let mut params_vec = vec![];
        for _ in 0..c_len {
            params_vec.push((Uuid::new_v4(), 1));
        }
        session.batch(&statement, params_vec).await?;
    }

    let select_query = "SELECT COUNT(1) FROM benchmarks.basic USING TIMEOUT 120s;";

    assert!(
        session
            .get_session()
            .query_unpaged(select_query, &[])
            .await?
            .into_rows_result()?
            .first_row::<(i64,)>()?
            .0
            == n.into()
    );

    Ok(())
}
