use scylla::{
    response::{PagingState, PagingStateResponse, query_result::QueryResult},
    statement::Statement,
};
use tokio::sync::Semaphore;

use crate::{
    errors::{err_to_napi, js_error},
    paging::PagingResult,
    requests::request::QueryOptionsWrapper,
    result::QueryResultWrapper,
    session::{SessionWrapper, apply_statement_options},
    types::encoded_data::EncodedValuesWrapper,
    utils::limited_join_set::LimitedJoinSet,
};

#[napi]
pub struct ConcurrentTask {
    limit: usize,
    // We want to avoid having just a single execute_multiple_single_page_encoded at 1 time,
    // as this would introduce a bottleneck for parameters serialization / deserialization.
    // Therefore we allow up to 4 concurrent calls, each having their quarter of the total in flight requests limit.
    // And we place the critical section only for the part that contacts the database.
    wait: Semaphore,
}

#[napi]
impl ConcurrentTask {
    #[napi]
    pub fn new(limit: u32) -> Self {
        if limit < 4 {
            Self {
                limit: limit as usize,
                wait: Semaphore::new(1),
            }
        } else {
            Self {
                limit: (limit / 4) as usize,
                wait: Semaphore::new(4),
            }
        }
    }
}

#[napi]
impl SessionWrapper {
    #[napi]
    pub async fn execute_multiple_single_page_encoded(
        &self,
        query: Vec<String>,
        params: Vec<Vec<EncodedValuesWrapper>>,
        options: &QueryOptionsWrapper,
        concurrent_task: &ConcurrentTask,
    ) -> napi::Result<Vec<napi::Result<PagingResult>>> {
        if query.len() != params.len() {
            return Err(js_error("Query length should match parameters length"));
        }
        let mut set = LimitedJoinSet::<napi::Result<(QueryResult, PagingStateResponse)>>::new(
            query.len(),
            concurrent_task.limit,
        );
        let query = query
            .into_iter()
            .map(|e| apply_statement_options(e.into(), &options.options))
            .collect::<Vec<napi::Result<Statement>>>();

        let tasks = query
            .into_iter()
            .zip(params.into_iter())
            .map(|(query, params)| {
                let session = self.inner.clone();
                async move {
                    let query = query.map_err(err_to_napi)?;
                    session
                        .execute_single_page(query, params, PagingState::start())
                        .await
                        .map_err(err_to_napi)
                }
            });
        // Above, we do not call the rust driver (yet). We only prepare the tasks to be executed.
        let guard = concurrent_task.wait.acquire().await.unwrap();
        for task in tasks {
            set.add_task(task).await?;
        }
        let res = set.collect_results().await?;
        drop(guard);
        Ok(res
            .into_iter()
            .map(|res| -> napi::Result<PagingResult> {
                let (result, page_state) = res.map_err(err_to_napi)?;
                Ok(PagingResult {
                    result: QueryResultWrapper::from_query(result)?,
                    paging_state: page_state.into(),
                })
            })
            .collect())
    }
}
