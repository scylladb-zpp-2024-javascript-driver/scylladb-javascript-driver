"use strict";

const { assert } = require("chai");
const dns = require("dns");
const util = require("util");

const helper = require("../../test-helper");
const Client = require("../../../lib/client");
const clientOptions = require("../../../lib/client-options");
const utils = require("../../../lib/utils");
const errors = require("../../../lib/errors");
const types = require("../../../lib/types");
const policies = require("../../../lib/policies");
const RoundRobinPolicy =
    require("../../../lib/policies/load-balancing.js").RoundRobinPolicy;
const Murmur3Tokenizer = require("../../../lib/tokenizer.js").Murmur3Tokenizer;
const { PlainTextAuthProvider } = require("../../../lib/auth");
const ConstantSpeculativeExecutionPolicy =
    policies.speculativeExecution.ConstantSpeculativeExecutionPolicy;
const OrderedLoadBalancingPolicy = helper.OrderedLoadBalancingPolicy;
const vit = helper.vit;

describe("Client", function () {
    this.timeout(180000);
    describe("#connect()", function () {
        let useLocalhost;

        helper.setup(3, { initClient: false });

        before(function (done) {
            dns.resolve("localhost", function (err) {
                useLocalhost = !err;
                done();
            });
        });

        it("should discover all hosts in the ring and hosts object can be serializable", async () => {
            const client = newInstance();
            await client.connect();

            assert.strictEqual(client.hosts.length, 3);
            assert.strictEqual(client.hosts.values().length, 3);
            assert.strictEqual(client.hosts.keys().length, 3);

            // It should be serializable
            assert.doesNotThrow(() => JSON.stringify(client.hosts));
        });

        it("should fail if the contact points can not be resolved", function (done) {
            const client = newInstance({ contactPoints: ["not-a-host"] });
            client.connect(function (err) {
                assert.ok(err);
                helper.assertInstanceOf(err, errors.NoHostAvailableError);
                client.shutdown(function (err) {
                    assert.ifError(err);
                    done();
                });
            });
        });

        it("should fail if the contact points can not be reached", function (done) {
            const client = newInstance({ contactPoints: ["1.1.1.1"] });
            client.connect(function (err) {
                assert.ok(err);
                helper.assertInstanceOf(err, errors.NoHostAvailableError);
                done();
            });
        });

        it("should select a tokenizer", function (done) {
            const client = newInstance();
            client.connect(function (err) {
                if (err) {
                    return done(err);
                }
                helper.assertInstanceOf(
                    client.metadata.tokenizer,
                    Murmur3Tokenizer,
                );
                done();
            });
        });

        it("should allow multiple parallel calls to connect", function (done) {
            const client = newInstance();
            utils.times(
                100,
                function (n, next) {
                    client.connect(next);
                },
                function (err) {
                    assert.ifError(err);
                    done();
                },
            );
        });

        it("should resolve host names", function (done) {
            if (!useLocalhost) {
                return done();
            }
            const client = new Client(
                utils.extend({}, helper.baseOptions, {
                    contactPoints: ["localhost"],
                }),
            );
            client.connect(function (err) {
                assert.ifError(err);
                assert.strictEqual(client.hosts.length, 3);
                client.hosts.forEach(function (h) {
                    assert.notEqual(h.address, "localhost");
                });
                done();
            });
        });

        [true, false].forEach((warmup) => {
            it(`should fail if the keyspace does not exists when warmup is ${warmup}`, function (done) {
                const client = newInstance({
                    keyspace: "not-existent-ks",
                    pooling: { warmup },
                });

                utils.times(
                    10,
                    function (n, next) {
                        client.connect(function (err) {
                            assert.ok(err);
                            // Not very nice way to check but here it is
                            // Does the message contains Keyspace
                            assert.ok(
                                err.message.toLowerCase().indexOf("keyspace") >=
                                    0,
                                "Message mismatch, was: " + err.message,
                            );
                            next();
                        });
                    },
                    done,
                );
            });
        });

        it("should not use contactPoints that are not part of peers", function (done) {
            const contactPoints = helper.baseOptions.contactPoints.slice(0);
            contactPoints.push("host-not-existent-not-peer");
            contactPoints.push("1.1.1.1");
            const client = newInstance({ contactPoints: contactPoints });
            client.connect(function (err) {
                assert.ifError(err);
                // the 3 original hosts
                assert.strictEqual(client.hosts.length, 3);
                const hosts = client.hosts.keys();
                assert.strictEqual(hosts[0], contactPoints[0] + ":9042");
                assert.notEqual(hosts[1], contactPoints[1] + ":9042");
                assert.notEqual(hosts[2], contactPoints[1] + ":9042");
                assert.notEqual(hosts[1], contactPoints[2] + ":9042");
                assert.notEqual(hosts[2], contactPoints[2] + ":9042");
                done();
            });
        });

        it("should use the default pooling options according to the protocol version", function (done) {
            const client = newInstance();
            client.connect(function (err) {
                assert.ifError(err);
                assert.ok(client.options.pooling.coreConnectionsPerHost);
                if (client.controlConnection.protocolVersion < 3) {
                    helper.assertValueEqual(
                        client.options.pooling.coreConnectionsPerHost,
                        clientOptions.coreConnectionsPerHostV2,
                    );
                } else {
                    helper.assertValueEqual(
                        client.options.pooling.coreConnectionsPerHost,
                        clientOptions.coreConnectionsPerHostV3,
                    );
                }
                utils.times(
                    10,
                    function (n, next) {
                        client.execute("SELECT key FROM system.local", next);
                    },
                    function (err) {
                        if (err) {
                            return done(err);
                        }
                        assert.strictEqual(
                            client.hosts.values()[0].pool.connections.length,
                            client.options.pooling.coreConnectionsPerHost[
                                types.distance.local
                            ],
                        );
                        done();
                    },
                );
            });
        });

        it("should override default pooling options when specified", function (done) {
            const client = newInstance({
                pooling: {
                    coreConnectionsPerHost: { 0: 4 },
                },
            });
            client.connect(function (err) {
                assert.ifError(err);
                assert.ok(client.options.pooling.coreConnectionsPerHost);
                let defaults = clientOptions.coreConnectionsPerHostV3;
                if (client.controlConnection.protocolVersion < 3) {
                    defaults = clientOptions.coreConnectionsPerHostV2;
                }
                assert.ok(
                    client.options.pooling.coreConnectionsPerHost[
                        types.distance.local
                    ],
                    4,
                );
                assert.ok(
                    client.options.pooling.coreConnectionsPerHost[
                        types.distance.remote
                    ],
                    defaults[types.distance.remote],
                );
                utils.times(
                    50,
                    function (n, next) {
                        client.execute("SELECT key FROM system.local", next);
                    },
                    function (err) {
                        if (err) {
                            return done(err);
                        }
                        setTimeout(function () {
                            // wait until all connections are made in the background
                            assert.strictEqual(
                                client.hosts.values()[0].pool.connections
                                    .length,
                                client.options.pooling.coreConnectionsPerHost[
                                    types.distance.local
                                ],
                            );
                            done();
                        }, 5000);
                    },
                );
            });
        });

        it("should not fail when switching keyspace and a contact point is not valid", function (done) {
            const client = new Client({
                contactPoints: ["1.1.1.1", helper.baseOptions.contactPoints[0]],
                localDataCenter: helper.baseOptions.localDataCenter,
                keyspace: "system",
            });
            client.connect(function (err) {
                assert.ifError(err);
                done();
            });
        });

        it("should open connections to all hosts when warmup is set", function (done) {
            // do it multiple times
            utils.timesSeries(
                300,
                function (n, next) {
                    const connectionsPerHost = {};
                    connectionsPerHost[types.distance.local] = 3;
                    connectionsPerHost[types.distance.remote] = 1;
                    const client = newInstance({
                        pooling: {
                            warmup: true,
                            coreConnectionsPerHost: connectionsPerHost,
                        },
                    });
                    client.connect(function (err) {
                        assert.ifError(err);
                        assert.strictEqual(client.hosts.length, 3);
                        // Cannot test that: getState deprecated
                        /* const state = client.getState(); */
                        client.hosts.forEach(function (host) {
                            assert.strictEqual(
                                host.pool.connections.length,
                                3,
                                "For host " + host.address,
                            );
                            /* assert.strictEqual(
                                state.getOpenConnections(host),
                                3,
                            ); */
                        });
                        client.shutdown(next);
                    });
                },
                done,
            );
        });

        it("should only warmup connections for hosts with local distance", async () => {
            const lbPolicy = new RoundRobinPolicy();
            lbPolicy.getDistance = function (host) {
                const id = helper.lastOctetOf(host.address);
                if (id === "1") {
                    return types.distance.local;
                } else if (id === "2") {
                    return types.distance.remote;
                }
                return types.distance.ignored;
            };

            const connectionsPerHost = {};
            connectionsPerHost[types.distance.local] = 2;
            connectionsPerHost[types.distance.remote] = 10;

            const client = newInstance({
                policies: { loadBalancing: lbPolicy },
                pooling: {
                    warmup: true,
                    coreConnectionsPerHost: connectionsPerHost,
                },
            });

            await client.connect();

            assert.strictEqual(client.hosts.length, 3);
            client.hosts.forEach(function (host) {
                const id = helper.lastOctetOf(host);
                if (id === "1") {
                    assert.strictEqual(
                        host.pool.connections.length,
                        connectionsPerHost[types.distance.local],
                    );
                } else if (id === "2") {
                    // It shouldn't have finished creating all the connections
                    assert.isBelow(
                        host.pool.connections.length,
                        connectionsPerHost[types.distance.remote],
                    );
                } else {
                    assert.strictEqual(host.pool.connections.length, 0);
                }
            });
        });

        it("should connect after unsuccessful attempt caused by a non-existent keyspace", function (done) {
            const keyspace = "ks_test_after_fail";
            const client = newInstance({ keyspace: keyspace });
            utils.series(
                [
                    function tryConnect(next) {
                        client.connect(function (err) {
                            helper.assertInstanceOf(err, errors.ResponseError);
                            next();
                        });
                    },
                    function createKeyspace(next) {
                        const tempClient = newInstance();
                        tempClient.execute(
                            helper.createKeyspaceCql(keyspace),
                            function (err) {
                                assert.ifError(err);
                                tempClient.shutdown(next);
                            },
                        );
                    },
                    function tryConnectAgain(next) {
                        client.connect(function (err) {
                            assert.ifError(err);
                            client.execute(helper.queries.basic, next);
                        });
                    },
                ],
                function (err) {
                    client.shutdown();
                    done(err);
                },
            );
        });

        it("should set the defaults based on product type", () => {
            const client = newInstance();

            return client.connect().then(() => {
                assert.strictEqual(
                    client.options.queryOptions.consistency,
                    types.consistencies.localOne,
                );
            });
        });
    });

    // Test failing due to java / ccm error
    // INVESTIGATE(@wprzytula)
    // https://github.com/scylladb-zpp-2024-javascript-driver/scylladb-javascript-driver/actions/runs/11573862581/job/32216863054?pr=43#step:11:782
    /* describe("#connect() with ipv6", function () {
        before(helper.ccmHelper.start(1, { ipFormat: "::%d" }));
        after(helper.ccmHelper.remove);
        it("should connect to ipv6 host", function (done) {
            utils.series(
                [
                    function testWithShortNotation(seriesNext) {
                        testConnect("::1", seriesNext);
                    },
                    function testFullAddress(seriesNext) {
                        testConnect("0:0:0:0:0:0:0:1", seriesNext);
                    },
                    function testFullAddress(seriesNext) {
                        testConnect("[0:0:0:0:0:0:0:1]:9042", seriesNext);
                    },
                ],
                done,
            );
            function testConnect(contactPoint, testDone) {
                const client = newInstance({ contactPoints: [contactPoint] });
                client.connect(function (err) {
                    assert.ifError(err);
                    assert.strictEqual(client.hosts.length, 1);
                    let expected = contactPoint + ":9042";
                    if (contactPoint.indexOf("[") === 0) {
                        expected = contactPoint.replace(/[[\]]/g, "");
                    }
                    assert.strictEqual(
                        client.hosts.values()[0].address,
                        expected,
                    );
                    utils.times(
                        10,
                        function (n, next) {
                            client.execute(helper.queries.basic, next);
                        },
                        helper.finish(client, testDone),
                    );
                });
            }
        });
    }); */

    describe("#connect() with nodes failing", function () {
        it("should connect after a failed attempt", function (done) {
            const client = newInstance();

            utils.series(
                [
                    helper.ccmHelper.removeIfAny,
                    function (next) {
                        client.connect(function (err) {
                            helper.assertInstanceOf(
                                err,
                                errors.NoHostAvailableError,
                            );
                            next();
                        });
                    },
                    helper.ccmHelper.start(1),
                    function (next) {
                        client.connect(function (err) {
                            assert.ifError(err);
                            const hosts = client.hosts.values();
                            assert.strictEqual(1, hosts.length);
                            assert.strictEqual(
                                typeof hosts[0].datacenter,
                                "string",
                            );
                            assert.notEqual(hosts[0].datacenter.length, 0);
                            next();
                        });
                    },
                    client.shutdown.bind(client),
                    helper.ccmHelper.remove,
                ],
                done,
            );
        });
        function getReceiveNotificationTest(nodeNumber) {
            return function receiveNotificationTest(done) {
                // Should receive notification when a node gracefully closes connections
                const client = newInstance({
                    pooling: {
                        warmup: true,
                        heartBeatInterval: 0,
                        // Use just 1 connection per host for all protocol versions in this test
                        coreConnectionsPerHost:
                            clientOptions.coreConnectionsPerHostV3,
                    },
                });
                utils.series(
                    [
                        helper.ccmHelper.removeIfAny,
                        helper.ccmHelper.start(2),
                        client.connect.bind(client),
                        function checkInitialState(next) {
                            const hosts = client.hosts.values();
                            assert.ok(hosts[0].isUp());
                            assert.ok(hosts[1].isUp());
                            next();
                        },
                        function stopNode(next) {
                            helper.ccmHelper.stopNode(nodeNumber, next);
                        },
                        helper.delay(300),
                        function checkThatStateChanged(next) {
                            // Only 1 node should be UP
                            assert.strictEqual(
                                client.hosts.values().filter(function (h) {
                                    return h.isUp();
                                }).length,
                                1,
                            );
                            next();
                        },
                        client.shutdown.bind(client),
                        helper.ccmHelper.remove,
                    ],
                    done,
                );
            };
        }
        it(
            "should receive socket closed event and set node as down",
            getReceiveNotificationTest(2),
        );
        it(
            "should receive socket closed event and set node as down (control connection node)",
            getReceiveNotificationTest(1),
        );
    });

    describe("#execute()", function () {
        helper.setup(3, { initClient: false });

        [true, false].forEach((warmup) => {
            it(`should use the keyspace provided when warmup is ${warmup}`, async () => {
                const client = newInstance({
                    keyspace: "system",
                    pooling: {
                        warmup,
                        coreConnectionsPerHost: { [types.distance.local]: 2 },
                    },
                });

                await client.connect();

                assert.strictEqual(client.keyspace, "system");

                if (!warmup) {
                    // Wait for each pool to be created
                    for (const host of client.hosts.values()) {
                        await helper.wait.until(
                            () => host.pool.connections.length > 0,
                        );
                    }
                } else {
                    // All connections should have switch to the active keyspace
                    client.hosts
                        .values()
                        .forEach((h) =>
                            h.pool.connections.forEach((c) =>
                                assert.strictEqual(c.keyspace, client.keyspace),
                            ),
                        );
                }

                const promises = Array(30)
                    .fill(0)
                    .map(async () => {
                        // Target a table on the system keyspace
                        const result = await client.execute(
                            "SELECT * FROM local",
                        );
                        assert.ok(result.rows);
                        assert.ok(result.rows.length > 0);
                    });

                await Promise.all(promises);
            });
        });

        it("should fail to execute if the keyspace does not exists", function (done) {
            const client = newInstance({ keyspace: "NOT____EXISTS" });
            // Execute on all hosts, some executions in parallel and some serial
            utils.timesLimit(
                12,
                6,
                function (n, next) {
                    // No matter what, the keyspace does not exists
                    client.execute(helper.queries.basic, function (err) {
                        helper.assertInstanceOf(err, Error);
                        next();
                    });
                },
                done,
            );
        });

        it("should change the active keyspace after USE statement", function (done) {
            // Use a large amount of connections to make it more error prone
            const client = newInstance({
                pooling: {
                    coreConnectionsPerHost: { [types.distance.local]: 10 },
                },
            });
            client.execute("USE system", function (err) {
                if (err) {
                    return done(err);
                }
                assert.strictEqual(client.keyspace, "system");
                // all next queries, the instance should still "be" in the system keyspace
                utils.timesLimit(
                    100,
                    50,
                    function (n, next) {
                        client.execute("SELECT * FROM local", [], next);
                    },
                    helper.finish(client, done),
                );
            });
        });

        it("should return ResponseError when executing USE with a wrong keyspace", function (done) {
            const client = newInstance();
            client.execute("USE ks_not_exist", function (err) {
                assert.ok(err instanceof errors.ResponseError);
                assert.equal(client.keyspace, null);
                client.shutdown();
                done();
            });
        });

        it("should create the amount of connections determined by the options", function (done) {
            const options = {
                pooling: {
                    coreConnectionsPerHost: {
                        0: 3,
                        1: 0,
                        2: 0,
                    },
                },
            };
            const client = newInstance(options);

            // Execute a couple of queries
            utils.timesLimit(
                100,
                50,
                function (n, next) {
                    client.execute(helper.queries.basic, next);
                },
                function (err) {
                    if (err) {
                        return done(err);
                    }
                    assert.strictEqual(client.hosts.length, 3);
                    const hosts = client.hosts.slice(0);
                    assert.strictEqual(hosts[0].pool.coreConnectionsLength, 3);
                    assert.strictEqual(hosts[1].pool.coreConnectionsLength, 3);
                    // wait for the pool to be the expected size
                    helper.setIntervalUntil(
                        function condition() {
                            return (
                                hosts[0].pool.connections.length === 3 &&
                                hosts[1].pool.connections.length === 3
                            );
                        },
                        1000,
                        20,
                        done,
                    );
                },
            );
        });

        it("should wait for schema agreement before calling back", function (done) {
            const queries = [
                "CREATE KEYSPACE ks1 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};",
                "CREATE TABLE ks1.tbl1 (id uuid PRIMARY KEY, value text)",
                "SELECT * FROM ks1.tbl1",
                "SELECT * FROM ks1.tbl1 where id = d54cb06d-d168-45a0-b1b2-9f5c75435d3d",
                "CREATE KEYSPACE ks2 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};",
                "CREATE TABLE ks2.tbl2 (id uuid PRIMARY KEY, value text)",
                "SELECT * FROM ks2.tbl2",
                "SELECT * FROM ks2.tbl2",
                "CREATE TABLE ks2.tbl3 (id uuid PRIMARY KEY, value text)",
                "SELECT * FROM ks2.tbl3",
                "SELECT * FROM ks2.tbl3",
                "CREATE TABLE ks2.tbl4 (id uuid PRIMARY KEY, value text)",
                "SELECT * FROM ks2.tbl4",
                "SELECT * FROM ks2.tbl4",
                "SELECT * FROM ks2.tbl4",
            ];

            const client = newInstance();

            // warmup first
            utils.timesSeries(
                10,
                function (n, next) {
                    client.execute("SELECT key FROM system.local", next);
                },
                function (err) {
                    assert.ifError(err);
                    utils.eachSeries(
                        queries,
                        function (query, next) {
                            client.execute(query, next);
                        },
                        done,
                    );
                },
            );
        });

        it(
            "should handle distance changing load balancing policies",
            changingDistancesTest("2"),
        );

        it(
            "should handle distance changing load balancing policies for control connection host",
            changingDistancesTest("1"),
        );
        [
            new policies.speculativeExecution.NoSpeculativeExecutionPolicy(),
            new ConstantSpeculativeExecutionPolicy(100, 1),
        ].forEach(function (policy) {
            context("with " + policy.constructor.name, function () {
                afterEach(function (done) {
                    helper.ccmHelper.resumeNode(1, done);
                });
                afterEach(function (done) {
                    helper.ccmHelper.resumeNode(2, done);
                });
                it("should wait until is completed on the first node", function (done) {
                    const client = newInstance({
                        pooling: { warmup: true },
                        policies: {
                            speculativeExecution: policy,
                            loadBalancing: new OrderedLoadBalancingPolicy(),
                            retry: new helper.FallthroughRetryPolicy(),
                        },
                        socketOptions: {
                            readTimeout: 5000,
                        },
                    });
                    utils.series(
                        [
                            client.connect.bind(client),
                            helper.toTask(helper.ccmHelper.pauseNode, null, 1),
                            function query(next) {
                                if (
                                    !(
                                        policy instanceof
                                        ConstantSpeculativeExecutionPolicy
                                    )
                                ) {
                                    // Resume first node after a few ms
                                    setTimeout(function () {
                                        helper.ccmHelper.resumeNode(1);
                                    }, 400);
                                }
                                utils.map(
                                    [false, true],
                                    function execute(prepare, mapNext) {
                                        client.execute(
                                            "SELECT * FROM system.local",
                                            null,
                                            {
                                                prepare: prepare,
                                                isIdempotent: true,
                                            },
                                            mapNext,
                                        );
                                    },
                                    function (err, results) {
                                        assert.ifError(err);
                                        assert.strictEqual(results.length, 2);
                                        let expectedHost;
                                        if (
                                            policy instanceof
                                            ConstantSpeculativeExecutionPolicy
                                        ) {
                                            // Use the next one in a speculative execution
                                            expectedHost =
                                                client.hosts.keys()[1];
                                        } else {
                                            // It should wait for it to yield the response without speculative execution
                                            expectedHost =
                                                client.hosts.keys()[0];
                                        }
                                        assert.deepEqual(
                                            results.map(function (rs) {
                                                return rs.info.queriedHost;
                                            }),
                                            results.map(function () {
                                                return expectedHost;
                                            }),
                                        );
                                        next();
                                    },
                                );
                            },
                            helper.toTask(helper.ccmHelper.resumeNode, null, 1),
                        ],
                        helper.finish(client, done),
                    );
                });
            });
        });

        function changingDistancesTest(address) {
            return function doTest(done) {
                const lbp = new RoundRobinPolicy();
                let ignoredHost;
                let cc;
                lbp.getDistance = function (h) {
                    return helper.lastOctetOf(h) === ignoredHost
                        ? types.distance.ignored
                        : types.distance.local;
                };
                const connectionsPerHost = 5;
                const client = newInstance({
                    policies: { loadBalancing: lbp },
                    pooling: {
                        coreConnectionsPerHost: { 0: connectionsPerHost },
                    },
                });
                function queryAndCheckPool(limit, assertions) {
                    return function executeSomeQueries(next) {
                        const coordinators = {};
                        utils.timesLimit(
                            limit,
                            3,
                            function (n, timesNext) {
                                client.execute(
                                    helper.queries.basic,
                                    function (err, result) {
                                        if (!err) {
                                            coordinators[
                                                helper.lastOctetOf(
                                                    result.info.queriedHost,
                                                )
                                            ] = true;
                                        }
                                        timesNext(err);
                                    },
                                );
                            },
                            function (err) {
                                assert.ifError(err);
                                assertions(Object.keys(coordinators).sort());
                                next();
                            },
                        );
                    };
                }
                utils.series(
                    [
                        client.connect.bind(client),
                        queryAndCheckPool(12, function (coordinators) {
                            utils
                                .objectValues(getPoolInfo(client))
                                .forEach(function (poolSize) {
                                    assert.notStrictEqual(poolSize, 0);
                                });
                            assert.deepEqual(coordinators, ["1", "2", "3"]);
                            cc = client.controlConnection.connection;
                            // Set as the ignored host for the next queries
                            ignoredHost = address;
                        }),
                        queryAndCheckPool(500, function (coordinators) {
                            // The pool for 1st and 3rd host should have the appropriate size by now.
                            const expectedPoolInfo = {
                                1: connectionsPerHost,
                                2: connectionsPerHost,
                                3: connectionsPerHost,
                            };
                            expectedPoolInfo[ignoredHost] = 0;
                            assert.deepEqual(
                                getPoolInfo(client),
                                expectedPoolInfo,
                            );
                            assert.deepEqual(
                                coordinators,
                                ["1", "2", "3"].filter(
                                    (x) => x !== ignoredHost,
                                ),
                            );
                        }),
                        client.shutdown.bind(client),
                        function checkPoolState(next) {
                            const expectedState = { 1: 0, 2: 0, 3: 0 };
                            assert.deepEqual(
                                getPoolInfo(client),
                                expectedState,
                            );
                            setTimeout(function checkPoolStateDelayed() {
                                assert.deepEqual(
                                    getPoolInfo(client),
                                    expectedState,
                                );
                                if (ignoredHost === "1") {
                                    // The control connection should have changed
                                    assert.ok(!cc.connected);
                                    assert.notStrictEqual(
                                        helper.lastOctetOf(
                                            client.controlConnection.host,
                                        ),
                                        "1",
                                    );
                                } else {
                                    assert.strictEqual(
                                        helper.lastOctetOf(
                                            client.controlConnection.host,
                                        ),
                                        "1",
                                    );
                                }
                                next();
                            }, 300);
                        },
                    ],
                    done,
                );
            };
        }
    });

    describe("failover", function () {
        beforeEach(helper.ccmHelper.start(3));
        afterEach(helper.ccmHelper.remove);

        it("should failover after a node goes down", function (done) {
            // treat queries as idempotent so they can be safely retried on another node
            const client = newInstance({
                queryOptions: { isIdempotent: true },
            });

            const hosts = {};
            const hostsDown = [];
            utils.series(
                [
                    client.connect.bind(client),
                    function (next) {
                        // wait for all initial events to ensure we don't incidentally get an 'UP' event for node 2
                        // after we have killed it.
                        setTimeout(next, 5000);
                    },
                    function warmUpPool(seriesNext) {
                        client.on("hostDown", function (h) {
                            hostsDown.push(h);
                        });
                        utils.times(
                            100,
                            function (n, next) {
                                client.execute(
                                    helper.queries.basic,
                                    function (err, result) {
                                        assert.ifError(err);
                                        hosts[result.info.queriedHost] = true;
                                        next();
                                    },
                                );
                            },
                            seriesNext,
                        );
                    },
                    function killNode(seriesNext) {
                        assert.strictEqual(Object.keys(hosts).length, 3);
                        setImmediate(function () {
                            helper.ccmHelper.exec([
                                "node1",
                                "stop",
                                "--not-gently",
                            ]);
                            seriesNext();
                        });
                    },
                    function executeWhileNodeGoingDown(seriesNext) {
                        utils.timesLimit(
                            1000,
                            10,
                            function (i, next) {
                                client.execute(helper.queries.basic, next);
                            },
                            function (err) {
                                assert.ifError(err);
                                // delay the next queries
                                setTimeout(seriesNext, 10000);
                            },
                        );
                    },
                    function executeAfterNodeWentDown(seriesNext) {
                        utils.timesSeries(
                            20,
                            function (i, next) {
                                client.execute(helper.queries.basic, next);
                            },
                            seriesNext,
                        );
                    },
                    function assertions(seriesNext) {
                        // Only 2 hosts alive at the end
                        assert.strictEqual(
                            client.hosts.values().reduce(function (val, h) {
                                return val + (h.isUp() ? 1 : 0);
                            }, 0),
                            2,
                        );
                        assert.ok(
                            hostsDown.length >= 1,
                            "Expected at least 1 host down" + " event.",
                        );
                        // Ensure each down event is for the stopped host.  We may get
                        // multiple down events for the same host on a control connection.
                        hostsDown.forEach(function (downHost) {
                            assert.strictEqual(
                                helper.lastOctetOf(downHost),
                                "1",
                            );
                        });
                        seriesNext();
                    },
                    client.shutdown.bind(client),
                ],
                done,
            );
        });

        // This whole test will likely be not supported due to getState being deprecated
        /* it("should failover when a node goes down with some outstanding requests", function (done) {
            const options = utils.extend(
                { queryOptions: { isIdempotent: true } },
                helper.baseOptions,
            );
            options.pooling = {
                coreConnectionsPerHost: {
                    0: 1,
                    1: 1,
                    2: 0,
                },
            };

            const client = new Client(options);
            const hosts = {};
            const query = helper.queries.basic;

                        utils.series(
                [
                    function (next) {
                        // wait for all initial events to ensure we don't incidentally get an 'UP' event for node 2
                        // after we have killed it.
                        setTimeout(next, 5000);
                    },
                    function warmUpPool(seriesNext) {
                        utils.times(
                            20,
                            function (n, next) {
                                client.execute(query, function (err, result) {
                                    assert.ifError(err);
                                    hosts[result.info.queriedHost] = true;
                                    next();
                                });
                            },
                            seriesNext,
                        );
                    },
                    helper.setIntervalUntilTask(
                        () => {
                            const state = client.getState();
                            return (
                                client.hosts
                                    .values()
                                    .reduce(
                                        (accumulator, h) =>
                                            accumulator +
                                            state.getInFlightQueries(h),
                                        0,
                                    ) === 0
                            );
                        },
                        20,
                        100,
                    ),
                    function testCase(seriesNext) {
                        // 3 hosts alive
                        assert.strictEqual(Object.keys(hosts).length, 3);

                        let killed = false;
                        utils.timesLimit(
                            500,
                            20,
                            function (n, next) {
                                if (n === 30) {
                                    // kill a node when there are some outstanding requests
                                    helper.ccmHelper.exec(
                                        ["node2", "stop", "--not-gently"],
                                        function (err) {
                                            killed = true;
                                            assert.ifError(err);
                                            // do a couple of more queries
                                            utils.timesSeries(
                                                10,
                                                function (n, next2) {
                                                    client.execute(
                                                        query,
                                                        next2,
                                                    );
                                                },
                                                next,
                                            );
                                        },
                                    );
                                    return;
                                }
                                if (killed) {
                                    // Don't issue more requests
                                    return next();
                                }
                                client.execute(query, function (err) {
                                    assert.ifError(err);
                                    next();
                                });
                            },
                            seriesNext,
                        );
                    },
                    (next) => setImmediate(next),
                    function assertHostState(next) {
                        // Only 2 hosts are UP at the end
                        assert.strictEqual(
                            client.hosts
                                .values()
                                .reduce(
                                    (val, h) => val + (h.isUp() ? 1 : 0),
                                    0,
                                ),
                            2,
                        );

                        // In-flight counter should be 0 for UP and DOWN nodes
                        const state = client.getState();
                        client.hosts.forEach((h) =>
                            assert.strictEqual(state.getInFlightQueries(h), 0),
                        );
                        next();
                    },
                ],
                done,
            );
        }); */

        it("should warn but not fail when warmup is enable and a node is down", async () => {
            await util.promisify(helper.ccmHelper.exec)(["node2", "stop"]);

            const warnings = [];
            const client = newInstance({ pooling: { warmup: true } });
            helper.afterThisTest(() => client.shutdown());

            client.on("log", (level, className, message) => {
                if (level !== "warning" || className !== "Client") {
                    return;
                }

                warnings.push(message);
            });

            await client.connect();
            assert.lengthOf(
                warnings.filter((w) => w.indexOf("pool") >= 0),
                1,
            );
        });
    });

    // No support for shutdown
    /* describe("#shutdown()", function () {}); */
});

/**
 * @param {ClientOptions} [options]
 * @returns {Client}
 */
function newInstance(options) {
    const client = new Client(
        utils.deepExtend({}, helper.baseOptions, options),
    );
    return client;
}

/**
 * Returns a dictionary containing the last octet of the address as keys and the pool size as values.
 */
function getPoolInfo(client) {
    const info = {};
    client.hosts.forEach(function (h, address) {
        info[helper.lastOctetOf(address)] = h.pool.connections.length;
    });
    return info;
}

function createRole(client, role, password) {
    return client.execute(
        `CREATE ROLE IF NOT EXISTS ${role} WITH PASSWORD = '${password}' AND LOGIN = true`,
    );
}

function assertAuthError(err, message) {
    helper.assertInstanceOf(err, errors.NoHostAvailableError);
    assert.ok(err.innerErrors);
    const firstErr = Object.values(err.innerErrors)[0];
    helper.assertInstanceOf(firstErr, errors.AuthenticationError);

    if (message) {
        assert.match(firstErr.message, message);
    }
}
