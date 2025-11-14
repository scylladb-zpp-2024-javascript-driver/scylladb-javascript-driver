use tokio::task::JoinSet;

use crate::errors::{err_to_napi, js_error};

pub(crate) struct LimitedJoinSet<T> {
    in_flight: usize,
    max_in_flight: usize,
    started: usize,
    res: Vec<Option<T>>,
    join_set: JoinSet<(T, usize)>,
}

impl<T> LimitedJoinSet<T>
where
    T: Send + 'static,
{
    pub(crate) fn new(no_tasks: usize, max_in_flight: usize) -> Self {
        let mut vec = Vec::with_capacity(no_tasks);
        // With no guarantees on T, we have to extend the result vector manually
        for _ in 0..no_tasks {
            vec.push(None);
        }
        LimitedJoinSet {
            in_flight: 0,
            started: 0,
            max_in_flight,
            res: vec,
            join_set: JoinSet::new(),
        }
    }

    async fn await_task(&mut self) -> napi::Result<()> {
        let (res, i) = self
            .join_set
            .join_next()
            .await
            .ok_or(js_error("Expected some result"))?
            .map_err(err_to_napi)?;
        self.res[i] = Some(res);
        self.in_flight -= 1;
        Ok(())
    }

    pub(crate) async fn add_task<F>(&mut self, task: F) -> napi::Result<()>
    where
        F: Future<Output = T> + Send + 'static,
    {
        if self.in_flight >= self.max_in_flight {
            self.await_task().await?;
        }
        let task_id = self.started;
        self.join_set.spawn(async move { (task.await, task_id) });
        self.started += 1;
        self.in_flight += 1;
        Ok(())
    }

    pub(crate) async fn collect_results(mut self) -> napi::Result<Vec<T>> {
        while self.in_flight > 0 {
            self.await_task().await.map_err(err_to_napi)?
        }
        let expected_len = self.res.len();
        let res: Vec<T> = self.res.into_iter().flatten().collect();
        if res.len() != expected_len {
            return Err(js_error("Failed to collect all results"));
        }
        Ok(res)
    }
}
