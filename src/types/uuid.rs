use napi::{Error, Status, bindgen_prelude::Buffer, bindgen_prelude::BufferSlice};
use uuid::Uuid;

#[napi]
pub struct UuidWrapper {
    uuid: Uuid,
}

#[napi]
impl UuidWrapper {
    #[napi]
    pub fn new(buffer: BufferSlice) -> napi::Result<Self> {
        match Uuid::from_slice(buffer.as_ref()) {
            Err(_) => Err(Error::new(Status::InvalidArg, "Invalid uuid buffer")),
            Ok(uuid) => Ok(Self { uuid }),
        }
    }

    #[napi]
    pub fn get_buffer(&self) -> Buffer {
        Buffer::from(self.uuid.as_bytes().to_vec())
    }
}

impl UuidWrapper {
    pub fn from_cql_uuid(uuid: Uuid) -> Self {
        UuidWrapper { uuid }
    }
    pub fn get_cql_uuid(&self) -> Uuid {
        self.uuid
    }
}
