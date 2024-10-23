use napi::{bindgen_prelude::Buffer, Error, Status};
use scylla::{
  frame::response::result::{ColumnType, CqlValue},
  QueryResult,
};

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
pub struct MetaColumnsWrapper {
  pub ksname: String,
  pub tablename: String,
  pub name: String,
  pub type_code: CqlTypes,
}

#[napi]
pub enum CqlTypes {
  Custom = 0x0,
  Ascii = 0x1,
  BigInt = 0x2,
  Boolean = 0x3,
  Blob = 0x4,
  Counter = 0x5,
  Decimal = 0x6,
  Double = 0x7,
  Float = 0x8,
  Int = 0x9,
  Timestamp = 0xB,
  Uuid = 0xC,
  Text = 0xD,
  Varint = 0xE,
  Timeuuid = 0xF,
  Inet = 0x10,
  Date = 0x11,
  Time = 0x12,
  SmallInt = 0x13,
  TinyInt = 0x14,
  Duration = 0x15,
  List = 0x20,
  Map = 0x21,
  Set = 0x22,
  UserDefinedType = 0x30,
  Tuple = 0x31,
  Empty,
}

#[napi]
impl QueryResultWrapper {
  pub fn from_query(_internal: QueryResult) -> QueryResultWrapper {
    let x = _internal;
    QueryResultWrapper { internal: x }
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
      rows
        .iter()
        .map(|f| RowWrapper {
          internal: f.columns.clone(),
        })
        .collect(),
    )
  }

  #[napi]
  pub fn get_columns_names(&self) -> Vec<String> {
    self
      .internal
      .col_specs()
      .iter()
      .map(|f| f.name.clone())
      .collect()
  }

  #[napi]
  pub fn get_columns_specs(&self) -> Vec<MetaColumnsWrapper> {
    self
      .internal
      .col_specs()
      .iter()
      .map(|f| {
        MetaColumnsWrapper {
          // ToDo: Check if rust provides such information
          ksname: "unknown?".to_string(),
          tablename: f.table_spec.table_name().to_string(),
          name: f.name.clone(),
          type_code: map_column_type_to_cql_value(&f.typ),
        }
      })
      .collect()
  }

  #[napi]
  pub fn get_warnings(&self) -> Vec<String> {
    self.internal.warnings.clone()
  }

  #[napi]
  // As we don't have UUID type, we temporary use string
  pub fn get_trace_id(&self) -> Option<String> {
    self.internal.tracing_id.map(|f| f.to_string())
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
      Some(r) => Ok(
        r.iter()
          .map(|f| CqlValueWrapper {
            internal: f.clone(),
          })
          .collect(),
      ),
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

fn map_column_type_to_cql_value(typ: &ColumnType) -> CqlTypes {
  match typ {
    ColumnType::Custom(_) => CqlTypes::Custom,
    ColumnType::Ascii => CqlTypes::Ascii,
    ColumnType::Boolean => CqlTypes::Boolean,
    ColumnType::Blob => CqlTypes::Blob,
    ColumnType::Counter => CqlTypes::Counter,
    ColumnType::Date => CqlTypes::Date,
    ColumnType::Decimal => CqlTypes::Decimal,
    ColumnType::Double => CqlTypes::Double,
    ColumnType::Duration => CqlTypes::Duration,
    ColumnType::Float => CqlTypes::Float,
    ColumnType::Int => CqlTypes::Int,
    ColumnType::BigInt => CqlTypes::BigInt,
    ColumnType::Text => CqlTypes::Text,
    ColumnType::Timestamp => CqlTypes::Timestamp,
    ColumnType::Inet => CqlTypes::Inet,
    ColumnType::List(_) => CqlTypes::List,
    ColumnType::Map(_, _) => CqlTypes::Map,
    ColumnType::Set(_) => CqlTypes::Set,
    ColumnType::UserDefinedType { .. } => CqlTypes::UserDefinedType,
    ColumnType::SmallInt => CqlTypes::SmallInt,
    ColumnType::TinyInt => CqlTypes::TinyInt,
    ColumnType::Time => CqlTypes::Time,
    ColumnType::Timeuuid => CqlTypes::Timeuuid,
    ColumnType::Tuple(_) => CqlTypes::Tuple,
    ColumnType::Uuid => CqlTypes::Uuid,
    ColumnType::Varint => CqlTypes::Varint,
  }
}
