use crate::utils::js_error;
use napi::bindgen_prelude::{Array, Env, Unknown};

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

        Ok(TupleWrapper { js_values })
    }

    #[napi]
    pub fn get_length(&self) -> u32 {
        self.js_values.len()
    }

    #[napi]
    pub fn get_js_values(&self, env: Env) -> napi::Result<Array> {
        let js_array = env.create_array_with_length(self.js_values.len() as usize)?;

        for (i, value) in self.js_values.iter().enumerate() {
            js_array.set_element(i as u32, value)?;
        }

        Ok(js_array)
    }

    #[napi]
    pub fn get(&self, env: Env, index: u32) -> napi::Result<Unknown> {
        self.js_values
            .get(index)
            .map(|v| v.unwrap_or_else(|| env.get_null().unwrap().into_unknown()))
    }
}
