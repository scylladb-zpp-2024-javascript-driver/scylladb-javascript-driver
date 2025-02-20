"use strict";

const crypto = require("crypto");
const utils = require("../utils");
const rust = require("../../index");

/** @module types */

/**
 * Represents an immutable universally unique identifier (UUID). A UUID represents a 128-bit value.
 */
class Uuid {
    /**
     * Used to check if the UUID is in a correct format
     * Source: https://stackoverflow.com/a/6640851
     * Verified also with documentation of UUID library in Rust: https://docs.rs/uuid/latest/uuid/
     */
    static uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /**
     * @type {rust.UuidWrapper}
     * @private
     */
    #internal;

    /**
     * Creates a new instance of Uuid based on a Buffer
     * @param {Buffer} buffer The 16-length buffer.
     */
    constructor(buffer) {
        if (!buffer || buffer.length !== 16) {
            throw new TypeError(
                "You must provide a buffer containing 16 bytes",
            );
        }
        this.#internal = rust.UuidWrapper.new(buffer);
    }

    /**
     * Returns the underlying buffer
     * @readonly
     * @type Buffer
     */
    get buffer() {
        return this.#internal.getBuffer();
    }

    set buffer(_) {
        throw new SyntaxError("UUID buffer is read-only");
    }

    /**
     * Parses a string representation of a Uuid
     * @param {string} value
     * @returns {Uuid}
     */
    static fromString(value) {
        if (typeof value !== "string" || !Uuid.uuidRegex.test(value)) {
            throw new Error(
                "Invalid string representation of Uuid, it should be in the 00000000-0000-0000-0000-000000000000 format",
            );
        }
        return new Uuid(
            utils.allocBufferFromString(value.replace(/-/g, ""), "hex"),
        );
    }

    /**
     * Creates a new random (version 4) Uuid.
     * @param {function} [callback] Optional callback to be invoked with the error as
     * first parameter and the created Uuid as second parameter.
     * @returns {Uuid}
     */
    static random(callback) {
        function getRandomBytes(cb) {
            return crypto.randomBytes(16, cb);
        }
        if (callback) {
            getRandomBytes(function (err, buffer) {
                if (err) {
                    return callback(err);
                }
                return callback(null, createUuidFromBuffer(buffer));
            });
        } else {
            const buffer = getRandomBytes();
            return createUuidFromBuffer(buffer);
        }
    }

    /**
     * Gets the bytes representation of a Uuid
     * @returns {Buffer}
     */
    getBuffer() {
        return this.#internal.getBuffer();
    }

    /**
     * Compares this object to the specified object.
     * The result is true if and only if the argument is not null, is a UUID object, and contains the same value, bit for bit, as this UUID.
     * @param {Uuid} other The other value to test for equality.
     */
    equals(other) {
        if (!(other instanceof Uuid)) {
            return false;
        }
        return this.buffer.compare(other.getBuffer()) == 0;
    }

    /**
     * Returns a string representation of the value of this Uuid instance.
     * 32 hex separated by hyphens, in the form of 00000000-0000-0000-0000-000000000000.
     * @returns {string}
     */
    toString() {
        // 32 hex representation of the Buffer
        const hexValue = this.buffer.toString("hex");
        return `${hexValue.slice(0, 8)}-${hexValue.slice(8, 12)}-${hexValue.slice(12, 16)}-${hexValue.slice(16, 20)}-${hexValue.slice(20)}`;
    }

    /**
     * Provide the name of the constructor and the string representation
     * @returns {string}
     */
    inspect() {
        return `${this.constructor.name}: ${this.toString()}`;
    }

    /**
     * Returns the string representation.
     * Method used by the native JSON.stringify() to serialize this instance.
     */
    toJSON() {
        return this.toString();
    }

    /**
     * @package
     * @param {rust.UuidWrapper} buffer
     * @returns {Uuid}
     */
    static fromRust(buffer) {
        return new Uuid(buffer.getBuffer());
    }

    /**
     * @package
     * @returns {rust.UuidWrapper}
     */
    getInternal() {
        return this.#internal;
    }
}

/**
 * Returns new Uuid
 * @private
 * @returns {Uuid}
 */
function createUuidFromBuffer(buffer) {
    // clear the version
    buffer[6] &= 0x0f;
    // set the version 4
    buffer[6] |= 0x40;
    // clear the variant
    buffer[8] &= 0x3f;
    // set the IETF variant
    buffer[8] |= 0x80;
    return new Uuid(buffer);
}

module.exports = Uuid;
