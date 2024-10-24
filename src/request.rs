use napi::bindgen_prelude::{BigInt, Buffer};
use scylla::{
  frame::{response::result::CqlValue, value::Counter},
  prepared_statement::PreparedStatement,
};

use crate::{
  result::{map_column_type_to_cql_value, CqlTypes},
  utils::js_generic_err,
};

#[napi]
pub struct QueryParameterWrapper {
  pub(crate) parameter: CqlValue,
}

#[napi]
pub struct PreparedStatementWrapper {
  pub(crate) query: PreparedStatement,
}

#[napi]
impl QueryParameterWrapper {
  #[napi]
  pub fn from_ascii(val: String) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Ascii(val),
    }
  }

  #[napi]
  pub fn from_boolean(val: bool) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Boolean(val),
    }
  }

  #[napi]
  pub fn from_blob(val: Buffer) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Blob(val.to_vec()),
    }
  }

  #[napi]
  pub fn from_counter(val: BigInt) -> napi::Result<QueryParameterWrapper> {
    // We quietly ignore overflow; Probably update this
    Ok(QueryParameterWrapper {
      parameter: CqlValue::Counter(Counter(val.get_i64().0)),
    })
  }

  #[napi]
  pub fn from_double(val: f64) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Double(val),
    }
  }

  #[napi]
  pub fn from_float(val: f64) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Float(val as f32),
    }
  }

  #[napi]
  pub fn from_int(val: i32) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Int(val),
    }
  }

  #[napi]
  pub fn from_text(val: String) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Ascii(val),
    }
  }

  #[napi]
  pub fn from_set(val: Vec<&QueryParameterWrapper>) -> QueryParameterWrapper {
    QueryParameterWrapper {
      parameter: CqlValue::Set(val.iter().map(|f| f.parameter.clone()).collect()),
    }
  }

  #[napi]
  pub fn from_small_int(val: i32) -> napi::Result<QueryParameterWrapper> {
    Ok(QueryParameterWrapper {
      parameter: CqlValue::SmallInt(
        val
          .try_into()
          .map_err(|_| js_generic_err("Value must fit in i16 type to be small int"))?,
      ),
    })
  }

  #[napi]
  pub fn from_tiny_int(val: i32) -> napi::Result<QueryParameterWrapper> {
    Ok(QueryParameterWrapper {
      parameter: CqlValue::TinyInt(
        val
          .try_into()
          .map_err(|_| js_generic_err("Value must fit in i16 type to be small int"))?,
      ),
    })
  }
}

#[napi]
impl PreparedStatementWrapper {
  #[napi]
  pub fn get_expected_types(&self) -> Vec<CqlTypes> {
    self
      .query
      .get_variable_col_specs()
      .iter()
      .map(|e| map_column_type_to_cql_value(&e.typ))
      .collect()
  }
}
