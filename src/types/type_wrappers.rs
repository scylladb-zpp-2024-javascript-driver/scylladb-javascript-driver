use std::borrow::Cow;

use crate::result::map_column_type_to_complex_type;
use scylla::frame::response::result::ColumnType;

/// Represents CQL types with their corresponding numeric values from the CQL protocol.
#[derive(Clone)]
#[napi]
pub enum CqlType {
    Ascii = 0x0001,
    Boolean = 0x0004,
    Blob = 0x0003,
    Counter = 0x0005,
    Decimal = 0x0006,
    Date = 0x0011,
    Double = 0x0007,
    Duration = 0x0015,
    Empty = 0x0069,
    Float = 0x0008,
    Int = 0x0009,
    BigInt = 0x0002,
    Text = 0x000A,
    Timestamp = 0x000B,
    Inet = 0x0010,
    List = 0x0020,
    Map = 0x0021,
    Set = 0x0022,
    UserDefinedType = 0x0030,
    SmallInt = 0x0013,
    TinyInt = 0x0014,
    Time = 0x0012,
    Timeuuid = 0x000F,
    Tuple = 0x0031,
    Uuid = 0x000C,
    Varint = 0x000E,
    Custom = 0x0000,
}

/// This struct is part of the `ComplexType` struct and is used to store information about UDTs.
#[derive(Clone)]
pub(crate) struct UdtMetadata {
    pub(crate) keyspace: String,
    pub(crate) name: String,
    pub(crate) field_names: Vec<String>,
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
    pub(crate) udt_metadata: Option<UdtMetadata>,
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
    pub fn get_udt_field_names(&self) -> Option<Vec<String>> {
        // Batch query to NAPI minimizes number of calls
        self.udt_metadata
            .as_ref()
            .map(|metadata| metadata.field_names.clone())
    }

    #[napi]
    pub fn get_udt_keyspace(&self) -> Option<String> {
        self.udt_metadata
            .as_ref()
            .map(|metadata| metadata.keyspace.clone())
    }

    #[napi]
    pub fn get_udt_name(&self) -> Option<String> {
        self.udt_metadata
            .as_ref()
            .map(|metadata| metadata.name.clone())
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
            udt_metadata: None,
        }
    }

    pub(crate) fn from_tuple(columns: Vec<ComplexType>) -> Self {
        ComplexType {
            base_type: CqlType::Tuple,
            support_type_1: None,
            support_type_2: None,
            inner_types: columns,
            udt_metadata: None,
        }
    }

    pub(crate) fn tuple_from_column_type(columns: &[ColumnType]) -> Self {
        ComplexType::from_tuple(
            columns
                .iter()
                .map(|column| map_column_type_to_complex_type(column))
                .collect(),
        )
    }

    /// Create a ComplexType from a UDT column type. Used when decoding UDTs from the database to the Rust driver.
    pub(crate) fn from_udt_column_type(
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
            udt_metadata: Some(UdtMetadata {
                keyspace: keyspace.clone(),
                name: name.clone(),
                field_names: items.iter().map(|(name, _)| name.to_string()).collect(),
            }),
        }
    }
}
