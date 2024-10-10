
#[napi(js_name = "PlainTextAuthProvider")]
pub struct PlainTextAuthProvider {
  id: u32,
  internal: scylla::SessionBuilder
}


#[napi]
impl PlainTextAuthProvider {
  #[napi(constructor)]
  pub fn new() -> Self {
    println!("Plain text constructor!");
    PlainTextAuthProvider { id: 10, internal: scylla::SessionBuilder::new() }
  }
}
