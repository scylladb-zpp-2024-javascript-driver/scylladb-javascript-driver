use scylla::frame::{response::result::CqlValue, value::CqlDuration};

use crate::{
    request::QueryParameterWrapper,
    types::type_wrappers::{ComplexType, CqlType},
};

#[napi]
pub fn tests_from_value_get_type(test: String) -> ComplexType {
    let v = match test.as_str() {
        "Duration" => (CqlType::Duration, None, None),
        "List" => (CqlType::List, Some(CqlType::Text), None),
        "Map" => (CqlType::Map, Some(CqlType::Ascii), Some(CqlType::Double)),
        "Set" => (CqlType::Set, Some(CqlType::Int), None),
        _ => (CqlType::Empty, None, None),
    };
    ComplexType::two_support(
        v.0,
        v.1.map(ComplexType::simple_type),
        v.2.map(ComplexType::simple_type),
    )
}

#[napi]
pub fn tests_from_value(test: String, value: &QueryParameterWrapper) {
    let v = match test.as_str() {
        "Duration" => CqlValue::Duration(CqlDuration {
            months: 21,
            days: 3,
            nanoseconds: 7,
        }),
        "List" => CqlValue::List(vec![
            CqlValue::Text("Test value".to_owned()),
            CqlValue::Text("Some other funny value".to_owned()),
        ]),
        "Map" => CqlValue::Map(vec![
            (CqlValue::Ascii("Text".to_owned()), CqlValue::Double(0.1)),
            (CqlValue::Ascii("Text2".to_owned()), CqlValue::Double(0.2)),
        ]),
        "Set" => CqlValue::Set(vec![CqlValue::Int(4), CqlValue::Int(7), CqlValue::Int(15)]),
        _ => CqlValue::Empty,
    };
    assert_eq!(value.parameter, v);
}
