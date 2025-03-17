"use strict";

const util = require("util");
const types = require("./index");
const rust = require("../../index");
const { ResponseError } = require("../errors");
const TimeUuid = require("./time-uuid");
const Uuid = require("./uuid");
const Duration = require("./duration");
const LocalTime = require("./local-time");
const InetAddress = require("./inet-address");

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
        res.push([getWrapped(keySubtype, key), getWrapped(valueSubtype, val)]);
    }
    return res;
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
    // To increase clarity of the error messages, in case value is of different type then expected,
    // when we call some methods on value variable, type is checked explicitly.
    // In other cases default Error will be thrown, which has message meaningful for the user.
    switch (type.baseType) {
        case rust.CqlType.Ascii:
            return rust.QueryParameterWrapper.fromAscii(value);
        case rust.CqlType.BigInt:
            return rust.QueryParameterWrapper.fromBigint(value);
        case rust.CqlType.Blob:
            return rust.QueryParameterWrapper.fromBlob(value);
        case rust.CqlType.Boolean:
            return rust.QueryParameterWrapper.fromBoolean(value);
        case rust.CqlType.Counter:
            return rust.QueryParameterWrapper.fromCounter(BigInt(value));
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
            return rust.QueryParameterWrapper.fromTimestamp(BigInt(value));
        case rust.CqlType.Inet:
            if (!(value instanceof InetAddress))
                throw new TypeError(
                    "Expected InetAddress type to parse into Cql Inet",
                );
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
            return rust.QueryParameterWrapper.fromSmallInt(value);
        case rust.CqlType.Time:
            if (!(value instanceof LocalTime))
                throw new TypeError(
                    "Expected LocalTime type to parse into Cql Time",
                );
            return rust.QueryParameterWrapper.fromLocalTime(
                value.getInternal(),
            );
        case rust.CqlType.TinyInt:
            return rust.QueryParameterWrapper.fromTinyInt(value);
        case rust.CqlType.Uuid:
            if (!(value instanceof Uuid))
                throw new TypeError(
                    "Expected UUID type to parse into Cql Uuid",
                );
            return rust.QueryParameterWrapper.fromUuid(value.getInternal());
        case rust.CqlType.Timeuuid:
            if (!(value instanceof TimeUuid))
                throw new TypeError(
                    "Expected Time UUID type to parse into Cql Uuid",
                );
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
 * @param {rust.PreparedStatementWrapper} preparedStatement
 * @param {Array<any>} params
 * @returns {Array<rust.QueryParameterWrapper>}
 */
function parseParams(preparedStatement, params) {
    let expectedTypes = preparedStatement.getExpectedTypes();
    if (expectedTypes.length == 0 && !params) return [];
    if (params.length != expectedTypes.length)
        throw new ResponseError(
            types.responseErrorCodes.invalid,
            `Expected ${expectedTypes.length}, got ${params.length} parameters.`,
        );
    let res = [];
    for (let i = 0; i < expectedTypes.length; i++) {
        res.push(getWrapped(expectedTypes[i], params[i]));
    }
    return res;
}

module.exports.parseParams = parseParams;

// For unit test usage
module.exports.getWrapped = getWrapped;
