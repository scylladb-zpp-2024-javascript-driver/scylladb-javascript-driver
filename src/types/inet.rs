use napi::{Error, Status};

#[napi]
pub struct InetAddress {
    pub length: u32,
    pub version: u32,
    buffer: Vec<u8>,
}

#[napi]
impl InetAddress {
    #[napi]
    pub fn new(buffer: Vec<u8>) -> napi::Result<Self> {
        if buffer.len() != 4 && buffer.len() != 16 {
            return Err(Error::new(
                Status::GenericFailure,
                "Invalid IP address length",
            ));
        }
        
        let length = buffer.len() as u32;
        let version = if length == 4 { 4 } else { 6 };
        Ok(Self {
            length,
            version,
            buffer,
        })
    }

    #[napi]
    pub fn toString(&self) -> napi::Result<String> {
        // Warning: removing backward compatibility, used to have one string parameter for printing in hex. 
        let mut result = String::new();
        if self.length == 4 {
            for i in 0..self.length {
                result.push_str(&self.buffer[i].to_string());
                if i < self.length - 1 {
                    result.push_str(".");
                }
            }
        } else if self.length == 16 {
            // TODO: Remove the longest group of zeros
            for i in 0..self.length {
                result.push_str(&format!("{:02x}", self.buffer[i]));
                if i < self.length - 1 {
                    result.push_str(":");
                }
            }
        } else {
            return Err(Error::new(
                Status::GenericFailure,
                "Invalid IP address length",
            ));
        }
        Ok(result)
    }
}