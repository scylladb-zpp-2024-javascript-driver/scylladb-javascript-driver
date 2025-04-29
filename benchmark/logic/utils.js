"use strict";
const utils = require("../../lib/utils");

function getClientArgs() {
    return {
        contactPoints: [process.env.SCYLLA_URI ?? "172.17.0.2:9042"],
        localDataCenter: process.env.DATACENTER ?? "datacenter1",
    };
}


function insertDeSer(cassandra) {
    const id = cassandra.types.Uuid.random();
    const tuid = cassandra.types.TimeUuid.fromString("8e14e760-7fa8-11eb-bc66-000000000001");
    const ip = new cassandra.types.InetAddress(utils.allocBufferFromArray([198, 168, 1, 1]));
    const date = cassandra.types.LocalDate.now();
    const time = cassandra.types.LocalTime.now();

    return [id, 100, tuid, ip, date, time];
}

function insertConcurrentDeSer(cassandra, n) {
    let allParameters = [];
    for (let i = 0; i < n; i++) {
        allParameters.push({
            query: "INSERT INTO benchmarks.basic (id, val, tuuid, ip, date, time) VALUES (?, ?, ?, ?, ?, ?)",
            params: insertDeSer(cassandra)
        });
    }
    return allParameters;
}
exports.getClientArgs = getClientArgs;
exports.insertDeSer = insertDeSer;
exports.insertConcurrentDeSer = insertConcurrentDeSer;
