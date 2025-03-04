"use strict";
const async = require("async");
// scylladb-javascript-driver, cassandra-driver
const cassandra = require(process.argv[2]);
const { getClientArgs } = require("./utils");
const { exit } = require("process");
const { assert } = require("console");

const client = new cassandra.Client(getClientArgs());
const iter_cnt = 100000;

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
            let all_parameters = [];
            for (let i = 0; i < iter_cnt; i++) {
                all_parameters.push({
                    query: 'INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)',
                    params: [cassandra.types.Uuid.random(), 10]
                });
            }
            const result = await cassandra.concurrent.executeConcurrent(client, all_parameters);
            next();
        },
        async function test(next) {
            const query = "SELECT COUNT(1) FROM benchmarks.basic USING TIMEOUT 120s;";
            let res = await client.execute(query);
            assert(res.rows[0].count == `BigInt(${iter_cnt})`);
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
