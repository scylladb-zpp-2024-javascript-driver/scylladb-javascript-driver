use napi::{bindgen_prelude::Buffer, Error, Status};
use scylla::frame::response::result::CqlValue;
use std::net::IpAddr;
#[napi]
pub struct InetAddressWrapper {
    inet: IpAddr,
}

#[napi]
impl InetAddressWrapper {
    #[napi]
    pub fn new(buffer: Buffer) -> napi::Result<Self> {
        let buffer: Vec<u8> = buffer.into();
        if buffer.len() == 4 {
            let mut ip = [0u8; 4];
            ip.copy_from_slice(&buffer);
            Ok(Self {
                inet: IpAddr::from(ip),
            })
        } else if buffer.len() == 16 {
            let mut ip = [0u8; 16];
            ip.copy_from_slice(&buffer);
            Ok(Self {
                inet: IpAddr::from(ip),
            })
        } else {
            return Err(Error::new(
                Status::GenericFailure,
                "Invalid IP address length",
            ));
        }
    }

    #[napi]
    pub fn get_length(&self) -> napi::Result<u32> {
        Ok(match self.inet {
            IpAddr::V4(_) => 4,
            IpAddr::V6(_) => 16,
        })
    }

    #[napi]
    pub fn get_version(&self) -> napi::Result<u32> {
        Ok(match self.inet {
            IpAddr::V4(_) => 4,
            IpAddr::V6(_) => 6,
        })
    }

    #[napi]
    pub fn get_buffer(&self) -> napi::Result<Buffer> {
        let buffer = match self.inet {
            IpAddr::V4(ip) => ip.octets().to_vec(),
            IpAddr::V6(ip) => ip.octets().to_vec(),
        };
        Ok(Buffer::from(buffer))
    }
}

impl InetAddressWrapper {
    pub fn from_cql_value(value: CqlValue) -> Result<Self, Error> {
        match value {
            CqlValue::Inet(inet) => Ok(Self { inet }),
            _ => Err(Error::new(
                Status::GenericFailure,
                "Invalid CqlValue type for InetAddress",
            )),
        }
    }
}
