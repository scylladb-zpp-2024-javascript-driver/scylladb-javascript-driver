use napi::bindgen_prelude::{BigInt, Buffer};
use scylla::frame::{
    response::result::CqlValue,
    value::{Counter, CqlTimeuuid},
};

use crate::{
    types::{duration::DurationWrapper, uuid::UuidWrapper},
    utils::{bigint_to_i64, js_error},
};

#[napi]
pub struct QueryParameterWrapper {
    parameter: CqlValue,
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
        Ok(QueryParameterWrapper {
            parameter: CqlValue::Counter(Counter(bigint_to_i64(
                val,
                "Value casted into counter type shouldn't overflow i64",
            )?)),
        })
    }

    #[napi]
    pub fn from_double(val: f64) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Double(val),
        }
    }

    #[napi]
    pub fn from_duration(val: &DurationWrapper) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Duration(val.get_cql_duration()),
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
                val.try_into()
                    .map_err(|_| js_error("Value must fit in i16 type to be small int"))?,
            ),
        })
    }

    #[napi]
    pub fn from_tiny_int(val: i32) -> napi::Result<QueryParameterWrapper> {
        Ok(QueryParameterWrapper {
            parameter: CqlValue::TinyInt(
                val.try_into()
                    .map_err(|_| js_error("Value must fit in i16 type to be small int"))?,
            ),
        })
    }

    #[napi]
    pub fn from_uuid(val: &UuidWrapper) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Uuid(val.get_cql_uuid()),
        }
    }

    #[napi]
    pub fn from_time_uuid(val: &UuidWrapper) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Timeuuid(CqlTimeuuid::from_bytes(val.get_cql_uuid().into_bytes())),
        }
    }
}
