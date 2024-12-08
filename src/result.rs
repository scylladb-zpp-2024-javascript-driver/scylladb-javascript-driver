use crate::{
    types::{time_uuid::TimeUuidWrapper, uuid::UuidWrapper},
    utils::err_to_napi,
};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Error, Status,
};
use scylla::{
    frame::response::result::{ColumnType, CqlValue, Row},
    transport::query_result::IntoRowsResultError,
    QueryResult, QueryRowsResult,
};

use crate::types::duration::DurationWrapper;
use crate::types::inet::InetAddressWrapper;
use crate::types::local_time::LocalTimeWrapper;
use crate::utils::js_error;

enum QueryResultVariant {
    EmptyResult(QueryResult),
    RowsResult(QueryRowsResult),
}

#[napi]
pub struct QueryResultWrapper {
    internal: QueryResultVariant,
}

#[napi]
pub struct RowWrapper {
    internal: Vec<Option<CqlValue>>,
}

#[napi]
pub struct CqlValueWrapper {
    pub(crate) inner: CqlValue,
}

#[napi]
pub struct MetaColumnWrapper {
    pub ksname: String,
    pub tablename: String,
    pub name: String,
    pub type_code: CqlType,
}

#[napi]
pub enum CqlType {
    Ascii,
    Boolean,
    Blob,
    Counter,
    Decimal,
    Date,
    Double,
    Duration,
    Empty,
    Float,
    Int,
    BigInt,
    Text,
    Timestamp,
    Inet,
    List,
    Map,
    Set,
    UserDefinedType,
    SmallInt,
    TinyInt,
    Time,
    Timeuuid,
    Tuple,
    Uuid,
    Varint,
    Custom,
}

#[napi]
impl QueryResultWrapper {
    pub fn from_query(internal: QueryResult) -> napi::Result<QueryResultWrapper> {
        let value = match internal.into_rows_result() {
            Ok(v) => QueryResultVariant::RowsResult(v),
            Err(IntoRowsResultError::ResultNotRows(v)) => QueryResultVariant::EmptyResult(v),
            Err(IntoRowsResultError::ResultMetadataLazyDeserializationError(e)) => {
                return Err(err_to_napi(e));
            }
        };
        Ok(QueryResultWrapper { internal: value })
    }

    #[napi]
    pub fn get_rows(&self) -> napi::Result<Option<Vec<RowWrapper>>> {
        let r2 = match &self.internal {
            QueryResultVariant::RowsResult(v) => v,
            QueryResultVariant::EmptyResult(_) => {
                return Ok(None);
            }
        };

        let rows = r2.rows::<Row>()
            .expect("Type check against the Row type has failed; this is a bug in the underlying Rust driver");
        Ok(Some(
            rows.map(|f| RowWrapper {
                // TODO: Correctly handle such errors
                internal: f.expect("Unhandled row Deserialization Error ").columns,
            })
            .collect(),
        ))
    }

    #[napi]
    /// Get the names of the columns in order
    pub fn get_columns_names(&self) -> Vec<String> {
        match &self.internal {
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

    #[napi]
    pub fn get_columns_specs(&self) -> Vec<MetaColumnWrapper> {
        match &self.internal {
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
            type_code: map_column_type_to_cql_type(f.typ()),
        })
        .collect()
    }

    #[napi]
    pub fn get_warnings(&self) -> Vec<String> {
        match &self.internal {
            QueryResultVariant::RowsResult(v) => v.warnings().map(|e| e.to_owned()).collect(),
            QueryResultVariant::EmptyResult(v) => v.warnings().map(|e| e.to_owned()).collect(),
        }
    }

    #[napi]
    pub fn get_trace_id(&self) -> Option<UuidWrapper> {
        match &self.internal {
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
            .internal
            .iter()
            .map(|f| f.clone().map(|f| CqlValueWrapper { inner: f }))
            .collect();
        Ok(s)
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
    /// Get type of value in this object
    pub fn get_type(&self) -> CqlType {
        match self.inner {
            CqlValue::Ascii(_) => CqlType::Ascii,
            CqlValue::BigInt(_) => CqlType::BigInt,
            CqlValue::Boolean(_) => CqlType::Boolean,
            CqlValue::Blob(_) => CqlType::Blob,
            CqlValue::Counter(_) => CqlType::Counter,
            CqlValue::Decimal(_) => CqlType::Decimal, // NOI
            CqlValue::Date(_) => CqlType::Date,       // NOI
            CqlValue::Double(_) => CqlType::Double,
            CqlValue::Duration(_) => CqlType::Duration,
            CqlValue::Empty => CqlType::Empty,
            CqlValue::Float(_) => CqlType::Float,
            CqlValue::Int(_) => CqlType::Int,
            CqlValue::Text(_) => CqlType::Text,
            CqlValue::Timestamp(_) => CqlType::Timestamp, // NOI
            CqlValue::Inet(_) => CqlType::Inet,
            CqlValue::List(_) => CqlType::List, // NOI
            CqlValue::Map(_) => CqlType::Map,   // NOI
            CqlValue::Set(_) => CqlType::Set,
            CqlValue::UserDefinedType { .. } => CqlType::UserDefinedType, // NOI
            CqlValue::SmallInt(_) => CqlType::SmallInt,
            CqlValue::TinyInt(_) => CqlType::TinyInt,
            CqlValue::Time(_) => CqlType::Time,
            CqlValue::Timeuuid(_) => CqlType::Timeuuid,
            CqlValue::Tuple(_) => CqlType::Tuple, // NOI
            CqlValue::Uuid(_) => CqlType::Uuid,
            CqlValue::Varint(_) => CqlType::Varint, // NOI
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
    pub fn get_inet(&self) -> napi::Result<InetAddressWrapper> {
        match self.inner.as_inet() {
            Some(r) => Ok(InetAddressWrapper::from_ip_addr(r)),
            None => Err(Self::generic_error("inet")),
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

pub(crate) fn map_column_type_to_cql_type(typ: &ColumnType) -> CqlType {
    match typ {
        ColumnType::Custom(_) => CqlType::Custom,
        ColumnType::Ascii => CqlType::Ascii,
        ColumnType::Boolean => CqlType::Boolean,
        ColumnType::Blob => CqlType::Blob,
        ColumnType::Counter => CqlType::Counter,
        ColumnType::Date => CqlType::Date,
        ColumnType::Decimal => CqlType::Decimal,
        ColumnType::Double => CqlType::Double,
        ColumnType::Duration => CqlType::Duration,
        ColumnType::Float => CqlType::Float,
        ColumnType::Int => CqlType::Int,
        ColumnType::BigInt => CqlType::BigInt,
        ColumnType::Text => CqlType::Text,
        ColumnType::Timestamp => CqlType::Timestamp,
        ColumnType::Inet => CqlType::Inet,
        ColumnType::List(_) => CqlType::List,
        ColumnType::Map(_, _) => CqlType::Map,
        ColumnType::Set(_) => CqlType::Set,
        ColumnType::UserDefinedType { .. } => CqlType::UserDefinedType,
        ColumnType::SmallInt => CqlType::SmallInt,
        ColumnType::TinyInt => CqlType::TinyInt,
        ColumnType::Time => CqlType::Time,
        ColumnType::Timeuuid => CqlType::Timeuuid,
        ColumnType::Tuple(_) => CqlType::Tuple,
        ColumnType::Uuid => CqlType::Uuid,
        ColumnType::Varint => CqlType::Varint,
    }
}
