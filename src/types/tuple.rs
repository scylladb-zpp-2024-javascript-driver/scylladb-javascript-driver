use std::usize;

use napi::bindgen_prelude::{Array, Env, Unknown};
use crate::utils::js_error;

#[napi]
pub struct TupleWrapper {
    js_values: Array,
}

#[napi]
impl TupleWrapper {
    #[napi]
    pub fn new(js_values: Array) -> napi::Result<Self> {
        if js_values.len() == 0 {
            return Err(js_error("Tuple must have at least one element"));
        }
        if js_values.len() > 16 {
            return Err(js_error("Tuple cannot have more than 16 elements"));
        }

        Ok(TupleWrapper {
            js_values,
        })
    }

    #[napi]
    pub fn get(&self, env: Env, index: u32) -> napi::Result<Unknown> {
        self.js_values
            .get(index)
            .map(|v| 
                v.unwrap_or_else(|| 
                    env
                        .get_null()
                        .unwrap()
                        .into_unknown()
                )
            )
    }
}