use scylla::{client::session_builder::SessionBuilder, statement::Statement, value::Row};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let uri: String = env::var("SCYLLA_URI").unwrap_or_else(|_| "172.42.0.2:9042".to_string());

    let session = SessionBuilder::new().known_node(uri).build().await?;

    let select_query =
        Statement::new("SELECT * FROM buggy.bug");

    let res = session.query_unpaged(select_query, &[]).await?;
    let w = res.into_rows_result()?;

    let rows = w.rows::<Row>().expect(
        "Type check against the Row type has failed; this is a bug in the underlying Rust driver",
    );

    rows.map(|f| f.map(|v| v.columns))
        .collect::<Result<Vec<_>, _>>()
        .unwrap();

    Ok(())
}
