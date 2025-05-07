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

    // Create a new copy of the ComplexType, with first support type set to the provided type
    #[napi]
    pub fn remap_list_support_type(&self, new_subtype: &ComplexType) -> ComplexType {
        ComplexType::one_support(self.base_type, Some(new_subtype.clone()))
    }

    #[napi]
    // Create a new copy of the ComplexType, with first and second support type set to the provided types
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

    /// Create a new ComplexType for tuple with provided inner types.
    #[napi]
    pub fn remap_tuple_support_type(new_subtypes: Vec<Option<&ComplexType>>) -> ComplexType {
        ComplexType {
            base_type: CqlType::Tuple,
            support_type_1: None,
            support_type_2: None,
            inner_types: new_subtypes
                .into_iter()
                // There is a chance, user doesn't provide a type for some tuple value.
                // If this vale is null or unset, we can still correctly handle that case.
                // For this reason we set here Custom type, a type that will never be used in request.
                // If we encounter Custom in parsing value, this means, that unsufficient type information was provided.
                .map(|e| {
                    e.unwrap_or(&ComplexType::simple_type(CqlType::Custom))
                        .clone()
                })
                .collect(),
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
        }
    }
}
