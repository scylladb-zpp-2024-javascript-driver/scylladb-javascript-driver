"use strict";
const customErrors = require("./errors");
const util = require("./utils");
const Integer = require("./types/integer");

const Long = require("long");

/**
 * @param {String} entity
 * @param {String} name
 */
function throwNotSupported(name) {
    throw new ReferenceError(`${name} is not supported by our driver`);
}

const errorTypeMap = {
    ...customErrors,
    Error,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
};

const concatenationMark = "#";

// BigInt constants
const isBigIntSupported = typeof BigInt !== "undefined";
const bigInt8 = isBigIntSupported ? BigInt(8) : null;
const bigInt0 = isBigIntSupported ? BigInt(0) : null;
const bigIntMinus1 = isBigIntSupported ? BigInt(-1) : null;
const bigInt8BitsOn = isBigIntSupported ? BigInt(0xff) : null;

// Buffer constants
const buffers = {
    int16Zero: util.allocBufferFromArray([0, 0]),
    int32Zero: util.allocBufferFromArray([0, 0, 0, 0]),
    int8Zero: util.allocBufferFromArray([0]),
    int8One: util.allocBufferFromArray([1]),
    int8MaxValue: util.allocBufferFromArray([0xff]),
};

/**
 * A wrapper function to map napi errors to Node.js errors or custom errors.
 * Because NAPI-RS does not support throwing errors different that Error, for example
 * TypeError, RangeError, etc. or custom, driver-specific errors, this function is used
 * to catch the original error and throw a new one with the appropriate type.
 * This should be used to wrap all NAPI-RS functions that may throw errors.
 *
 * @param {Function} fn The original function to be wrapped.
 * @returns {Function} A wrapped function with error handling logic.
 */
function napiErrorHandler(fn) {
    return function (...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            // Check if message is of format errorType#errorMessage, if so map it to
            // appropriate error, otherwise throw the original error.
            const [errorType, ...messageParts] =
                error.message.split(concatenationMark);
            const message = messageParts.join(concatenationMark);

            if (errorTypeMap[errorType]) {
                const newError = new errorTypeMap[errorType](message);
                newError.stack = error.stack;
                throw newError;
            }
            throw error;
        }
    };
}

// maxInt value is based on how does Long split values between internal high and low fields.
const maxInt = BigInt(0x100000000);
const minusOne = BigInt(-1);

/**
 * Converts from bigint provided by napi into Long type used by the datastax library
 * BigInt is the way napi handles values too big for js Number type,
 * while Long is the way datastax code handles 64-bit integers.
 * @param {bigint} from
 * @returns {Long}
 */
function bigintToLong(from) {
    let lo = from % maxInt;
    let hi = from / maxInt;
    if (lo < 0) hi += minusOne;
    return Long.fromValue({
        low: Number(lo),
        high: Number(hi),
        unsigned: false,
    });
}

/**
 * Converts from Long type used by the datastax library into bigint used by napi
 * @param {Long} from
 * @returns {bigint}
 */
function longToBigint(from) {
    let lo = BigInt(from.low);
    let hi = BigInt(from.high);
    let r = lo + maxInt * hi;
    if (lo < 0) r += maxInt;
    return r;
}

/**
 * Ensure the value is one of the accepted numeric types, and convert them to BigInt
 * @param {string | number | Long | BigInt} value
 */
function arbitraryValueToBigInt(value) {
    if (typeof value === "bigint") return value;
    if (typeof value === "string" || typeof value == "number")
        return BigInt(value);
    if (value instanceof Long) return longToBigint(value);

    throw new TypeError(
        "Not a valid BigInt value, obtained " + util.inspect(value),
    );
}

/**
 * Converts a value to a varint buffer.
 * @param {Integer|Buffer|String|Number} value
 * @returns {Buffer}
 * @private
 */
function encodeVarint(value) {
    if (typeof value === "number") {
        value = Integer.fromNumber(value);
    }
    if (typeof value === "string") {
        value = Integer.fromString(value);
    }
    let buf = null;
    if (typeof value === "bigint") {
        buf = encodeVarintFromBigInt(value);
    }
    if (value instanceof Buffer) {
        buf = value;
    }
    if (value instanceof Integer) {
        buf = Integer.toBuffer(value);
    }
    if (buf === null) {
        throw new TypeError(
            "Not a valid varint, expected Integer/Number/String/Buffer, obtained " +
                util.inspect(value),
        );
    }
    return buf;
}

/**
 * Converts a BigInt to a varint buffer.
 * @param {String|BigInt} value
 * @returns {Buffer}
 */
function encodeVarintFromBigInt(value) {
    if (typeof value === "string") {
        // All numeric types are supported as strings for historical reasons
        value = BigInt(value);
    }

    if (typeof value !== "bigint") {
        throw new TypeError(
            "Not a valid varint, expected BigInt, obtained " +
                util.inspect(value),
        );
    }

    if (value === bigInt0) {
        return buffers.int8Zero;
    } else if (value === bigIntMinus1) {
        return buffers.int8MaxValue;
    }

    const parts = [];

    if (value > bigInt0) {
        while (value !== bigInt0) {
            parts.unshift(Number(value & bigInt8BitsOn));
            value = value >> bigInt8;
        }

        if (parts[0] > 0x7f) {
            // Positive value needs a padding
            parts.unshift(0);
        }
    } else {
        while (value !== bigIntMinus1) {
            parts.unshift(Number(value & bigInt8BitsOn));
            value = value >> bigInt8;
        }

        if (parts[0] <= 0x7f) {
            // Negative value needs a padding
            parts.unshift(0xff);
        }
    }

    return util.allocBufferFromArray(parts);
}

/**
 * Converts a byte array to a BigInt
 * @param {Buffer} bytes
 * @returns {BigInt}
 */
function decodeVarintAsBigInt(bytes) {
    let result = bigInt0;
    if (bytes[0] <= 0x7f) {
        for (let i = 0; i < bytes.length; i++) {
            const b = BigInt(bytes[bytes.length - 1 - i]);
            result = result | (b << BigInt(i * 8));
        }
    } else {
        for (let i = 0; i < bytes.length; i++) {
            const b = BigInt(bytes[bytes.length - 1 - i]);
            result = result | ((~b & bigInt8BitsOn) << BigInt(i * 8));
        }
        result = ~result;
    }

    return result;
}

exports.throwNotSupported = throwNotSupported;
exports.napiErrorHandler = napiErrorHandler;
exports.throwNotSupported = throwNotSupported;
exports.bigintToLong = bigintToLong;
exports.longToBigint = longToBigint;
exports.arbitraryValueToBigInt = arbitraryValueToBigInt;
exports.encodeVarint = encodeVarint;
exports.decodeVarintAsBigInt = decodeVarintAsBigInt;
