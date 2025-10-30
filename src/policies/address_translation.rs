use std::{net::SocketAddr, sync::Arc};

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

/// This is rust version the the EC2MultiRegionTranslator policy.
/// See JS implementation for more details on this policy and it's implementation.
pub struct EC2MultiRegionTranslator {}

#[async_trait]
impl AddressTranslator for EC2MultiRegionTranslator {
    async fn translate_address(
        &self,
        untranslated_peer: &UntranslatedPeer,
    ) -> Result<SocketAddr, TranslationError> {
        let translation = async move || {
            let ip = untranslated_peer.untranslated_address().ip();
            let reverse_lookup = tokio::task::spawn_blocking(move || {
                dns_lookup::lookup_addr(&ip).map_err(|e| TranslationError::IoError(e.into()))
            })
            .await
            .map_err(|e| TranslationError::IoError(Arc::new(e.into())))??;
            let host =
                reverse_lookup + ":" + &untranslated_peer.untranslated_address().port().to_string();
            let looked_up = tokio::net::lookup_host(&host)
                .await
                .map_err(|e| TranslationError::IoError(e.into()))?
                .next();
            match looked_up {
                Some(SocketAddr::V4(ipv4)) => Ok(SocketAddr::V4(ipv4)),
                Some(SocketAddr::V6(ipv6)) => Ok(SocketAddr::V6(ipv6)),
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
