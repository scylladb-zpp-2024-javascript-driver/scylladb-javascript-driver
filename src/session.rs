use scylla::{transport::SelfIdentity, Session, SessionBuilder};

use crate::{
    options::{self},
    result::QueryResultWrapper,
    utils::err_to_napi,
};

#[napi]
pub struct SessionOptions {
    pub connect_points: Vec<String>,
    pub application_name: Option<String>,
    pub application_version: Option<String>,
    pub credentials_username: Option<String>,
    pub credentials_password: Option<String>,
}

#[napi]
pub struct SessionWrapper {
    internal_session: Session,
}

#[napi]
impl SessionOptions {
    #[napi]
    pub fn empty() -> Self {
        SessionOptions {
            connect_points: vec![],
            application_name: None,
            application_version: None,
            credentials_username: None,
            credentials_password: None,
        }
    }
}

#[napi]
impl SessionWrapper {
    #[napi]
    pub async fn create_session(options: &SessionOptions) -> napi::Result<Self> {
        let builder = configure_session_builder(options);
        let session = builder.build().await.map_err(err_to_napi)?;
        Ok(SessionWrapper {
            internal_session: session,
        })
    }

    #[napi]
    pub async fn query_unpaged_no_values(&self, query: String) -> napi::Result<QueryResultWrapper> {
        let query = self
            .internal_session
            .query_unpaged(query, &[])
            .await
            .map_err(err_to_napi)?;
        Ok(QueryResultWrapper::from_query(query))
    }
}

fn configure_session_builder(options: &SessionOptions) -> SessionBuilder {
    let mut builder = SessionBuilder::new();
    builder = builder.custom_identity(get_self_identity(options));
    builder = builder.known_nodes(&options.connect_points);
    if let (Some(username), Some(password)) = (
        options.credentials_username.as_ref(),
        options.credentials_password.as_ref(),
    ) {
        builder = builder.user(username, password);
    }
    builder
}

fn get_self_identity(options: &SessionOptions) -> SelfIdentity<'static> {
    let mut self_identity = SelfIdentity::new();
    self_identity.set_custom_driver_name(options::DEFAULT_DRIVER_NAME);
    self_identity.set_application_version(options::DEFAULT_DRIVER_VERSION);
    if let Some(app_name) = &options.application_name {
        self_identity.set_application_name(app_name.clone());
    }
    if let Some(app_version) = &options.application_name {
        self_identity.set_application_version(app_version.clone());
    }
    self_identity
}
