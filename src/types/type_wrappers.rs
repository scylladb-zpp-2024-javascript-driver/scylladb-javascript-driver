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

#[napi]
#[derive(Clone)]
pub struct ComplexType {
    pub base_type: CqlType,
    pub(crate) support_type_1: Option<Box<ComplexType>>,
    pub(crate) support_type_2: Option<Box<ComplexType>>,
    pub(crate) field_name: Option<String>,
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
    pub fn get_field_name(&self) -> Option<String> {
        self.field_name.clone()
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
    pub(crate) fn simple_type(base_type: CqlType) -> Self {
        ComplexType::one_support(base_type, None)
    }

    pub(crate) fn one_support(base_type: CqlType, support1: Option<ComplexType>) -> Self {
        ComplexType::two_support(base_type, support1, None)
    }

    pub(crate) fn two_support(
        base_type: CqlType,
        support1: Option<ComplexType>,
        support2: Option<ComplexType>,
    ) -> Self {
        ComplexType::full_type(base_type, support1, support2, None, None, None)
    }

    pub(crate) fn full_type(
        base_type: CqlType,
        support1: Option<ComplexType>,
        support2: Option<ComplexType>,
        field_name: Option<String>,
        udt_keyspace: Option<String>,
        udt_name: Option<String>,
    ) -> Self {
        ComplexType {
            base_type,
            support_type_1: support1.map(Box::new),
            support_type_2: support2.map(Box::new),
            field_name,
            udt_keyspace,
            udt_name,
        }
    }

    pub(crate) fn from_tuple(columns: &[ColumnType]) -> Self {
        ComplexType::two_support(
            CqlType::Tuple,
            columns.first().map(|v| map_column_type_to_complex_type(v)),
            if columns.is_empty() {
                None
            } else {
                Some(ComplexType::from_tuple(&columns[1..]))
            },
        )
    }

    pub(crate) fn from_udt(
        items: &[(Cow<str>, ColumnType)],
        name: Option<String>,
        keyspace: Option<String>,
    ) -> Self {
        ComplexType::full_type(
            CqlType::UserDefinedType,
            items
                .first()
                .map(|(_, v)| map_column_type_to_complex_type(v)),
            if items.is_empty() {
                None
            } else {
                Some(ComplexType::from_udt(&items[1..], None, None))
            },
            items.first().map(|(name, _)| name.to_string()),
            keyspace,
            name,
        )
    }

    // pub(crate) fn from_udt
}
