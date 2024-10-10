#![allow(dead_code)]

use scylla::SessionBuilder;

#[macro_use]
extern crate napi_derive;

#[napi]
pub async fn test_connection(uri: String) -> String {

  println!("Connecting to {} ...", uri);

  match SessionBuilder::new().known_node(uri).build().await {
    Ok(data) => data,
    Err(_) => {
      return "Error".to_string();
    }
  };
  "Success".to_string()
}

pub mod auth;
