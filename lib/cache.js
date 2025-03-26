const _rust = require("../index");

class PreparedCache {
    /**
     * @type {Map<string, _rust.PreparedStatementWrapper>}
     */
    #cache;

    constructor() {
        this.#cache = {};
    }

    /**
     *
     * @param {string} key
     * @returns {_rust.PreparedStatementWrapper}
     */
    getElement(key) {
        return this.#cache[key];
    }

    /**
     *
     * @param {string} key
     * @param {_rust.PreparedStatementWrapper} element
     */
    storeElement(key, element) {
        this.#cache[key] = element;
    }
}

module.exports.PreparedCache = PreparedCache;
