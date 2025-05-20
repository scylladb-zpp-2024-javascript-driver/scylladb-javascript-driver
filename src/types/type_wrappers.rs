use std::borrow::Cow;

use crate::result::map_column_type_to_complex_type;
use scylla::frame::response::result::ColumnType;

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
    Unprovided = 0x0070,
}

/// The goal of this class is to have an enum, that can be type checked.
/// By default, it's not possible to check in JS if value is of given enum type.
/// For this reason we create a class containing just an enum.
#[napi]
pub struct CqlTypeClass {
    pub typ: CqlType,
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

    /// Create a new copy of the ComplexType, with first support type set to the provided type and the same base type
    ///
    /// Intended for filling types of the list / set values in case no support type was initially provided
    #[napi]
    pub fn remap_list_support_type(&self, new_subtype: &ComplexType) -> ComplexType {
        ComplexType::one_support(self.base_type, Some(new_subtype.clone()))
    }

    #[napi]
    /// Create a new copy of the ComplexType, with first and second support type set to the provided types and the same base type
    ///
    /// Intended for filling types of the map keys and value in case no support types were initially provided
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

    #[napi]
    // Create a new ComplexType for UDT with provided inner types and previous type.
    pub fn remap_udt_support_type(
        old_type: &ComplexType,
        new_subtypes: Vec<Option<&ComplexType>>,
    ) -> ComplexType {
        ComplexType {
            base_type: CqlType::UserDefinedType,
            support_type_1: None,
            support_type_2: None,
            inner_types: new_subtypes
                .into_iter()
                // HACK:
                // There is a chance, user doesn't provide a type for some tuple value.
                // If this value is null or unset, we can still correctly handle that case.
                // For this reason we set here Unprovided type, a type that will never be used in request.
                // If we encounter Unprovided in parsing value, this means, that unsufficient type information was provided.
                //
                // This will be fixed at a later time, as it requires more investigation into how UDT works.
                .map(|e| {
                    e.unwrap_or(&ComplexType::simple_type(CqlType::Unprovided))
                        .clone()
                })
                .collect(),
            field_names: old_type.field_names.clone(),
            udt_keyspace: old_type.udt_keyspace.clone(),
            udt_name: old_type.udt_name.clone(),
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
            field_names: vec![],
            udt_keyspace: None,
            udt_name: None,
        }
    }

    pub(crate) fn from_tuple(columns: Vec<ComplexType>) -> Self {
        ComplexType {
            base_type: CqlType::Tuple,
            support_type_1: None,
            support_type_2: None,
            inner_types: columns,
            field_names: vec![],
            udt_keyspace: None,
            udt_name: None,
        }
    }

    pub(crate) fn from_udt(
        items: Vec<ComplexType>,
        names: Vec<String>,
        name: String,
        keyspace: String,
    ) -> Self {
        ComplexType {
            base_type: CqlType::UserDefinedType,
            support_type_1: None,
            support_type_2: None,
            inner_types: items,
            field_names: names,
            udt_keyspace: Some(keyspace),
            udt_name: Some(name),
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

    pub(crate) fn from_udt_column_type(
        items: &[(Cow<str>, ColumnType)],
        name: String,
        keyspace: String,
    ) -> Self {
        ComplexType::from_udt(
            items
                .iter()
                .map(|(_, column)| map_column_type_to_complex_type(column))
                .collect(),
            items.iter().map(|(name, _)| name.to_string()).collect(),
            name,
            keyspace,
        )
    }
}
