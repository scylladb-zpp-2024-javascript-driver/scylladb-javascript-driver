use std::{
    net::{IpAddr, Ipv4Addr},
    str::FromStr,
};

use scylla::frame::{
    response::result::CqlValue,
    value::{Counter, CqlDuration, CqlTime, CqlTimestamp, CqlTimeuuid},
};

use crate::result::CqlValueWrapper;
use uuid::uuid;

#[napi]
/// Test function returning sample CqlValueWrapper with Ascii type
pub fn tests_get_cql_wrapper_ascii() -> CqlValueWrapper {
    let element = CqlValue::Ascii("test value".to_owned());
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with BigInt type
pub fn tests_get_cql_wrapper_bigint() -> CqlValueWrapper {
    let element = CqlValue::BigInt(69);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Boolean type
pub fn tests_get_cql_wrapper_boolean() -> CqlValueWrapper {
    let element = CqlValue::Boolean(false);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Blob type
pub fn tests_get_cql_wrapper_blob() -> CqlValueWrapper {
    let element = CqlValue::Blob((0..4).collect());
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Counter type
pub fn tests_get_cql_wrapper_counter() -> CqlValueWrapper {
    let element = CqlValue::Counter(Counter(i64::MAX));
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Double type
pub fn tests_get_cql_wrapper_double() -> CqlValueWrapper {
    let element = CqlValue::Double(f64::MAX);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Duration type
pub fn tests_get_cql_wrapper_duration() -> CqlValueWrapper {
    let element = CqlValue::Duration(CqlDuration {
        months: 1,
        days: 2,
        nanoseconds: 3,
    });
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Float type
pub fn tests_get_cql_wrapper_float() -> CqlValueWrapper {
    let element = CqlValue::Float(0_f32);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Int type
pub fn tests_get_cql_wrapper_int() -> CqlValueWrapper {
    let element = CqlValue::Int(i32::MAX);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Text type
pub fn tests_get_cql_wrapper_text() -> CqlValueWrapper {
    let element = CqlValue::Text("".to_owned());
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Timestamp type
pub fn tests_get_cql_wrapper_timestamp() -> CqlValueWrapper {
    let element = CqlValue::Timestamp(CqlTimestamp(1_000_000_i64));
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with List type
pub fn tests_get_cql_wrapper_list() -> CqlValueWrapper {
    let element = CqlValue::List(vec![
        CqlValue::Duration(CqlDuration {
            months: 6,
            days: 5,
            nanoseconds: 4,
        }),
        CqlValue::Boolean(false),
    ]);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Set type
pub fn tests_get_cql_wrapper_set() -> CqlValueWrapper {
    let element = CqlValue::Set(vec![
        CqlValue::Text("some text".to_owned()),
        CqlValue::Int(1),
    ]);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Map type
pub fn tests_get_cql_wrapper_map() -> CqlValueWrapper {
    let element = CqlValue::Map(vec![(
        CqlValue::Uuid(uuid!("ffffffff-ffff-ffff-eeee-ffffffffffff")),
        CqlValue::Int(1999),
    )]);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with SmallInt type
pub fn tests_get_cql_wrapper_small_int() -> CqlValueWrapper {
    let element = CqlValue::SmallInt(-1);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with TinyInt type
pub fn tests_get_cql_wrapper_tiny_int() -> CqlValueWrapper {
    let element = CqlValue::TinyInt(3);
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Uuid type
pub fn tests_get_cql_wrapper_uuid() -> CqlValueWrapper {
    let element = CqlValue::Uuid(uuid!("ffffffff-ffff-ffff-ffff-ffffffffffff"));
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Timeuuid type
pub fn tests_get_cql_wrapper_time_uuid() -> CqlValueWrapper {
    let element =
        CqlValue::Timeuuid(CqlTimeuuid::from_str("8e14e760-7fa8-11eb-bc66-000000000001").unwrap());
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with CqlTime type
pub fn tests_get_cql_wrapper_time() -> CqlValueWrapper {
    let element = CqlValue::Time(CqlTime(64 * 1_000_000_000));
    CqlValueWrapper { inner: element }
}

#[napi]
/// Test function returning sample CqlValueWrapper with Inet type
pub fn tests_get_cql_wrapper_inet() -> CqlValueWrapper {
    let element = CqlValue::Inet(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)));
    CqlValueWrapper { inner: element }
}
