use scylla::{frame::response::result::CqlValue, Session, SessionBuilder};

use crate::{
    request::{PreparedStatementWrapper, QueryParameterWrapper},
    result::QueryResultWrapper,
    utils::err_to_napi,
};

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
        let sb = SessionBuilder::new()
            .known_node(options.connect_points[0].clone())
            .build()
            .await
            .map_err(err_to_napi)?;
        Ok(SessionWrapper { internal: sb })
    }

    #[napi]
    pub async fn query_unpaged_no_values(&self, query: String) -> napi::Result<QueryResultWrapper> {
        let query = self
            .internal
            .query_unpaged(query, &[])
            .await
            .map_err(err_to_napi)?;
        Ok(QueryResultWrapper::from_query(query).map_err(err_to_napi)?)
    }

    #[napi]
    pub async fn prepare_statement(
        &self,
        statement: String,
    ) -> napi::Result<PreparedStatementWrapper> {
        Ok(PreparedStatementWrapper {
            query: self
                .internal
                .prepare(statement)
                .await
                .map_err(err_to_napi)?,
        })
    }

    #[napi]
    pub async fn query_simple(
        &self,
        query: &PreparedStatementWrapper,
        params: Vec<&QueryParameterWrapper>,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<CqlValue> = params.iter().map(|e| e.parameter.clone()).collect();
        Ok(QueryResultWrapper::from_query(
            self.internal
                .execute_unpaged(&query.query, params_vec)
                .await
                .map_err(err_to_napi)?,
        ))
    }
}
