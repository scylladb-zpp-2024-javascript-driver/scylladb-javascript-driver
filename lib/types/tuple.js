"use strict";

/** @module types */

/**
 * Represents a sequence of immutable objects.
 *
 * Tuples are sequences, just like [Arrays]{@link Array}. The only difference is that tuples can't be changed.
 *
 * As tuples can be used as a Map keys, the {@link Tuple#toString toString()} method calls toString of each element,
 * to try to get a unique string key.
 */
class Tuple {
    /**
    * @type {rust.TupleWrapper}
    * @private
    */
    #internal

    /**
     * Creates a new instance of Tuple.
     * @param  {...any} args
     */
    constructor(...args) {
        this.#internal = rust.TupleWrapper.new(args);

        if (this.elements.length === 0) {
            throw new TypeError("Tuple must contain at least one value");
        }

        /**
         * Returns the number of the elements.
         * @type Number
         */
        this.length = this.elements.length;
    }

    /**
     * Returns the elements of the tuple.
     * @readonly
     * @type Array
     */
    get elements() {
        return this.#internal.getElements();
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
        return this.#internal.getLength();
    }

    set length(_) {
        throw new SyntaxError("Tuple length is read-only");
    }

    /**
     * Creates a new instance of a tuple based on the Array
     * @param {Array} elements
     * @returns {Tuple}
     */
    static fromArray(elements) {
        // Apply the elements Array as parameters
        return new Tuple(...elements);
    }

    /**
     * Returns the value located at the index.
     * @param {Number} index Element index
     */
    get(index) {
        return this.elements[index || 0];
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
     * Gets the elements as an array
     * @returns {Array}
     */
    values() {
        // Clone the elements
        return this.elements.slice(0);
    }

    
}

module.exports = Tuple;
