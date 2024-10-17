use napi::{bindgen_prelude::Buffer, Status};
use scylla::frame::value::{CqlDuration, Value};

#[napi]
// Will PartialEq or Eq be exposed to napi?
#[derive(Clone, Debug, Copy, PartialEq, Eq)]
pub struct Duration {
    internal: CqlDuration,
}

#[napi]
impl Duration {
    #[napi]
    pub fn new(months: i32, days: i32, ns1: i64, ns2: i64, filler: i64) -> Self {
        let nanoseconds = ns1 + ns2 * filler;
        Duration {
            internal: CqlDuration {
                months,
                days,
                nanoseconds,
            },
        }
    }

    #[napi]
    pub fn get_object(&self) -> napi::Result<Vec<i64>> {
        let re: i64 = i32::MAX.into();
        // println!("ns in rust: {}", self.internal.nanoseconds);
        Ok(vec![
            self.internal.months.into(),
            self.internal.days.into(),
            (self.internal.nanoseconds / re),
            (self.internal.nanoseconds % re),
            re,
        ])
    }

    #[napi]
    // Consider BufferRef
    pub fn from_buffer(buffer: Buffer) -> napi::Result<Duration> {
        let tmp = Duration::new(2, 0, 0, 0, 0);
        let arg: Vec<u8> = buffer.into();
        tmp.internal
            .serialize(&mut arg.clone())
            .map_err(|e| napi::Error::new(Status::GenericFailure, format!("{}", e)))?;
        Ok(tmp)
    }
}
