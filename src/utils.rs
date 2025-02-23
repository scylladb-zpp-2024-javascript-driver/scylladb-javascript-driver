use std::{
    error::Error,
    fmt::{self, Display},
};

use napi::{bindgen_prelude::BigInt, Status};

/// Enum representing possible JavaScript error types.
/// Error, RangeError, ReferenceError, SyntaxError, TypeError
/// are native JavaScript error types and the rest are custom
/// Datastax driver error types.
pub enum ErrorType {
    ArgumentError,
    AuthenticationError,
    BusyConnectionError, // TODO: Add suport for fields of this error
    DriverError,
    DriverInternalError,
    NoHostAvailableError, // TODO: Add suport for fields of this error
    NotSupportedError,
    OperationTimedOutError, // TODO: Add suport for fields of this error
    ResponseError,          // TODO: Add suport for fields of this error
    Error,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
}

impl Display for ErrorType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            ErrorType::ArgumentError => "ArgumentError",
            ErrorType::AuthenticationError => "AuthenticationError",
            ErrorType::BusyConnectionError => "BusyConnectionError",
            ErrorType::DriverError => "DriverError",
            ErrorType::DriverInternalError => "DriverInternalError",
            ErrorType::NoHostAvailableError => "NoHostAvailableError",
            ErrorType::NotSupportedError => "NotSupportedError",
            ErrorType::OperationTimedOutError => "OperationTimedOutError",
            ErrorType::ResponseError => "ResponseError",
            ErrorType::Error => "Error",
            ErrorType::RangeError => "RangeError",
            ErrorType::ReferenceError => "ReferenceError",
            ErrorType::SyntaxError => "SyntaxError",
            ErrorType::TypeError => "TypeError",
        })
    }
}

/// Convert rust error to napi::Error
pub(crate) fn err_to_napi<T: Error>(e: T) -> napi::Error {
    js_error(e)
}

/// Create napi::Error from a message
pub(crate) fn js_error<T: Display>(e: T) -> napi::Error {
    js_typed_error(e, ErrorType::Error)
}

/// Create napi::Error from a message and error type
pub(crate) fn js_typed_error<T: Display>(e: T, error_type: ErrorType) -> napi::Error {
    napi::Error::new(Status::GenericFailure, format!("{}#{}", error_type, e))
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
