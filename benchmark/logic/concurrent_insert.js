"use strict";
const async = require("async");
// Possible values of argv[2] (driver) are scylladb-javascript-driver and cassandra-driver.
const cassandra = require(process.argv[2]);
const { getClientArgs } = require("./utils");
const { exit } = require("process");
const assert = require("assert");

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
            let allParameters = [];
            for (let i = 0; i < iterCnt; i++) {
                allParameters.push({
                    query: 'INSERT INTO benchmarks.basic (id, val) VALUES (?, ?)',
                    params: [cassandra.types.Uuid.random(), 10]
                });
            }
            try {
                const _result = await cassandra.concurrent.executeConcurrent(client, allParameters, {prepare: true});
            } catch (err) {
                return next(err);
            }
            next();
        },
        async function test(next) {
            const query = "SELECT COUNT(1) FROM benchmarks.basic USING TIMEOUT 120s;";
            try {
                let res = await client.execute(query);
                assert(res.rows[0].count == iterCnt);
            } catch (err) {
                return next(err);
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

