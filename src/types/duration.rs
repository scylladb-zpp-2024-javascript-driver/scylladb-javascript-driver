use napi::{bindgen_prelude::BigInt, Error, Status};
use scylla::frame::value::CqlDuration;

#[napi]
pub struct DurationWrapper {
  pub months: i32,
  pub days: i32,
  pub nanoseconds: i64,
}

#[napi]
impl DurationWrapper {
  #[napi]
  pub fn new(months: i32, days: i32, ns_bigint: BigInt) -> napi::Result<Self> {
    let ns = ns_bigint.get_i64();
    if !ns.1 {
      return Err(Error::new(
        Status::GenericFailure,
        "Invalid use: Should not happen?",
      ));
    }
    let nanoseconds: i64 = ns.0
      * if ns_bigint.sign_bit && ns.0 > 0 {
        -1
      } else {
        1
      };
    Ok(DurationWrapper {
      months,
      days,
      nanoseconds,
    })
  }

  #[napi]
  pub fn get_nanoseconds(&self) -> BigInt {
    let tmp: i128 = self.nanoseconds.into();
    let mut res: BigInt = BigInt::from(tmp.abs());
    res.sign_bit = self.nanoseconds < 0;
    res
  }
}

impl DurationWrapper {
  pub fn from_cql_duration(duration: CqlDuration) -> Self {
    DurationWrapper {
      months: duration.months,
      days: duration.days,
      nanoseconds: duration.nanoseconds,
    }
  }
  pub fn get_cql_duration(&self) -> CqlDuration {
    CqlDuration {
      months: self.months,
      days: self.days,
      nanoseconds: self.nanoseconds,
    }
  }
}
