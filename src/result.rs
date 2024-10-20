use napi::{bindgen_prelude::Buffer, Error, Status};
use scylla::{frame::response::result::CqlValue, QueryResult};

#[napi]
pub struct QueryResultWrapper {
    internal: QueryResult,
}

#[napi]
pub struct RowWrapper {
    internal: Vec<Option<CqlValue>>,
}

#[napi]
pub struct CqlValueWrapper {
    internal: CqlValue,
}

#[napi]
pub enum CqlTypes {
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
}

#[napi]
impl QueryResultWrapper {
    pub fn from_query(_internal: QueryResult) -> QueryResultWrapper {
        let x = _internal;
        QueryResultWrapper { internal: x }
    }

    #[napi]
    pub fn get_rows(&self) -> napi::Result<Vec<RowWrapper>> {
        let rows = match &self.internal.rows {
            Some(r) => r,
            None => {
                return Err(Error::new(Status::GenericFailure, "No rows"));
            }
        };

        Ok(rows
            .iter()
            .map(|f| RowWrapper {
                internal: f.columns.clone(),
            })
            .collect())
    }

    #[napi]
    pub fn get_columns_names(&self) -> Vec<String> {
        self.internal
            .col_specs()
            .iter()
            .map(|f| f.name.clone())
            .collect()
    }
}

#[napi]
impl RowWrapper {
    #[napi]
    pub fn get_columns(&self) -> napi::Result<Vec<CqlValueWrapper>> {
        let s: Vec<CqlValueWrapper> = self
            .internal
            .iter()
            .filter_map(|f| {
                f.as_ref().map(|r| CqlValueWrapper {
                    internal: r.clone(),
                })
            })
            .collect();
        Ok(s)
    }
}

#[napi]
impl CqlValueWrapper {
    #[napi]
    pub fn stringify(&self) -> String {
        format!("{:?}", self.internal)
    }

    #[napi]
    pub fn get_type(&self) -> CqlTypes {
        match self.internal {
            CqlValue::Ascii(_) => CqlTypes::Ascii,
            CqlValue::BigInt(_) => CqlTypes::BigInt, // NOI
            CqlValue::Boolean(_) => CqlTypes::Boolean,
            CqlValue::Blob(_) => CqlTypes::Blob,
            CqlValue::Counter(_) => CqlTypes::Counter,
            CqlValue::Decimal(_) => CqlTypes::Decimal, // NOI
            CqlValue::Date(_) => CqlTypes::Date,       // NOI
            CqlValue::Double(_) => CqlTypes::Double,
            CqlValue::Duration(_) => CqlTypes::Duration, // NOI
            CqlValue::Empty => CqlTypes::Empty,          // NOI: Not needed?
            CqlValue::Float(_) => CqlTypes::Float,
            CqlValue::Int(_) => CqlTypes::Int,
            CqlValue::Text(_) => CqlTypes::Text,
            CqlValue::Timestamp(_) => CqlTypes::Timestamp, // NOI
            CqlValue::Inet(_) => CqlTypes::Inet,           // NOI
            CqlValue::List(_) => CqlTypes::List,           // NOI
            CqlValue::Map(_) => CqlTypes::Map,             // NOI
            CqlValue::Set(_) => CqlTypes::Set,
            CqlValue::UserDefinedType { .. } => CqlTypes::UserDefinedType, // NOI
            CqlValue::SmallInt(_) => CqlTypes::SmallInt,
            CqlValue::TinyInt(_) => CqlTypes::TinyInt,
            CqlValue::Time(_) => CqlTypes::Time,         // NOI
            CqlValue::Timeuuid(_) => CqlTypes::Timeuuid, // NOI
            CqlValue::Tuple(_) => CqlTypes::Tuple,       // NOI
            CqlValue::Uuid(_) => CqlTypes::Uuid,         // NOI
            CqlValue::Varint(_) => CqlTypes::Varint,     // NOI
        }
    }

    #[napi]
    pub fn get_ascii(&self) -> napi::Result<String> {
        // We want to fore napi to use big num
        match self.internal.as_ascii() {
            Some(r) => Ok(r.clone()),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_boolean(&self) -> napi::Result<bool> {
        match self.internal.as_boolean() {
            Some(r) => Ok(r),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_blob(&self) -> napi::Result<Buffer> {
        match self.internal.as_blob() {
            Some(r) => Ok(r.clone().into()),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_counter(&self) -> napi::Result<i128> {
        // Is this correct?
        match self.internal.as_counter() {
            Some(r) => Ok(r.0.into()),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_double(&self) -> napi::Result<f64> {
        match self.internal.as_double() {
            Some(r) => Ok(r),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_float(&self) -> napi::Result<f32> {
        match self.internal.as_float() {
            Some(r) => Ok(r),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_int(&self) -> napi::Result<i32> {
        match self.internal.as_int() {
            Some(r) => Ok(r),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_text(&self) -> napi::Result<String> {
        match self.internal.as_text() {
            Some(r) => Ok(r.clone()),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_set(&self) -> napi::Result<Vec<CqlValueWrapper>> {
        match self.internal.as_set() {
            Some(r) => Ok(r
                .iter()
                .map(|f| CqlValueWrapper {
                    internal: f.clone(),
                })
                .collect()),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }
    #[napi]
    pub fn get_small_int(&self) -> napi::Result<i16> {
        match self.internal.as_smallint() {
            Some(r) => Ok(r),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }

    #[napi]
    pub fn get_tiny_int(&self) -> napi::Result<i8> {
        match self.internal.as_tinyint() {
            Some(r) => Ok(r),
            None => Err(Error::new(Status::GenericFailure, "Error")),
        }
    }
}
