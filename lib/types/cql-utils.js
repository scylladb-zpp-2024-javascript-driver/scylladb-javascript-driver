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
 * @returns {rust.ComplexType} type guess, converted to ``ComplexType`` object
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
 * @returns {Array<rust.QueryParameterWrapper>}
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
        res.push(getWrapped(subtype, values[i]));
    }
    return res;
}

/**
 * @param {*} value
 * @param {rust.ComplexType} parentType
 * @returns {Array<Array<rust.QueryParameterWrapper>>}
 */
function encodeMap(value, parentType) {
    const keySubtype = parentType.getFirstSupportType();
    const valueSubtype = parentType.getSecondSupportType();

    let res = [];

    for (const key in value) {
        if (!value.hasOwnProperty(key)) {
            continue;
        }
        const val = value[key];
        ensureValue(val, "A collection can't contain null or unset values");
        ensureValue(key, "A collection can't contain null or unset values");
        res.push([
            getWrapped(keySubtype || guessTypeChecked(key), key),
            getWrapped(valueSubtype || guessTypeChecked(val), val),
        ]);
    }
    return res;
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
 * Wrap value into QueryParameterWrapper based on the type
 * @param {rust.ComplexType} type
 * @param {*} value
 * @returns {rust.QueryParameterWrapper}
 */
function getWrapped(type, value) {
    if (value === null || value === types.unset) {
        return null;
    }
    let encodedElement;
    let tmpElement;
    // To increase clarity of the error messages, in case value is of different type then expected,
    // when we call some methods on value variable, type is checked explicitly.
    // In other cases default Error will be thrown, which has message meaningful for the user.
    switch (type.baseType) {
        case rust.CqlType.Ascii:
            return rust.QueryParameterWrapper.fromAscii(value);
        case rust.CqlType.BigInt:
            return rust.QueryParameterWrapper.fromBigint(
                arbitraryValueToBigInt(value),
            );
        case rust.CqlType.Blob:
            return rust.QueryParameterWrapper.fromBlob(value);
        case rust.CqlType.Boolean:
            return rust.QueryParameterWrapper.fromBoolean(value);
        case rust.CqlType.Counter:
            return rust.QueryParameterWrapper.fromCounter(BigInt(value));
        case rust.CqlType.Date:
            if (!(value instanceof LocalDate))
                throw new TypeError(
                    "Expected LocalDate type to parse into Cql Date",
                );
            return rust.QueryParameterWrapper.fromLocalDate(
                value.getInternal(),
            );
        case rust.CqlType.Double:
            return rust.QueryParameterWrapper.fromDouble(value);
        case rust.CqlType.Duration:
            if (!(value instanceof Duration))
                throw new TypeError(
                    "Expected Duration type to parse into Cql Duration",
                );
            return rust.QueryParameterWrapper.fromDuration(value.getInternal());
        case rust.CqlType.Float:
            return rust.QueryParameterWrapper.fromFloat(value);
        case rust.CqlType.Int:
            ensureNumber(value);
            return rust.QueryParameterWrapper.fromInt(value);
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
            encodedElement = encodeListLike(value, type.getFirstSupportType());
            return rust.QueryParameterWrapper.fromSet(encodedElement);
        case rust.CqlType.Text:
            return rust.QueryParameterWrapper.fromText(value);
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

            return rust.QueryParameterWrapper.fromTimestamp(BigInt(value));
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
            return rust.QueryParameterWrapper.fromInet(value.getInternal());
        case rust.CqlType.List:
            encodedElement = encodeListLike(value, type.getFirstSupportType());
            return rust.QueryParameterWrapper.fromList(encodedElement);
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
            encodedElement = encodeMap(value, type);
            return rust.QueryParameterWrapper.fromMap(encodedElement);
        case rust.CqlType.SmallInt:
            ensureNumber(value);
            return rust.QueryParameterWrapper.fromSmallInt(value);
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

            return rust.QueryParameterWrapper.fromLocalTime(
                value.getInternal(),
            );
        case rust.CqlType.TinyInt:
            ensureNumber(value);
            return rust.QueryParameterWrapper.fromTinyInt(value);
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
            return rust.QueryParameterWrapper.fromUuid(value.getInternal());
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
            return rust.QueryParameterWrapper.fromTimeUuid(value.getInternal());
        default:
            // Or not yet implemented type
            throw new ReferenceError(
                `[INTERNAL DRIVER ERROR] Unknown type: ${type}`,
            );
    }
}

/**
 * Parses array of params into rust objects according to preparedStatement expected types
 * Throws ResponseError when received different amount of parameters than expected
 *
 * If ``allowGuessing`` is true, then for each missing field of ``expectedTypes``, this function will try to guess a type.
 * If the type cannot be guessed, error will be thrown.
 * Field is missing if it is null, undefined (or if the ``expectedTypes`` list is to short)
 * @param {Array<rust.ComplexType | null>} expectedTypes List of expected types.
 * @param {Array<any>} params
 * @param {boolean} [allowGuessing]
 * @returns {Array<rust.QueryParameterWrapper>}
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

        if (params[i] === null) {
            res.push(null);
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
