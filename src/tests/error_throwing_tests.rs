use crate::utils::{js_typed_error, ErrorType};

#[napi]
/// Test function that throws specified error with a custom message.
pub fn throw_test_error(error_type: String, custom_message: Option<String>) -> napi::Result<()> {
    let message = custom_message.unwrap_or_else(|| "Test error".to_string());
    match error_type.as_str() {
        "ArgumentError" => Err(js_typed_error(&message, ErrorType::ArgumentError)),
        "AuthenticationError" => Err(js_typed_error(&message, ErrorType::AuthenticationError)),
        "BusyConnectionError" => Err(js_typed_error(&message, ErrorType::BusyConnectionError)),
        "DriverError" => Err(js_typed_error(&message, ErrorType::DriverError)),
        "DriverInternalError" => Err(js_typed_error(&message, ErrorType::DriverInternalError)),
        "NoHostAvailableError" => Err(js_typed_error(&message, ErrorType::NoHostAvailableError)),
        "NotSupportedError" => Err(js_typed_error(&message, ErrorType::NotSupportedError)),
        "ResponseError" => Err(js_typed_error(&message, ErrorType::ResponseError)),
        "Error" => Err(js_typed_error(&message, ErrorType::Error)),
        "RangeError" => Err(js_typed_error(&message, ErrorType::RangeError)),
        "ReferenceError" => Err(js_typed_error(&message, ErrorType::ReferenceError)),
        "SyntaxError" => Err(js_typed_error(&message, ErrorType::SyntaxError)),
        "TypeError" => Err(js_typed_error(&message, ErrorType::TypeError)),
        _ => Ok(()),
    }
}
