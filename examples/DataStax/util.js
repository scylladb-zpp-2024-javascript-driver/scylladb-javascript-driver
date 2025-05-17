function getClientArgs() {
    return {
        contactPoints: [process.env.SCYLLA_URI ?? "172.17.0.2:9042"],
    };
}

exports.getClientArgs = getClientArgs;
