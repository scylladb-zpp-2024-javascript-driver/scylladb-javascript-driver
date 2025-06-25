"use strict";
const cassandra = require("scylladb-javascript-driver");
const { getClientArgs } = require("../DataStax/util");

const client = new cassandra.Client(getClientArgs());

/**
 * Creates a table with a Tuple type, inserts a row and selects a row.
 */
client
    .connect()
    .then(function () {
        const query =
            "CREATE KEYSPACE IF NOT EXISTS examples WITH replication =" +
            "{'class': 'NetworkTopologyStrategy', 'replication_factor': '1' }";
        return client.execute(query);
    })
    .then(function () {
        const query =
            "CREATE TABLE IF NOT EXISTS examples.tuple_forex " +
            "(name text, time timeuuid, currencies frozen<tuple<text, text>>, PRIMARY KEY (name, time))";
        return client.execute(query);
    })
    .then(function () {
        console.log("Inserting");
        // Create a new instance of a Tuple
        const currencies = new cassandra.types.Tuple("USD", "EUR");
        const query =
            "INSERT INTO examples.tuple_forex (name, time, currencies)  VALUES (?, ?, ?)";
        const params = ["market1", cassandra.types.TimeUuid.now(), currencies];
        return client.execute(query, params, { prepare: true });
    })
    .then(function () {
        const query =
            "SELECT name, time, currencies, FROM examples.tuple_forex where name = ?";
        return client.execute(query, ["market1"], { prepare: true });
    })
    .then(function (result) {
        const row = result.first();
        console.log(
            `${row["currencies"].get(0)} to ${row["currencies"].get(1)}`,
        );
    })
    .catch(function (err) {
        console.error("There was an error", err);
    });
