use std::cmp::min;

use napi::{bindgen_prelude::Buffer, Status};
use scylla::frame::value::{CqlDuration, Value};

#[napi]
// Will PartialEq or Eq be exposed to napi?
#[derive(Clone, Debug, Copy, PartialEq, Eq)]
pub struct Duration {
  internal: CqlDuration,
}

const LONG_ONE_THOUSAND: i64 = 1000;
const NANOS_PER_MICRO: i64 = LONG_ONE_THOUSAND;
const NANOS_PER_MILLI: i64 = LONG_ONE_THOUSAND * NANOS_PER_MICRO;
const NANOS_PER_SECOND: i64 = LONG_ONE_THOUSAND * NANOS_PER_MILLI;
const NANOS_PER_MINUTE: i64 = 60 * NANOS_PER_SECOND;
const NANOS_PER_HOUR: i64 = 60 * NANOS_PER_MINUTE;
const MONTHS_PER_YEAR: i32 = 12;

#[napi]
impl Duration {
  #[napi]
  pub fn new(months: i32, days: i32, nanoseconds: i64) -> Self {
    Duration {
      internal: CqlDuration {
        months,
        days,
        nanoseconds,
      },
    }
  }

  #[napi]
  pub fn to_buffer(&self) -> Buffer {
    let months = self.internal.months.to_ne_bytes();
    let months = months.as_slice();

    let days = self.internal.days.to_ne_bytes();
    let days = days.as_slice();

    let nanoseconds = self.internal.nanoseconds.to_ne_bytes();
    let nanoseconds = nanoseconds.as_slice();
    [months, days, nanoseconds].concat().into()
  }

  #[napi]
  #[allow(clippy::inherent_to_string)]
  pub fn to_string(&self) -> String {
    let reminder = self.internal.nanoseconds.abs();

    let hours = reminder / NANOS_PER_HOUR;
    let reminder = reminder % NANOS_PER_HOUR;

    let minutes = reminder / NANOS_PER_MINUTE;
    let reminder = reminder % NANOS_PER_MINUTE;

    let seconds = reminder / NANOS_PER_SECOND;
    let reminder = reminder % NANOS_PER_SECOND;

    let milliseconds = reminder / NANOS_PER_MILLI;
    let reminder = reminder % NANOS_PER_MILLI;

    let microseconds = reminder / NANOS_PER_MICRO;
    let reminder = reminder % NANOS_PER_MICRO;
    let negative_part = if min(
      self.internal.nanoseconds,
      min(self.internal.days, self.internal.months).into(),
    ) < 0
    {
      "-"
    } else {
      ""
    };

    let days_part: String = format!(
      "{}y{}mo{}d",
      self.internal.months.abs() / MONTHS_PER_YEAR,
      self.internal.months.abs() % MONTHS_PER_YEAR,
      self.internal.days.abs(),
    );

    let ns_part: String = if self.internal.nanoseconds > 0 {
      format!(
        "{}h{}m{}s{}ms{}us{}ns",
        hours, minutes, seconds, milliseconds, microseconds, reminder
      )
    } else {
      "".into()
    };

    format!("{}{}{}", negative_part, days_part, ns_part)
  }

  #[napi]
  // Consider BufferRef
  pub fn from_buffer(buffer: Buffer) -> napi::Result<Duration> {
    let tmp = Duration::new(0, 0, 0);
    let arg: Vec<u8> = buffer.into();
    tmp
      .internal
      .serialize(&mut arg.clone())
      .map_err(|e| napi::Error::new(Status::GenericFailure, format!("{}", e)))?;
    Ok(tmp)
  }
}
