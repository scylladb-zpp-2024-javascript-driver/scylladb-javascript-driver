function getClientArgs() {
    return {
        contactPoints: [process.env.SCYLLA_URI?.split(':')[0] ?? '172.17.0.2'],
        localDataCenter: process.env.DATACENTER?.split(':')[0] ?? 'datacenter1'
    };
}

exports.getClientArgs = getClientArgs;
