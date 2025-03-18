use napi::bindgen_prelude::{BigInt, Buffer};
use scylla::value::{Counter, CqlTimestamp, CqlTimeuuid, CqlValue, MaybeUnset};

use crate::{
    types::{
        duration::DurationWrapper, inet::InetAddressWrapper, local_date::LocalDateWrapper,
        local_time::LocalTimeWrapper, uuid::UuidWrapper,
    },
    utils::{bigint_to_i64, js_error},
};

#[napi]
pub struct MaybeUnsetQueryParameterWrapper {
    pub(crate) parameter: MaybeUnset<CqlValue>,
}

/// Structure wraps CqlValue type. Use for passing parameters for requests.
///
/// Exposes functions from___ for each CQL type. They can be used to
/// create QueryParameterWrapper from a given value. For complex types,
/// like list or map, it requires the values to be provided as QueryParameterWrapper.
///
/// Currently there is no type validation for complex types, meaning this code
/// will accept for example vector with multiple types of values, which is not a valid CQL object.
#[napi]
pub struct QueryParameterWrapper {
    pub(crate) parameter: CqlValue,
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
    pub fn from_local_date(val: &LocalDateWrapper) -> QueryParameterWrapper {
        QueryParameterWrapper {
            parameter: CqlValue::Date(val.get_cql_date()),
        }
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

impl MaybeUnsetQueryParameterWrapper {
    /// Takes vector of QueryParameterWrapper references and turns it into vector of CqlValue
    pub(crate) fn extract_parameters(
        row: Vec<Option<&MaybeUnsetQueryParameterWrapper>>,
    ) -> Vec<Option<MaybeUnset<CqlValue>>> {
        row.iter()
            .map(|e| e.as_ref().map(|v| v.parameter.clone()))
            .collect()
    }
}

#[napi]
impl MaybeUnsetQueryParameterWrapper {
    #[napi]
    pub fn from_non_null_non_unset_value(
        val: &QueryParameterWrapper,
    ) -> MaybeUnsetQueryParameterWrapper {
        MaybeUnsetQueryParameterWrapper {
            parameter: MaybeUnset::Set(val.parameter.clone()),
        }
    }

    #[napi]
    pub fn unset() -> MaybeUnsetQueryParameterWrapper {
        MaybeUnsetQueryParameterWrapper {
            parameter: MaybeUnset::Unset,
        }
    }
}
