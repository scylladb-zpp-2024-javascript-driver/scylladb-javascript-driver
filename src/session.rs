use scylla::{Session, SessionBuilder};

use crate::{result::QueryResultWrapper, utils::err_to_napi};

#[napi]
pub struct SessionOptions {
    pub connect_points: Vec<String>,
}

#[napi]
pub struct SessionWrapper {
    internal: Session,
}

#[napi]
impl SessionOptions {
    #[napi]
    pub fn empty() -> Self {
        SessionOptions {
            connect_points: vec![],
        }
    }
}

#[napi]
impl SessionWrapper {
    #[napi]
    pub async fn create_session(options: &SessionOptions) -> napi::Result<Self> {
        let s = SessionBuilder::new()
            .known_node(options.connect_points[0].clone())
            .build()
            .await
            .map_err(err_to_napi)?;
        Ok(SessionWrapper { internal: s })
    }

    #[napi]
    pub async fn query_unpaged_no_values(&self, query: String) -> napi::Result<QueryResultWrapper> {
        let query_result = self
            .internal
            .query_unpaged(query, &[])
            .await
            .map_err(err_to_napi)?;
        Ok(QueryResultWrapper::from_query(query_result))
    }
}
