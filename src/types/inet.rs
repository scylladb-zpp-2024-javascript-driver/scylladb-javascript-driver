use crate::utils::js_error;
use napi::bindgen_prelude::{Buffer, BufferSlice};
use std::net::IpAddr;

#[napi]
pub struct InetAddressWrapper {
    inet: IpAddr,
}

#[napi]
impl InetAddressWrapper {
    #[napi]
    pub fn new(buffer: BufferSlice) -> napi::Result<Self> {
        let buffer = buffer.as_ref();
        if let Ok(arr) = <[u8; 4]>::try_from(buffer) {
            Ok(Self {
                inet: IpAddr::from(arr),
            })
        } else if let Ok(arr) = <[u8; 16]>::try_from(buffer) {
            Ok(Self {
                inet: IpAddr::from(arr),
            })
        } else {
            Err(js_error("Invalid IP address length"))
        }
    }

    #[napi]
    pub fn get_length(&self) -> u32 {
        match self.inet {
            IpAddr::V4(_) => 4,
            IpAddr::V6(_) => 16,
        }
    }

    #[napi]
    pub fn get_version(&self) -> u32 {
        match self.inet {
            IpAddr::V4(_) => 4,
            IpAddr::V6(_) => 6,
        }
    }

    #[napi]
    pub fn get_buffer(&self) -> Buffer {
        let buffer = match self.inet {
            IpAddr::V4(ip) => ip.octets().to_vec(),
            IpAddr::V6(ip) => ip.octets().to_vec(),
        };
        Buffer::from(buffer)
    }
}

impl InetAddressWrapper {
    pub fn from_ip_addr(inet: IpAddr) -> Self {
        Self { inet }
    }
    pub fn get_ip_addr(&self) -> IpAddr {
        self.inet
    }
}
