use scylla::prepared_statement::PreparedStatement;

use crate::{result::map_column_type_to_complex_type, types::type_wrappers::ComplexType};

#[napi]
pub struct PreparedStatementWrapper {
    pub(crate) prepared: PreparedStatement,
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
