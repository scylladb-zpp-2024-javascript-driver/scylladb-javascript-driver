use std::net::{IpAddr, SocketAddr, SocketAddrV4, SocketAddrV6};

use async_trait::async_trait;

use scylla::{
    errors::TranslationError,
    policies::address_translator::{AddressTranslator, UntranslatedPeer},
};

#[napi]
pub enum AddressTranslatorPolicies {
    CustomPolicy,
    EC2MultiRegion,
}

pub struct EC2MultiRegionTranslator {}

#[async_trait]
impl AddressTranslator for EC2MultiRegionTranslator {
    async fn translate_address(
        &self,
        untranslated_peer: &UntranslatedPeer,
    ) -> Result<SocketAddr, TranslationError> {
        let translation = async move || {
            let reverse_lookup =
                dns_lookup::lookup_addr(&untranslated_peer.untranslated_address().ip())
                    .map_err(|e| TranslationError::IoError(e.into()))?;
            let looked_up = dns_lookup::lookup_host(&reverse_lookup)
                .map_err(|e| TranslationError::IoError(e.into()))?
                .nth(1);
            match looked_up {
                Some(IpAddr::V4(ipv4)) => Ok(SocketAddr::V4(SocketAddrV4::new(
                    ipv4,
                    untranslated_peer.untranslated_address().port(),
                ))),
                Some(IpAddr::V6(ipv4)) => Ok(SocketAddr::V6(SocketAddrV6::new(
                    ipv4,
                    untranslated_peer.untranslated_address().port(),
                    0,
                    0,
                ))),
                None => Err(TranslationError::IoError(
                    std::io::Error::other(format!(
                        "Could not resolve secondary IP for {}",
                        untranslated_peer.untranslated_address()
                    ))
                    .into(),
                )),
            }
        };
        match translation().await {
            Ok(addr) => Ok(addr),
            Err(_) => {
                // TODO: In the initial implementation, this address policy could have been inherited,
                // to allow logging of translation failures. This has to be adapted, probably by calling a callback,
                // to the user provided logging function.
                //
                // On the other hand, we may consider a policy with an overridden logging method, as a fully custom policy.
                // This will be a simpler solution, as it would not require distinguishing between
                // inherited policies with only logging overridden
                // and policies with custom translation logic (ex. some logic + calling the super translation method).

                // Initial policy returned untranslated address on failure.
                Ok(untranslated_peer.untranslated_address())
            }
        }
    }
}
