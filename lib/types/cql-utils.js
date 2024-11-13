"use strict";

const types = require("./index");
const rust = require("../../index");
const { ResponseError } = require("../errors");
const TimeUuid = require("./time-uuid");
const Uuid = require("./uuid");
const Duration = require("./duration");

/**
 * Wrap value into QueryParameterWrapper based on the type
 * @param {CqlType} type
 * @param {*} value
 * @returns {rust.QueryParameterWrapper}
 */
function getWrapped(type, value) {
    if (value === null || value === types.unset) {
        return rust.QueryParameterWrapper.fromEmpty();
    }
    switch (type) {
        case rust.CqlType.Ascii:
            return rust.QueryParameterWrapper.fromAscii(value);
        case rust.CqlType.Blob:
            return rust.QueryParameterWrapper.fromBlob(value);
        case rust.CqlType.Boolean:
            return rust.QueryParameterWrapper.fromBoolean(value);
        case rust.CqlType.Counter:
            return rust.QueryParameterWrapper.fromCounter(value);
        case rust.CqlType.Double:
            return rust.QueryParameterWrapper.fromDouble(value);
        case rust.CqlType.Duration:
            if (!(value instanceof Duration)) throw new TypeError("");
            return rust.QueryParameterWrapper.fromDuration(value.getInternal());
        case rust.CqlType.Float:
            return rust.QueryParameterWrapper.fromFloat(value);
        case rust.CqlType.Int:
            return rust.QueryParameterWrapper.fromInt(value);
        case rust.CqlType.Set:
            return rust.QueryParameterWrapper.fromSet(value);
        case rust.CqlType.Text:
            return rust.QueryParameterWrapper.fromText(value);
        case rust.CqlType.SmallInt:
            return rust.QueryParameterWrapper.fromSmallInt(value);
        case rust.CqlType.TinyInt:
            return rust.QueryParameterWrapper.fromTinyInt(value);
        case rust.CqlType.Uuid:
            if (!(value instanceof Uuid)) throw new TypeError("");
            return rust.QueryParameterWrapper.fromUuid(value.getInternal());
        case rust.CqlType.Timeuuid:
            if (!(value instanceof TimeUuid)) throw new TypeError("");
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
 * @param {PreparedStatementWrapper} preparedStatement
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