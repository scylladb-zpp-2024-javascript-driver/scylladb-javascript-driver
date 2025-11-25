use scylla::{
    client::{caching_session::CachingSession, session_builder::SessionBuilder},
    response::PagingState,
    statement::Statement,
};
use std::{env, ops::ControlFlow};
use uuid::Uuid;

const DEFAULT_CACHE_SIZE: u32 = 512;

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
    for _ in 0..50 {
        // use CachingSession as it is used in the scylla-javascript-driver
        let statement: Statement = insert_query.into();
        let prepared = session.add_prepared_statement(&statement).await?;

        let id = Uuid::new_v4();
        session
            .get_session()
            .execute_unpaged(&prepared, (id, 10))
            .await?;
    }

    let mut select_query = Statement::new("SELECT * FROM benchmarks.basic");
    select_query.set_page_size(1);
    let prepared = session.add_prepared_statement(&select_query).await?;

    for _ in 0..n {
        let mut state = PagingState::start();

        let mut sm = 0;
        loop {
            let (res, next) = session
                .get_session()
                .execute_single_page(&prepared, &[], state)
                .await?;
            if let ControlFlow::Continue(ps) = next.into_paging_control_flow() {
                state = ps;
            } else {
                break;
            }
            res.into_rows_result()?
                .rows::<(Uuid, i32)>()?
                .for_each(|r| {
                    sm += r.unwrap().1;
                });
        }
        assert_eq!(sm, 500);
    }

    Ok(())
}
