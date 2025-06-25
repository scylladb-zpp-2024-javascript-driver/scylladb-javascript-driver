"use strict";
const async = require("async");
// Possible values of argv[2] (driver) are scylladb-javascript-driver and cassandra-driver.
const cassandra = require(process.argv[2]);
const utils = require("./utils");
const { exit } = require("process");

const client = new cassandra.Client(utils.getClientArgs());
const iterCnt = parseInt(process.argv[3]);

async.series(
    [
        function initialize(next) {
            utils.prepareDatabase(client, utils.tableSchemaBasic, next);
        },
        async function insert(next) {
            let query =
                "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";
            for (let i = 0; i < 10; i++) {
                let id = cassandra.types.Uuid.random();
                try {
                    await client.execute(query, [id, 100], { prepare: true });
                } catch (err) {
                    return next(err);
                }
            }
            next();
        },
        async function query(next) {
            const query = "SELECT * FROM benchmarks.basic";
            for (let i = 0; i < iterCnt; i++) {
                try {
                    await client.execute(query);
                } catch (err) {
                    return next(err);
                }
            }
            next();
        },
        function r() {
            exit(0);
        }

    ], function (err) {
        if (err) {
            console.error("Error: ", err.message, err.stack);
            exit(1);
        }
    },);

