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
        }
    }
}
