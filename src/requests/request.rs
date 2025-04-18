use napi::bindgen_prelude::BigInt;
use scylla::statement::prepared::PreparedStatement;

use crate::{result::map_column_type_to_complex_type, types::type_wrappers::ComplexType};

#[napi]
#[derive(Clone)]
pub struct PreparedStatementWrapper {
    pub(crate) prepared: PreparedStatement,
}

#[napi]
pub struct QueryOptionsWrapper {
    pub auto_page: Option<bool>,
    pub capture_stack_trace: Option<bool>,
    pub consistency: Option<u16>,
    pub counter: Option<bool>,
    // customPayload?: any;
    // executionProfile?: string | ExecutionProfile;
    pub fetch_size: Option<i32>,
    // hints?: string[] | string[][];
    // host?: Host;
    pub is_idempotent: Option<bool>,
    pub keyspace: Option<String>,
    pub logged: Option<bool>,
    // pageState?: Buffer | string;
    pub prepare: Option<bool>,
    pub read_timeout: Option<i32>,
    // retry?: policies.retry.RetryPolicy;
    pub routing_indexes: Option<Vec<i32>>,
    // routingKey?: Buffer | Buffer[];
    pub routing_names: Option<Vec<String>>,
    pub serial_consistency: Option<i16>,
    pub timestamp: Option<BigInt>,
    pub trace_query: Option<bool>,
}

#[napi]
impl PreparedStatementWrapper {
    #[napi]
    /// Get array of expected types for this prepared statement.
    pub fn get_expected_types(&self) -> Vec<ComplexType> {
        self.prepared
            .get_variable_col_specs()
            .iter()
            .map(|e| map_column_type_to_complex_type(e.typ()))
            .collect()
    }
}

#[napi]
impl QueryOptionsWrapper {
    /// Constructor for empty QueryOptionsWrapper
    #[napi]
    pub fn empty_options() -> QueryOptionsWrapper {
        QueryOptionsWrapper {
            auto_page: None,
            capture_stack_trace: None,
            consistency: None,
            counter: None,
            fetch_size: None,
            is_idempotent: None,
            keyspace: None,
            logged: None,
            prepare: None,
            read_timeout: None,
            routing_indexes: None,
            routing_names: None,
            serial_consistency: None,
            timestamp: None,
            trace_query: None,
        }
    }
}
