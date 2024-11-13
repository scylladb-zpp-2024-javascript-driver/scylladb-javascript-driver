use std::{error::Error, fmt::Display};

use napi::Status;

/// Convert rust error to napi::Error
pub(crate) fn err_to_napi<T: Error>(e: T) -> napi::Error {
    js_error(e)
}

/// Create napi::Error from a message
pub(crate) fn js_error<T: Display>(e: T) -> napi::Error {
    napi::Error::new(Status::GenericFailure, e.to_string())
}
