use scylla::client::caching_session::CachingSession;
use scylla::client::session_builder::SessionBuilder;
use scylla::client::SelfIdentity;
use scylla::response::PagingState;
use scylla::statement::batch::Batch;
use scylla::statement::prepared::PreparedStatement;
use scylla::statement::{Consistency, SerialConsistency, Statement};
use scylla::value::{CqlValue, MaybeUnset};

use crate::options;
use crate::paging::{PagingResult, PagingStateWrapper};
use crate::requests::parameter_wrappers::ParameterWrapper;
use crate::requests::request::QueryOptionsWrapper;
use crate::utils::{bigint_to_i64, js_error};
use crate::{
    requests::request::PreparedStatementWrapper, result::QueryResultWrapper, utils::err_to_napi,
};

const DEFAULT_CACHE_SIZE: u32 = 512;

#[napi]
pub struct SessionOptions {
    pub connect_points: Vec<String>,
    pub keyspace: Option<String>,
    pub application_name: Option<String>,
    pub application_version: Option<String>,
    pub credentials_username: Option<String>,
    pub credentials_password: Option<String>,
    pub cache_size: Option<u32>,
}

#[napi]
pub struct BatchWrapper {
    inner: Batch,
}

#[napi]
pub struct SessionWrapper {
    inner: CachingSession,
}

#[napi]
impl SessionOptions {
    /// Empty SessionOptions constructor
    #[napi]
    pub fn empty() -> Self {
        SessionOptions {
            connect_points: vec![],
            keyspace: None,
            application_name: None,
            application_version: None,
            credentials_username: None,
            credentials_password: None,
            cache_size: None,
        }
    }
}

#[napi]
impl SessionWrapper {
    /// Creates session based on the provided session options.
    #[napi]
    pub async fn create_session(options: &SessionOptions) -> napi::Result<Self> {
        let builder = configure_session_builder(options);
        let session = builder.build().await.map_err(err_to_napi)?;
        let session: CachingSession = CachingSession::from(
            session,
            options.cache_size.unwrap_or(DEFAULT_CACHE_SIZE) as usize,
        );
        Ok(SessionWrapper { inner: session })
    }

    /// Returns the name of the current keyspace
    #[napi]
    pub fn get_keyspace(&self) -> Option<String> {
        self.inner
            .get_session()
            .get_keyspace()
            .as_deref()
            .map(ToOwned::to_owned)
    }

    /// Executes unprepared statement. This assumes the types will be either guessed or provided by user.
    ///
    /// Returns a wrapper of the result provided by the rust driver
    ///
    /// All parameters must be in a type recognizable by ParameterWrapper
    /// -- each value must be tuple of its ComplexType and the value itself.
    /// If the provided types will not be correct, this query will fail.
    #[napi]
    pub async fn query_unpaged(
        &self,
        query: String,
        params: Vec<ParameterWrapper>,
        options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let statement: Statement = apply_statement_options(query.into(), options)?;
        let params_vec: Vec<Option<MaybeUnset<CqlValue>>> =
            params.into_iter().map(|e| e.row).collect();
        let query_result = self
            .inner
            .get_session()
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
        let statement: Statement = statement.into();
        Ok(PreparedStatementWrapper {
            prepared: self
                .inner
                .add_prepared_statement(&statement) // TODO: change for add_prepared_statement_to_owned after it is made public
                .await
                .map_err(err_to_napi)?,
        })
    }

    /// Execute a given prepared statement against the database with provided parameters.
    ///
    /// Returns a wrapper of the result provided by the rust driver
    ///
    /// All parameters must be in a type recognizable by ParameterWrapper
    /// -- each value must be tuple of its ComplexType and the value itself.
    /// Creating Prepared statement may help to determine required types
    ///
    /// Currently `execute_unpaged` from rust driver is used, so no paging is done
    /// and there is no support for any query options
    #[napi]
    pub async fn execute_prepared_unpaged(
        &self,
        query: &PreparedStatementWrapper,
        params: Vec<ParameterWrapper>,
        options: &QueryOptionsWrapper,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Option<MaybeUnset<CqlValue>>> =
            params.into_iter().map(|e| e.row).collect();
        let query = apply_prepared_options(query.prepared.clone(), options)?;
        QueryResultWrapper::from_query(
            self.inner
                .get_session()
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
        params: Vec<Vec<ParameterWrapper>>,
    ) -> napi::Result<QueryResultWrapper> {
        let params_vec: Vec<Vec<Option<MaybeUnset<CqlValue>>>> = params
            .into_iter()
            .map(|e| e.into_iter().map(|f| f.row).collect())
            .collect();
        QueryResultWrapper::from_query(
            self.inner
                .batch(&batch.inner, params_vec)
                .await
                .map_err(err_to_napi)?,
        )
    }

    /// Query a single page of a prepared statement
    ///
    /// For the first page, paging state is not required.
    /// For the following pages you need to provide page state
    /// received from the previous page
    ///
    /// Currently it clones each argument on each call -- quite inefficient
    #[napi]
    pub async fn query_single_page(
        &self,
        query: String,
        params: Vec<ParameterWrapper>,
        options: &QueryOptionsWrapper,
        paging_state: Option<&PagingStateWrapper>,
    ) -> napi::Result<PagingResult> {
        let statement: Statement = apply_statement_options(query.into(), options)?;
        let paging_state = paging_state
            .map(|e| e.inner.clone())
            .unwrap_or(PagingState::start());
        let values: Vec<Option<MaybeUnset<CqlValue>>> = params.into_iter().map(|e| e.row).collect();

        let (result, paging_state_response) = self
            .inner
            .get_session()
            .query_single_page(statement, values, paging_state)
            .await
            .map_err(err_to_napi)?;

        Ok(PagingResult {
            result: QueryResultWrapper::from_query(result)?,
            paging_state: paging_state_response.into(),
        })
    }

    /// Execute a single page of a prepared statement
    ///
    /// For the first page, paging state is not required.
    /// For the following pages you need to provide page state
    /// received from the previous page
    ///
    /// Currently it clones each argument on each call -- quite inefficient
    #[napi]
    pub async fn execute_single_page(
        &self,
        query: &PreparedStatementWrapper,
        params: Vec<ParameterWrapper>,
        options: &QueryOptionsWrapper,
        paging_state: Option<&PagingStateWrapper>,
    ) -> napi::Result<PagingResult> {
        let paging_state = paging_state
            .map(|e| e.inner.clone())
            .unwrap_or(PagingState::start());
        let values: Vec<Option<MaybeUnset<CqlValue>>> = params.into_iter().map(|e| e.row).collect();
        let prepared = apply_prepared_options(query.prepared.clone(), options)?;

        let (result, paging_state) = self
            .inner
            .get_session()
            .execute_single_page(&prepared, values, paging_state)
            .await
            .map_err(err_to_napi)?;
        Ok(PagingResult {
            result: QueryResultWrapper::from_query(result)?,
            paging_state: paging_state.into(),
        })
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

fn configure_session_builder(options: &SessionOptions) -> SessionBuilder {
    let mut builder = SessionBuilder::new();
    builder = builder.custom_identity(self_identity(options));
    builder = builder.known_nodes(&options.connect_points);
    if let Some(keyspace) = &options.keyspace {
        builder = builder.use_keyspace(keyspace, false);
    }
    match (
        options.credentials_username.as_ref(),
        options.credentials_password.as_ref(),
    ) {
        (Some(username), Some(password)) => {
            builder = builder.user(username, password);
        }
        (None, None) => (),
        (Some(_), None) | (None, Some(_)) => {
            unreachable!("There is a check in JS Client constructor that should have prevented only one credential passed")
        }
    }
    builder
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

/// Macro to allow applying options that can be used for queries other than batch
macro_rules! make_non_batch_apply_options {
    ($statement_type: ty, $fn_name: ident, $partial_name: ident) => {
        make_apply_options!($statement_type, $partial_name);
        fn $fn_name(
            statement: $statement_type,
            options: &QueryOptionsWrapper,
        ) -> napi::Result<$statement_type> {
            // Statement with partial options applied -
            // those that are common with batch queries
            let mut statement_with_part_of_options_applied = $partial_name(statement, options)?;
            if let Some(o) = options.fetch_size {
                statement_with_part_of_options_applied.set_page_size(o);
            }
            Ok(statement_with_part_of_options_applied)
        }
    };
}

make_non_batch_apply_options!(Statement, apply_statement_options, statement_opt_partial);
make_non_batch_apply_options!(
    PreparedStatement,
    apply_prepared_options,
    prepared_opt_partial
);
make_apply_options!(Batch, apply_batch_options);

/// Provides driver self identity, filling information on application based on session options.
fn self_identity(options: &SessionOptions) -> SelfIdentity<'static> {
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
