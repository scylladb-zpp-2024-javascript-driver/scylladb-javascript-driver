use scylla::{
    cluster::metadata::{ColumnType, NativeType},
    value::CqlTime,
};
use std::{
    net::{IpAddr, Ipv4Addr},
    str::FromStr,
};

use crate::{
    requests::parameter_wrappers::ParameterWrapper,
    types::type_wrappers::{ComplexType, CqlType},
};

use scylla::value::{Counter, CqlDuration, CqlTimestamp, CqlTimeuuid, CqlValue};
use uuid::uuid;

#[napi]
pub fn tests_from_value_get_type(test: String) -> ComplexType {
    let v = match test.as_str() {
        "Ascii" => (CqlType::Ascii, None, None),
        "BigInt" => (CqlType::BigInt, None, None),
        "Boolean" => (CqlType::Boolean, None, None),
        "Blob" => (CqlType::Blob, None, None),
        "Counter" => (CqlType::Counter, None, None),
        "Double" => (CqlType::Double, None, None),
        "Duration" => (CqlType::Duration, None, None),
        "Float" => (CqlType::Float, None, None),
        "Int" => (CqlType::Int, None, None),
        "Text" => (CqlType::Text, None, None),
        "Timestamp" => (CqlType::Timestamp, None, None),
        "Inet" => (CqlType::Inet, None, None),
        "List" => (CqlType::List, Some(CqlType::Text), None),
        "Map" => (CqlType::Map, Some(CqlType::Ascii), Some(CqlType::Double)),
        "Set" => (CqlType::Set, Some(CqlType::Int), None),
        "SmallInt" => (CqlType::SmallInt, None, None),
        "TinyInt" => (CqlType::TinyInt, None, None),
        "Time" => (CqlType::Time, None, None),
        "Timeuuid" => (CqlType::Timeuuid, None, None),
        "Tuple" => {
            return ComplexType::tuple_from_column_type(&[
                ColumnType::Native(NativeType::Text),
                ColumnType::Tuple(vec![
                    ColumnType::Native(NativeType::Int),
                    ColumnType::Native(NativeType::Int),
                ]),
                ColumnType::Native(NativeType::Int),
            ])
        }
        "Uuid" => (CqlType::Uuid, None, None),
        _ => (CqlType::Empty, None, None),
    };
    ComplexType::two_support(
        v.0,
        v.1.map(ComplexType::simple_type),
        v.2.map(ComplexType::simple_type),
    )
}

#[napi]
pub fn tests_from_value(test: String, value: ParameterWrapper) {
    let v = match test.as_str() {
        "Ascii" => CqlValue::Ascii("Some arbitrary value".to_owned()),
        "BigInt" => CqlValue::BigInt(i64::MAX),
        "Boolean" => CqlValue::Boolean(false),
        "Blob" => CqlValue::Blob(vec![0, 1, 2, 3]),
        "Counter" => CqlValue::Counter(Counter(921)),
        "Double" => CqlValue::Double(21.37),
        "Duration" => CqlValue::Duration(CqlDuration {
            months: 21,
            days: 3,
            nanoseconds: 7,
        }),

        "Float" => CqlValue::Float(111.222),
        "Int" => CqlValue::Int(-1234),
        "Text" => CqlValue::Text("Nonsense".to_owned()),
        "Timestamp" => CqlValue::Timestamp(CqlTimestamp(0)),
        "Inet" => CqlValue::Inet(IpAddr::V4(Ipv4Addr::from_bits(0x12345678))),
        "List" => CqlValue::List(vec![
            CqlValue::Text("Test value".to_owned()),
            CqlValue::Text("Some other funny value".to_owned()),
        ]),
        "Map" => CqlValue::Map(vec![
            (CqlValue::Ascii("Text".to_owned()), CqlValue::Double(0.1)),
            (CqlValue::Ascii("Text2".to_owned()), CqlValue::Double(0.2)),
        ]),
        "Set" => CqlValue::Set(vec![CqlValue::Int(4), CqlValue::Int(7), CqlValue::Int(15)]),
        "SmallInt" => CqlValue::SmallInt(1_i16),
        "TinyInt" => CqlValue::TinyInt(-1_i8),
        "Time" => CqlValue::Time(CqlTime(4312)),
        "Timeuuid" => CqlValue::Timeuuid(
            CqlTimeuuid::from_str("8e14e760-7fa8-11eb-bc66-000000000001").unwrap(),
        ),
        "Tuple" => CqlValue::Tuple(vec![
            Some(CqlValue::Text("First".to_owned())),
            Some(CqlValue::Tuple(vec![
                Some(CqlValue::Int(1)),
                Some(CqlValue::Int(2)),
            ])),
            None,
        ]),
        "Uuid" => CqlValue::Uuid(uuid!("ffffffff-eeee-ffff-ffff-ffffffffffff")),
        _ => CqlValue::Empty,
    };
    assert_eq!(
        match value.row {
            Some(v) => {
                match v {
                    scylla::value::MaybeUnset::Unset => panic!("Expected set value"),
                    scylla::value::MaybeUnset::Set(w) => w,
                }
            }
            None => panic!("Expected some value"),
        },
        v
    );
}

#[napi]
pub fn tests_parameters_wrapper_unset(value: ParameterWrapper) {
    match value.row {
        Some(v) => match v {
            scylla::value::MaybeUnset::Unset => (),
            scylla::value::MaybeUnset::Set(_) => panic!("Expected unset value"),
        },
        None => panic!("Expected some value"),
    }
}

#[napi]
pub fn tests_parameters_wrapper_null(value: ParameterWrapper) {
    if value.row.is_some() {
        panic!("Expected none value")
    }
}
