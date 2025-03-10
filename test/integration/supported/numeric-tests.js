"use strict";

const expect = require("chai").expect;
const Client = require("../../../lib/client");
const types = require("../../../lib/types");
const helper = require("../../test-helper");
const Uuid = types.Uuid;

const createTableNumericValuesCql = `CREATE TABLE tbl_numeric_values (
   id uuid PRIMARY KEY,
   bigint_value bigint,
   decimal_value decimal,
   double_value double,
   float_value float,
   varint_value varint,
   int_value int,
   timestamp_value timestamp)`;

const createTableNumericCollectionsCql = `CREATE TABLE tbl_numeric_collections (
   id uuid PRIMARY KEY,
   list_bigint list<bigint>,
   list_decimal list<decimal>,
   map_double map<text, double>,
   set_float set<float>,
   map_varint map<text, varint>,
   set_int set<int>)`;

// Exported to be called on other fixtures to take advantage from existing setups
module.exports = function (keyspace, prepare) {
    context("with numeric values", () => {
        const client = new Client({
            contactPoints: helper.baseOptions.contactPoints,
            localDataCenter: helper.baseOptions.localDataCenter,
            keyspace,
        });

        before(() => client.connect());
        before(() => client.execute(createTableNumericValuesCql));
        before(() => client.execute(createTableNumericCollectionsCql));
        after(() => client.shutdown());

        it("should support setting numeric values using strings", () => {
            const insertQuery = `INSERT INTO tbl_numeric_values
         (id, bigint_value, decimal_value, double_value, float_value, varint_value, int_value) VALUES
         (?, ?, ?, ?, ?, ?, ?)`;
            const hints = !prepare
                ? [
                      null,
                      "bigint",
                      "decimal",
                      "double",
                      "float",
                      "varint",
                      "int",
                  ]
                : null;
            const intValue = "1234567";
            const decimalValue = "1234567.875";
            const id = Uuid.random();

            const params = [
                id,
                intValue,
                decimalValue,
                decimalValue,
                decimalValue,
                intValue,
                intValue,
            ];

            return client
                .execute(insertQuery, params, { prepare, hints })
                .then(() =>
                    client.execute(
                        "SELECT * FROM tbl_numeric_values WHERE id = ?",
                        [id],
                    ),
                )
                .then((rs) => {
                    const row = rs.first();
                    ["bigint_value", "varint_value", "int_value"].forEach(
                        (columnName) =>
                            expect(row[columnName].toString()).to.be.equal(
                                intValue,
                            ),
                    );

                    ["decimal_value", "double_value", "float_value"].forEach(
                        (columnName) =>
                            expect(row[columnName].toString()).to.be.equal(
                                decimalValue,
                            ),
                    );
                });
        });

        it("should support setting numeric values using strings for collections", () => {
            const insertQuery = `INSERT INTO tbl_numeric_collections
         (id, list_bigint, list_decimal, map_double, set_float, map_varint, set_int) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const hints = !prepare
                ? [
                      null,
                      "list<bigint>",
                      "list<decimal>",
                      "map<text, double>",
                      "set<float>",
                      "map<text, varint>",
                      "set<int>",
                  ]
                : null;
            const intValue = "890";
            const decimalValue = "1234567.875";
            const id = Uuid.random();

            const params = [
                id,
                [intValue],
                [decimalValue],
                { a: decimalValue },
                [decimalValue],
                { a: intValue },
                [intValue],
            ];

            return client
                .execute(insertQuery, params, { prepare, hints })
                .then(() =>
                    client.execute(
                        "SELECT * FROM tbl_numeric_collections WHERE id = ?",
                        [id],
                    ),
                )
                .then((rs) => {
                    const row = rs.first();
                    expect(row["list_bigint"][0].toString()).to.be.equal(
                        intValue,
                    );
                    expect(row["list_decimal"][0].toString()).to.be.equal(
                        decimalValue,
                    );
                    expect(row["set_float"][0].toString()).to.be.equal(
                        decimalValue,
                    );
                    expect(row["set_int"][0].toString()).to.be.equal(intValue);
                });
        });

        it("should support setting BigInt values using strings", function () {
            if (typeof BigInt === "undefined") {
                return this.skip();
            }

            const client = new Client({
                contactPoints: helper.baseOptions.contactPoints,
                localDataCenter: helper.baseOptions.localDataCenter,
                keyspace,
                encoding: {
                    useBigIntAsVarint: true,
                    useBigIntAsLong: true,
                    set: Set,
                },
            });

            after(() => client.shutdown());

            const insertQuery =
                "INSERT INTO tbl_numeric_values (id, bigint_value, varint_value) VALUES (?, ?, ?)";
            const hints = !prepare ? [null, "bigint", "varint"] : null;
            const intValue = "9223372036854775807";
            const id = Uuid.random();

            return client
                .connect()
                .then(() =>
                    client.execute(insertQuery, [id, intValue, intValue], {
                        prepare,
                        hints,
                    }),
                )
                .then(() =>
                    client.execute(
                        "SELECT * FROM tbl_numeric_values WHERE id = ?",
                        [id],
                    ),
                )
                .then((rs) => {
                    const row = rs.first();
                    ["bigint_value", "varint_value"].forEach((columnName) =>
                        expect(row[columnName].toString()).to.be.equal(
                            intValue,
                        ),
                    );
                });
        });
    });

    context("when BigInt is supported by the engine", () => {
        if (typeof BigInt === "undefined") {
            return;
        }

        const client = new Client({
            contactPoints: helper.baseOptions.contactPoints,
            localDataCenter: helper.baseOptions.localDataCenter,
            keyspace,
            encoding: {
                useBigIntAsVarint: true,
                useBigIntAsLong: true,
                set: Set,
            },
        });

        before(() => client.connect());
        before(() =>
            client.execute(
                `CREATE TABLE tbl_integers (id1 text, id2 bigint, varint1 varint, list1 list<bigint>, set1 set<bigint>,
         set2 set<varint>, PRIMARY KEY ((id1, id2)))`,
            ),
        );
        after(() => client.shutdown());

        const int64TextValues = [
            "1",
            "0",
            "-1",
            "-128",
            "-256",
            "281474976710655",
            "109951162777712341",
            "-281474976710655",
            "-9223372036854775808",
            "9223372036854775807",
            "-73372036854775999",
            "4294967295",
            "-2147483648",
            "2147483647",
        ];

        const varintTextValues = [
            "309485009821345068724781055",
            "-309485009821345068724781055",
            "10071880159625853916579273765154",
            "-10071880159625853916579273765154",
            "10151108322140118254172817715490",
            "-10151108322140118254172817715490",
        ];

        it("should insert and retrieve BigInt type values", () =>
            Promise.all(
                int64TextValues.map((textValue) => {
                    const insertQuery =
                        "INSERT INTO tbl_integers (id1, id2, varint1, list1, set1, set2)" +
                        " VALUES (?, ?, ?, ?, ?, ?)";
                    const selectQuery =
                        "SELECT * FROM tbl_integers WHERE id1 = ? AND id2 = ?";
                    const hints = !prepare
                        ? [
                              "text",
                              "bigint",
                              "varint",
                              "list<bigint>",
                              "set<bigint>",
                              "set<varint>",
                          ]
                        : null;
                    const value = BigInt(textValue);
                    const params = [
                        textValue,
                        value,
                        value,
                        [value, value],
                        new Set([value]),
                        new Set([value]),
                    ];

                    return client
                        .execute(insertQuery, params, { hints, prepare })
                        .then(() =>
                            client.execute(selectQuery, [textValue, value], {
                                hints,
                                prepare,
                            }),
                        )
                        .then((rs) => {
                            const row = rs.first();
                            expect(row["id1"]).to.be.equal(value.toString());
                            expect(row["id2"]).to.be.equal(value);
                            expect(row["varint1"]).to.be.equal(value);
                            expect(row["list1"])
                                .to.be.an("array")
                                .to.have.all.members([value, value]);
                            expect(row["set1"])
                                .to.be.instanceOf(Set)
                                .and.to.have.all.keys(value);
                            expect(row["set2"])
                                .to.be.instanceOf(Set)
                                .and.to.have.all.keys(value);
                        });
                }),
            ));

        it("should insert and retrieve varint values larger than 64bits as BigInt", () =>
            Promise.all(
                varintTextValues.map((textValue) => {
                    const insertQuery =
                        "INSERT INTO tbl_integers (id1, id2, varint1, set2) VALUES (?, ?, ?, ?)";
                    const selectQuery =
                        "SELECT * FROM tbl_integers WHERE id1 = ? AND id2 = ?";
                    const hints = !prepare
                        ? ["text", "bigint", "varint", "set<varint>"]
                        : null;
                    const value = BigInt(textValue);
                    const params = [
                        textValue,
                        BigInt(0),
                        value,
                        new Set([value]),
                    ];

                    return client
                        .execute(insertQuery, params, { hints, prepare })
                        .then(() =>
                            client.execute(
                                selectQuery,
                                [textValue, BigInt(0)],
                                {
                                    hints,
                                    prepare,
                                },
                            ),
                        )
                        .then((rs) => {
                            const row = rs.first();
                            expect(row["id1"]).to.be.equal(value.toString());
                            expect(row["varint1"]).to.be.equal(value);
                            expect(row["set2"])
                                .to.be.instanceOf(Set)
                                .and.to.have.all.keys(value);
                        });
                }),
            ));

        it("should insert and retrieve timestamp values", () => {
            const insertQuery =
                "INSERT INTO tbl_numeric_values (id, timestamp_value) VALUES (?, ?)";
            const selectQuery = "SELECT * FROM tbl_numeric_values WHERE id = ?";
            const id = Uuid.random();
            const date = new Date();

            return client
                .execute(insertQuery, [id, date], { prepare })
                .then(() => client.execute(selectQuery, [id], { prepare }))
                .then((rs) => {
                    const row = rs.first();
                    expect(row).to.be.instanceOf(types.Row);
                    expect(row["timestamp_value"].getTime()).to.be.equal(
                        date.getTime(),
                    );
                });
        });
    });
};
