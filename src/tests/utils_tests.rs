use napi::bindgen_prelude::BigInt;

use crate::utils::{self, bigint_to_i64};

#[napi]
pub fn tests_bigint_to_i64(value: BigInt, case: Option<i32>) -> napi::Result<()> {
    let case = match case {
        Some(case) => case,
        None => {
            return utils::bigint_to_i64(value, "Overflow expected").map(|_| ());
        }
    };

    let expected = match case {
        0 => 0,
        1 => -1,
        2 => 5,
        3 => -5,
        4 => i64::MAX,
        5 => i64::MIN,
        6 => i64::MIN + 1,
        _ => 0,
    };

    let value = bigint_to_i64(value, "Overflow not expected");
    match value {
        Ok(v) => {
            if v == expected {
                Ok(())
            } else {
                Err(utils::js_error(format!("Got {}, expected{}", v, expected)))
            }
        }
        Err(e) => Err(e),
    }
}
