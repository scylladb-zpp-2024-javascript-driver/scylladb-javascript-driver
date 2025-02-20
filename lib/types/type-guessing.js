const rust = require("../../index");
const { errors } = require("../../main");
const types = require("./index");
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
    const esTypeName = typeof value;
    if (esTypeName === "number") {
        code = rust.CqlType.Double;
    } else if (esTypeName === "string") {
        code = rust.CqlType.Text;
        if (value.length === 36 && types.Uuid.uuidRegex.test(value)) {
            code = rust.CqlType.Uuid;
        }
    } else if (esTypeName === "boolean") {
        code = rust.CqlType.Boolean;
    } else if (value instanceof Buffer) {
        code = rust.CqlType.Blob;
    } else if (value instanceof Date) {
        code = rust.CqlType.Timestamp;
    } else if (value instanceof Long) {
        code = rust.CqlType.BigInt;
    } else if (value instanceof Integer) {
        code = rust.CqlType.Varint;
    } else if (value instanceof BigDecimal) {
        code = rust.CqlType.Decimal;
    } else if (value instanceof types.Uuid) {
        code = rust.CqlType.Uuid;
    } else if (value instanceof types.InetAddress) {
        code = rust.CqlType.Inet;
    } else if (value instanceof types.Tuple) {
        code = rust.CqlType.Tuple;
    } else if (value instanceof types.LocalDate) {
        code = rust.CqlType.Date;
    } else if (value instanceof types.LocalTime) {
        code = rust.CqlType.Time;
    } else if (value instanceof types.Duration) {
        code = rust.CqlType.Duration;
    }
    // Map JS TypedArrays onto vectors
    else if (isTypedArray(value)) {
        // TODO: Add support for typed arrays
        throw new errors.DriverInternalError(
            "No support for typed array guessing type",
        );
        /* code = rust.CqlType.Custom;
        // DS TODO: another area that we have to generalize if we ever need to support vector subtypes other than float
        info = buildParameterizedCustomType(customTypeNames.vector, [
            singleTypeNamesByDataType[rust.CqlType.float],
            value.length,
        ]); */
    } else if (Array.isArray(value)) {
        code = rust.CqlType.List;
    }

    return code;
}

exports.guessType = guessType;
