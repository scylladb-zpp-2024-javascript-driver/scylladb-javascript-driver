#![deny(clippy::all)]

use scylla::SessionBuilder;

#[macro_use]
extern crate napi_derive;

#[napi]
pub async fn test_connection(uri: String) -> String {

  println!("Connecting to {} ...", uri);

  match SessionBuilder::new().known_node(uri).build().await {
    Ok(data) => data,
    Err(_) => {
      return "ErrorXD".to_string();
    }
  };
  "Success".to_string()
}
