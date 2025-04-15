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
     * Elements of the tuple if stored in JS.
     * @type {Array?}
     * @private
     */
    #elements;

    /**
     * Creates a new instance of Tuple.
     * @param  {...any} args
     */
    constructor(...args) {
        this.#elements = args;

        if (this.elements.length === 0) {
            throw new TypeError("Tuple must contain at least one value");
        }
    }

    /**
     * Returns the elements of the tuple.
     * @readonly
     * @type Array
     */
    get elements() {
        return this.#elements;
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
        return this.#elements.length;
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
        return this.#elements[index || 0];
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
        jsTuple.#elements = rustTuple
            .getAll()
            .map((e) => resultWrapper.getCqlObject(e))
            .map((e) => (e == null ? undefined : e));
        return jsTuple;
    }
}

module.exports = Tuple;
