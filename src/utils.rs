use std::{error::Error, fmt::Display};

use napi::{bindgen_prelude::BigInt, Status};

/// Convert rust error to napi::Error
pub(crate) fn err_to_napi<T: Error>(e: T) -> napi::Error {
    js_error(e)
}

/// Create napi::Error from a message
pub(crate) fn js_error<T: Display>(e: T) -> napi::Error {
    napi::Error::new(Status::GenericFailure, e.to_string())
}

/// Convert bigint to i64. Returns napi::Error if value doesn't fit in i64.
pub(crate) fn bigint_to_i64(value: BigInt, error_msg: impl Display) -> napi::Result<i64> {
    // Currently BigInt.get_i64() doesn't work as intended, so for now convert it manually
    if value.words.len() != 1 || value.words[0] > i64::MAX as u64 {
        if value.sign_bit && value.words.first().unwrap_or(&0) == &i64::MIN.unsigned_abs() {
            return Ok(i64::MIN);
        }
        return Err(js_error(error_msg));
    }
    Ok(value.words[0] as i64 * if value.sign_bit { -1 } else { 1 })
}
