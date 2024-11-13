"use strict";
const { assert } = require("chai");
const rust = require("../../index");

describe("Rust bigint_to_i64", function () {
    it("should get the i64 value correctly from bigint", function () {
        const cases = [
            ["0", 0],
            ["-1", 1],
            ["5", 2],
            ["-5", 3],
            ["9223372036854775807", 4],
            ["-9223372036854775808", 5],
            ["-9223372036854775807", 6],
        ];

        cases.forEach((test) => {
            rust.testsBigintToI64(BigInt(test[0]), test[1]);
        });
    });

    it("should throw error when value overflows i64", function () {
        const cases = [
            "9223372036854775808",
            "-9223372036854775809",
            "99999999999999999999999999999999",
            "-99999999999999999999999999999999",
        ];
        cases.forEach((test) => {
            assert.throw(
                () => rust.testsBigintToI64(BigInt(test)),
                "Overflow expected",
            );
        });
    });
});
