const { errors } = require("../errors");
const types = require("./index");
const typeValues = types.dataTypes;
const Long = types.Long;
const Integer = types.Integer;
const BigDecimal = types.BigDecimal;

function isTypedArray(arg) {
    // The TypedArray superclass isn't available directly so to detect an instance of a TypedArray
    // subclass we have to access the prototype of a concrete instance.  There's nothing magical about
    // Uint8Array here; we could just as easily use any of the other TypedArray subclasses.
    return arg instanceof Object.getPrototypeOf(Uint8Array);
}

/**
 * Try to guess the Cassandra type to be stored, based on the javascript value type.
 * This guessing is based on the guessing done by Datastax driver with minor alterations
 * @param value
 * @returns {{code: number, info: object}|null}
 * @ignore
 * @internal
 */
function guessType(value) {
    let code = null;
    let info = null;
    const esTypeName = typeof value;

    if (esTypeName === "number") {
        code = typeValues.double;
    } else if (esTypeName === "string") {
        code = typeValues.text;
        if (value.length === 36 && types.Uuid.uuidRegex.test(value)) {
            code = typeValues.uuid;
        }
    } else if (esTypeName === "boolean") {
        code = typeValues.boolean;
    } else if (value instanceof Buffer) {
        code = typeValues.blob;
    } else if (value instanceof Date) {
        code = typeValues.timestamp;
    } else if (value instanceof Long) {
        code = typeValues.bigint;
    } else if (value instanceof Integer) {
        code = typeValues.varint;
    } else if (value instanceof BigDecimal) {
        code = typeValues.decimal;
    } else if (value instanceof types.Uuid) {
        code = typeValues.uuid;
    } else if (value instanceof types.InetAddress) {
        code = typeValues.inet;
    } else if (value instanceof types.Tuple) {
        code = typeValues.tuple;
        info = [];
        for (const element of value.elements) {
            info.push(guessType(element));
        }
    } else if (value instanceof types.LocalDate) {
        code = typeValues.date;
    } else if (value instanceof types.LocalTime) {
        code = typeValues.time;
    } else if (value instanceof types.Duration) {
        code = typeValues.duration;
    }
    // Map JS TypedArrays onto vectors
    else if (isTypedArray(value)) {
        // TODO: Add support for typed arrays
        throw new errors.DriverInternalError(
            "No support for typed array guessing type",
        );
        /* code = typeValues.Custom;
        // DS TODO: another area that we have to generalize if we ever need to support vector subtypes other than float
        info = buildParameterizedCustomType(customTypeNames.vector, [
            singleTypeNamesByDataType[typeValues.float],
            value.length,
        ]); */
    } else if (Array.isArray(value)) {
        code = typeValues.list;
        if (value.length == 0) {
            throw new Error(
                `TODO: Type guessing of empty array is not yet implemented`,
            );
        }
        info = guessType(value[0]);
    }

    if (code === null) return null;

    return { code: code, info: info };
}

exports.guessType = guessType;
