use scylla::{
    batch::Batch, frame::response::result::CqlValue, transport::SelfIdentity, Session,
    SessionBuilder,
};

use crate::requests::parameter_wrappers::QueryParameterWrapper;
use crate::requests::request::QueryOptionsWrapper;
use crate::{
    options, requests::request::PreparedStatementWrapper, result::QueryResultWrapper,
    utils::err_to_napi,
};

#[napi]
pub struct SessionOptions {
    pub connect_points: Vec<String>,
    pub application_name: Option<String>,
    pub application_version: Option<String>,
}

#[napi]
pub struct BatchWrapper {
    inner: Batch,
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
            application_name: None,
            application_version: None,
        }
    }
}

#[napi]
impl SessionWrapper {
    #[napi]
    pub async fn create_session(options: &SessionOptions) -> napi::Result<Self> {
        let s = SessionBuilder::new()
            .known_node(options.connect_points[0].clone())
            .custom_identity(get_self_identity(options))
            .build()
            .await
            .map_err(err_to_napi)?;
        Ok(SessionWrapper { internal: s })
    }

    #[napi]
    pub fn get_keyspace(&self) -> Option<String> {
        self.internal
            .get_keyspace()
            .as_deref()
            .map(ToOwned::to_owned)
    }

    #[napi]
    pub async fn query_unpaged_no_values(
        &self,
        query: String,
        _options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let query_result = self
            .internal
            .query_unpaged(query, &[])
            .await
            .map_err(err_to_napi)?;
        QueryResultWrapper::from_query(query_result)
    }

    /// Prepares a statement through rust driver for a given session
    /// Return PreparedStatementWrapper that wraps object returned by the rust driver
    #[napi]
    pub async fn prepare_statement(
        &self,
        statement: String,
    ) -> napi::Result<PreparedStatementWrapper> {
        Ok(PreparedStatementWrapper {
            prepared: self
                .internal
                .prepare(statement)
                .await
                .map_err(err_to_napi)?,
        })
    }

    /// Query a database with a given prepared statement and provided parameters.
    ///
    /// Returns a wrapper of the value provided by the rust driver
    ///
    /// All parameters need to be wrapped into QueryParameterWrapper keeping CqlValue of correct type
    /// Creating Prepared statement may help to determine required types
    ///
    /// Currently `execute_unpaged` from rust driver is used, so no paging is done
    /// and there is no support for any query options
    #[napi]
    pub async fn execute_prepared_unpaged(
        &self,
        query: &PreparedStatementWrapper,
        params: Vec<Option<&QueryParameterWrapper>>,
        _options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Option<CqlValue>> = QueryParameterWrapper::extract_parameters(params);
        QueryResultWrapper::from_query(
            self.internal
                .execute_unpaged(&query.prepared, params_vec)
                .await
                .map_err(err_to_napi)?,
        )
    }

    #[napi]
    pub async fn query_batch(
        &self,
        batch: &BatchWrapper,
        params: Vec<Vec<Option<&QueryParameterWrapper>>>,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Vec<Option<CqlValue>>> = params
            .into_iter()
            .map(QueryParameterWrapper::extract_parameters)
            .collect();
        QueryResultWrapper::from_query(
            self.internal
                .batch(&batch.inner, params_vec)
                .await
                .map_err(err_to_napi)?,
        )
    }
}

#[napi]
pub fn create_batch(queries: Vec<&PreparedStatementWrapper>) -> BatchWrapper {
    let mut batch: Batch = Default::default();
    queries
        .iter()
        .for_each(|q| batch.append_statement(q.prepared.clone()));
    BatchWrapper { inner: batch }
}

fn get_self_identity(options: &SessionOptions) -> SelfIdentity<'static> {
    let mut self_identity = SelfIdentity::new();
    self_identity.set_custom_driver_name(options::DEFAULT_DRIVER_NAME);
    self_identity.set_application_version(options::DEFAULT_DRIVER_VERSION);
    if let Some(app_name) = &options.application_name {
        self_identity.set_application_name(app_name.clone());
    }
    if let Some(app_version) = &options.application_name {
        self_identity.set_application_version(app_version.clone());
    }
    self_identity
}
