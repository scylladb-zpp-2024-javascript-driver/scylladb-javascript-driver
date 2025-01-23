"use strict";
const async = require("async");
const cassandra = require("scylladb-javascript-driver");
const { getClientArgs } = require("./utils");
const { exit } = require("process");
const { assert } = require("console");
const Long = require("long");
const { randomInt } = require("crypto");

const client = new cassandra.Client(getClientArgs());
const iterCnt = 10000;

async.series(
    [
        function connect(next) {
            client.connect(next);
        },
        function createKeyspace(next) {
            // Keep replication one to reduce time spent in the database
            const query =
                "CREATE KEYSPACE IF NOT EXISTS benchmarks WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1' }";
            client.execute(query, next);
        },
        // Drop tabele to ensure no overhead comes from having already some data in the database
        function dropTable(next) {
            const query =
                "DROP TABLE IF EXISTS benchmarks.basic";
            client.execute(query, next);
        },
        function createTable(next) {
            const query =
                "CREATE TABLE benchmarks.basic (id uuid, val int, PRIMARY KEY(id))";
            client.execute(query, next);
        },
        async function insert(next) {
            let allParameters = [];
            for (let i = 0; i < iterCnt; i++) {
                allParameters.push({
                    query: 'INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)',
                    params: [cassandra.types.Uuid.random(), randomInt(1 << 30 - 1)]
                });
            }
            const _result = await cassandra.concurrent.executeConcurrent(client, allParameters);
            next();
        },
        async function test(next) {
            const query = "SELECT COUNT(1) FROM benchmarks.basic USING TIMEOUT 120s;";
            let res = await client.execute(query);
            console.log(res.rows[0].count)
            assert(Long.fromInt(iterCnt).equals(res.rows[0].count));
            next();
        },
        function r() {
            exit(0);
        }
    ]);

// Exit on unhandledRejection
process.on("unhandledRejection", (reason) => {
    throw reason;
});
