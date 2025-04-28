"use strict";
const rust = require("../../index");
const { getWrapped } = require("../../lib/types/cql-utils");
const utils = require("../../lib/utils");
const Duration = require("../../lib/types/duration");
const InetAddress = require("../../lib/types/inet-address");
const LocalTime = require("../../lib/types/local-time");
const TimeUuid = require("../../lib/types/time-uuid");
const Tuple = require("../../lib/types/tuple");
const Uuid = require("../../lib/types/uuid");
const Long = require("long");
const Integer = require("../../lib/types/integer");
const { types } = require("../../main");

const maxI64 = BigInt("9223372036854775807");

const testCases = [
    ["Ascii", "Some arbitrary value"],
    ["BigInt", maxI64],
    ["Boolean", false],
    ["Blob", utils.allocBufferFromArray([0, 1, 2, 3])],
    ["Counter", 921],
    ["Double", 21.37],
    ["Duration", new Duration(21, 3, 7)],
    ["Float", 111.222],
    ["Int", -1234],
    ["Text", "Nonsense"],
    ["Timestamp", 0],
    [
        "Inet",
        new InetAddress(utils.allocBufferFromArray([0x12, 0x34, 0x56, 0x78])),
    ],
    ["List", ["Test value", "Some other funny value"]],
    ["Map", { Text: 0.1, Text2: 0.2 }],
    ["Set", [4, 7, 15]],
    ["SmallInt", 1],
    ["TinyInt", -1],
    ["Time", new LocalTime(Long.fromInt(4312))],
    ["Timeuuid", TimeUuid.fromString("8e14e760-7fa8-11eb-bc66-000000000001")],
    ["Tuple", new Tuple("First", new Tuple(1, 2), null)],
    ["Uuid", Uuid.fromString("ffffffff-eeee-ffff-ffff-ffffffffffff")],
    [
        "Varint",
        Integer.fromString(
            "4540866244600635114649842549360310111892940575123159374096375843447573711370",
            10,
        ),
    ],
    [
        "Varint",
        BigInt(
            "4540866244600635114649842549360310111892940575123159374096375843447573711370",
        ),
    ],
];

describe("Should correctly convert ", function () {
    describe("some set values into Parameter wrapper", function () {
        testCases.forEach((test) => {
            it(test[0], function () {
                let value = test[1];
                let expectedType = rust.testsFromValueGetType(test[0]);
                let converted = getWrapped(expectedType, value);
                // Assertion appears in rust code
                rust.testsFromValue(test[0], converted);
            });
        });
    });

    describe("some unset value", function () {
        it("with type", function () {
            let someType = rust.testsFromValueGetType(testCases[0][0]);
            let wrapped = getWrapped(someType, types.unset);
            // Assertion appears in rust code
            rust.testsParametersWrapperUnset(wrapped);
        });
        it("without type", function () {
            let wrapped = getWrapped(null, types.unset);
            // Assertion appears in rust code
            rust.testsParametersWrapperUnset(wrapped);
        });
    });

    describe("none value", function () {
        it("with type", function () {
            let someType = rust.testsFromValueGetType(testCases[0][0]);
            let wrapped = getWrapped(someType, null);
            // Assertion appears in rust code
            rust.testsParametersWrapperNull(wrapped);
        });
        it("without type", function () {
            let wrapped = getWrapped(null, null);
            // Assertion appears in rust code
            rust.testsParametersWrapperNull(wrapped);
        });
    });
});
