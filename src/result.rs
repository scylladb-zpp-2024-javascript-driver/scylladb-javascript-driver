use crate::{
    types::{
        local_date::LocalDateWrapper,
        time_uuid::TimeUuidWrapper,
        type_wrappers::{ComplexType, CqlType},
        uuid::UuidWrapper,
    },
    utils::err_to_napi,
};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Error, Status,
};
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
use crate::utils::js_error;

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
#[napi]
pub struct RowWrapper {
    inner: Vec<Option<CqlValue>>,
}

/// Wrapper for a single CQL value
///
/// CqlValueWrapper exposes functions get____ for each CQL type,
/// which extract value from the object,
/// assuming this wrapper stores a value of the requested CQL type.
#[napi]
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

#[napi]
impl RowWrapper {
    #[napi]
    /// Get the CQL value wrappers for each column in the given row
    pub fn get_columns(&self) -> napi::Result<Vec<Option<CqlValueWrapper>>> {
        let s: Vec<Option<CqlValueWrapper>> = self
            .inner
            .iter()
            .map(|f| f.clone().map(|f| CqlValueWrapper { inner: f }))
            .collect();
        Ok(s)
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
impl CqlValueWrapper {
    #[napi]
    /// This uses rust Debug to return string representation of underlying value
    pub fn stringify(&self) -> String {
        format!("{:?}", self.inner)
    }

    #[napi]
    /// Get type of CQL value that is stored in this object
    pub fn get_type(&self) -> CqlType {
        match &self.inner {
            CqlValue::Ascii(_) => CqlType::Ascii,
            CqlValue::BigInt(_) => CqlType::BigInt,
            CqlValue::Boolean(_) => CqlType::Boolean,
            CqlValue::Blob(_) => CqlType::Blob,
            CqlValue::Counter(_) => CqlType::Counter,
            CqlValue::Decimal(_) => CqlType::Decimal, // NOI
            CqlValue::Date(_) => CqlType::Date,
            CqlValue::Double(_) => CqlType::Double,
            CqlValue::Duration(_) => CqlType::Duration,
            CqlValue::Empty => CqlType::Empty,
            CqlValue::Float(_) => CqlType::Float,
            CqlValue::Int(_) => CqlType::Int,
            CqlValue::Text(_) => CqlType::Text,
            CqlValue::Timestamp(_) => CqlType::Timestamp,
            CqlValue::Inet(_) => CqlType::Inet,
            CqlValue::List(_) => CqlType::List,
            CqlValue::Map(_) => CqlType::Map,
            CqlValue::Set(_) => CqlType::Set,
            CqlValue::UserDefinedType { .. } => CqlType::UserDefinedType, // NOI
            CqlValue::SmallInt(_) => CqlType::SmallInt,
            CqlValue::TinyInt(_) => CqlType::TinyInt,
            CqlValue::Time(_) => CqlType::Time,
            CqlValue::Timeuuid(_) => CqlType::Timeuuid,
            CqlValue::Tuple(_) => CqlType::Tuple, // NOI
            CqlValue::Uuid(_) => CqlType::Uuid,
            CqlValue::Varint(_) => CqlType::Varint, // NOI
            other => unimplemented!("Missing implementation for CQL value {:?}", other),
        }
    }

    fn generic_error(expected_type: &str) -> Error<Status> {
        js_error(format!(
            "Could not get value of type {} from CqlValueWrapper",
            expected_type
        ))
    }

    #[napi]
    pub fn get_ascii(&self) -> napi::Result<String> {
        match self.inner.as_ascii() {
            Some(r) => Ok(r.clone()),
            None => Err(Self::generic_error("ascii")),
        }
    }

    #[napi]
    pub fn get_bigint(&self) -> napi::Result<BigInt> {
        match self.inner.as_bigint() {
            Some(r) => Ok(BigInt::from(r)),
            None => Err(Self::generic_error("bigint")),
        }
    }

    #[napi]
    pub fn get_boolean(&self) -> napi::Result<bool> {
        match self.inner.as_boolean() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("boolean")),
        }
    }

    #[napi]
    pub fn get_blob(&self) -> napi::Result<Buffer> {
        match self.inner.as_blob() {
            Some(r) => Ok(r.clone().into()),
            None => Err(Self::generic_error("blob")),
        }
    }

    #[napi]
    pub fn get_counter(&self) -> napi::Result<BigInt> {
        match self.inner.as_counter() {
            Some(r) => Ok(r.0.into()),
            None => Err(Self::generic_error("counter")),
        }
    }

    #[napi]
    pub fn get_local_date(&self) -> napi::Result<LocalDateWrapper> {
        match self.inner.as_cql_date() {
            Some(r) => Ok(LocalDateWrapper::from_cql_date(r)),
            None => Err(Self::generic_error("local_date")),
        }
    }

    #[napi]
    pub fn get_double(&self) -> napi::Result<f64> {
        match self.inner.as_double() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("double")),
        }
    }

    #[napi]
    pub fn get_duration(&self) -> napi::Result<DurationWrapper> {
        match self.inner.as_cql_duration() {
            Some(r) => Ok(DurationWrapper::from_cql_duration(r)),
            None => Err(Self::generic_error("duration")),
        }
    }
    #[napi]
    pub fn get_float(&self) -> napi::Result<f32> {
        match self.inner.as_float() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("float")),
        }
    }

    #[napi]
    pub fn get_int(&self) -> napi::Result<i32> {
        match self.inner.as_int() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("int")),
        }
    }

    #[napi]
    pub fn get_text(&self) -> napi::Result<String> {
        match self.inner.as_text() {
            Some(r) => Ok(r.clone()),
            None => Err(Self::generic_error("text")),
        }
    }

    #[napi]
    pub fn get_timestamp(&self) -> napi::Result<BigInt> {
        match self.inner.as_cql_timestamp() {
            Some(r) => Ok(r.0.into()),
            None => Err(Self::generic_error("text")),
        }
    }

    #[napi]
    pub fn get_inet(&self) -> napi::Result<InetAddressWrapper> {
        match self.inner.as_inet() {
            Some(r) => Ok(InetAddressWrapper::from_ip_addr(r)),
            None => Err(Self::generic_error("inet")),
        }
    }

    #[napi]
    pub fn get_list(&self) -> napi::Result<Vec<CqlValueWrapper>> {
        match self.inner.as_list() {
            Some(r) => Ok(r
                .iter()
                .map(|f| CqlValueWrapper { inner: f.clone() })
                .collect()),
            None => Err(Self::generic_error("list")),
        }
    }

    #[napi]
    /// Return array of "tuples" keeping (key, value) for each element in the map
    /// Currently NAPI doesn't implement ToNapiValue for tuples,
    /// but the returned typed here will be the same as if we returned tuple.
    pub fn get_map(&self) -> napi::Result<Vec<Vec<CqlValueWrapper>>> {
        match self.inner.as_map() {
            Some(r) => Ok(r
                .iter()
                .map(|f| {
                    vec![
                        CqlValueWrapper { inner: f.0.clone() },
                        CqlValueWrapper { inner: f.1.clone() },
                    ]
                })
                .collect()),
            None => Err(Self::generic_error("map")),
        }
    }

    #[napi]
    pub fn get_set(&self) -> napi::Result<Vec<CqlValueWrapper>> {
        match self.inner.as_set() {
            Some(r) => Ok(r
                .iter()
                .map(|f| CqlValueWrapper { inner: f.clone() })
                .collect()),
            None => Err(Self::generic_error("set")),
        }
    }

    #[napi]
    pub fn get_small_int(&self) -> napi::Result<i16> {
        match self.inner.as_smallint() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("small_int")),
        }
    }

    #[napi]
    pub fn get_tiny_int(&self) -> napi::Result<i8> {
        match self.inner.as_tinyint() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("tiny_int")),
        }
    }
    #[napi]
    pub fn get_local_time(&self) -> napi::Result<LocalTimeWrapper> {
        match self.inner.as_cql_time() {
            Some(r) => Ok(LocalTimeWrapper::from_cql_time(r)),
            None => Err(Self::generic_error("local_time")),
        }
    }

    #[napi]
    pub fn get_time_uuid(&self) -> napi::Result<TimeUuidWrapper> {
        match self.inner.as_timeuuid() {
            Some(r) => Ok(TimeUuidWrapper::from_cql_time_uuid(r)),
            None => Err(Self::generic_error("time_uuid")),
        }
    }

    #[napi]
    pub fn get_uuid(&self) -> napi::Result<UuidWrapper> {
        match self.inner.as_uuid() {
            Some(r) => Ok(UuidWrapper::from_cql_uuid(r)),
            None => Err(Self::generic_error("uuid")),
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
        ColumnType::Tuple(_) => ComplexType::simple_type(CqlType::Tuple),
        ColumnType::Vector {
            typ: _,
            dimensions: _,
        } => todo!(),
        other => unimplemented!("Missing implementation for CQL type {:?}", other),
    }
}
