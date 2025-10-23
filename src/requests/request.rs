use napi::bindgen_prelude::BigInt;
use scylla::statement::prepared::PreparedStatement;

use crate::{
    create_serializable_object, result::map_column_type_to_complex_type,
    types::type_wrappers::ComplexType,
};

pub(crate) struct PreparedStatementWrapper {
    pub(crate) prepared: PreparedStatement,
}

// Missing fields
// customPayload?, any;
// executionProfile?, string | ExecutionProfile;
// hints?, string[] | string[][];
// host?, Host;
// pageState?, Buffer | string;
// retry?, policies.retry.RetryPolicy;
// routingKey?, Buffer | Buffer[];
create_serializable_object!(
    QueryOptionsWrapper,
    {auto_page, bool},
    {capture_stack_trace, bool},
    {consistency, u16},
    {counter, bool},
    {fetch_size, i32},
    {is_idempotent, bool},
    {keyspace, String},
    {logged, bool},
    {prepare, bool},
    {read_timeout, i32},
    {routing_indexes, Vec<i32>},
    {routing_names, Vec<String>},
    {serial_consistency, i16},
    {timestamp, BigInt},
    {trace_query, bool}
);

impl PreparedStatementWrapper {
    /// Get array of expected types for this prepared statement.
    pub fn get_expected_types(&self) -> Vec<ComplexType> {
        self.prepared
            .get_variable_col_specs()
            .iter()
            .map(|e| map_column_type_to_complex_type(e.typ()))
            .collect()
    }
}
