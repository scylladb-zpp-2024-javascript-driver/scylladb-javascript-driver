use crate::utils::js_error;

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
}

#[napi]
impl ComplexType {
    #[napi]
    pub fn get_support_type(&self, id: i32) -> napi::Result<ComplexType> {
        let err = || Err(js_error("Cannot get requested support type"));
        let v = match id {
            1 => &self.support_type_1,
            2 => &self.support_type_2,
            _ => {
                return err();
            }
        };
        match v {
            Some(s) => Ok(*s.clone()),
            None => err(),
        }
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
        ComplexType {
            base_type,
            support_type_1: support1.map(Box::new),
            support_type_2: support2.map(Box::new),
        }
    }
}
