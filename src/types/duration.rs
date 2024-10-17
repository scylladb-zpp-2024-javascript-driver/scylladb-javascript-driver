use napi::bindgen_prelude::BigInt;

use crate::utils::js_error;

#[napi]
// Will PartialEq or Eq be exposed to napi?
#[derive(Clone, Debug, Copy, PartialEq, Eq)]
pub struct Duration {
    pub months: i32,
    pub days: i32,
    pub nanoseconds: i64,
}

#[napi]
impl Duration {
    #[napi]
    pub fn new(months: i32, days: i32, ns_bigint: BigInt) -> napi::Result<Self> {
        let ns = ns_bigint.get_i64();
        if !ns.1 {
            return Err(js_error("Invalid use: Should not happen?"));
        }
        let nanoseconds: i64 = ns.0
            * if ns_bigint.sign_bit && ns.0 > 0 {
                -1
            } else {
                1
            };
        Ok(Duration {
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
