"use strict";

const util = require("util");
const types = require("./index");
const rust = require("../../index");
const BigDecimal = require("./big-decimal");
const TimeUuid = require("./time-uuid");
const Uuid = require("./uuid");
const Duration = require("./duration");
const LocalDate = require("./local-date");
const LocalTime = require("./local-time");
const InetAddress = require("./inet-address");
const { guessType } = require("./type-guessing");
const { arbitraryValueToBigInt } = require("../new-utils");
const _Encoder = require("../encoder");

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
 * Wraps UDT into format recognized by ParameterWrapper.
 * @param {Object} value
 * @param {rust.ComplexType} type
 * @returns {Array<rust.ComplexType|Array<Array<String|any>>>} Returns tuple of ComplexType and array of tuples of field name and field value.
 */
function encodeUdt(value, type) {
    let names = type.getUdtFieldNames();
    let types = type.getInnerTypes();
    let newTypes = [];
    let res = [];

    if (names.length !== types.length) {
        throw new TypeError(
            `Expected ${types.length} field names in UDT, obtained ${names.length}`,
        );
    }

    for (let i = 0; i < names.length; i++) {
        if (!types[i]) {
            types[i] = guessTypeChecked(value[names[i]]);
        }
        const element = getWrapped(
            types[i],
            value[names[i]] !== undefined ? value[names[i]] : null, // Undefined values should be treated as null value.
        );
        newTypes.push(element[0]);
        res.push([names[i], element[1]]);
    }
    return [
        rust.ComplexType.newUdtType(
            newTypes,
            names,
            type.getUdtKeyspace(),
            type.getUdtName(),
        ),
        res,
    ];
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
        case rust.CqlType.Empty:
        case rust.CqlType.Text:
            break;
        case rust.CqlType.BigInt:
            value = arbitraryValueToBigInt(value);
            break;
        case rust.CqlType.Double:
        case rust.CqlType.Float:
            if (typeof value === "string") {
                value = Number.parseFloat(value);
            }
            break;
        case rust.CqlType.Counter:
            value = BigInt(value);
            break;
        case rust.CqlType.Decimal:
            if (typeof value === "number") {
                value = BigDecimal.fromNumber(value);
            } else if (typeof value === "string") {
                value = BigDecimal.fromString(value);
            }
            if (!(value instanceof BigDecimal)) {
                throw new TypeError(
                    "Expected BigDecimal type to parse into Cql Decimal",
                );
            }
            value = BigDecimal.toBuffer(value);
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
            if (typeof value === "string") {
                value = Number.parseFloat(value);
            }
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
        case rust.CqlType.UserDefinedType:
            value = encodeUdt(value, type);
            type = value[0];
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
        case rust.CqlType.Varint:
            value = arbitraryValueToBigInt(value);
            break;
        default:
            // Or not yet implemented type
            throw new ReferenceError(
                `[INTERNAL DRIVER ERROR] Unknown type: ${type.baseType}`,
            );
    }
    return [type, value];
}

/**
 * @param {Array<rust.ComplexType | null>} expectedTypes List of expected types.
 * @param {Array<any>} params
 * @param {_Encoder} encoder
 * @returns {Array<rust.ComplexType|any>} Returns: [] for null values, [undefined] for unset values
 * and [rust.ComplexType, any] for all other values.
 * @throws ResponseError when received different amount of parameters than expected
 */
function encodeParams(expectedTypes, params, encoder) {
    if (expectedTypes.length == 0 && !params) return [];
    let res = [];
    for (let i = 0; i < params.length; i++) {
        let tmp = encoder.encode(params[i], expectedTypes[i]);
        res.push(tmp);
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
 * Convert rust ComplexType into type representation used in the driver encoder
 * @param {rust.ComplexType} type
 */
function convertComplexType(type) {
    let data = {
        code: type.baseType.valueOf(),
    };
    let firstSupport = type.getFirstSupportType();
    let secondSupport = type.getSecondSupportType();
    let innerTypes = type.getInnerTypes();
    if (firstSupport != null) {
        data.info = convertComplexType(firstSupport);
        if (secondSupport != null) {
            data.info = [data.info, convertComplexType(secondSupport)];
        }
    } else if (innerTypes.length > 0) {
        if (data.code == rust.CqlType.UserDefinedType) {
            let names = type.getUdtFieldNames();
            data.info = {
                fields: innerTypes.map((typ, index) => {
                    let obj = { type: convertComplexType(typ) };
                    obj.name = names[index];
                    return obj;
                }),
            };
        } else {
            data.info = innerTypes.map((t) => convertComplexType(t));
        }
    }
    return data;
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

module.exports.encodeParams = encodeParams;
module.exports.convertHints = convertHints;
module.exports.rustConvertHint = rustConvertHint;
module.exports.convertComplexType = convertComplexType;

// For unit test usage
module.exports.getWrapped = getWrapped;
