use std::fmt::Display;

use napi::{Error, Status};

pub fn js_generic_err(msg: impl Display) -> Error<Status> {
  Error::new(Status::GenericFailure, msg)
}
