use scylla::client::session::Session;
use scylla::client::session_builder::SessionBuilder;
use scylla::client::SelfIdentity;
use scylla::statement::batch::Batch;
use scylla::statement::prepared::PreparedStatement;
use scylla::statement::{Consistency, SerialConsistency, Statement};
use scylla::value::{CqlValue, MaybeUnset};

use crate::options;
use crate::requests::parameter_wrappers::MaybeUnsetQueryParameterWrapper;
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
    inner: Session,
}

#[napi]
impl SessionOptions {
    /// Empty SessionOptions constructor
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
    /// Creates session based on the provided session options.
    #[napi]
    pub async fn create_session(options: &SessionOptions) -> napi::Result<Self> {
        let s = SessionBuilder::new()
            .known_node(options.connect_points[0].clone())
            .custom_identity(get_self_identity(options))
            .build()
            .await
            .map_err(err_to_napi)?;
        Ok(SessionWrapper { inner: s })
    }

    /// Returns the name of the current keyspace
    #[napi]
    pub fn get_keyspace(&self) -> Option<String> {
        self.inner.get_keyspace().as_deref().map(ToOwned::to_owned)
    }

    /// Executes unprepared statement. This assumes the types will be either guessed or provided by user.
    ///
    /// Returns a wrapper of the result provided by the rust driver
    ///
    /// All parameters need to be wrapped into QueryParameterWrapper keeping CqlValue of assumed correct type
    /// If the provided types will not be correct, this query will fail.
    #[napi]
    pub async fn query_unpaged(
        &self,
        query: String,
        params: Vec<Option<&MaybeUnsetQueryParameterWrapper>>,
        options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let statement: Statement = apply_statement_options(query.into(), options)?;
        let params_vec = MaybeUnsetQueryParameterWrapper::extract_parameters(params);
        let query_result = self
            .inner
            .query_unpaged(statement, params_vec)
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
            prepared: self.inner.prepare(statement).await.map_err(err_to_napi)?,
        })
    }

    /// Execute a given prepared statement against the database with provided parameters.
    ///
    /// Returns a wrapper of the result provided by the rust driver
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
        params: Vec<Option<&MaybeUnsetQueryParameterWrapper>>,
        options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec = MaybeUnsetQueryParameterWrapper::extract_parameters(params);
        let query = apply_prepared_options(query.prepared.clone(), options)?;
        QueryResultWrapper::from_query(
            self.inner
                .execute_unpaged(&query, params_vec)
                .await
                .map_err(err_to_napi)?,
        )
    }

    /// Executes all statements in the provided batch. Those statements can be either prepared or unprepared.
    ///
    /// Returns a wrapper of the result provided by the rust driver
    #[napi]
    pub async fn batch(
        &self,
        batch: &BatchWrapper,
        params: Vec<Vec<Option<&MaybeUnsetQueryParameterWrapper>>>,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Vec<Option<MaybeUnset<CqlValue>>>> = params
            .into_iter()
            .map(MaybeUnsetQueryParameterWrapper::extract_parameters)
            .collect();
        QueryResultWrapper::from_query(
            self.inner
                .batch(&batch.inner, params_vec)
                .await
                .map_err(err_to_napi)?,
        )
    }
}

/// Creates object representing a prepared batch of statements.
/// Requires each passed statement to be already prepared.
#[napi]
pub fn create_prepared_batch(
    statements: Vec<&PreparedStatementWrapper>,
    options: &QueryOptionsWrapper,
) -> napi::Result<BatchWrapper> {
    let mut batch: Batch = Default::default();
    statements
        .iter()
        .for_each(|q| batch.append_statement(q.prepared.clone()));
    batch = apply_batch_options(batch, options)?;
    Ok(BatchWrapper { inner: batch })
}

/// Creates object representing unprepared batch of statements.
#[napi]
pub fn create_unprepared_batch(
    statements: Vec<String>,
    options: &QueryOptionsWrapper,
) -> napi::Result<BatchWrapper> {
    let mut batch: Batch = Default::default();
    statements
        .into_iter()
        .for_each(|q| batch.append_statement(q.as_str()));

    batch = apply_batch_options(batch, options)?;
    Ok(BatchWrapper { inner: batch })
}

/// Macro to allow applying options to any query type
macro_rules! make_apply_options {
    ($statement_type: ty, $fn_name: ident) => {
        fn $fn_name(
            mut statement: $statement_type,
            options: &QueryOptionsWrapper,
        ) -> napi::Result<$statement_type> {
            if let Some(o) = options.consistency {
                statement.set_consistency(
                    Consistency::try_from(o)
                        .map_err(|_| js_error(format!("Unknown consistency value: {o}")))?,
                );
            }

            if let Some(o) = options.serial_consistency {
                statement
                    .set_serial_consistency(Some(SerialConsistency::try_from(o).map_err(
                        |_| js_error(format!("Unknown serial consistency value: {o}")),
                    )?));
            }

            if let Some(o) = options.is_idempotent {
                statement.set_is_idempotent(o);
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
                statement.set_timestamp(Some(bigint_to_i64(
                    o.clone(),
                    "Timestamp cannot overflow i64",
                )?));
            }
            // TODO: Update it to allow collection of information from traced query
            // Currently it's just passing the value, but not able to access any tracing information
            if let Some(o) = options.trace_query {
                statement.set_tracing(o);
            }

            Ok(statement)
        }
    };
}

make_apply_options!(Statement, apply_statement_options);
make_apply_options!(PreparedStatement, apply_prepared_options);
make_apply_options!(Batch, apply_batch_options);

/// Provides driver self identity, filling information on application based on session options.
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
