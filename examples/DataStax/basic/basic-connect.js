"use strict";
const cassandra = require("scylladb-javascript-driver");
const { getClientArgs } = require("../util");

const client = new cassandra.Client(getClientArgs());
client
    .connect()
    .then(function () {
        console.log("Connected to cluster.");

        console.log("Shutting down");
        return client.shutdown();
    })
    .catch(function (err) {
        console.error("There was an error when connecting", err);
        return client.shutdown().then(() => {
            throw err;
        });
    });
