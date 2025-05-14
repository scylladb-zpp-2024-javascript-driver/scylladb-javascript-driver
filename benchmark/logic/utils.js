"use strict";

const { _Client } = require("../../main");

const tableSchemaBasic = "CREATE TABLE benchmarks.basic (id uuid, val int, PRIMARY KEY(id))";

function getClientArgs() {
    return {
        contactPoints: [process.env.SCYLLA_URI ?? "172.17.0.2:9042"],
        localDataCenter: process.env.DATACENTER ?? "datacenter1",
    };
}

/**
 * 
 * @param {_Client} client 
 * @param {string} tableDefinition
 * @param {Function} next 
 */
async function prepareDatabase(client, tableDefinition, next) {
    await client.connect();

    // Keep replication one to reduce time spent in the database
    const query =
        "CREATE KEYSPACE IF NOT EXISTS benchmarks WITH replication = {'class': 'NetworkTopologyStrategy', 'replication_factor': '1' }";
    await client.execute(query);

    // Drop table to ensure no overhead comes from having already some data in the database
    const dropTable =
        "DROP TABLE IF EXISTS benchmarks.basic";
    await client.execute(dropTable);

    await client.execute(tableDefinition);

    next();
}

exports.tableSchemaBasic = tableSchemaBasic;
exports.getClientArgs = getClientArgs;
exports.prepareDatabase = prepareDatabase;
