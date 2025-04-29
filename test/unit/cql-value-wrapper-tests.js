"use strict";
const { assert } = require("chai");
const rust = require("../../index");
const { getCqlObject } = require("../../lib/types/results-wrapper");
const Uuid = require("../../lib/types/uuid");
const TimeUuid = require("../../lib/types/time-uuid");
const Duration = require("../../lib/types/duration");
const LocalTime = require("../../lib/types/local-time");
const Long = require("long");
const InetAddress = require("../../lib/types/inet-address");
const LocalDate = require("../../lib/types/local-date");
const Tuple = require("../../lib/types/tuple");
const BigDecimal = require("../../lib/types/big-decimal");

const maxI64 = BigInt("9223372036854775807");
const maxI32 = Number(2147483647);

describe("Cql value wrapper", function () {
    it("should get ascii type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperAscii();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Ascii("test value".to_owned()); */
        assert.strictEqual(value, "test value");
    });

    it("should get bigInt type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperBigint();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::BigInt(69); */
        assert.strictEqual(Long.fromString("69").equals(value), true);
    });

    it("should get boolean type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperBoolean();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Boolean(false); */
        assert.strictEqual(value, false);
    });

    it("should get blob type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperBlob();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Blob((0..4).collect()); */
        let expected = Buffer.from([0, 1, 2, 3]);
        assert.deepEqual(value, expected);
    });

    it("should get counter type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperCounter();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Counter(Counter(i64::MAX)); */
        assert.strictEqual(value, maxI64);
    });

    it("should get decimal type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDecimal();
        let value = getCqlObject(element);
        assert.instanceOf(value, BigDecimal);
        /* Corresponding value:
        let element = CqlValue::Decimal(CqlDecimal::from_signed_be_bytes_slice_and_exponent(
            &[
                1, 53, 169, 169, 173, 175, 83, 216, 15, 110, 137, 47, 175, 202, 192, 196, 222, 179,
                11, 93, 98, 127, 51, 6, 161, 141, 90, 11, 80, 251, 28,
            ],
            69,
        ));
        */
        let expectedDecimal = BigDecimal.fromString(
            "2137.213721372137213721372137213721372137213721372137213721372137213721372",
        );
        assert.equal(value.equals(expectedDecimal), true);
    });

    it("should get decimal type with negative sign correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDecimalNegative();
        let value = getCqlObject(element);
        assert.instanceOf(value, BigDecimal);
        /* Corresponding value:
        let element = CqlValue::Decimal(CqlDecimal::from_signed_be_bytes_slice_and_exponent(&[246], 0));
        */
        let expectedDecimal = BigDecimal.fromString("-10");
        assert.equal(value.equals(expectedDecimal), true);
    });

    it("should get decimal type with negative exponent correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDecimalNegativeExponent();
        let value = getCqlObject(element);
        assert.instanceOf(value, BigDecimal);
        /* Corresponding value:
        let element = CqlValue::Decimal(CqlDecimal::from_signed_be_bytes_slice_and_exponent(&[69], -10));
        */
        let expectedDecimal = new BigDecimal(69, -10);
        assert.equal(value.equals(expectedDecimal), true);
    });

    it("should get LocalDate type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDate();
        let value = getCqlObject(element);
        assert.instanceOf(value, LocalDate);
        /* Corresponding value: 
        let element = CqlValue::Date(CqlDate((1 << 31) + 7)); */
        let expectedLocalDate = new LocalDate(7);
        assert.equal(value.equals(expectedLocalDate), true);
    });

    it("should get double type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDouble();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Double(f64::MAX); */
        assert.strictEqual(value, Number.MAX_VALUE);
    });

    it("should get duration type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperDuration();
        let value = getCqlObject(element);
        assert.instanceOf(value, Duration);
        /* Corresponding value: 
        let element = CqlValue::Duration(CqlDuration {
            months: 1,
            days: 2,
            nanoseconds: 3,
        }); */
        let expectedDuration = new Duration(1, 2, 3);
        assert.equal(expectedDuration.equals(value), true);
    });

    it("should get float type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperFloat();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Float(0_f32); */
        assert.strictEqual(value, Number(0));
    });

    it("should get int type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperInt();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Int(i32::MAX); */
        assert.strictEqual(value, maxI32);
    });

    it("should get text type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperText();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Text("".to_owned()); */
        assert.strictEqual(value, "");
    });

    it("should get timestamp type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTimestamp();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Timestamp(CqlTimestamp(1_000_000_i64)); */
        assert.strictEqual(
            value.toISOString(),
            new Date(1000000).toISOString(),
        );
    });

    it("should get list type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperList();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::List(vec![
            CqlValue::Duration(CqlDuration {
                months: 6,
                days: 5,
                nanoseconds: 4,
            }),
            CqlValue::Boolean(false),
        ]); */
        let expectedDuration = new Duration(6, 5, 4);
        assert.strictEqual(Array.isArray(value), true);
        assert.strictEqual(value.length, 2);
        assert.strictEqual(expectedDuration.equals(value[0]), true);
        assert.strictEqual(value[1], false);
    });

    it("should get set type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperSet();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::Set(vec![
            CqlValue::Text("some text".to_owned()),
            CqlValue::Int(1),
        ]); */
        assert.deepEqual(value, ["some text", Number(1)]);
    });

    it("should get map type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperMap();
        let value = getCqlObject(element);
        /* Corresponding value:
        let element = CqlValue::Map(vec![(
            CqlValue::Uuid(uuid!("ffffffff-ffff-ffff-eeee-ffffffffffff")),
            CqlValue::Int(1999),
        )]); */
        assert.deepEqual(typeof value, "object");
        let tm = Uuid.fromString("ffffffff-ffff-ffff-eeee-ffffffffffff");
        let z = {};
        z[tm] = 1999;
        assert.deepStrictEqual(value, z);
    });

    it("should get small int type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperSmallInt();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::SmallInt(-1); */
        assert.strictEqual(value, Number(-1));
    });

    it("should get tiny int type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTinyInt();
        let value = getCqlObject(element);
        /* Corresponding value: 
        let element = CqlValue::TinyInt(3); */
        assert.strictEqual(value, Number(3));
    });

    it("should get uuid type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperUuid();
        let value = getCqlObject(element);
        assert.instanceOf(value, Uuid);
        /* Corresponding value: 
        let element = CqlValue::Uuid(uuid!("ffffffff-ffff-ffff-ffff-ffffffffffff")); */
        let expectedUuid = Uuid.fromString(
            "ffffffff-ffff-ffff-ffff-ffffffffffff",
        );
        assert.equal(value.equals(expectedUuid), true);
    });

    it("should get tuple type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTuple();
        let value = getCqlObject(element);
        assert.instanceOf(value, Tuple);
        /* Corresponding value:
        let element = CqlValue::Tuple(vec![
            Some(CqlValue::Text("some text".to_owned())),
            Some(CqlValue::Int(1)),
            None,
        ]); */
        assert.strictEqual(value.length, 3);
        console.log(value.get(0));
        assert.strictEqual(value.get(0), "some text");
        assert.strictEqual(value.get(1), 1);
        assert.strictEqual(value.get(2), undefined);
    });

    it("should get time uuid type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperTimeUuid();
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
        let value = getCqlObject(element);
        assert.instanceOf(value, LocalTime);
        /* Corresponding value: 
        let element = CqlValue::Time(CqlTime(64 * 1_000_000_000)); */
        let expectedLocalTime = new LocalTime(Long.fromString("64000000000"));
        assert.equal(value.equals(expectedLocalTime), true);
    });

    it("should get inet type correctly from napi", function () {
        let element = rust.testsGetCqlWrapperInet();
        let value = getCqlObject(element);
        assert.instanceOf(value, InetAddress);
        /* Corresponding value: 
        let element = CqlValue::Inet(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))); */
        let expectedInet = InetAddress.fromString("127.0.0.1");
        assert.strictEqual(value.equals(expectedInet), true);
    });
});
