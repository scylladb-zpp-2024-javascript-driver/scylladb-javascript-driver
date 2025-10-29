use napi::bindgen_prelude::Buffer;

use crate::session::SessionWrapper;

#[napi]
pub struct HostWrapper {
    pub host_id: Buffer,
    pub address: String,
    pub datacenter: Option<String>,
    pub rack: Option<String>,
}

#[napi]
impl SessionWrapper {
    /// Due to using Napi structs, this endpoint is not very efficient.
    /// It should be retrieved lazily, whenever user requests information about hosts.
    #[napi]
    pub fn get_all_hosts(&self) -> Vec<HostWrapper> {
        self.inner
            .get_session()
            .get_cluster_state()
            .get_nodes_info()
            .iter()
            .map(|node| HostWrapper {
                host_id: Buffer::from(node.host_id.as_bytes().as_slice()),
                address: node.address.to_string(),
                datacenter: node.datacenter.clone(),
                rack: node.rack.clone(),
            })
            .collect()
    }
}
