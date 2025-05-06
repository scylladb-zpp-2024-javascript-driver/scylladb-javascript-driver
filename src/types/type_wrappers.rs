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
    Unprovided,
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

    /// Create a new copy of the ComplexType, with first support type set to the provided type and the same base type
    ///
    /// Intended for filling types of the list / set values in case no support type was initially provided
    #[napi]
    pub fn remap_list_support_type(&self, new_subtype: &ComplexType) -> ComplexType {
        ComplexType::one_support(self.base_type, Some(new_subtype.clone()))
    }

    /// Create a new copy of the ComplexType, with first and second support type set to the provided types and the same base type
    ///
    /// Intended for filling types of the map keys and value in case no support types were initially provided
    #[napi]
    pub fn remap_map_support_type(
        &self,
        key_new_subtype: &ComplexType,
        val_new_subtype: &ComplexType,
    ) -> ComplexType {
        ComplexType::two_support(
            self.base_type,
            Some(key_new_subtype.clone()),
            Some(val_new_subtype.clone()),
        )
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

    /// Create a new ComplexType for tuple with provided inner types.
    #[napi]
    pub fn remap_tuple_support_type(new_subtypes: Vec<Option<&ComplexType>>) -> ComplexType {
        ComplexType::from_tuple(
            new_subtypes
                .into_iter()
                // HACK:
                // There is a chance, user doesn't provide a type for some tuple value.
                // If this value is null or unset, we can still correctly handle that case.
                // For this reason we set here Unprovided type, a type that will never be used in request.
                // If we encounter Unprovided in parsing value, this means that insufficient type information was provided.
                //
                // This will be fixed at a later time, as it requires more investigation into how tuple works.
                .map(|e| {
                    e.unwrap_or(&ComplexType::simple_type(CqlType::Unprovided))
                        .clone()
                })
                .collect(),
        )
    }

    /// Create a new ComplexType for UDT with provided inner types and field names. Used in JS part of the driver during type guessing.
    #[napi]
    pub fn new_udt_type(
        new_subtypes: Vec<Option<&ComplexType>>,
        field_names: Vec<String>,
        keyspace: String,
        name: String,
    ) -> ComplexType {
        ComplexType {
            base_type: CqlType::UserDefinedType,
            support_type_1: None,
            support_type_2: None,
            inner_types: new_subtypes
                .into_iter()
                // HACK:
                // There is a chance, user doesn't provide a type for some UDT value.
                // If this value is null or unset, we can still correctly handle that case.
                // For this reason we set here Unprovided type, a type that will never be used in request.
                // If we encounter Unprovided in parsing value, this means, that unsufficient type information was provided.
                //
                // This will be fixed at a later time, as it requires more investigation into how UDT works.
                .map(|e| {
                    e.cloned()
                        .unwrap_or_else(|| ComplexType::simple_type(CqlType::Unprovided))
                })
                .collect(),
            udt_metadata: Some(UdtMetadata {
                keyspace,
                name,
                field_names,
            }),
        }
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
