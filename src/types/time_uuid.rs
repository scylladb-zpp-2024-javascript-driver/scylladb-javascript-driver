use napi::bindgen_prelude::Buffer;
use scylla::frame::value::CqlTimeuuid;

use super::uuid::UuidWrapper;

#[napi]
pub struct TimeUuidWrapper {
    uuid: UuidWrapper,
}

#[napi]
impl TimeUuidWrapper {
    #[napi]
    pub fn get_buffer(&self) -> Buffer {
        Buffer::from(self.uuid.get_cql_uuid().into_bytes().to_vec())
    }
}

impl TimeUuidWrapper {
    pub fn from_cql_time_uuid(time_uuid: CqlTimeuuid) -> Self {
        TimeUuidWrapper {
            uuid: UuidWrapper::from_cql_uuid(*time_uuid.as_ref()),
        }
    }
    pub fn get_cql_time_uuid(&self) -> CqlTimeuuid {
        CqlTimeuuid::from_bytes(self.uuid.get_cql_uuid().into_bytes())
    }
}
