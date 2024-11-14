"use strict";
const { assert } = require("chai");
const rust = require("../../index");
const { getCqlObject } = require("../../lib/types/results-wrapper");
const Uuid = require("../../lib/types/uuid");
const TimeUuid = require("../../lib/types/time-uuid");
const Duration = require("../../lib/types/duration");
const LocalTime = require("../../lib/types/local-time");
const Long = require("long");

const maxI64 = BigInt("9223372036854775807");
const maxI32 = Number(2147483647);

describe("Cql value wrapper", function () {
    it("should get ascii type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperAscii();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Ascii);
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Ascii("test value".to_owned()); */
        assert.strictEqual(value, "test value");
    });

    it("should get boolean type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperBoolean();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Boolean);
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Boolean(false); */
        assert.strictEqual(value, false);
    });

    it("should get blob type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperBlob();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Blob);
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Blob((0..4).collect()); */
        let expected = Buffer.from([0, 1, 2, 3]);
        assert.deepEqual(value, expected);
    });

    it("should get counter type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperCounter();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Counter);
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Counter(Counter(i64::MAX)); */
        assert.strictEqual(value, maxI64);
    });

    it("should get double type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDouble();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Double);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Double(f64::MAX); */
        assert.strictEqual(value, Number.MAX_VALUE);
    });

    it("should get duration type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDuration();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Duration);
        let value = getCqlObject(element);
        assert.instanceOf(value, Duration);
        /* Corresponding value: 
        let element = CqlValue::Duration(CqlDuration {
            months: 1,
            days: 2,
            nanoseconds: 3,
        }); */
        let expected_duration = new Duration(1, 2, 3);
        assert.equal(expected_duration.equals(value), true);
    });

    it("should get float type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperFloat();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Float);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Float(0_f32); */
        assert.strictEqual(value, Number(0));
    });

    it("should get int type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperInt();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Int);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Int(i32::MAX); */
        assert.strictEqual(value, maxI32);
    });

    it("should get text type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperText();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Text);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Text("".to_owned()); */
        assert.strictEqual(value, "");
    });

    it("should get set type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperSet();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Set);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Set(vec![
            CqlValue::Text("some text".to_owned()),
            CqlValue::Int(1),
        ]); */
        assert.deepEqual(value, ["some text", Number(1)]);
    });

    it("should get small int type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperSmallInt();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.SmallInt);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::SmallInt(-1); */
        assert.strictEqual(value, Number(-1));
    });

    it("should get tiny int type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTinyInt();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.TinyInt);
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::TinyInt(3); */
        assert.strictEqual(value, Number(3));
    });

    it("should get uuid type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperUuid();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Uuid);
        let value = getCqlObject(element);
        assert.instanceOf(value, Uuid);
        /* Corresponding value: 
        let element = CqlValue::Uuid(uuid!("ffffffff-ffff-ffff-ffff-ffffffffffff")); */
        let expectedUuid = Uuid.fromString(
            "ffffffff-ffff-ffff-ffff-ffffffffffff",
        );
        assert.equal(value.equals(expectedUuid), true);
    });

    it("should get time uuid type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTimeUuid();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Timeuuid);
        let value = getCqlObject(element);
        assert.instanceOf(value, TimeUuid);
        /* Corresponding value: 
        let element =
        CqlValue::Timeuuid(CqlTimeuuid::from_str("8e14e760-7fa8-11eb-bc66-000000000001").unwrap()); */
        let expectedUuid = TimeUuid.fromString(
            "8e14e760-7fa8-11eb-bc66-000000000001",
        );
        assert.equal(value.equals(expectedUuid), true);
    });

    it("should get LocalTime type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTime();
        let type = element.getType();
        assert.strictEqual(type, rust.CqlType.Time);
        let value = getCqlObject(element);
        assert.instanceOf(value, LocalTime);
        /* Corresponding value: 
        let element = CqlValue::Time(CqlTime(64 * 1_000_000_000)); */
        let expectedLocalTime = new LocalTime(Long.fromString("64000000000"));
        assert.equal(value.equals(expectedLocalTime), true);
    });
});
