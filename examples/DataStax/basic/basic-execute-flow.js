"use strict";
const cassandra = require("cassandra-driver");
const async = require("async");

const client = new cassandra.Client({
    contactPoints: [process.env.SCYLLA_URI ?? "172.17.0.2:9042"],
    localDataCenter: "datacenter1"
});

const id = cassandra.types.Uuid.random();

async.series(
    [
        function connect(next) {
            client.connect(next);
        },
        function createKeyspace(next) {
            const query =
                "CREATE KEYSPACE IF NOT EXISTS buggy WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1' }";
            client.execute(query, next);
        },
        function del(next) {
            const query =
                "DROP TABLE IF EXISTS buggy.bug";
            client.execute(query, next);
        },
        function createTable(next) {
            const query =
                "CREATE TABLE IF NOT EXISTS buggy.bug (id uuid PRIMARY KEY, tuple_col1 tuple<text,int>)";
            client.execute(query, next);
        },
        function insert(next) {
            const tuple = new cassandra.types.Tuple("XD");
            const query =
                "INSERT INTO buggy.bug (id, tuple_col1) VALUES (?, ?)";
            client.execute(query, [id, tuple], { prepare: true }, next);
        },
    ],
    function (err) {
        if (err) {
            console.error("There was an error", err.message, err.stack);
        }
        console.log("Shutting down");
    },
);
