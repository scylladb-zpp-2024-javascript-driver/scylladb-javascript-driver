use scylla::prepared_statement::PreparedStatement;

use crate::result::{map_column_type_to_cql_type, CqlType};

#[napi]
pub struct PreparedStatementWrapper {
    pub(crate) prepared: PreparedStatement,
}

#[napi]
impl PreparedStatementWrapper {
    #[napi]
    pub fn get_expected_types(&self) -> Vec<CqlType> {
        self.prepared
            .get_variable_col_specs()
            .iter()
            .map(|e| map_column_type_to_cql_type(e.typ()))
            .collect()
    }
}
