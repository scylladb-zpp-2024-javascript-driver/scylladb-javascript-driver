"use strict";
const assert = require("assert");
const types = require("../../lib/types");

describe("Tuple", function () {
    const Tuple = types.Tuple;
    describe("#constructor()", function () {
        it("should throw an error when no arguments are provided", function () {
            assert.throws(() => new Tuple(), TypeError);
        });
    });
    describe("#get()", function () {
        it("should return the element at position", function () {
            const t = new Tuple("first", "second");
            assert.strictEqual(t.get(0), "first");
            assert.strictEqual(t.get(1), "second");
            assert.strictEqual(t.get(2), undefined);
            assert.strictEqual(t.length, 2);
        });
    });
    describe("#toString()", function () {
        it("should return the string of the elements surrounded by parenthesis", function () {
            const id = types.Uuid.random();
            const decimal = types.BigDecimal.fromString("1.2");
            const t = new Tuple(id, decimal, 0);
            assert.strictEqual(
                t.toString(),
                "(" + id.toString() + "," + decimal.toString() + ",0)",
            );
        });
    });
    describe("#toJSON()", function () {
        it("should return the string of the elements surrounded by square brackets", function () {
            const id = types.TimeUuid.now();
            const decimal = types.BigDecimal.fromString("-1");
            const t = new Tuple(id, decimal, 1, { z: 1 });
            assert.strictEqual(
                JSON.stringify(t),
                '["' +
                    id.toString() +
                    '","' +
                    decimal.toString() +
                    '",1,{"z":1}]',
            );
        });
    });
    describe("#values()", function () {
        it("should return the Array representation of the Tuple", function () {
            const t = new Tuple("first2", "second2", "third2");
            assert.strictEqual(t.length, 3);
            const values = t.values();
            assert.ok(Array.isArray(values));
            assert.strictEqual(values.length, 3);
            assert.strictEqual(values[0], "first2");
            assert.strictEqual(values[1], "second2");
            assert.strictEqual(values[2], "third2");
        });
        it("when modifying the returned Array the Tuple should not change its values", function () {
            const t = new Tuple("first3", "second3", "third3");
            const values = t.values();
            assert.strictEqual(values.length, 3);
            values[0] = "whatever";
            values.shift();
            assert.strictEqual(t.get(0), "first3");
            assert.strictEqual(t.get(1), "second3");
            assert.strictEqual(t.get(2), "third3");
        });
    });

    describe("fromArray()", () => {
        it("should return a Tuple instance using the Array items as elements", () => {
            [["a"], ["a", "b"], ["a", "b", "c"]].forEach((items) => {
                const tuple = Tuple.fromArray(items);
                // The Array instance should not be the same
                assert.notStrictEqual(tuple.elements, items);
                // The elements should be the same
                assert.deepStrictEqual(tuple.elements, items);
            });
        });
    });
});
