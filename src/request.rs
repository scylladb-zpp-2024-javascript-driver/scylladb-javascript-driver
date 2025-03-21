use napi::bindgen_prelude::{BigInt, Buffer};
use scylla::{
    frame::{
        response::result::CqlValue,
        value::{Counter, CqlTimestamp, CqlTimeuuid},
    },
    prepared_statement::PreparedStatement,
};

use crate::{
    result::map_column_type_to_complex_type,
    types::{
        duration::DurationWrapper, inet::InetAddressWrapper, local_time::LocalTimeWrapper,
        type_wrappers::ComplexType, uuid::UuidWrapper,
    },
    utils::{bigint_to_i64, js_error},
};

/// Structure wraps CqlValue type. Use for passing parameters for queries
#[napi]
pub struct QueryParameterWrapper {
    pub(crate) parameter: CqlValue,
}

#[napi]
/// Wrapper for struct representing Prepared statement to the database
pub struct PreparedStatementWrapper {
    pub(crate) prepared: PreparedStatement,
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
    pub fn from_bigint(val: BigInt) -> napi::Result<QueryParameterWrapper> {
        Ok(QueryParameterWrapper {
            parameter: CqlValue::BigInt(bigint_to_i64(val, "Cannot fit value in CqlBigInt")?),
        })
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
            parameter: CqlValue::Text(val),
        }
    }

    #[napi]
    pub fn from_timestamp(val: BigInt) -> napi::Result<QueryParameterWrapper> {
        Ok(QueryParameterWrapper {
            parameter: CqlValue::Timestamp(CqlTimestamp(bigint_to_i64(
                val,
                "timestamp cannot overflow i64",
            )?)),
        })
    }

    #[napi]
    pub fn from_inet(val: &InetAddressWrapper) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Inet(val.get_ip_addr()),
        }
    }

    #[napi]
    pub fn from_list(val: Vec<&QueryParameterWrapper>) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::List(val.iter().map(|f| f.parameter.clone()).collect()),
        }
    }

    #[napi]
    pub fn from_set(val: Vec<&QueryParameterWrapper>) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Set(val.iter().map(|f| f.parameter.clone()).collect()),
        }
    }

    #[napi]
    pub fn from_map(
        val: Vec<(&QueryParameterWrapper, &QueryParameterWrapper)>,
    ) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Map(
                val.iter()
                    .map(|f| (f.0.parameter.clone(), f.1.parameter.clone()))
                    .collect(),
            ),
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
    pub fn from_local_time(val: &LocalTimeWrapper) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Time(val.get_cql_time()),
        }
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

impl QueryParameterWrapper {
    /// Takes vector of QueryParameterWrapper references and turns it into vector of CqlValue
    pub(crate) fn extract_parameters(
        row: Vec<Option<&QueryParameterWrapper>>,
    ) -> Vec<Option<CqlValue>> {
        row.iter()
            .map(|e| e.as_ref().map(|v| v.parameter.clone()))
            .collect()
    }
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
