use std::borrow::Cow;

use crate::result::map_column_type_to_complex_type;
use scylla::frame::response::result::ColumnType;

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

/// Keeps whole CQL type, including support types.
/// It has similar information to [scylla::frame::response::result::ColumnType],
/// but can be passes to NAPI-RS
#[napi]
#[derive(Clone)]
pub struct ComplexType {
    pub base_type: CqlType,
    pub(crate) support_type_1: Option<Box<ComplexType>>,
    pub(crate) support_type_2: Option<Box<ComplexType>>,
    pub(crate) inner_types: Vec<ComplexType>, // Used by Tuple and UDT
    pub(crate) field_names: Vec<String>,
    pub(crate) udt_keyspace: Option<String>,
    pub(crate) udt_name: Option<String>,
}

#[napi]
impl ComplexType {
    #[napi]
    pub fn get_first_support_type(&self) -> Option<ComplexType> {
        self.support_type_1.as_ref().map(|f| *f.clone())
    }
    #[napi]
    pub fn get_second_support_type(&self) -> Option<ComplexType> {
        self.support_type_2.as_ref().map(|f| *f.clone())
    }

    #[napi]
    pub fn get_inner_types(&self) -> Vec<ComplexType> {
        // Batch query to NAPI minimizes number of calls
        self.inner_types.clone()
    }

    #[napi]
    pub fn get_field_names(&self) -> Vec<String> {
        // Batch query to NAPI minimizes number of calls
        self.field_names.clone()
    }

    #[napi]
    pub fn get_udt_keyspace(&self) -> Option<String> {
        self.udt_keyspace.clone()
    }

    #[napi]
    pub fn get_udt_name(&self) -> Option<String> {
        self.udt_name.clone()
    }
}

impl ComplexType {
    /// Constructor for a simple object, like text or int
    pub(crate) fn simple_type(base_type: CqlType) -> Self {
        ComplexType::one_support(base_type, None)
    }

    /// Constructor for a object with one support type, like list
    pub(crate) fn one_support(base_type: CqlType, support1: Option<ComplexType>) -> Self {
        ComplexType::two_support(base_type, support1, None)
    }

    /// Constructor for a object with two support types currently only map
    pub(crate) fn two_support(
        base_type: CqlType,
        support1: Option<ComplexType>,
        support2: Option<ComplexType>,
    ) -> Self {
        ComplexType {
            base_type,
            support_type_1: support1.map(Box::new),
            support_type_2: support2.map(Box::new),
            inner_types: vec![],
            field_names: vec![],
            udt_keyspace: None,
            udt_name: None,
        }
    }

    pub(crate) fn from_tuple(columns: &[ColumnType]) -> Self {
        ComplexType {
            base_type: CqlType::Tuple,
            support_type_1: None,
            support_type_2: None,
            inner_types: columns
                .iter()
                .map(|column| map_column_type_to_complex_type(column))
                .collect(),
            field_names: vec![],
            udt_keyspace: None,
            udt_name: None,
        }
    }

    pub(crate) fn from_udt(
        items: &[(Cow<str>, ColumnType)],
        name: String,
        keyspace: String,
    ) -> Self {
        ComplexType {
            base_type: CqlType::UserDefinedType,
            support_type_1: None,
            support_type_2: None,
            inner_types: items
                .iter()
                .map(|(_, column)| map_column_type_to_complex_type(column))
                .collect(),
            field_names: items.iter().map(|(name, _)| name.to_string()).collect(),
            udt_keyspace: Some(keyspace),
            udt_name: Some(name),
        }
    }
}
