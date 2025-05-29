use std::sync::Arc;

use crate::{
    errors::err_to_napi,
    types::{
        local_date::LocalDateWrapper,
        type_wrappers::{ComplexType, CqlType, CqlTypeClass},
        uuid::UuidWrapper,
    },
};
use napi::bindgen_prelude::{BigInt, Buffer, ToNapiValue};
use scylla::{
    cluster::metadata::{CollectionType, NativeType},
    errors::IntoRowsResultError,
    frame::response::result::ColumnType,
    response::query_result::{QueryResult, QueryRowsResult},
    value::{CqlValue, Row},
};

use crate::types::duration::DurationWrapper;
use crate::types::inet::InetAddressWrapper;
use crate::types::local_time::LocalTimeWrapper;

enum QueryResultVariant {
    EmptyResult(QueryResult),
    RowsResult(QueryRowsResult),
}

/// Wrapper for a whole query result
#[napi]
pub struct QueryResultWrapper {
    inner: QueryResultVariant,
}

/// Wrapper for a single row of the query result
///
/// Whenever it's returned from NAPI function call
/// it's automatically converted to the inner vector
pub struct RowWrapper {
    inner: Vec<Option<CqlValue>>,
}

/// Represents a single row of result from paged query
#[napi]
pub struct PagedRowWrapper {
    // Values of the row
    inner: Vec<Option<CqlValue>>,
    // Column names. Kept as an Arc to avoid some cloning
    names: Arc<Vec<String>>,
}

/// Wrapper for a single CQL value
///
/// When returned from NAPI-RS, returns either just a inner value or tuple of elements: ``(cqlType, value)``
///
/// Plain value is returned, when we know how to treat the value, based on the value type.
/// The tuple is returned when there is ambiguity how the given value
/// should be handled, based on its type.
///
/// For example if we return String, no matter if it's CqlAscii or CqlText,
/// we treat it the same, and don't need to specify CqlType.
/// On the other hand, CqlBigInt and CqlTimestamp are returned from rust layer
/// as BigInt, but are provided to driver's user as BigInt and Date, respectively.
pub struct CqlValueWrapper {
    pub(crate) inner: CqlValue,
}

/// Wrapper for the information required in the ResultSet.columns field
#[napi]
pub struct MetaColumnWrapper {
    pub ksname: String,
    pub tablename: String,
    pub name: String,
    pub type_code: CqlType,
}

#[napi]
impl QueryResultWrapper {
    /// Converts rust query result into query result wrapper that can be passed to NAPI-RS
    pub fn from_query(result: QueryResult) -> napi::Result<QueryResultWrapper> {
        let value = match result.into_rows_result() {
            Ok(v) => QueryResultVariant::RowsResult(v),
            Err(IntoRowsResultError::ResultNotRows(v)) => QueryResultVariant::EmptyResult(v),
            Err(IntoRowsResultError::ResultMetadataLazyDeserializationError(e)) => {
                return Err(err_to_napi(e));
            }
        };
        Ok(QueryResultWrapper { inner: value })
    }

    /// Extracts all the rows of the result into a vector of rows
    #[napi]
    pub fn get_rows(&self) -> napi::Result<Option<Vec<RowWrapper>>> {
        let result = match &self.inner {
            QueryResultVariant::RowsResult(v) => v,
            QueryResultVariant::EmptyResult(_) => {
                return Ok(None);
            }
        };

        let rows = result.rows::<Row>()
            .expect("Type check against the Row type has failed; this is a bug in the underlying Rust driver");
        Ok(Some(
            rows.map(|f| RowWrapper {
                // TODO: Correctly handle such errors
                inner: f.expect("Unhandled row Deserialization Error ").columns,
            })
            .collect(),
        ))
    }

    /// Get the names of the columns in order, as they appear in the query result
    #[napi]
    pub fn get_columns_names(&self) -> Vec<String> {
        match &self.inner {
            QueryResultVariant::RowsResult(v) => v,
            QueryResultVariant::EmptyResult(_) => {
                return vec![];
            }
        }
        .column_specs()
        .iter()
        .map(|f| f.name().to_owned())
        .collect()
    }

    /// Get the specification of all columns as they appear in the query result
    #[napi]
    pub fn get_columns_specs(&self) -> Vec<MetaColumnWrapper> {
        match &self.inner {
            QueryResultVariant::RowsResult(v) => v,
            QueryResultVariant::EmptyResult(_) => {
                return vec![];
            }
        }
        .column_specs()
        .iter()
        .map(|f| MetaColumnWrapper {
            ksname: f.table_spec().ks_name().to_owned(),
            tablename: f.table_spec().table_name().to_owned(),
            name: f.name().to_owned(),
            type_code: map_column_type_to_complex_type(f.typ()).base_type,
        })
        .collect()
    }

    /// Get all warnings generated in the query
    #[napi]
    pub fn get_warnings(&self) -> Vec<String> {
        match &self.inner {
            QueryResultVariant::RowsResult(v) => v.warnings().map(|e| e.to_owned()).collect(),
            QueryResultVariant::EmptyResult(v) => v.warnings().map(|e| e.to_owned()).collect(),
        }
    }

    /// Get all tracing ids generated in the query
    #[napi]
    pub fn get_trace_id(&self) -> Option<UuidWrapper> {
        match &self.inner {
            QueryResultVariant::RowsResult(v) => v.tracing_id().map(UuidWrapper::from_cql_uuid),
            QueryResultVariant::EmptyResult(v) => v.tracing_id().map(UuidWrapper::from_cql_uuid),
        }
    }
}

impl ToNapiValue for RowWrapper {
    /// # Safety
    ///
    /// Valid pointer to napi env must be provided
    unsafe fn to_napi_value(
        env: napi::sys::napi_env,
        val: Self,
    ) -> napi::Result<napi::sys::napi_value> {
        // Caller of this function ensures a valid pointer to napi env is provided
        unsafe {
            Vec::to_napi_value(
                env,
                val.inner
                    .into_iter()
                    .map(|e| e.map(|f| CqlValueWrapper { inner: f }))
                    .collect(),
            )
        }
    }
}

impl From<Row> for RowWrapper {
    fn from(value: Row) -> Self {
        RowWrapper {
            inner: value.columns,
        }
    }
}

#[napi]
impl PagedRowWrapper {
    #[napi]
    pub fn get_columns_names(&self) -> Vec<String> {
        (*self.names).clone()
    }

    /// Get the CQL value wrappers for each column in the given row
    #[napi]
    pub fn get_columns(&self) -> napi::Result<Vec<Option<CqlValueWrapper>>> {
        let s: Vec<Option<CqlValueWrapper>> = self
            .inner
            .iter()
            .map(|f| f.clone().map(|f| CqlValueWrapper { inner: f }))
            .collect();
        Ok(s)
    }
}

/// Converts value into tuple of elements:
/// ``(typ, value)``
/// for a given CQL Value.
///
/// Intended to be used when there is ambiguity how the given value
/// should be provided, based on its type.
///
/// # Safety
///
/// Valid pointer to napi env must be provided
unsafe fn add_type_to_napi_obj(
    env: napi::sys::napi_env,
    value: napi::Result<napi::sys::napi_value>,
    typ: CqlType,
) -> napi::Result<napi::sys::napi_value> {
    // Caller of this function ensures a valid pointer to napi env is provided
    unsafe {
        // We need to use CqlTypeClass for JS to recognize the value if of enum type
        Vec::to_napi_value(
            env,
            vec![
                CqlTypeClass::to_napi_value(env, CqlTypeClass { typ }),
                value,
            ],
        )
    }
}

impl ToNapiValue for CqlValueWrapper {
    unsafe fn to_napi_value(
        env: napi::sys::napi_env,
        value: Self,
    ) -> napi::Result<napi::sys::napi_value> {
        match value.inner {
            CqlValue::Ascii(val) => String::to_napi_value(env, val),
            CqlValue::Boolean(val) => bool::to_napi_value(env, val),
            CqlValue::Blob(val) => Buffer::to_napi_value(env, val.into()),
            CqlValue::Counter(val) => add_type_to_napi_obj(
                env,
                BigInt::to_napi_value(env, val.0.into()),
                CqlType::Counter,
            ),
            CqlValue::Decimal(_) => todo!(),
            CqlValue::Date(val) => {
                LocalDateWrapper::to_napi_value(env, LocalDateWrapper::from_cql_date(val))
            }
            CqlValue::Double(val) => f64::to_napi_value(env, val),
            CqlValue::Duration(val) => {
                DurationWrapper::to_napi_value(env, DurationWrapper::from_cql_duration(val))
            }
            CqlValue::Empty => todo!(),
            CqlValue::Float(val) => f32::to_napi_value(env, val),
            CqlValue::Int(val) => i32::to_napi_value(env, val),
            CqlValue::BigInt(val) => {
                add_type_to_napi_obj(env, BigInt::to_napi_value(env, val.into()), CqlType::BigInt)
            }
            CqlValue::Text(val) => String::to_napi_value(env, val),
            CqlValue::Timestamp(val) => add_type_to_napi_obj(
                env,
                BigInt::to_napi_value(env, val.0.into()),
                CqlType::Timestamp,
            ),
            CqlValue::Inet(val) => {
                InetAddressWrapper::to_napi_value(env, InetAddressWrapper::from_ip_addr(val))
            }
            CqlValue::List(val) => Vec::to_napi_value(
                env,
                val.into_iter()
                    .map(|e| CqlValueWrapper::to_napi_value(env, CqlValueWrapper { inner: e }))
                    .collect(),
            ),
            CqlValue::Map(val) => add_type_to_napi_obj(
                env,
                Vec::to_napi_value(
                    env,
                    val.into_iter()
                        .map(|e: (CqlValue, CqlValue)| {
                            vec![
                                CqlValueWrapper { inner: e.0 },
                                CqlValueWrapper { inner: e.1 },
                            ]
                        })
                        .collect(),
                ),
                CqlType::Map,
            ),
            CqlValue::Set(val) => Vec::to_napi_value(
                env,
                val.into_iter()
                    .map(|e| CqlValueWrapper::to_napi_value(env, CqlValueWrapper { inner: e }))
                    .collect(),
            ),
            CqlValue::UserDefinedType { .. } => todo!(),
            CqlValue::SmallInt(val) => i16::to_napi_value(env, val),
            CqlValue::TinyInt(val) => i8::to_napi_value(env, val),
            CqlValue::Time(val) => {
                LocalTimeWrapper::to_napi_value(env, LocalTimeWrapper::from_cql_time(val))
            }
            CqlValue::Timeuuid(val) => add_type_to_napi_obj(
                env,
                Buffer::to_napi_value(env, Buffer::from(val.as_bytes().as_slice())),
                CqlType::Timeuuid,
            ),
            CqlValue::Tuple(val) => add_type_to_napi_obj(
                env,
                Vec::to_napi_value(
                    env,
                    val.into_iter()
                        .map(|v| {
                            v.map(|e| {
                                CqlValueWrapper::to_napi_value(
                                    env,
                                    CqlValueWrapper { inner: e.clone() },
                                )
                            })
                        })
                        .collect(),
                ),
                CqlType::Tuple,
            ),

            CqlValue::Uuid(val) => add_type_to_napi_obj(
                env,
                Buffer::to_napi_value(env, Buffer::from(val.as_bytes().as_slice())),
                CqlType::Uuid,
            ),
            CqlValue::Varint(_) => todo!(),
            other => unimplemented!("Missing implementation for CQL value {:?}", other),
        }
    }
}

/// Maps rust driver ColumnType representing type of the column with support types
/// into ComplexType used in this code.
pub(crate) fn map_column_type_to_complex_type(typ: &ColumnType) -> ComplexType {
    match typ {
        ColumnType::Native(native) => ComplexType::simple_type(match native {
            NativeType::Ascii => CqlType::Ascii,
            NativeType::Boolean => CqlType::Boolean,
            NativeType::Blob => CqlType::Blob,
            NativeType::Counter => CqlType::Counter,
            NativeType::Date => CqlType::Date,
            NativeType::Decimal => CqlType::Decimal,
            NativeType::Double => CqlType::Double,
            NativeType::Duration => CqlType::Duration,
            NativeType::Float => CqlType::Float,
            NativeType::Int => CqlType::Int,
            NativeType::BigInt => CqlType::BigInt,
            NativeType::Text => CqlType::Text,
            NativeType::Timestamp => CqlType::Timestamp,
            NativeType::Inet => CqlType::Inet,
            NativeType::SmallInt => CqlType::SmallInt,
            NativeType::TinyInt => CqlType::TinyInt,
            NativeType::Time => CqlType::Time,
            NativeType::Timeuuid => CqlType::Timeuuid,
            NativeType::Uuid => CqlType::Uuid,
            NativeType::Varint => CqlType::Varint,
            other => unimplemented!("Missing implementation for CQL native type {:?}", other),
        }),
        ColumnType::Collection { frozen: _, typ } => match typ {
            CollectionType::List(column_type) => ComplexType::one_support(
                CqlType::List,
                Some(map_column_type_to_complex_type(column_type)),
            ),
            CollectionType::Map(column_type, column_type1) => ComplexType::two_support(
                CqlType::Map,
                Some(map_column_type_to_complex_type(column_type)),
                Some(map_column_type_to_complex_type(column_type1)),
            ),
            CollectionType::Set(column_type) => ComplexType::one_support(
                CqlType::Set,
                Some(map_column_type_to_complex_type(column_type)),
            ),
            other => unimplemented!("Missing implementation for CQL Collection type {:?}", other),
        },
        ColumnType::UserDefinedType { .. } => ComplexType::simple_type(CqlType::UserDefinedType),
        ColumnType::Tuple(t) => ComplexType::tuple_from_column_type(t.as_slice()),
        ColumnType::Vector {
            typ: _,
            dimensions: _,
        } => todo!(),
        other => unimplemented!("Missing implementation for CQL type {:?}", other),
    }
}
