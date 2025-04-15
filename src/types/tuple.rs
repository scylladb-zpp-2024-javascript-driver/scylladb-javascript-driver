use crate::{result::CqlValueWrapper, utils::js_error};
use scylla::value::CqlValue;

#[napi]
pub struct TupleWrapper {
    // If values == None, then Tuple is stored in JS part,
    // as it is not possible to convert it to Rust without knowing expected types
    values: Option<Vec<Option<CqlValue>>>,
}

#[napi]
impl TupleWrapper {
    #[napi]
    pub fn new() -> napi::Result<Self> {
        Ok(TupleWrapper { values: None })
    }

    #[napi]
    pub fn get_all(&self) -> napi::Result<Vec<Option<CqlValueWrapper>>> {
        self.values
            .as_ref()
            .ok_or_else(|| js_error("Values are stored in JS"))
            .map(|values| {
                values
                    .iter()
                    .map(|v| v.as_ref().map(|v| CqlValueWrapper { inner: v.clone() }))
                    .collect()
            })
    }

    pub fn from_cql_tuple(values: Vec<Option<CqlValue>>) -> Self {
        TupleWrapper {
            values: Some(values),
        }
    }
}
