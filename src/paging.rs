use napi::bindgen_prelude::FromNapiValue;
use scylla::response::{PagingState, PagingStateResponse};

use crate::{result::QueryResultWrapper, utils::js_error};

#[napi]
pub struct PagingStateWrapper {
    pub(crate) inner: PagingState,
}

#[napi]
pub struct PagingStateResponseWrapper {
    inner: PagingStateResponse,
}

impl From<PagingStateResponse> for PagingStateResponseWrapper {
    fn from(value: PagingStateResponse) -> Self {
        PagingStateResponseWrapper { inner: value }
    }
}

/// Instead of using this object, we could return tuple of values.
/// This object can be used as a read only.
///
/// But, this can be only done in NAPI 3.0 which we are not using at the moment
#[napi(object)]
pub struct PagingResult {
    pub result: QueryResultWrapper,
    pub paging_state: PagingStateResponseWrapper,
}

/// This trait is required for PagingResult object.
/// This trait shout not be used -- setting a value of PagingStateResponseWrapper type
/// from any JS object will result in an error
impl FromNapiValue for PagingStateResponseWrapper {
    unsafe fn from_napi_value(
        _: napi::sys::napi_env,
        _: napi::sys::napi_value,
    ) -> napi::Result<Self> {
        unimplemented!("PagingStateResponseWrapper should not be used in this way!")
    }
}

/// This trait is required for PagingResult object.
/// This trait shout not be used -- setting a value of QueryResultWrapper type
/// from any JS object will result in an error
impl FromNapiValue for QueryResultWrapper {
    unsafe fn from_napi_value(
        _: napi::sys::napi_env,
        _: napi::sys::napi_value,
    ) -> napi::Result<Self> {
        unimplemented!("QueryResultWrapper should not be used in this way!")
    }
}

#[napi]
impl PagingStateResponseWrapper {
    /// Determines if the query has finished
    /// or it should be resumed with
    /// given PagingState in order to fetch next pages.
    #[napi]
    pub fn has_next_page(&self) -> bool {
        !self.inner.finished()
    }

    /// Get the next page of the given query, assuming there are pages left
    #[napi]
    pub fn next_page(&self) -> napi::Result<PagingStateWrapper> {
        Ok(PagingStateWrapper {
            inner: match &self.inner {
                PagingStateResponse::HasMorePages { state } => state.clone(),
                PagingStateResponse::NoMorePages => {
                    return Err(js_error("All pages transferred"));
                }
            },
        })
    }
}
