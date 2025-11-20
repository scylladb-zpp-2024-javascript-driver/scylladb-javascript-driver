"use strict";
const dns = require("dns");
const utils = require("../utils");
const rust = require("../../index");
/** @module policies/addressResolution */
/**
 * Translates IP addresses received from Cassandra nodes into locally queryable
 * addresses.
 *
 * The driver auto-detects new Cassandra nodes added to the cluster through server
 * side pushed notifications and through checking the system tables. For each
 * node, the address received will correspond to the address set as
 * `rpc_address` in the node yaml file. In most case, this is the correct
 * address to use by the driver and that is what is used by default. However,
 * sometimes the addresses received through this mechanism will either not be
 * reachable directly by the driver or should not be the preferred address to use
 * to reach the node (for instance, the `rpc_address` set on Cassandra nodes
 * might be a private IP, but some clients  may have to use a public IP, or
 * pass by a router to reach that node). This interface allows to deal with
 * such cases, by allowing to translate an address as sent by a Cassandra node
 * to another address to be used by the driver for connection.
 *
 * Please note that the contact points addresses provided while creating the
 * {@link Client} instance are not "translated", only IP address retrieve from or sent
 * by Cassandra nodes to the driver are.
 */
class AddressTranslator {
    constructor() {}
    /**
     * Translates a Cassandra `rpc_address` to another address if necessary.
     * @param {String} address the address of a node as returned by Cassandra.
     *
     * Note that if the `rpc_address` of a node has been configured to `0.0.0.0`
     * server side, then the provided address will be the node `listen_address`,
     * *not* `0.0.0.0`.
     * @param {Number} port The port number, as specified in the [protocolOptions]{@link ClientOptions} at Client instance creation (9042 by default).
     * @param {Function} callback Callback to invoke with endpoint as first parameter.
     * The endpoint is an string composed of the IP address and the port number in the format `ipAddress:port`.
     */
    translate(address, port, callback) {
        callback(address + ":" + port);
    }

    /**
     * This method is used to determine if the provided policy is one of the policies with the default implementation.
     * This is meant to be for internal use only - overriding it by users may lead to UB.
     *
     * This is a abstract class, so by default we return CustomPolicy.
     * @package
     * @returns {rust.AddressTranslatorPolicies}
     */
    whichDefaultPolicy() {
        return rust.AddressTranslatorPolicies.CustomPolicy;
    }
}

/**
 * {@link AddressTranslator} implementation for multi-region EC2 deployments <strong>where clients are also deployed in EC2</strong>.
 *
 * Its distinctive feature is that it translates addresses according to the location of the Cassandra host:
 * - addresses in different EC2 regions (than the client) are unchanged
 * - addresses in the same EC2 region are <strong>translated to private IPs</strong>
 *
 * This optimizes network costs, because Amazon charges more for communication over public IPs.
 */
class EC2MultiRegionTranslator extends AddressTranslator {
    constructor() {
        super();
    }
    /**
     * Addresses in the same EC2 region are translated to private IPs and addresses in
     * different EC2 regions (than the client) are unchanged
     */
    translate(address, port, callback) {
        // Internal note. This logic is replicated on the Rust side,
        // for non inherited version of this policy, to reduce the number of callbacks.
        // For now, this logic is used only when someone overrides this address translator class.
        // To avoid code duplication, we may consider calling a rust version of this code from here.
        let newAddress = address;
        const self = this;
        let name;
        utils.series(
            [
                function resolve(next) {
                    dns.reverse(address, function (err, hostNames) {
                        if (err) {
                            return next(err);
                        }
                        if (!hostNames) {
                            return next();
                        }
                        name = hostNames[0];
                        next();
                    });
                },
                function lookup(next) {
                    if (!name) {
                        return next();
                    }
                    dns.lookup(name, function (err, lookupAddress) {
                        if (err) {
                            return next(err);
                        }
                        newAddress = lookupAddress;
                        next();
                    });
                },
            ],
            function (err) {
                if (err) {
                    // there was an issue while doing dns resolution
                    self.logError(address, err);
                }
                callback(newAddress + ":" + port);
            },
        );
    }
    /**
     * Log method called to log errors that occurred while performing dns resolution.
     * You can assign your own method to the class instance to do proper logging.
     * @param {String} address
     * @param {Error} err
     */
    logError(address, err) {
        // Do nothing by default
    }

    /**
     * This method is used to determine if the provided policy is one of the policies with the default implementation.
     *
     * Here we check if the current instance is of the base class type and not inherited.
     * @package
     * @returns {rust.AddressTranslatorPolicies}
     */
    whichDefaultPolicy() {
        if (
            Object.getPrototypeOf(this) === EC2MultiRegionTranslator.prototype
        ) {
            return rust.AddressTranslatorPolicies.EC2MultiRegion;
        }
        return rust.AddressTranslatorPolicies.CustomPolicy;
    }
}

exports.AddressTranslator = AddressTranslator;
exports.EC2MultiRegionTranslator = EC2MultiRegionTranslator;
