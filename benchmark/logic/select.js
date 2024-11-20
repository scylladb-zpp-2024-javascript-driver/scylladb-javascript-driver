"use strict";
const async = require("async");
const cassandra = require("scylladb-javascript-driver");
const { getClientArgs } = require("./utils");
const { exit } = require("process");

const client = new cassandra.Client(getClientArgs());


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
            let query =
                "INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)";
            for (let i = 0; i < 10; i++) {
                let id = cassandra.types.Uuid.random();
                await client.execute(query, [id, 100]);
            }
            next();
        },
        async function query(next) {
            const query = "SELECT * FROM benchmarks.basic";
            for (let i = 0; i < 10000; i++) {
                let res = await client.execute(query);
            }
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
