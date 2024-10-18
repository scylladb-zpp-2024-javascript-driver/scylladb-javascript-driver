function getClientArgs() {
    return {
        contactPoints: [process.env.SCYLLA_URI ?? '172.17.0.2'],
        localDataCenter: process.env.DATACENTER ?? 'datacenter1'
    };
}

exports.getClientArgs = getClientArgs;
