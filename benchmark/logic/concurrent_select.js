"use strict";
const async = require("async");
// Possible values of argv[2] (driver) are scylladb-javascript-driver and cassandra-driver.
const cassandra = require(process.argv[2]);
const { getClientArgs } = require("./utils");
const { exit } = require("process");

const client = new cassandra.Client(getClientArgs());
const iterCnt = parseInt(process.argv[3]); 

async.series(
    [
        function connect(next) {
            client.connect(next);
        },
        function createKeyspace(next) {
            // Keep replication one to reduce time spent in the database
            const query =
                "CREATE KEYSPACE IF NOT EXISTS benchmarks WITH replication = {'class': 'NetworkTopologyStrategy', 'replication_factor': '1' }";
            client.execute(query, next);
        },
        // Drop table to ensure no overhead comes from having already some data in the database
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
                await client.execute(query, [id, 100], {prepare: true});
            }
            next();
        },
        async function select(next) {
            
            let allParameters = [];
            for (let i = 0; i < iterCnt; i++) {
                allParameters.push({
                    query: 'SELECT * FROM benchmarks.basic',
                });
            }
            const _result = await cassandra.concurrent.executeConcurrent(client, allParameters, {prepare: true});
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
