use scylla::frame::value::CqlValue;

type CqlTuple = Vec<Option<CqlValue>>;

#[napi]
pub struct TupleWrapper {
    pub inner: CqlTuple,
}

#[napi]
impl TupleWrapper {
    #[napi]
    pub fn new() -> napi::Result<Self> {
        Ok(TupleWrapper {
            inner: 0,
        })
    }

    #[napi]
    pub fn get_something() {

    }
}

impl TupleWrapper {
    pub fn from_cql_tuple(tuple: CqlTuple) -> Self {
        TupleWrapper {
            inner: tuple
        }
    }
    pub fn get_cql_tuple(&self) -> CqlTuple {
        inner.clone()
    }
}
