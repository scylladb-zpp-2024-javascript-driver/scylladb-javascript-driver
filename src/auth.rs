// This is separate file, but still compiles into the library

#[napi(js_name = "PlainTextAuthProvider")]
pub struct PlainTextAuthProvider {
  // If we use pub, given attribute is accessible in JS:
  pub id: u32,
  // Not all attributes can be public:
  /* pub <- CE */
  internal: scylla::SessionBuilder,
  /* If a given object can't be translated into js, it can still be
  in a class exposed to JS, but cannot be public. It's also not visible in the
  definition in ts file. This **suggests** if we crete an object of this class,
  and pass it to JS, it's treated as a pointer to this object in rust*/
  // !!!It's best to test it a bit more before assuming it's true!!!
}

// yup. If you are running rust-analyzer in VSCode, this impl with constructor will show errors.
// (https://github.com/rust-lang/rust-analyzer/issues/14233)
// It should be possible to disable this errors, but apparently no way to fix it...
// But this is small enough error, to just don't expose constructors as constructors
#[napi]
impl PlainTextAuthProvider {
  #[napi]
  // #[napi(constructor)]
  pub fn new() -> Self {
    println!("Plain text constructor!");
    PlainTextAuthProvider {
      id: 10,
      internal: scylla::SessionBuilder::new(),
    }
  }

  #[napi]
  pub fn test(&self) -> u32 {
    println!("Plain text function!: accessing internal: {}",self.internal.config.disallow_shard_aware_port);
    1
  }
}

impl Default for PlainTextAuthProvider {
  fn default() -> Self {
    Self::new()
  }
}
