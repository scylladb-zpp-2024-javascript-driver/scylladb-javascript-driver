"use strict";

const events = require("events");

const utils = require("./utils");

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

        /**
         * Gets string containing the DSE version or null if not set.
         * @type {String}
         */
        this.dseVersion = null;

        /**
         * Gets the DSE Workloads the host is running.
         *
         * This is based on the "workload" or "workloads" columns in {@code system.local} and {@code system.peers}.
         *
         * Workload labels may vary depending on the DSE version in use;e.g. DSE 5.1 may report two distinct workloads:
         *
         * `Search` and `Analytics`, while DSE 5.0 would report a single
         * `SearchAnalytics` workload instead. The driver simply returns the workload labels as reported by
         * DSE, without any form of pre-processing.
         *
         *
         * When the information is unavailable, this property returns an empty array.
         * @type {Array<string>}
         */
        this.workloads = utils.emptyArray;
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
     * Gets the DSE version of the host as an Array, containing the major version in the first position.
     * In case the cluster is not a DSE cluster, it returns an empty Array.
     * @returns {Array}
     */
    getDseVersion() {
        if (!this.dseVersion) {
            return utils.emptyArray;
        }
        return this.dseVersion
            .split("-")[0]
            .split(".")
            .map((x) => parseInt(x, 10));
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
}

module.exports = {
    Host,
    HostMap,
};
