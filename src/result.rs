use scylla::{frame::response::result::CqlValue, QueryResult};

use crate::utils::js_error;

#[napi]
pub struct QueryResultWrapper {
    internal: QueryResult,
}

#[napi]
pub struct RowWrapper {
    internal: Vec<Option<CqlValue>>,
}

#[napi]
pub struct CqlValueWrapper {
    internal: CqlValue,
}

#[napi]
impl QueryResultWrapper {
    pub fn from_query(_internal: QueryResult) -> QueryResultWrapper {
        let x = _internal;
        QueryResultWrapper { internal: x }
    }

    #[napi]
    pub fn get_rows(&self) -> napi::Result<Vec<RowWrapper>> {
        let rows = match &self.internal.rows {
            Some(r) => r,
            None => {
                return Err(js_error("No rows"));
            }
        };

        Ok(rows
            .iter()
            .map(|f| RowWrapper {
                internal: f.columns.clone(),
            })
            .collect())
    }
}

#[napi]
impl RowWrapper {
    #[napi]
    pub fn get_columns(&self) -> napi::Result<Vec<CqlValueWrapper>> {
        let s: Vec<CqlValueWrapper> = self
            .internal
            .iter()
            .filter_map(|f| {
                f.as_ref().map(|r| CqlValueWrapper {
                    internal: r.clone(),
                })
            })
            .collect();
        Ok(s)
    }
}

#[napi]
impl CqlValueWrapper {
    #[napi]
    pub fn stringify(&self) -> String {
        format!("{:?}", self.internal)
    }
}
