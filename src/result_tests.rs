use scylla::frame::{response::result::CqlValue, value::Counter};

use crate::result::CqlValueWrapper;

#[napi]
/// Test function returning sample CqlValueWrapper with Ascii type
pub fn tests_get_cql_wrapper_ascii() -> CqlValueWrapper {
    let element = CqlValue::Ascii("test value".to_owned());
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
/// Test function returning sample CqlValueWrapper with Set type
pub fn tests_get_cql_wrapper_set() -> CqlValueWrapper {
    let element = CqlValue::Set(vec![
        CqlValue::Text("some text".to_owned()),
        CqlValue::Int(1),
    ]);
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