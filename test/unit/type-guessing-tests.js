const { assert } = require("chai");
const rust = require("../../index");
const utils = require("../../lib/utils");
const types = require("../../lib/types");
const Encoder = require("../../lib/encoder");

describe("Encoder.guessDataType()", function () {
    it("should guess the native types", function () {
        assertGuessed(
            1,
            rust.CqlType.Double,
            "Guess type for an integer (double) number failed",
        );
        assertGuessed(
            1.01,
            rust.CqlType.Double,
            "Guess type for a double number failed",
        );
        assertGuessed(
            true,
            rust.CqlType.Boolean,
            "Guess type for a boolean value failed",
        );
        assertGuessed(
            [1, 2, 3],
            rust.CqlType.List,
            "Guess type for an Array value failed",
        );
        assertGuessed(
            "a string",
            rust.CqlType.Text,
            "Guess type for an string value failed",
        );
        assertGuessed(
            utils.allocBufferFromString("bip bop"),
            rust.CqlType.Blob,
            "Guess type for a buffer value failed",
        );
        assertGuessed(
            new Date(),
            rust.CqlType.Timestamp,
            "Guess type for a Date value failed",
        );
        assertGuessed(
            new types.Long(10),
            rust.CqlType.BigInt,
            "Guess type for a Int 64 value failed",
        );
        assertGuessed(
            types.Uuid.random(),
            rust.CqlType.Uuid,
            "Guess type for a UUID value failed",
        );
        assertGuessed(
            types.TimeUuid.now(),
            rust.CqlType.Uuid,
            "Guess type for a TimeUuid value failed",
        );
        assertGuessed(
            types.TimeUuid.now().toString(),
            rust.CqlType.Uuid,
            "Guess type for a string uuid value failed",
        );
        assertGuessed(
            types.timeuuid(),
            rust.CqlType.Uuid,
            "Guess type for a Timeuuid value failed",
        );
        assertGuessed(
            types.Integer.fromNumber(1),
            rust.CqlType.Varint,
            "Guess type for a varint value failed",
        );
        assertGuessed(
            types.BigDecimal.fromString("1.01"),
            rust.CqlType.Decimal,
            "Guess type for a varint value failed",
        );
        assertGuessed(
            types.Integer.fromBuffer(utils.allocBufferFromArray([0xff])),
            rust.CqlType.Varint,
            "Guess type for a varint value failed",
        );
        assertGuessed(
            new types.InetAddress(utils.allocBufferFromArray([10, 10, 10, 2])),
            rust.CqlType.Inet,
            "Guess type for a inet value failed",
        );
        assertGuessed(
            new types.Tuple(1, 2, 3),
            rust.CqlType.Tuple,
            "Guess type for a tuple value failed",
        );
        assertGuessed(
            new types.LocalDate(2010, 4, 29),
            rust.CqlType.Date,
            "Guess type for a date value failed",
        );
        assertGuessed(
            new types.LocalTime(types.Long.fromString("6331999999911")),
            rust.CqlType.Time,
            "Guess type for a time value failed",
        );
        assertGuessed(
            new Float32Array([1.2, 3.4, 5.6]),
            rust.CqlType.Custom,
            "Guess type for a Float32 TypedArray value failed",
        );
        assertGuessed({}, null, "Objects must not be guessed");
    });

    function assertGuessed(value, expectedType, message) {
        let type = Encoder.guessDataType(value);
        assert.strictEqual(
            type === null ? null : type.code,
            expectedType,
            message + ": " + value,
        );
    }
});
