use std::env;

use scylla::client::{caching_session::CachingSession, session_builder::SessionBuilder};

const DEFAULT_CACHE_SIZE: u32 = 512;

pub(crate) async fn init_simple_table() -> Result<CachingSession, Box<dyn std::error::Error>> {
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
    Ok(session)
}
