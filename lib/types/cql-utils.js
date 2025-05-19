"use strict";

const util = require("util");
const types = require("./index");
const rust = require("../../index");
const { ResponseError } = require("../errors");
const TimeUuid = require("./time-uuid");
const Uuid = require("./uuid");
const Duration = require("./duration");
const LocalDate = require("./local-date");
const LocalTime = require("./local-time");
const InetAddress = require("./inet-address");
const { guessType } = require("./type-guessing");
const { arbitraryValueToBigInt } = require("../new-utils");

/**
 * Ensures the value isn't one of many ways to express null value
 * @param {string} message Error message if value is "null"
 * @throws {TypeError} Throws an error if the value is "null"
 */
function ensureValue(val, message) {
    if (val === null || typeof val === "undefined" || val === types.unset)
        throw new TypeError(message);
}

/**
 * Guess the type, and if the type cannot be guessed, throw an error.
 * @param {any} value
 * @returns {rust.ComplexType} type guess, converted to `ComplexType` object
 */
function guessTypeChecked(value) {
    let type = rustConvertHint(guessType(value));
    if (!type) {
        throw new TypeError(
            "Target data type could not be guessed, you should use prepared statements for accurate type mapping. Value: " +
                util.inspect(value),
        );
    }
    return type;
}

/**
 * Wraps each of the elements into given subtype
 * @param {Array} values
 * @param {rust.ComplexType} subtype
 * @returns {Array<rust.ComplexType|any[]>} Returns tuple: [rust.ComplexType, any[]]
 */
function encodeListLike(values, subtype) {
    if (!Array.isArray(values))
        throw new TypeError(
            `Not a valid list value, expected Array obtained ${util.inspect(values)}`,
        );

    if (!subtype) subtype = guessTypeChecked(values[0]);

    let res = [];
    for (let i = 0; i < values.length; i++) {
        // This requirement is based on the datastax code
        ensureValue(
            values[i],
            "A collection can't contain null or unset values",
        );
        res.push(wrapValueBasedOnType(subtype, values[i])[1]);
    }
    return [subtype, res];
}

/**
 * @param {*} value
 * @param {rust.ComplexType} parentType
 * @returns {Array<rust.ComplexType|any[][]>} Returns tuple: [rust.ComplexType, any[][]]
 */
function encodeMap(value, parentType) {
    let keySubtype = parentType.getFirstSupportType();
    let valueSubtype = parentType.getSecondSupportType();

    let res = [];

    for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
            continue;
        }
        const val = value[key];
        ensureValue(val, "A collection can't contain null or unset values");
        ensureValue(key, "A collection can't contain null or unset values");
        if (!keySubtype || !valueSubtype) {
            if (valueSubtype || keySubtype) {
                throw new Error(
                    `Internal error: Invalid support types for map`,
                );
            }
            keySubtype = guessTypeChecked(key);
            valueSubtype = guessTypeChecked(val);
            parentType = parentType.remapMapSupportType(
                keySubtype,
                valueSubtype,
            );
        }
        res.push([
            wrapValueBasedOnType(keySubtype, key)[1],
            wrapValueBasedOnType(valueSubtype, val)[1],
        ]);
    }
    return [parentType, res];
}

/**
 * Ensures the provided value is non NaN. If it is, throws an error
 * @param {any} value
 */
function ensureNumber(value) {
    if (Number.isNaN(value)) {
        throw new TypeError("Expected Number, obtained " + util.inspect(value));
    }
}

/**
 * Wraps tuple into format recognized by ParameterWrapper
 * @param {types.Tuple} value
 * @param {rust.ComplexType} type
 * @returns {Array<rust.ComplexType|Array<any>>} Returns tuple: [rust.ComplexType, Array<any>]
 */
function encodeTuple(value, type) {
    let res = [];
    // TODO:
    // Add proper type guessing for tuples
    // If some of the types are not provided (as it's a possible case in type guessing)
    // then the returned type will have this information, while type provided in argument - not.
    let newTypes = [];
    let types = type.getInnerTypes();
    for (let i = 0; i < types.length; i++) {
        const element = getWrapped(
            types[i],
            value.get(i) !== undefined ? value.get(i) : null,
        );
        newTypes.push(element[0]);
        res.push(element[1]);
    }
    return [rust.ComplexType.remapTupleSupportType(newTypes), res];
}

/**
 * Wraps value into format recognized by ParameterWrapper, based on the provided type
 * @param {rust.ComplexType} type
 * @param {*} value
 * @returns {Array<rust.ComplexType|any>} Returns tuple: [rust.ComplexType, any] or []
 */
function getWrapped(type, value) {
    // Unset was introduced in CQLv3, and the backend of the driver - Rust driver -
    // works only with version >= 4 of CQL, so unset will always be supported.
    if (value === null) {
        return [];
    } else if (value === types.unset) {
        return [undefined];
    }
    return wrapValueBasedOnType(type, value);
}

/**
 * Wrap value, which is not Unset, into type and value pair,
 * ensuring value is converted into expected form
 * @param {rust.ComplexType} type
 * @param {*} value
 * @returns {Array<rust.ComplexType|any>} Returns tuple: [rust.ComplexType, any]
 */
function wrapValueBasedOnType(type, value) {
    let tmpElement;
    // To increase clarity of the error messages, in case value is of different type then expected,
    // when we call some methods on value variable, type is checked explicitly.
    // In other cases default Error will be thrown, which has message meaningful for the user.
    switch (type.baseType) {
        // For these types, no action is required
        case rust.CqlType.Ascii:
        case rust.CqlType.Boolean:
        case rust.CqlType.Blob:
        case rust.CqlType.Decimal:
        case rust.CqlType.Double:
        case rust.CqlType.Empty:
        case rust.CqlType.Float:
        case rust.CqlType.Text:
            break;
        case rust.CqlType.BigInt:
            value = arbitraryValueToBigInt(value);
            break;
        case rust.CqlType.Counter:
            value = BigInt(value);
            break;
        case rust.CqlType.Date:
            if (!(value instanceof LocalDate))
                throw new TypeError(
                    "Expected LocalDate type to parse into Cql Date",
                );
            value = value.getInternal();
            break;
        case rust.CqlType.Duration:
            if (!(value instanceof Duration))
                throw new TypeError(
                    "Expected Duration type to parse into Cql Duration",
                );
            value = value.getInternal();
            break;
        case rust.CqlType.Int:
        case rust.CqlType.SmallInt:
        case rust.CqlType.TinyInt:
            ensureNumber(value);
            break;
        case rust.CqlType.Set:
            // TODO:
            // This is part of the datastax logic for encoding set.
            // Here, this way of providing set is not supported.
            /* if (
                this.encodingOptions.set &&
                value instanceof this.encodingOptions.set
            ) {
                const arr = [];
                value.forEach(function (x) {
                    arr.push(x);
                });
                return this.encodeList(arr, subtype);
            } */
            value = encodeListLike(value, type.getFirstSupportType());
            if (!type.getFirstSupportType())
                type = type.remapListSupportType(value[0]);
            value = value[1];
            break;
        case rust.CqlType.Timestamp:
            tmpElement = value;
            if (typeof value === "string") {
                value = new Date(value);
            }
            if (value instanceof Date) {
                // milliseconds since epoch
                value = value.getTime();
                if (isNaN(value)) {
                    throw new TypeError("Invalid date: " + tmpElement);
                }
            }
            value = BigInt(value);
            break;
        case rust.CqlType.Inet:
            // Other forms of providing InetAddress are kept as parity with old driver
            if (typeof value === "string") {
                value = InetAddress.fromString(value);
            } else if (value instanceof Buffer) {
                value = new InetAddress(value);
            }

            if (!(value instanceof InetAddress)) {
                throw new TypeError(
                    "Expected InetAddress type to parse into Cql Inet",
                );
            }
            value = value.getInternal();
            break;
        case rust.CqlType.List:
            value = encodeListLike(value, type.getFirstSupportType());
            if (!type.getFirstSupportType())
                type = type.remapListSupportType(value[0]);
            value = value[1];
            break;
        case rust.CqlType.Map:
            // TODO:
            // This is part of the datastax logic for encoding map.
            // Here, this way of providing map is not supported.
            /* if (
                this.encodingOptions.map &&
                value instanceof this.encodingOptions.map
            ) {
                // Use Map#forEach() method to iterate
                value.forEach(addItem);
            } */
            value = encodeMap(value, type);
            type = value[0];
            value = value[1];
            break;
        case rust.CqlType.Time:
            // Other forms of providing LocalTime are kept as parity with old driver
            if (typeof value == "string") {
                value = LocalTime.fromString(value);
            }
            if (!(value instanceof LocalTime)) {
                throw new TypeError(
                    "Expected LocalTime type to parse into Cql Time",
                );
            }

            value = value.getInternal();
            break;
        case rust.CqlType.Uuid:
            // Other forms of providing UUID are kept as parity with old driver
            if (typeof value === "string") {
                value = Uuid.fromString(value);
            }

            if (!(value instanceof Uuid)) {
                throw new TypeError(
                    "Expected UUID type to parse into Cql Uuid",
                );
            }
            value = value.getInternal();
            break;
        case rust.CqlType.Tuple:
            value = encodeTuple(value, type);
            type = value[0];
            value = value[1];
            break;
        case rust.CqlType.Timeuuid:
            // Other forms of providing TimeUUID are kept as parity with old driver
            if (typeof value === "string") {
                value = TimeUuid.fromString(value);
            }
            if (!(value instanceof TimeUuid)) {
                throw new TypeError(
                    "Expected Time UUID type to parse into Cql Uuid",
                );
            }
            value = value.getInternal();
            break;
        default:
            // Or not yet implemented type
            throw new ReferenceError(
                `[INTERNAL DRIVER ERROR] Unknown type: ${type}`,
            );
    }
    return [type, value];
}

/**
 * Parses array of params into expected format according to preparedStatement expected types
 *
 * If `allowGuessing` is true, then for each missing field of `expectedTypes`, this function will try to guess a type.
 * If the type cannot be guessed, error will be thrown.
 * Field is missing if it is null, undefined or if the `expectedTypes` list is too short
 * @param {Array<rust.ComplexType | null>} expectedTypes List of expected types.
 * @param {Array<any>} params
 * @param {boolean} [allowGuessing]
 * @returns {Array<rust.ComplexType|any>} Returns tuple: [rust.ComplexType, any] or []
 * @throws ResponseError when received different amount of parameters than expected
 */
function parseParams(expectedTypes, params, allowGuessing) {
    if (expectedTypes.length == 0 && !params) return [];
    if (params.length != expectedTypes.length && !allowGuessing) {
        throw new ResponseError(
            types.responseErrorCodes.invalid,
            `Expected ${expectedTypes.length}, got ${params.length} parameters.`,
        );
    }
    let res = [];
    for (let i = 0; i < params.length; i++) {
        if (params[i] === types.unset) {
            // Rust driver works only with version >= 4 of CQL [Source?], so unset will always be supported.
            // Currently we don't support unset values and we treat them as NULL values.
            // TODO: Fix this
            params[i] = null;
        }

        // undefined as null depends on encodingOptions.useUndefinedAsUnset option
        // TODO: Add support for this option
        if (params[i] === null || params[i] === undefined) {
            res.push([]);
            continue;
        }

        let type = expectedTypes[i];
        if (!type && allowGuessing) type = guessTypeChecked(params[i]);
        res.push(getWrapped(type, params[i]));
    }
    return res;
}

/**
 * Convert the hints from the formats allowed by the driver, to internal type representation
 * @param {Array<string | number | object | null>} hints
 * @returns {Array<rust.ComplexType | null>}
 */
function convertHints(hints) {
    let result = [];

    if (!Array.isArray(hints)) {
        return [];
    }

    for (const hint of hints) {
        if (hint) {
            /** @type {{code: Number, info: object}} */
            let objectHint = {
                code: null,
                info: null,
            };
            if (typeof hint === "number") {
                objectHint.code = hint;
            } else if (typeof hint === "string") {
                objectHint = types.dataTypes.getByName(hint);
            } else if (typeof hint.code === "number") {
                objectHint.code = hint.code;
                objectHint.info = hint.info;
            }
            if (typeof objectHint.code !== "number") {
                throw new TypeError(
                    "Type information not valid, only String and Number values are valid hints",
                );
            }
            result.push(rustConvertHint(objectHint));
        } else {
            result.push(null);
        }
    }
    return result;
}

/**
 *
 * @param {null | object | Array<object>} object
 * @returns {rust.ComplexType | null}
 */
function rustConvertHint(object) {
    if (object.info && !Array.isArray(object.info)) {
        object.info = [object.info];
    }
    return rust.convertHint(object);
}

module.exports.parseParams = parseParams;
module.exports.convertHints = convertHints;
module.exports.rustConvertHint = rustConvertHint;

// For unit test usage
module.exports.getWrapped = getWrapped;
