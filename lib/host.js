"use strict";

const events = require("events");

const utils = require("./utils");
const { throwNotSupported } = require("./new-utils");
const _rust = require("../index");

/**
 * Represents a Cassandra node.
 * @extends EventEmitter
 */
class Host extends events.EventEmitter {
    /**
     * Creates a new Host instance.
     */
    constructor() {
        super();
        /**
         * Gets ip address and port number of the node separated by `:`.
         * @type {String}
         */
        this.address = null;

        /**
         * Gets string containing the Cassandra version.
         * @type {String}
         */
        this.cassandraVersion = null;

        /**
         * Gets data center name of the node.
         * @type {String}
         */
        this.datacenter = null;

        /**
         * Gets rack name of the node.
         * @type {String}
         */
        this.rack = null;

        /**
         * Gets the tokens assigned to the node.
         * @type {Array}
         */
        this.tokens = null;

        /**
         * Gets the id of the host.
         *
         * This identifier is used by the server for internal communication / gossip.
         * @type {Uuid}
         */
        this.hostId = null;
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    get dseVersion() {
        throwNotSupported("Host.dseVersion");
        return null;
    }

    set dseVersion(_) {
        throwNotSupported("Host.dseVersion");
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    get workloads() {
        throwNotSupported("Host.workloads");
        return null;
    }

    set workloads(_) {
        throwNotSupported("Host.workloads");
    }

    /**
     * Determines if the node is UP now (seen as UP by the driver).
     * @returns {boolean}
     */
    isUp() {
        throw new Error(`TODO: Not implemented`);
    }

    /**
     * Determines if the host can be considered as UP.
     * Deprecated: Use {@link Host#isUp()} instead.
     * @returns {boolean}
     */
    canBeConsideredAsUp() {
        throw new Error(`TODO: Not implemented`);
    }

    /**
     * Returns an array containing the Cassandra Version as an Array of Numbers having the major version in the first
     * position.
     * @returns {Array.<Number>}
     */
    getCassandraVersion() {
        if (!this.cassandraVersion) {
            return utils.emptyArray;
        }
        return this.cassandraVersion
            .split("-")[0]
            .split(".")
            .map((x) => parseInt(x, 10));
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    getDseVersion() {
        throwNotSupported("Host.getDseVersion");
    }

    /**
     * Creates a Host instance from a Rust HostWrapper.
     * @param {_rust.HostWrapper} hostWrapper
     * @package
     */
    static fromRust(hostWrapper) {
        let host = new Host();
        host.address = hostWrapper.address;
        host.datacenter = hostWrapper.datacenter;
        host.rack = hostWrapper.rack;
        host.hostId = hostWrapper.hostId;
        return host;
    }
}

/**
 * Represents an associative-array of {@link Host hosts} that can be iterated.
 * It creates an internal copy when adding or removing, making it safe to iterate using the values()
 * method within async operations.
 * @extends events.EventEmitter
 * @constructor
 */
class HostMap extends events.EventEmitter {
    constructor() {
        super();

        this._items = new Map();
        this._values = null;

        Object.defineProperty(this, "length", {
            get: () => this.values().length,
            enumerable: true,
        });

        /**
         * Emitted when a host is added to the map
         * @event HostMap#add
         */
        /**
         * Emitted when a host is removed from the map
         * @event HostMap#remove
         */
    }

    /**
     * Executes a provided function once per map element.
     * @param callback
     */
    forEach(callback) {
        const items = this._items;
        for (const [key, value] of items) {
            callback(value, key);
        }
    }

    /**
     * Gets a {@link Host host} by key or undefined if not found.
     * @param {String} key
     * @returns {Host}
     */
    get(key) {
        return this._items.get(key);
    }

    /**
     * Returns an array of host addresses.
     * @returns {Array.<String>}
     */
    keys() {
        return Array.from(this._items.keys());
    }

    /**
     * Removes an item from the map.
     * @param {String} key The key of the host
     * @fires HostMap#remove
     */
    remove(key) {
        const value = this._items.get(key);
        if (value === undefined) {
            return;
        }

        // Clear cache
        this._values = null;

        // Copy the values
        const copy = new Map(this._items);
        copy.delete(key);

        this._items = copy;
        this.emit("remove", value);
    }

    /**
     * Removes multiple hosts from the map.
     * @param {Array.<String>} keys
     * @fires HostMap#remove
     */
    removeMultiple(keys) {
        // Clear value cache
        this._values = null;

        // Copy the values
        const copy = new Map(this._items);
        const removedHosts = [];

        for (const key of keys) {
            const h = copy.get(key);

            if (!h) {
                continue;
            }

            removedHosts.push(h);
            copy.delete(key);
        }

        this._items = copy;
        removedHosts.forEach((h) => this.emit("remove", h));
    }

    /**
     * Adds a new item to the map.
     * @param {String} key The key of the host
     * @param {Host} value The host to be added
     * @fires HostMap#remove
     * @fires HostMap#add
     */
    set(key, value) {
        // Clear values cache
        this._values = null;

        const originalValue = this._items.get(key);
        if (originalValue) {
            // The internal structure does not change
            this._items.set(key, value);
            // emit a remove followed by a add
            this.emit("remove", originalValue);
            this.emit("add", value);
            return;
        }

        // Copy the values
        const copy = new Map(this._items);
        copy.set(key, value);
        this._items = copy;
        this.emit("add", value);
        return value;
    }

    /**
     * Returns a shallow copy of a portion of the items into a new array object.
     * Backward-compatibility.
     * @param {Number} [begin]
     * @param {Number} [end]
     * @returns {Array}
     * @ignore
     */
    slice(begin, end) {
        if (!begin && !end) {
            // Avoid making a copy of the copy
            return this.values();
        }

        return this.values().slice(begin || 0, end);
    }

    /**
     * Deprecated: Use set() instead.
     * @ignore
     * @deprecated
     */
    push(k, v) {
        this.set(k, v);
    }

    /**
     * Returns a shallow copy of the values of the map.
     * @returns {Array.<Host>}
     */
    values() {
        if (!this._values) {
            // Cache the values
            this._values = Object.freeze(Array.from(this._items.values()));
        }

        return this._values;
    }

    /**
     * Removes all items from the map.
     * @returns {Array.<Host>} The previous items
     */
    clear() {
        const previousItems = this.values();

        // Clear cache
        this._values = null;

        // Clear items
        this._items = new Map();

        // Emit events
        previousItems.forEach((h) => this.emit("remove", h));

        return previousItems;
    }

    inspect() {
        return this._items;
    }

    toJSON() {
        // Node.js 10 and below don't support Object.fromEntries()
        if (Object.fromEntries) {
            return Object.fromEntries(this._items);
        }

        const obj = {};
        for (const [key, value] of this._items) {
            obj[key] = value;
        }

        return obj;
    }

    /**
     * Converts a list of HostWrapper from Rust to a HostMap
     * @param {Array.<_rust.HostWrapper>} hostsList
     * @package
     */
    static fromRust(hostsList) {
        const hostMap = new HostMap();

        for (const hostWrapper of hostsList) {
            hostMap.set(hostWrapper.address, Host.fromRust(hostWrapper));
        }

        return hostMap;
    }
}

module.exports = {
    Host,
    HostMap,
};
