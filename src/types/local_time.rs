use core::fmt;
use napi::bindgen_prelude::BigInt;
use scylla::frame::value::CqlTime;

use crate::utils::bigint_to_i64;

const NANO_SEC_IN_SEC: i64 = 1000000000;

#[napi]
pub struct LocalTimeWrapper {
    pub value: BigInt,
    pub hour: i64,
    pub minute: i64,
    pub second: i64,
    pub nanosecond: i64,
    ns_value: i64,
}

#[napi]
impl LocalTimeWrapper {
    fn convert_to_object(ns_value: i64) -> Self {
        let mut second: i64 = ns_value / NANO_SEC_IN_SEC;
        let nanosecond: i64 = ns_value - (second * NANO_SEC_IN_SEC);

        let mut minute = second / 60;
        let hour = minute / 60;

        second %= 60;
        minute %= 60;

        LocalTimeWrapper {
            value: BigInt::from(ns_value),
            hour,
            minute,
            second,
            nanosecond,
            ns_value,
        }
    }

    #[napi]
    pub fn new(total_nanoseconds: BigInt) -> napi::Result<Self> {
        let ns_value = bigint_to_i64(total_nanoseconds, "Nanoseconds must not overflow i64")?;

        Ok(Self::convert_to_object(ns_value))
    }

    //format: hh:MM:ss.ns
    #[napi(js_name = "toString")]
    pub fn to_format(&self) -> String {
        self.to_string()
    }

    pub fn get_cql_time(&self) -> CqlTime {
        CqlTime(self.ns_value)
    }

    pub fn from_cql_time(time: CqlTime) -> Self {
        Self::convert_to_object(time.0)
    }
}

impl fmt::Display for LocalTimeWrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}:{}:{}{}",
            if self.hour < 10 {
                format!("0{}", self.hour)
            } else {
                self.hour.to_string()
            },
            if self.minute < 10 {
                format!("0{}", self.minute)
            } else {
                self.minute.to_string()
            },
            if self.second < 10 {
                format!("0{}", self.second)
            } else {
                self.second.to_string()
            },
            if self.nanosecond > 0 {
                let zeros = 9 - self.nanosecond.to_string().chars().count();
                let mut nanos = self.nanosecond;
                while nanos % 10 == 0 {
                    nanos /= 10;
                }
                format!(".{}{}", "0".repeat(zeros), nanos)
            } else {
                "".to_string()
            }
        )
    }
}
