use std::{
    error::Error,
    fmt::{self, Display},
};

use napi::{
    Env, JsValue, Status,
    bindgen_prelude::{JsObjectValue, ToNapiValue},
};

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

/// Custom result class, that supports extended errors
/// Conversion of this class to NapiValue is intended
/// only as a top level class, of the returned value.
/// Using this struct in other ways, may result in unwanted errors thrown in JS.
///
/// Meaning this is valid use-case:
///
/// ```rust
/// // Good - will throw a JS error if Error or NapiError, and return value if Ok
/// #[napi]
/// fn some_func<T>() -> JsResult<T>{
/// ...
/// JsResult<T> value = ...;
/// ...
/// value
/// }
/// ```
///
/// And the following use-cases are invalid:
///
/// ```rust
/// // Bad - this may return something else then expected
/// #[napi]
/// fn other_func<T>() -> napi::Result<JsResult<T>> {...}
///
/// #[napi]
/// fn another_func<T>() {
/// ...
/// JsResult<T> value = ...;
///
/// // Bad - this may unintentional throw an error
/// JsResult<T>::to_napi_value(env, value);
/// }
/// ```
///
/// When converting this class to JS value through ToNapiValue
/// cases will be handled in the following way
/// - Ok(T): T::to_napi_value will be return
/// - Error(ConvertedError): Converted error will be thrown through napi_throw().
///   zThis happens no matter at what point the ToNapiValue trait is called.
/// - NapiError(Error): Err(Error) will be returned
pub enum JsResult<T> {
    Ok(T),
    Error(ConvertedError),
    NapiError(napi::Error),
}

impl<T, E> From<Result<T, E>> for JsResult<T>
where
    E: Error,
{
    fn from(value: Result<T, E>) -> Self {
        match value {
            Ok(v) => JsResult::Ok(v),
            Err(e) => JsResult::Error(e.into()),
        }
    }
}

pub(crate) trait ToConvertable<Final> {
    fn cnv(self) -> Final;
}

impl<T, E> ToConvertable<Result<T, ConvertedError>> for Result<T, E>
where
    E: Into<ConvertedError> + Error,
{
    fn cnv(self) -> Result<T, ConvertedError> {
        self.map_err(ConvertedError::from)
    }
}

impl<T> From<Result<T, ConvertedError>> for JsResult<T> {
    fn from(value: Result<T, ConvertedError>) -> Self {
        match value {
            Ok(v) => JsResult::Ok(v),
            Err(e) => JsResult::Error(e),
        }
    }
}

impl<T> ToNapiValue for JsResult<T>
where
    T: ToNapiValue,
{
    unsafe fn to_napi_value(
        env: napi::sys::napi_env,
        val: Self,
    ) -> napi::Result<napi::sys::napi_value> {
        match val {
            JsResult::Ok(val) => unsafe { T::to_napi_value(env, val) },
            JsResult::Error(error) => {
                let v = unsafe { ConvertedError::to_napi_value(env, error) }?;
                // Regular return path will be ignored, once we throw the error.
                unsafe { napi::sys::napi_throw(env, v) };
                // But we still need to return something, to satisfy rust type safety
                Ok(v)
            }
            JsResult::NapiError(err) => Err(err),
        }
    }
}

pub struct ConvertedError {
    msg: String,
    name: String,
}

impl<T> From<T> for ConvertedError
where
    T: Error,
{
    fn from(value: T) -> Self {
        ConvertedError {
            msg: value.to_string(),
            // We obtain the error class name.
            // Because this is never empty, we will never fail to get the last element
            // The split is done to cope with the fact that the type name
            // may return type with full package or without.
            //
            // Why using such obscure method?
            // Rust driver maintainer did not agree to add a code that would allow
            // systematic conversion from the errors as they are into their names and so on...
            //
            // For this reason, we also only expose the error class name,
            // and not the name of the specific kind, or the inner values of those errors.
            name: std::any::type_name::<T>()
                .split(":")
                .last()
                .expect("Expected to obtain error name")
                .to_owned(),
        }
    }
}

impl ToNapiValue for ConvertedError {
    unsafe fn to_napi_value(
        env: napi::sys::napi_env,
        val: Self,
    ) -> napi::Result<napi::sys::napi_value> {
        let env = Env::from_raw(env);
        let mut e = env.create_error(napi::Error::new(Status::GenericFailure, val.msg))?;

        e.set_named_property("name", val.name)?;

        Ok(e.raw())
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
    napi::Error::new(Status::GenericFailure, format!("{error_type}#{e}"))
}
