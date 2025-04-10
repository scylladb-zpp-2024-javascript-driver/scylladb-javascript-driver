"use strict";
const { assert } = require("chai");
const util = require("util");

const types = require("../../lib/types");
const { dataTypes } = types;
const utils = require("../../lib/utils");
const helper = require("../test-helper");

describe("Row", function () {
    it("should get the value by column name or index", function () {
        const columns = [
            { name: "first", type: { code: dataTypes.varchar } },
            { name: "second", type: { code: dataTypes.varchar } },
        ];
        const row = new types.Row(columns);
        row["first"] = "hello";
        row["second"] = "world";
        assert.ok(row.get, "It should contain a get method");
        assert.strictEqual(row["first"], "hello");
        assert.strictEqual(row.get("first"), row["first"]);
        assert.strictEqual(row.get(0), row["first"]);
        assert.strictEqual(row.get("second"), row["second"]);
        assert.strictEqual(row.get(1), row["second"]);
    });
    it("should get the value by column name or index with new interface", function () {
        const columns = ["first", "second"];
        const row = new types.Row(columns);
        row["first"] = "hello";
        row["second"] = "world";
        assert.ok(row.get, "It should contain a get method");
        assert.strictEqual(row["first"], "hello");
        assert.strictEqual(row.get("first"), row["first"]);
        assert.strictEqual(row.get(0), row["first"]);
        assert.strictEqual(row.get("second"), row["second"]);
        assert.strictEqual(row.get(1), row["second"]);
    });
    it("should enumerate only columns defined", function () {
        const columns = [
            { name: "col1", type: { code: dataTypes.varchar } },
            { name: "col2", type: { code: dataTypes.varchar } },
        ];
        const row = new types.Row(columns);
        row["col1"] = "val1";
        row["col2"] = "val2";
        assert.strictEqual(
            JSON.stringify(row),
            JSON.stringify({ col1: "val1", col2: "val2" }),
        );
    });
    it("should be serializable to json", function () {
        let i;
        let columns = [
            { name: "col1", type: { code: dataTypes.varchar } },
            { name: "col2", type: { code: dataTypes.varchar } },
        ];
        let row = new types.Row(columns, [
            utils.allocBufferFromString("val1"),
            utils.allocBufferFromString("val2"),
        ]);
        row["col1"] = "val1";
        row["col2"] = "val2";
        assert.strictEqual(
            JSON.stringify(row),
            JSON.stringify({ col1: "val1", col2: "val2" }),
        );

        columns = [
            { name: "cid", type: { code: dataTypes.uuid } },
            { name: "ctid", type: { code: dataTypes.timeuuid } },
            { name: "clong", type: { code: dataTypes.bigint } },
            { name: "cvarint", type: { code: dataTypes.varint } },
        ];
        let rowValues = [
            types.Uuid.random(),
            types.TimeUuid.now(),
            types.Long.fromNumber(1000),
            types.Integer.fromNumber(22),
        ];
        row = new types.Row(columns);
        for (i = 0; i < columns.length; i++) {
            row[columns[i].name] = rowValues[i];
        }
        let expected = util.format(
            '{"cid":"%s","ctid":"%s","clong":"1000","cvarint":"22"}',
            rowValues[0].toString(),
            rowValues[1].toString(),
        );
        assert.strictEqual(JSON.stringify(row), expected);
        rowValues = [
            types.BigDecimal.fromString("1.762"),
            new types.InetAddress(utils.allocBufferFromArray([192, 168, 0, 1])),
            null,
        ];
        columns = [
            { name: "cdecimal", type: { code: dataTypes.decimal } },
            { name: "inet1", type: { code: dataTypes.inet } },
            { name: "inet2", type: { code: dataTypes.inet } },
        ];
        row = new types.Row(columns);
        for (i = 0; i < columns.length; i++) {
            row[columns[i].name] = rowValues[i];
        }
        expected = '{"cdecimal":"1.762","inet1":"192.168.0.1","inet2":null}';
        assert.strictEqual(JSON.stringify(row), expected);
    });
    it("should have values that can be inspected", function () {
        const columns = [
            { name: "col10", type: { code: dataTypes.varchar } },
            { name: "col2", type: { code: dataTypes.int } },
        ];
        const row = new types.Row(columns);
        row["col10"] = "val1";
        row["col2"] = 2;
        helper.assertContains(
            util.inspect(row),
            util.inspect({ col10: "val1", col2: 2 }),
        );
    });
});
