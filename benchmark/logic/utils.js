"use strict";

const singleStepCount = 1000000;

function getClientArgs() {
    return {
        contactPoints: [process.env.SCYLLA_URI ?? "172.17.0.2:9042"],
        localDataCenter: process.env.DATACENTER ?? "datacenter1",
    };
}

// call callback, each with up to singleStepCount,
// multiple times, so that sum of all called callback is equal to n
async function repeatCapped(callback, n) {
    for (let rep = 0; rep * singleStepCount < n; rep++) {
        const finalStep = Math.min(n, (rep + 1) * singleStepCount);
        await callback(finalStep - rep * singleStepCount);
    }

}

exports.getClientArgs = getClientArgs;
exports.repeatCapped = repeatCapped;
