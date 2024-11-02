use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Error, Status,
};
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
}

#[napi]
impl QueryResultWrapper {
    pub fn from_query(internal: QueryResult) -> QueryResultWrapper {
        QueryResultWrapper { internal }
    }

    #[napi]
    pub fn get_rows(&self) -> Option<Vec<RowWrapper>> {
        let rows = match &self.internal.rows {
            Some(r) => r,
            None => {
                return None;
            }
        };

        Some(
            rows.iter()
                .map(|f| RowWrapper {
                    internal: f.columns.clone(),
                })
                .collect(),
        )
    }

    #[napi]
    /// Get the names of the columns in order 
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
    /// Get the CQL value wrappers for each column in the given row
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
    /// This uses rust Debug to return string representation of underlying value
    pub fn stringify(&self) -> String {
        format!("{:?}", self.internal)
    }

    #[napi]
    /// Get type of value in this object
    pub fn get_type(&self) -> CqlType {
        match self.internal {
            CqlValue::Ascii(_) => CqlType::Ascii,
            CqlValue::BigInt(_) => CqlType::BigInt,
            CqlValue::Boolean(_) => CqlType::Boolean,
            CqlValue::Blob(_) => CqlType::Blob,
            CqlValue::Counter(_) => CqlType::Counter,
            CqlValue::Decimal(_) => CqlType::Decimal, // NOI
            CqlValue::Date(_) => CqlType::Date,       // NOI
            CqlValue::Double(_) => CqlType::Double,
            CqlValue::Duration(_) => CqlType::Duration, // NOI
            CqlValue::Empty => CqlType::Empty,
            CqlValue::Float(_) => CqlType::Float,
            CqlValue::Int(_) => CqlType::Int,
            CqlValue::Text(_) => CqlType::Text,
            CqlValue::Timestamp(_) => CqlType::Timestamp, // NOI
            CqlValue::Inet(_) => CqlType::Inet,           // NOI
            CqlValue::List(_) => CqlType::List,           // NOI
            CqlValue::Map(_) => CqlType::Map,             // NOI
            CqlValue::Set(_) => CqlType::Set,
            CqlValue::UserDefinedType { .. } => CqlType::UserDefinedType, // NOI
            CqlValue::SmallInt(_) => CqlType::SmallInt,
            CqlValue::TinyInt(_) => CqlType::TinyInt,
            CqlValue::Time(_) => CqlType::Time,         // NOI
            CqlValue::Timeuuid(_) => CqlType::Timeuuid, // NOI
            CqlValue::Tuple(_) => CqlType::Tuple,       // NOI
            CqlValue::Uuid(_) => CqlType::Uuid,         // NOI
            CqlValue::Varint(_) => CqlType::Varint,     // NOI
        }
    }

    fn generic_error(expected_type: &str) -> Error<Status> {
        Error::new(
            Status::GenericFailure,
            format!(
                "Could not get value of type {} from CqlValueWrapper",
                expected_type
            ),
        )
    }

    #[napi]
    pub fn get_ascii(&self) -> napi::Result<String> {
        match self.internal.as_ascii() {
            Some(r) => Ok(r.clone()),
            None => Err(Self::generic_error("ascii")),
        }
    }

    #[napi]
    pub fn get_boolean(&self) -> napi::Result<bool> {
        match self.internal.as_boolean() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("boolean")),
        }
    }

    #[napi]
    pub fn get_blob(&self) -> napi::Result<Buffer> {
        match self.internal.as_blob() {
            Some(r) => Ok(r.clone().into()),
            None => Err(Self::generic_error("blob")),
        }
    }

    #[napi]
    pub fn get_counter(&self) -> napi::Result<BigInt> {
        match self.internal.as_counter() {
            Some(r) => Ok(r.0.into()),
            None => Err(Self::generic_error("counter")),
        }
    }

    #[napi]
    pub fn get_double(&self) -> napi::Result<f64> {
        match self.internal.as_double() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("double")),
        }
    }

    #[napi]
    pub fn get_float(&self) -> napi::Result<f32> {
        match self.internal.as_float() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("float")),
        }
    }

    #[napi]
    pub fn get_int(&self) -> napi::Result<i32> {
        match self.internal.as_int() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("int")),
        }
    }

    #[napi]
    pub fn get_text(&self) -> napi::Result<String> {
        match self.internal.as_text() {
            Some(r) => Ok(r.clone()),
            None => Err(Self::generic_error("text")),
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
            None => Err(Self::generic_error("set")),
        }
    }

    #[napi]
    pub fn get_small_int(&self) -> napi::Result<i16> {
        match self.internal.as_smallint() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("small_int")),
        }
    }

    #[napi]
    pub fn get_tiny_int(&self) -> napi::Result<i8> {
        match self.internal.as_tinyint() {
            Some(r) => Ok(r),
            None => Err(Self::generic_error("tiny_int")),
        }
    }
}
