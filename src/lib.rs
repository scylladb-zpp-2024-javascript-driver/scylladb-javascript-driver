use scylla::SessionBuilder;

#[macro_use]
extern crate napi_derive;

// Just a basic function to test if we can run the rust driver
// Will return "Success" only if connects to running scylla database
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

// Link other file
pub mod auth;
pub mod result;
pub mod session;
