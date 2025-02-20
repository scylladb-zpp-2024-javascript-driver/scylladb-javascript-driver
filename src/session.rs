use scylla::prepared_statement::PreparedStatement;
use scylla::statement::{Consistency, SerialConsistency};
use scylla::{
    batch::Batch, frame::response::result::CqlValue, transport::SelfIdentity, Session,
    SessionBuilder,
};

use crate::options;
use crate::requests::parameter_wrappers::QueryParameterWrapper;
use crate::requests::request::QueryOptionsWrapper;
use crate::utils::{bigint_to_i64, js_error};
use crate::{
    requests::request::PreparedStatementWrapper, result::QueryResultWrapper, utils::err_to_napi,
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

    /// Executes unprepared query. This assumes the types will be either guessed or provided by user.
    ///
    /// Returns a wrapper of the value provided by the rust driver
    ///
    /// All parameters need to be wrapped into QueryParameterWrapper keeping CqlValue of assumed correct type
    /// If the provided types will not be correct, this query will fail.
    #[napi]
    pub async fn query_unpaged(
        &self,
        query: String,
        params: Vec<Option<&QueryParameterWrapper>>,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Option<CqlValue>> = QueryParameterWrapper::extract_parameters(params);
        let query_result = self
            .internal
            .query_unpaged(query, params_vec)
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
        options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Option<CqlValue>> = QueryParameterWrapper::extract_parameters(params);
        let query = apply_options(query.prepared.clone(), options)?;
        QueryResultWrapper::from_query(
            self.internal
                .execute_unpaged(&query, params_vec)
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

fn apply_options(
    mut prepared: PreparedStatement,
    options: &QueryOptionsWrapper,
) -> napi::Result<PreparedStatement> {
    if let Some(o) = options.consistency {
        prepared.set_consistency(
            Consistency::try_from(o)
                .map_err(|_| js_error(format!("Unknown consistency value: {o}")))?,
        );
    }

    if let Some(o) = options.serial_consistency {
        prepared.set_serial_consistency(Some(
            SerialConsistency::try_from(o)
                .map_err(|_| js_error(format!("Unknown serial consistency value: {o}")))?,
        ));
    }

    if let Some(o) = options.is_idempotent {
        prepared.set_is_idempotent(o);
    }
    // TODO: Update it and check all edge-cases:
    // https://github.com/scylladb-zpp-2024-javascript-driver/scylladb-javascript-driver/pull/92#discussion_r1864461799
    // Currently there is no support for paging, so there is no need for this option
    /* if let Some(o) = options.fetch_size {
        if o.is_negative() {
            return Err(js_error("fetch size cannot be negative"));
        }
        query.set_page_size(o);
    } */
    if let Some(o) = &options.timestamp {
        prepared.set_timestamp(Some(bigint_to_i64(
            o.clone(),
            "Timestamp cannot overflow i64",
        )?));
    }
    // TODO: Update it to allow collection of information from traced query
    // Currently it's just passing the value, but not able to access any tracing information
    if let Some(o) = options.trace_query {
        prepared.set_tracing(o);
    }

    Ok(prepared)
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
