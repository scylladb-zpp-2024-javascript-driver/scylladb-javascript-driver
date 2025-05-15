use std::{
    error::Error,
    fmt::{self, Display},
};

use napi::Status;

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
