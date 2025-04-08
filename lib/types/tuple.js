"use strict";

const resultWrapper = require("./results-wrapper");

/** @module types */

/**
 * Represents a sequence of immutable objects.
 *
 * Tuples are sequences, just like Arrays. The only difference is that tuples can't be changed.
 *
 * As tuples can be used as a Map keys, the {{@link module:types~Tuple#toString toString}} method calls toString of each element,
 * to try to get a unique string key.
 *
 * **Implementation notes:**
 * The `Tuple` class behaves differently depending on its origin:
 * - If the tuple was created in JavaScript, its values are stored in JS.
 * - If the tuple comes from a ScyllaDB query result, its values remain in Rust memory, and access requires a native call.
 */
class Tuple {
    /**
     * Rust tuple object if stored in Rust part of the driver.
     * @type {rust.TupleWrapper?}
     * @private
     */
    #internal;

    /**
     * Elements of the tuple if stored in JS.
     * @type {Array?}
     * @private
     */
    #jsElements;

    /**
     * True if the tuple is stored in JS, false if it's stored in Rust part of the driver.
     * @type {Boolean}
     * @private
     */
    #isJsStored;

    /**
     * Creates a new instance of Tuple.
     * @param  {...any} args
     */
    constructor(...args) {
        this.#isJsStored = true;
        this.#internal = null;
        this.#jsElements = args;

        if (this.elements.length === 0) {
            throw new TypeError("Tuple must contain at least one value");
        }

        // This is Rust driver limitation.
        if (this.elements.length > 16) {
            throw new TypeError("Tuple must contain at most 16 values");
        }
    }

    /**
     * Returns the elements of the tuple.
     * @readonly
     * @type Array
     */
    get elements() {
        if (this.#isJsStored) return this.#jsElements;
        return this.#internal.getAll();
    }

    set elements(_) {
        throw new SyntaxError("Tuple elements are read-only");
    }

    /**
     * Returns the number of the elements.
     * @readonly
     * @type Number
     */
    get length() {
        if (this.#isJsStored) return this.#jsElements.length;
        return this.#internal.getLength();
    }

    set length(_) {
        throw new SyntaxError("Tuple length is read-only");
    }

    /**
     * Creates a new instance of a tuple based on the Array.
     * @param {Array} elements
     * @returns {Tuple}
     */
    static fromArray(elements) {
        // Apply the elements Array as parameters.
        return new Tuple(...elements);
    }

    /**
     * Returns the value located at the index.
     * @param {Number} index Element index
     */
    get(index) {
        if (this.#isJsStored) return this.#jsElements[index || 0];
        return resultWrapper.getCqlObject(this.#internal.get(index || 0));
    }

    /**
     * Returns the string representation of the sequence surrounded by parenthesis, ie: (1, 2).
     *
     * The returned value attempts to be a unique string representation of its values.
     *
     * @returns {string}
     */
    toString() {
        return `(${this.elements.reduce((prev, x, i) => {
            return prev + (i > 0 ? "," : "") + x.toString();
        }, "")})`;
    }

    /**
     * Returns the Array representation of the sequence.
     * @returns {Array}
     */
    toJSON() {
        return this.elements;
    }

    /**
     * Gets the elements as an array.
     * @returns {Array}
     */
    values() {
        // Clone the elements
        return this.elements.slice(0);
    }

    /**
     * Get tuple from rust object. Not intended to be exposed in the API.
     * @package
     * @param {rust.TupleWrapper} rustTuple
     * @returns {Tuple}
     */
    static fromRust(rustTuple) {
        let jsTuple = new Tuple(null);
        jsTuple.#internal = rustTuple;
        jsTuple.#isJsStored = false;
        jsTuple.#jsElements = null;
        return jsTuple;
    }
}

module.exports = Tuple;
