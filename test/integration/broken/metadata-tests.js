"use strict";
const assert = require("chai").assert;

const helper = require("../../test-helper");
const Client = require("../../../lib/client");
const utils = require("../../../lib/utils");
const types = require("../../../lib/types");
const packageInfo = require("../../../package.json");
const vit = helper.vit;
const vdescribe = helper.vdescribe;

describe("metadata @SERVER_API", function () {
    this.timeout(240000);

    const yaml = [];

    if (helper.isDseGreaterThan("6")) {
        yaml.push("cdc_enabled:true");
    }

    if (!helper.isDse() && helper.isCassandraGreaterThan("4.0")) {
        yaml.push("enable_materialized_views:true");
    }

    const setupInfo = helper.setup("2:0", {
        ccmOptions: { vnodes: true, yaml },
    });

    describe("Metadata", function () {
        describe("#keyspaces", function () {
            it("should keep keyspace information up to date", function (done) {
                const client = newInstance();
                const nonSyncClient = newInstance({
                    isMetadataSyncEnabled: false,
                });

                function checkKeyspaceWithInfo(
                    ks,
                    strategy,
                    optionName,
                    optionValue,
                ) {
                    assert.ok(ks);
                    assert.strictEqual(ks.strategy, strategy);
                    assert.ok(ks.strategyOptions);
                    assert.strictEqual(
                        ks.strategyOptions[optionName],
                        optionValue,
                    );
                    assert.strictEqual(ks.virtual, false);
                }

                function checkKeyspace(
                    client,
                    name,
                    strategy,
                    optionName,
                    optionValue,
                ) {
                    const m = client.metadata;
                    const ks = m.keyspaces[name];
                    checkKeyspaceWithInfo(
                        ks,
                        strategy,
                        optionName,
                        optionValue,
                    );
                }

                utils.series(
                    [
                        client.connect.bind(client),
                        nonSyncClient.connect.bind(nonSyncClient),
                        function checkKeyspaces(next) {
                            const m = client.metadata;
                            assert.ok(m);
                            assert.ok(m.keyspaces);
                            assert.ok(m.keyspaces["system"]);
                            assert.ok(m.keyspaces["system"].strategy);
                            assert.strictEqual(
                                m.keyspaces["system"].virtual,
                                false,
                            );
                            next();
                        },
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ks1 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3}",
                        ),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ks2 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 2}",
                        ),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ks3 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 1}",
                        ),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ks4 WITH replication = {'class': 'NetworkTopologyStrategy', 'dc1' : 1}",
                        ),
                        function checkKeyspaces(next) {
                            checkKeyspace(
                                client,
                                "ks1",
                                "org.apache.cassandra.locator.SimpleStrategy",
                                "replication_factor",
                                "3",
                            );
                            checkKeyspace(
                                client,
                                "ks2",
                                "org.apache.cassandra.locator.SimpleStrategy",
                                "replication_factor",
                                "2",
                            );
                            checkKeyspace(
                                client,
                                "ks3",
                                "org.apache.cassandra.locator.SimpleStrategy",
                                "replication_factor",
                                "1",
                            );
                            checkKeyspace(
                                client,
                                "ks4",
                                "org.apache.cassandra.locator.NetworkTopologyStrategy",
                                "dc1",
                                "1",
                            );

                            // There should be no keyspace metadata for the non sync client until its fetched via refreshKeyspaces.
                            const ks = nonSyncClient.metadata.keyspaces;
                            assert.ok(ks["ks1"] === undefined);
                            assert.ok(ks["ks2"] === undefined);
                            assert.ok(ks["ks3"] === undefined);
                            assert.ok(ks["ks4"] === undefined);

                            nonSyncClient.metadata.refreshKeyspaces(
                                function (err) {
                                    assert.ifError(err);
                                    checkKeyspace(
                                        nonSyncClient,
                                        "ks1",
                                        "org.apache.cassandra.locator.SimpleStrategy",
                                        "replication_factor",
                                        "3",
                                    );
                                    checkKeyspace(
                                        nonSyncClient,
                                        "ks2",
                                        "org.apache.cassandra.locator.SimpleStrategy",
                                        "replication_factor",
                                        "2",
                                    );
                                    checkKeyspace(
                                        nonSyncClient,
                                        "ks3",
                                        "org.apache.cassandra.locator.SimpleStrategy",
                                        "replication_factor",
                                        "1",
                                    );
                                    checkKeyspace(
                                        nonSyncClient,
                                        "ks4",
                                        "org.apache.cassandra.locator.NetworkTopologyStrategy",
                                        "dc1",
                                        "1",
                                    );
                                    next();
                                },
                            );
                        },
                        helper.toTask(
                            client.execute,
                            client,
                            "ALTER KEYSPACE ks3 WITH replication = {'class' : 'NetworkTopologyStrategy', 'dc1' : 1}",
                        ),
                        function checkAlteredKeyspace(next) {
                            // rf strategy should have changed on client.
                            checkKeyspace(
                                client,
                                "ks3",
                                "org.apache.cassandra.locator.NetworkTopologyStrategy",
                                "dc1",
                                "1",
                            );

                            // rf strategy should not have changed yet on nonSyncClient without refreshing explicitly.
                            checkKeyspace(
                                nonSyncClient,
                                "ks3",
                                "org.apache.cassandra.locator.SimpleStrategy",
                                "replication_factor",
                                "1",
                            );

                            nonSyncClient.metadata.refreshKeyspace(
                                "ks3",
                                function (err, ks) {
                                    assert.ifError(err);
                                    checkKeyspaceWithInfo(
                                        ks,
                                        "org.apache.cassandra.locator.NetworkTopologyStrategy",
                                        "dc1",
                                        "1",
                                    );
                                    next();
                                },
                            );
                        },
                        client.shutdown.bind(client),
                        nonSyncClient.shutdown.bind(nonSyncClient),
                    ],
                    done,
                );
            });
            it("should delete keyspace information on drop", function (done) {
                const client = newInstance({ refreshSchemaDelay: 50 });
                client.connect(function (err) {
                    assert.ifError(err);
                    const m = client.metadata;
                    assert.ok(m);
                    assert.ok(!m.keyspaces["ks_todelete"]);
                    utils.series(
                        [
                            helper.toTask(
                                client.execute,
                                client,
                                helper.createKeyspaceCql("ks_todelete", 1),
                            ),
                            function assertions1(next) {
                                assert.ok(m.keyspaces["ks_todelete"]);
                                next();
                            },
                            helper.toTask(
                                client.execute,
                                client,
                                "DROP KEYSPACE ks_todelete",
                            ),
                            function assertions2(next) {
                                assert.ok(!m.keyspaces["ks_todelete"]);
                                next();
                            },
                        ],
                        done,
                    );
                });
            });
        });
        describe("#getTokenRanges()", function () {
            it("should return 512 ranges", function (done) {
                // as vnodes are enabled and there are 2 nodes, expect 512 (2* 256) ranges.
                const client = newInstance();
                utils.series(
                    [
                        client.connect.bind(client),
                        function getRanges(next) {
                            const ranges = client.metadata.getTokenRanges();
                            assert.strictEqual(ranges.size, 512);
                            next();
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
        });
        describe("#getTokenRangesForHost()", function () {
            it("should return the expected number of ranges per host", function (done) {
                const client = newInstance();
                utils.series(
                    [
                        client.connect.bind(client),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ksrf1 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 1}",
                        ),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ksrf2 WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 2}",
                        ),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE KEYSPACE ksntsrf2 WITH replication = {'class': 'NetworkTopologyStrategy', 'dc1' : 2}",
                        ),
                        function getRanges(next) {
                            const host1 = helper.findHost(client, 1);
                            const host2 = helper.findHost(client, 2);
                            // the sum of ranges between host1 and host2 should be the total number of tokens.
                            // we can't make an exact assertion here because token assignment is not exact.
                            const rf1Ranges =
                                client.metadata.getTokenRangesForHost(
                                    "ksrf1",
                                    host1,
                                ).size +
                                client.metadata.getTokenRangesForHost(
                                    "ksrf1",
                                    host2,
                                ).size;
                            assert.strictEqual(rf1Ranges, 512);
                            // expect 512 ranges for each host (2 replica = 512 tokens)
                            assert.strictEqual(
                                client.metadata.getTokenRangesForHost(
                                    "ksrf2",
                                    host1,
                                ).size,
                                512,
                            );
                            assert.strictEqual(
                                client.metadata.getTokenRangesForHost(
                                    "ksrf2",
                                    host2,
                                ).size,
                                512,
                            );
                            assert.strictEqual(
                                client.metadata.getTokenRangesForHost(
                                    "ksntsrf2",
                                    host1,
                                ).size,
                                512,
                            );
                            assert.strictEqual(
                                client.metadata.getTokenRangesForHost(
                                    "ksntsrf2",
                                    host2,
                                ).size,
                                512,
                            );
                            next();
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
        });
        vdescribe("2.1", "#getUdt()", function () {
            it("should return null if it does not exists", function (done) {
                const client = newInstance();
                utils.series(
                    [
                        client.connect.bind(client),
                        function testWithCallbacks(next) {
                            const m = client.metadata;
                            utils.timesSeries(
                                10,
                                function (n, timesNext) {
                                    m.getUdt(
                                        "ks1",
                                        "udt_does_not_exists",
                                        function (err, udtInfo) {
                                            assert.ifError(err);
                                            assert.strictEqual(udtInfo, null);
                                            timesNext();
                                        },
                                    );
                                },
                                next,
                            );
                        },
                        function testWithPromises(next) {
                            const m = client.metadata;
                            utils.timesSeries(
                                10,
                                function (n, timesNext) {
                                    m.getUdt("ks1", "udt_does_not_exists")
                                        .then(function (udtInfo) {
                                            assert.strictEqual(udtInfo, null);
                                        })
                                        .then(timesNext)
                                        .catch(timesNext);
                                },
                                next,
                            );
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
            it("should return the udt information", function (done) {
                const client = newInstance();
                const createUdtQuery1 =
                    "CREATE TYPE phone (alias text, number text, country_code int, second_number 'DynamicCompositeType(s => UTF8Type, i => Int32Type)')";
                const createUdtQuery2 =
                    'CREATE TYPE address (street text, "ZIP" int, phones set<frozen<phone>>)';
                utils.series(
                    [
                        helper.toTask(client.connect, client),
                        helper.toTask(
                            client.execute,
                            client,
                            helper.createKeyspaceCql("ks_udt1", 2),
                        ),
                        helper.toTask(client.execute, client, "USE ks_udt1"),
                        helper.toTask(client.execute, client, createUdtQuery1),
                        helper.toTask(client.execute, client, createUdtQuery2),
                        function checkPhoneUdt(next) {
                            const m = client.metadata;
                            m.getUdt(
                                "ks_udt1",
                                "phone",
                                function (err, udtInfo) {
                                    assert.ifError(err);
                                    assert.ok(udtInfo);
                                    assert.strictEqual(udtInfo.name, "phone");
                                    assert.ok(udtInfo.fields);
                                    assert.strictEqual(
                                        udtInfo.fields.length,
                                        4,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[0].name,
                                        "alias",
                                    );
                                    assert.ok(
                                        udtInfo.fields[0].type.code ===
                                            types.dataTypes.varchar ||
                                            udtInfo.fields[0].type.code ===
                                                types.dataTypes.text,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[1].name,
                                        "number",
                                    );
                                    assert.ok(
                                        udtInfo.fields[1].type.code ===
                                            types.dataTypes.varchar ||
                                            udtInfo.fields[1].type.code ===
                                                types.dataTypes.text,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].name,
                                        "country_code",
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].type.code,
                                        types.dataTypes.int,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[3].name,
                                        "second_number",
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[3].type.code,
                                        types.dataTypes.custom,
                                    );

                                    const customTypeInfo =
                                        udtInfo.fields[3].type.info;
                                    helper.assertContains(
                                        customTypeInfo,
                                        "s=>org.apache.cassandra.db.marshal.UTF8Type",
                                    );
                                    helper.assertContains(
                                        customTypeInfo,
                                        "i=>org.apache.cassandra.db.marshal.Int32Type",
                                    );
                                    assert.strictEqual(
                                        customTypeInfo.startsWith(
                                            "org.apache.cassandra.db.marshal.DynamicCompositeType(",
                                        ),
                                        true,
                                    );

                                    next();
                                },
                            );
                        },
                        function checkAddressUdt(next) {
                            const m = client.metadata;
                            m.getUdt(
                                "ks_udt1",
                                "address",
                                function (err, udtInfo) {
                                    assert.ifError(err);
                                    assert.ok(udtInfo);
                                    assert.strictEqual(udtInfo.name, "address");
                                    assert.strictEqual(
                                        udtInfo.fields.length,
                                        3,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[0].name,
                                        "street",
                                    );
                                    assert.ok(
                                        udtInfo.fields[0].type.code ===
                                            types.dataTypes.varchar ||
                                            udtInfo.fields[0].type.code ===
                                                types.dataTypes.text,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[1].name,
                                        "ZIP",
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[1].type.code,
                                        types.dataTypes.int,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].name,
                                        "phones",
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].type.code,
                                        types.dataTypes.set,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].type.info.code,
                                        types.dataTypes.udt,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].type.info.info.name,
                                        "phone",
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].type.info.info.fields
                                            .length,
                                        4,
                                    );
                                    assert.strictEqual(
                                        udtInfo.fields[2].type.info.info
                                            .fields[0].name,
                                        "alias",
                                    );
                                    next();
                                },
                            );
                        },
                        function checkAddressUdtWithPromises(next) {
                            const m = client.metadata;
                            m.getUdt("ks_udt1", "address")
                                .then(function (udtInfo) {
                                    assert.ok(udtInfo);
                                    assert.strictEqual(udtInfo.name, "address");
                                    assert.strictEqual(
                                        udtInfo.fields.length,
                                        3,
                                    );
                                })
                                .then(next)
                                .catch(next);
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
        });
        describe("#getTrace()", function () {
            it("should retrieve the trace immediately after", function (done) {
                // use a single node
                const lbp = new helper.AllowListPolicy(["1"]);
                const client = newInstance({
                    policies: { loadBalancing: lbp },
                });
                let traceId;
                utils.series(
                    [
                        client.connect.bind(client),
                        function executeQuery(next) {
                            client.execute(
                                helper.queries.basic,
                                [],
                                { traceQuery: true },
                                function (err, result) {
                                    assert.ifError(err);
                                    traceId = result.info.traceId;
                                    next();
                                },
                            );
                        },
                        function getTrace(next) {
                            client.metadata.getTrace(
                                traceId,
                                function (err, trace) {
                                    assert.ifError(err);
                                    assert.ok(trace);
                                    assert.strictEqual(
                                        typeof trace.duration,
                                        "number",
                                    );
                                    if (
                                        client.controlConnection
                                            .protocolVersion >= 4
                                    ) {
                                        // Check the new field added in C* 2.2
                                        helper.assertInstanceOf(
                                            trace.clientAddress,
                                            types.InetAddress,
                                        );
                                    }
                                    assert.ok(trace.events.length);
                                    next();
                                },
                            );
                        },
                        function getTraceWithConsistency(next) {
                            client.metadata.getTrace(
                                traceId,
                                types.consistencies.all,
                                function (err, trace) {
                                    assert.ifError(err);
                                    assert.ok(trace);
                                    assert.strictEqual(
                                        typeof trace.duration,
                                        "number",
                                    );
                                    assert.ok(trace.events.length);
                                    next();
                                },
                            );
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
            it("should retrieve the trace a few seconds after", function (done) {
                // use a single node
                const lbp = new helper.AllowListPolicy(["2"]);
                const client = newInstance({
                    policies: { loadBalancing: lbp },
                });
                let traceId;
                utils.series(
                    [
                        client.connect.bind(client),
                        function executeQuery(next) {
                            client.execute(
                                helper.queries.basic,
                                [],
                                { traceQuery: true },
                                function (err, result) {
                                    if (err) {
                                        return next(err);
                                    }
                                    traceId = result.info.traceId;
                                    setTimeout(next, 1500);
                                },
                            );
                        },
                        function getTrace(next) {
                            client.metadata.getTrace(
                                traceId,
                                function (err, trace) {
                                    assert.ifError(err);
                                    assert.ok(trace);
                                    assert.strictEqual(
                                        typeof trace.duration,
                                        "number",
                                    );
                                    assert.ok(trace.events.length);
                                    next();
                                },
                            );
                        },
                    ],
                    done,
                );
            });

            describe("with no callback specified", function () {
                it("should return the trace in a promise", async () => {
                    const client = newInstance();
                    await client.connect();
                    const rs = await client.execute(helper.queries.basic, [], {
                        traceQuery: true,
                    });
                    const id = rs.info.traceId;

                    // As we are going to retrieve the trace below, make sure the trace is saved on all nodes
                    await helper.wait.until(async () => {
                        const query =
                            "SELECT * FROM system_traces.sessions WHERE session_id=?";
                        const sessionRs = await client.execute(query, [id], {
                            consistency: types.consistencies.all,
                        });
                        const row = sessionRs.first();
                        return row && typeof row["duration"] === "number";
                    });

                    const traceArray = await Promise.all([
                        client.metadata.getTrace(id),
                        client.metadata.getTrace(id, types.consistencies.all),
                    ]);
                    traceArray.forEach(function (trace) {
                        assert.ok(trace);
                        assert.strictEqual(typeof trace.duration, "number");
                        assert.ok(trace.events.length);
                    });
                    client.shutdown();
                });
            });
        });

        describe("#refreshKeyspace()", function () {
            describe("with no callback specified", function () {
                it("should return keyspace in a promise", function () {
                    const client = newInstance({
                        isMetadataSyncEnabled: false,
                    });
                    return client
                        .connect()
                        .then(function () {
                            const ks = client.metadata.keyspaces;
                            assert.ok(ks["system"] === undefined);
                            return client.metadata.refreshKeyspace("system");
                        })
                        .then(function (keyspace) {
                            assert.ok(keyspace);
                            assert.strictEqual(keyspace.name, "system");
                            return client.shutdown();
                        });
                });
            });
        });
        describe("#refreshKeyspaces()", function () {
            describe("with no callback specified", function () {
                it("should return keyspaces in a promise", function () {
                    const client = newInstance({
                        isMetadataSyncEnabled: false,
                    });
                    return client
                        .connect()
                        .then(function () {
                            const ks = client.metadata.keyspaces;
                            assert.ok(ks["system"] === undefined);
                            return client.metadata.refreshKeyspaces();
                        })
                        .then(function (data) {
                            assert.ok(data);
                            assert.ok(data["system"]);
                            return client.shutdown();
                        });
                });
            });
        });
        describe("#getTable()", function () {
            const keyspace = "ks_tbl_meta";
            const is3 = helper.isCassandraGreaterThan("3.0");
            const valuesIndex = is3 ? "(values(map_values))" : "(map_values)";
            before(function createTables(done) {
                const client = newInstance();
                const queries = [
                    "CREATE KEYSPACE ks_tbl_meta WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3}",
                    "USE ks_tbl_meta",
                    "CREATE TABLE tbl1 (id uuid PRIMARY KEY, text_sample text)",
                    "CREATE TABLE tbl2 (id uuid, text_sample text, PRIMARY KEY ((id, text_sample)))",
                    "CREATE TABLE tbl3 (id uuid, text_sample text, PRIMARY KEY (id, text_sample))",
                    "CREATE TABLE tbl4 (zck timeuuid, apk2 text, pk1 uuid, val2 blob, valz1 int, PRIMARY KEY ((pk1, apk2), zck))",
                    "CREATE TABLE tbl7 (id1 uuid, id3 timeuuid, zid2 text, int_sample int, PRIMARY KEY (id1, zid2, id3)) WITH CLUSTERING ORDER BY (zid2 ASC, id3 DESC)",
                    "CREATE TABLE tbl8 (id uuid, rating_value counter, rating_votes counter, PRIMARY KEY (id))",
                    "CREATE TABLE tbl9 (id uuid, c1 'DynamicCompositeType(s => UTF8Type, i => Int32Type)', c2 'ReversedType(CompositeType(UTF8Type, Int32Type))', c3 'Int32Type', PRIMARY KEY (id, c1, c2))",
                    "CREATE TABLE ks_tbl_meta.tbl_collections (id uuid, ck blob, list_sample list<int>, set_sample list<text>, int_sample int, map_sample map<text,int>, PRIMARY KEY (id, ck))",
                    "CREATE INDEX text_index ON tbl1 (text_sample)",
                ];

                queries.push(
                    "CREATE TABLE tbl_indexes1 (id uuid PRIMARY KEY, map_values map<text,int>, map_keys map<text,int>, map_entries map<text,int>, map_all map<text,int>, list_sample frozen<list<blob>>)",
                    "CREATE INDEX map_keys_index ON tbl_indexes1 (keys(map_keys))",
                    "CREATE INDEX map_values_index ON tbl_indexes1 " +
                        valuesIndex,
                    "CREATE INDEX list_index ON tbl_indexes1 (full(list_sample))",
                    "CREATE TYPE udt1 (i int, b blob, t text, c 'DynamicCompositeType(s => UTF8Type, i => Int32Type)')",
                    'CREATE TYPE "UDTq""uoted" ("I" int, "B""B" blob, t text)',
                    "CREATE TABLE tbl_udts1 (id uuid PRIMARY KEY, udt_sample frozen<udt1>)",
                    "CREATE TABLE tbl_udts2 (id frozen<udt1> PRIMARY KEY)",
                    'CREATE TABLE tbl_udts_with_quoted (id uuid PRIMARY KEY, udt_sample frozen<"UDTq""uoted">)',
                    "CREATE TABLE tbl_static (id1 int, id2 int, static_value int static, value int, PRIMARY KEY (id1, id2))",
                );

                if (helper.isCassandraGreaterThan("2.2")) {
                    queries.push(
                        "CREATE INDEX map_entries_index ON tbl_indexes1 (entries(map_entries))",
                        "CREATE TABLE ks_tbl_meta.tbl_c22 " +
                            "(id uuid PRIMARY KEY, smallint_sample smallint, tinyint_sample tinyint, date_sample date, time_sample time)",
                    );

                    queries.push(
                        "CREATE INDEX map_all_entries_index on tbl_indexes1 (entries(map_all))",
                        "CREATE INDEX map_all_keys_index on tbl_indexes1 (keys(map_all))",
                        "CREATE INDEX map_all_values_index on tbl_indexes1 (values(map_all))",
                    );
                }

                if (helper.isDseGreaterThan("6")) {
                    queries.push(
                        "CREATE TABLE tbl_cdc_true (a int PRIMARY KEY, b text) WITH cdc=TRUE",
                        "CREATE TABLE tbl_cdc_false (a int PRIMARY KEY, b text) WITH cdc=FALSE",
                        "CREATE TABLE tbl_nodesync_true (a int PRIMARY KEY, b text) WITH nodesync={'enabled': 'true', 'deadline_target_sec': '86400'}",
                        "CREATE TABLE tbl_nodesync_false (a int PRIMARY KEY, b text) WITH nodesync={'enabled': 'false'}",
                    );
                }

                if (
                    !helper.isCassandraGreaterThan("4.0") &&
                    !helper.isDseGreaterThan("6.0")
                ) {
                    // COMPACT STORAGE is not supported by DSE 6.0 / C* 4.0.
                    queries.push(
                        "CREATE TABLE tbl5 (id1 uuid, id2 timeuuid, text1 text, PRIMARY KEY (id1, id2)) WITH COMPACT STORAGE",
                        "CREATE TABLE tbl6 (id uuid, text1 text, text2 text, PRIMARY KEY (id)) WITH COMPACT STORAGE",
                    );
                }

                utils.eachSeries(
                    queries,
                    client.execute.bind(client),
                    helper.finish(client, done),
                );
            });
            it("should retrieve the metadata of a single partition key table", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl1",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(
                                table.bloomFilterFalsePositiveChance,
                                0.01,
                            );
                            assert.ok(table.caching);
                            assert.strictEqual(typeof table.caching, "string");
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id",
                                "text_sample",
                            ]);
                            assert.strictEqual(table.isCompact, false);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id",
                            );
                            assert.strictEqual(table.clusteringKeys.length, 0);
                            assert.strictEqual(table.clusteringOrder.length, 0);
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a composite partition key table", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl2",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(table.columns.length, 2);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id",
                                "text_sample",
                            ]);
                            assert.strictEqual(table.isCompact, false);
                            assert.strictEqual(table.partitionKeys.length, 2);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id",
                            );
                            assert.strictEqual(
                                table.partitionKeys[1].name,
                                "text_sample",
                            );
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a partition key and clustering key table", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl3",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(
                                table.bloomFilterFalsePositiveChance,
                                0.01,
                            );
                            assert.ok(table.caching);
                            assert.strictEqual(table.columns.length, 2);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id",
                                "text_sample",
                            ]);
                            assert.strictEqual(table.isCompact, false);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id",
                            );
                            assert.strictEqual(table.clusteringKeys.length, 1);
                            assert.strictEqual(
                                table.clusteringKeys[0].name,
                                "text_sample",
                            );
                            assert.strictEqual(table.clusteringOrder.length, 1);
                            assert.strictEqual(table.clusteringOrder[0], "ASC");
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a table with reversed clustering order", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl7",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(
                                table.bloomFilterFalsePositiveChance,
                                0.01,
                            );
                            assert.ok(table.caching);
                            assert.strictEqual(table.columns.length, 4);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id1",
                                "id3",
                                "int_sample",
                                "zid2",
                            ]);
                            assert.strictEqual(table.isCompact, false);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id1",
                            );
                            assert.strictEqual(table.clusteringKeys.length, 2);
                            assert.strictEqual(
                                table.clusteringKeys[0].name,
                                "zid2",
                            );
                            assert.strictEqual(
                                table.clusteringKeys[1].name,
                                "id3",
                            );
                            assert.strictEqual(table.clusteringOrder.length, 2);
                            assert.strictEqual(table.clusteringOrder[0], "ASC");
                            assert.strictEqual(
                                table.clusteringOrder[1],
                                "DESC",
                            );
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a counter table", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl8",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(table.columns.length, 3);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id",
                                "rating_value",
                                "rating_votes",
                            ]);
                            assert.strictEqual(table.isCompact, false);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id",
                            );
                            assert.strictEqual(
                                table.partitionKeys[0].type.code,
                                types.dataTypes.uuid,
                            );
                            assert.strictEqual(table.clusteringKeys.length, 0);
                            assert.strictEqual(
                                table.columnsByName["rating_value"].type.code,
                                types.dataTypes.counter,
                            );
                            assert.strictEqual(
                                table.columnsByName["rating_votes"].type.code,
                                types.dataTypes.counter,
                            );
                            // true counter tables
                            assert.strictEqual(table.replicateOnWrite, true);
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a compact storaged table", function (done) {
                if (
                    helper.isCassandraGreaterThan("4.0") ||
                    helper.isDseGreaterThan("6")
                ) {
                    this.skip();
                }

                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl6",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(
                                table.bloomFilterFalsePositiveChance,
                                0.01,
                            );
                            assert.ok(table.caching);
                            assert.strictEqual(table.columns.length, 3);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id",
                                "text1",
                                "text2",
                            ]);
                            assert.strictEqual(table.isCompact, true);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id",
                            );
                            assert.strictEqual(table.clusteringKeys.length, 0);
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a compact storaged table with clustering key", function (done) {
                if (
                    helper.isCassandraGreaterThan("4.0") ||
                    helper.isDseGreaterThan("6")
                ) {
                    this.skip();
                }

                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl5",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(table.columns.length, 3);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "id1",
                                "id2",
                                "text1",
                            ]);
                            assert.strictEqual(table.isCompact, true);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id1",
                            );
                            assert.strictEqual(table.clusteringKeys.length, 1);
                            assert.strictEqual(
                                table.clusteringKeys[0].name,
                                "id2",
                            );
                            assert.strictEqual(table.virtual, false);
                            done();
                        },
                    );
                });
            });
            it("should retrieve the metadata of a table with ColumnToCollectionType", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl_collections",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            const columns = table.columns
                                .map((c) => c.name)
                                .sort();
                            helper.assertValueEqual(columns, [
                                "ck",
                                "id",
                                "int_sample",
                                "list_sample",
                                "map_sample",
                                "set_sample",
                            ]);
                            assert.strictEqual(table.isCompact, false);
                            assert.strictEqual(table.partitionKeys.length, 1);
                            assert.strictEqual(
                                table.partitionKeys[0].name,
                                "id",
                            );
                            assert.strictEqual(table.clusteringKeys.length, 1);
                            assert.strictEqual(
                                table.clusteringKeys[0].name,
                                "ck",
                            );
                            assert.strictEqual(table.virtual, false);
                            client.shutdown(done);
                        },
                    );
                });
            });
            it("should retrieve a simple secondary index", function (done) {
                const client = newInstance({ keyspace: keyspace });
                client.connect(function (err) {
                    assert.ifError(err);
                    client.metadata.getTable(
                        keyspace,
                        "tbl1",
                        function (err, table) {
                            assert.ifError(err);
                            assert.ok(table);
                            assert.strictEqual(table.columns.length, 2);
                            assert.ok(table.indexes);
                            assert.strictEqual(table.indexes.length, 1);
                            const index = table.indexes[0];
                            assert.strictEqual(index.name, "text_index");
                            assert.strictEqual(index.target, "text_sample");
                            assert.strictEqual(index.isCompositesKind(), true);
                            assert.strictEqual(index.isCustomKind(), false);
                            assert.strictEqual(index.isKeysKind(), false);
                            assert.ok(index.options);
                            client.shutdown(done);
                        },
                    );
                });
            });
            vit(
                "2.1",
                "should retrieve a secondary index on map keys",
                function (done) {
                    const client = newInstance({ keyspace: keyspace });
                    client.connect(function (err) {
                        assert.ifError(err);
                        client.metadata.getTable(
                            keyspace,
                            "tbl_indexes1",
                            function (err, table) {
                                assert.ifError(err);
                                assert.ok(table);
                                assert.ok(table.indexes);
                                assert.ok(table.indexes.length > 0);
                                const index = table.indexes.filter(
                                    (x) => x.name === "map_keys_index",
                                )[0];
                                assert.ok(index, "Index not found");
                                assert.strictEqual(
                                    index.name,
                                    "map_keys_index",
                                );
                                assert.strictEqual(
                                    index.target,
                                    "keys(map_keys)",
                                );
                                assert.strictEqual(
                                    index.isCompositesKind(),
                                    true,
                                );
                                assert.strictEqual(index.isCustomKind(), false);
                                assert.strictEqual(index.isKeysKind(), false);
                                assert.ok(index.options);
                                client.shutdown(done);
                            },
                        );
                    });
                },
            );
            vit(
                "2.1",
                "should retrieve a secondary index on map values",
                function (done) {
                    const client = newInstance({ keyspace: keyspace });
                    client.connect(function (err) {
                        assert.ifError(err);
                        client.metadata.getTable(
                            keyspace,
                            "tbl_indexes1",
                            function (err, table) {
                                assert.ifError(err);
                                assert.ok(table);
                                assert.ok(table.indexes);
                                assert.ok(table.indexes.length > 0);
                                const index = table.indexes.filter(
                                    (x) => x.name === "map_values_index",
                                )[0];
                                assert.ok(index, "Index not found");
                                assert.strictEqual(
                                    index.name,
                                    "map_values_index",
                                );
                                assert.strictEqual(
                                    index.target,
                                    is3 ? "values(map_values)" : "map_values",
                                );
                                assert.strictEqual(
                                    index.isCompositesKind(),
                                    true,
                                );
                                assert.strictEqual(index.isCustomKind(), false);
                                assert.strictEqual(index.isKeysKind(), false);
                                assert.ok(index.options);
                                client.shutdown(done);
                            },
                        );
                    });
                },
            );

            vit("2.1", "should retrieve static columns", () =>
                setupInfo.client.metadata
                    .getTable(keyspace, "tbl_static")
                    .then((table) => {
                        assert.strictEqual(table.columns.length, 4);
                        table.columns.forEach((c) =>
                            assert.strictEqual(
                                c.isStatic,
                                c.name === "static_value",
                            ),
                        );
                    }),
            );

            vit(
                "2.2",
                "should retrieve a secondary index on map entries",
                function (done) {
                    const client = newInstance({ keyspace: keyspace });
                    client.connect(function (err) {
                        assert.ifError(err);
                        client.metadata.getTable(
                            keyspace,
                            "tbl_indexes1",
                            function (err, table) {
                                assert.ifError(err);
                                assert.ok(table);
                                assert.ok(table.indexes);
                                assert.ok(table.indexes.length > 0);
                                const index = table.indexes.filter(
                                    (x) => x.name === "map_entries_index",
                                )[0];
                                assert.ok(index, "Index not found");
                                assert.strictEqual(
                                    index.name,
                                    "map_entries_index",
                                );
                                assert.strictEqual(
                                    index.target,
                                    "entries(map_entries)",
                                );
                                assert.strictEqual(
                                    index.isCompositesKind(),
                                    true,
                                );
                                assert.strictEqual(index.isCustomKind(), false);
                                assert.strictEqual(index.isKeysKind(), false);
                                assert.ok(index.options);
                                client.shutdown(done);
                            },
                        );
                    });
                },
            );
            vit(
                "3.0",
                "should retrieve multiple indexes on same map column",
                function (done) {
                    const client = newInstance({ keyspace: keyspace });
                    client.connect(function (err) {
                        assert.ifError(err);
                        client.metadata.getTable(
                            keyspace,
                            "tbl_indexes1",
                            function (err, table) {
                                assert.ifError(err);
                                assert.ok(table);
                                assert.ok(table.indexes);
                                assert.ok(table.indexes.length > 0);

                                const indexes = [
                                    {
                                        name: "map_all_entries_index",
                                        target: "entries(map_all)",
                                    },
                                    {
                                        name: "map_all_keys_index",
                                        target: "keys(map_all)",
                                    },
                                    {
                                        name: "map_all_values_index",
                                        target: "values(map_all)",
                                    },
                                ];

                                indexes.forEach(function (idx) {
                                    const index = table.indexes.filter(
                                        (x) => x.name === idx.name,
                                    )[0];
                                    assert.ok(index, "Index not found");
                                    assert.strictEqual(index.name, idx.name);
                                    assert.strictEqual(
                                        index.target,
                                        idx.target,
                                    );
                                    assert.strictEqual(
                                        index.isCompositesKind(),
                                        true,
                                    );
                                    assert.strictEqual(
                                        index.isCustomKind(),
                                        false,
                                    );
                                    assert.strictEqual(
                                        index.isKeysKind(),
                                        false,
                                    );
                                    assert.ok(index.options);
                                });
                                client.shutdown(done);
                            },
                        );
                    });
                },
            );
            vit(
                "2.1",
                "should retrieve a secondary index on frozen list",
                function (done) {
                    const client = newInstance({ keyspace: keyspace });
                    client.connect(function (err) {
                        assert.ifError(err);
                        client.metadata.getTable(
                            keyspace,
                            "tbl_indexes1",
                            function (err, table) {
                                assert.ifError(err);
                                assert.ok(table);
                                assert.ok(table.indexes);
                                assert.ok(table.indexes.length > 0);
                                const index = table.indexes.filter(
                                    function (x) {
                                        return x.name === "list_index";
                                    },
                                )[0];
                                assert.ok(index, "Index not found");
                                assert.strictEqual(index.name, "list_index");
                                assert.strictEqual(
                                    index.target,
                                    "full(list_sample)",
                                );
                                assert.strictEqual(
                                    index.isCompositesKind(),
                                    true,
                                );
                                assert.strictEqual(index.isCustomKind(), false);
                                assert.strictEqual(index.isKeysKind(), false);
                                assert.ok(index.options);
                                client.shutdown(done);
                            },
                        );
                    });
                },
            );
            vit(
                "2.2",
                "should retrieve the metadata of a table containing new 2.2 types",
                function (done) {
                    const client = newInstance({ keyspace: keyspace });
                    utils.series(
                        [
                            client.connect.bind(client),
                            function checkTable(next) {
                                client.metadata.getTable(
                                    keyspace,
                                    "tbl_c22",
                                    function (err, table) {
                                        assert.ifError(err);
                                        assert.ok(table);
                                        assert.strictEqual(
                                            table.columns.length,
                                            5,
                                        );
                                        assert.ok(
                                            table.columnsByName[
                                                "smallint_sample"
                                            ],
                                        );
                                        assert.ok(
                                            table.columnsByName[
                                                "tinyint_sample"
                                            ],
                                        );
                                        assert.ok(
                                            table.columnsByName["date_sample"],
                                        );
                                        assert.ok(
                                            table.columnsByName["time_sample"],
                                        );
                                        assert.strictEqual(
                                            table.columnsByName[
                                                "smallint_sample"
                                            ].type.code,
                                            types.dataTypes.smallint,
                                        );
                                        assert.strictEqual(
                                            table.columnsByName[
                                                "tinyint_sample"
                                            ].type.code,
                                            types.dataTypes.tinyint,
                                        );
                                        assert.strictEqual(
                                            table.columnsByName["date_sample"]
                                                .type.code,
                                            types.dataTypes.date,
                                        );
                                        assert.strictEqual(
                                            table.columnsByName["time_sample"]
                                                .type.code,
                                            types.dataTypes.time,
                                        );
                                        next();
                                    },
                                );
                            },
                        ],
                        done,
                    );
                },
            );
            vit(
                "2.1",
                "should retrieve the metadata of a table with udt column",
                function (done) {
                    const client = newInstance();
                    utils.series(
                        [
                            client.connect.bind(client),
                            function checkMetadata(next) {
                                client.metadata.getTable(
                                    keyspace,
                                    "tbl_udts1",
                                    function (err, table) {
                                        assert.ifError(err);
                                        assert.ok(table);
                                        assert.deepEqual(
                                            table.columns.map((c) => c.name),
                                            ["id", "udt_sample"],
                                        );
                                        const udtColumn =
                                            table.columnsByName["udt_sample"];
                                        assert.ok(udtColumn);
                                        assert.strictEqual(
                                            udtColumn.type.code,
                                            types.dataTypes.udt,
                                        );
                                        assert.ok(udtColumn.type.info);
                                        assert.strictEqual(
                                            udtColumn.type.info.name,
                                            "udt1",
                                        );
                                        assert.deepEqual(
                                            udtColumn.type.info.fields.map(
                                                function (f) {
                                                    return f.name;
                                                },
                                            ),
                                            ["i", "b", "t", "c"],
                                        );
                                        next();
                                    },
                                );
                            },
                            client.shutdown.bind(client),
                        ],
                        done,
                    );
                },
            );
            vit(
                "2.1",
                "should retrieve the metadata of a table with udt partition key",
                function (done) {
                    const client = newInstance();
                    utils.series(
                        [
                            client.connect.bind(client),
                            function checkMetadata(next) {
                                client.metadata.getTable(
                                    keyspace,
                                    "tbl_udts2",
                                    function (err, table) {
                                        assert.ifError(err);
                                        assert.ok(table);
                                        assert.deepEqual(
                                            table.columns.map((c) => c.name),
                                            ["id"],
                                        );
                                        const udtColumn = table.columns[0];
                                        assert.ok(udtColumn);
                                        assert.strictEqual(
                                            table.partitionKeys[0],
                                            udtColumn,
                                        );
                                        assert.strictEqual(
                                            udtColumn.type.code,
                                            types.dataTypes.udt,
                                        );
                                        assert.ok(udtColumn.type.info);
                                        assert.strictEqual(
                                            udtColumn.type.info.name,
                                            "udt1",
                                        );
                                        assert.deepEqual(
                                            udtColumn.type.info.fields.map(
                                                function (f) {
                                                    return f.name;
                                                },
                                            ),
                                            ["i", "b", "t", "c"],
                                        );
                                        next();
                                    },
                                );
                            },
                            client.shutdown.bind(client),
                        ],
                        done,
                    );
                },
            );
            it("should retrieve the metadata of a table with custom type columns", function (done) {
                const client = newInstance();
                utils.series(
                    [
                        client.connect.bind(client),
                        function checkMetadata(next) {
                            client.metadata.getTable(
                                keyspace,
                                "tbl9",
                                function (err, table) {
                                    assert.ifError(err);
                                    assert.ok(table);

                                    assert.strictEqual(
                                        table.clusteringOrder.length,
                                        2,
                                    );
                                    assert.strictEqual(
                                        table.clusteringOrder[0],
                                        "ASC",
                                    );
                                    // Since c2 is a reversed type, clustering order should be DESC.
                                    assert.strictEqual(
                                        table.clusteringOrder[1],
                                        "DESC",
                                    );

                                    const dynamicColumn =
                                        table.clusteringKeys[0];
                                    assert.ok(dynamicColumn);
                                    assert.strictEqual(
                                        dynamicColumn.name,
                                        "c1",
                                    );
                                    assert.strictEqual(
                                        dynamicColumn.type.code,
                                        types.dataTypes.custom,
                                    );

                                    const typeInfo = dynamicColumn.type.info;

                                    helper.assertContains(
                                        typeInfo,
                                        "s=>org.apache.cassandra.db.marshal.UTF8Type",
                                    );
                                    helper.assertContains(
                                        typeInfo,
                                        "i=>org.apache.cassandra.db.marshal.Int32Type",
                                    );
                                    assert.strictEqual(
                                        typeInfo.startsWith(
                                            "org.apache.cassandra.db.marshal.DynamicCompositeType(",
                                        ),
                                        true,
                                    );

                                    const reversedColumn =
                                        table.clusteringKeys[1];
                                    assert.ok(reversedColumn);
                                    assert.strictEqual(
                                        reversedColumn.name,
                                        "c2",
                                    );
                                    assert.strictEqual(
                                        reversedColumn.type.code,
                                        types.dataTypes.custom,
                                    );
                                    assert.strictEqual(
                                        reversedColumn.type.info,
                                        "org.apache.cassandra.db.marshal.CompositeType(" +
                                            "org.apache.cassandra.db.marshal.UTF8Type," +
                                            "org.apache.cassandra.db.marshal.Int32Type)",
                                    );

                                    const intColumn = table.columnsByName["c3"];
                                    assert.ok(intColumn);
                                    assert.strictEqual(
                                        intColumn.type.code,
                                        types.dataTypes.int,
                                    );
                                    next();
                                },
                            );
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
            vit(
                "2.1",
                "should retrieve the metadata of a table with quoted udt",
                function (done) {
                    const client = newInstance();
                    utils.series(
                        [
                            client.connect.bind(client),
                            function checkMetadata(next) {
                                client.metadata.getTable(
                                    keyspace,
                                    "tbl_udts_with_quoted",
                                    function (err, table) {
                                        assert.ifError(err);
                                        assert.ok(table);
                                        assert.deepEqual(
                                            table.columns.map((c) => c.name),
                                            ["id", "udt_sample"],
                                        );
                                        const udtColumn =
                                            table.columnsByName["udt_sample"];
                                        assert.ok(udtColumn);
                                        assert.strictEqual(
                                            udtColumn.type.code,
                                            types.dataTypes.udt,
                                        );
                                        assert.ok(udtColumn.type.info);
                                        assert.strictEqual(
                                            udtColumn.type.info.name,
                                            'UDTq"uoted',
                                        );
                                        assert.deepEqual(
                                            udtColumn.type.info.fields.map(
                                                function (f) {
                                                    return f.name;
                                                },
                                            ),
                                            ["I", 'B"B', "t"],
                                        );
                                        next();
                                    },
                                );
                            },
                            client.shutdown.bind(client),
                        ],
                        done,
                    );
                },
            );
            // Need to investigate:
            // https://github.com/scylladb-zpp-2024-javascript-driver/scylladb-javascript-driver/pull/43#discussion_r1830763855
            /* vit(
                "dse-6",
                "should retrieve the cdc information of a table metadata",
                function (done) {
                    const client = setupInfo.client;
                    utils.mapSeries(
                        [
                            ["tbl_cdc_true", true],
                            ["tbl_cdc_false", false],
                            ["tbl1", false],
                        ],
                        function mapEach(item, next) {
                            client.metadata.getTable(
                                keyspace,
                                item[0],
                                function (err, table) {
                                    assert.ifError(err);
                                    assert.strictEqual(table.cdc, item[1]);
                                    next();
                                },
                            );
                        },
                        done,
                    );
                },
            );
            vit(
                "dse-6",
                "should retrieve the nodesync information of a table metadata",
                function (done) {
                    const client = setupInfo.client;
                    utils.mapSeries(
                        [
                            [
                                "tbl_nodesync_true",
                                {
                                    enabled: "true",
                                    deadline_target_sec: "86400",
                                },
                            ],
                            ["tbl_nodesync_false", { enabled: "false" }],
                        ],
                        function mapEach(item, next) {
                            client.metadata.getTable(
                                keyspace,
                                item[0],
                                function (err, table) {
                                    assert.ifError(err);
                                    assert.deepEqual(table.nodesync, item[1]);
                                    next();
                                },
                            );
                        },
                        done,
                    );
                },
            ); */
            vit(
                "4.0",
                "should retrieve the metadata of a virtual table",
                () => {
                    const client = setupInfo.client;
                    return client.metadata
                        .getTable("system_views", "clients")
                        .then((table) => {
                            assert.ok(table);
                            assert.ok(table.virtual);
                            assert.strictEqual(table.name, "clients");
                            assert.deepEqual(
                                table.columns.map((c) => c.name),
                                [
                                    "address",
                                    "connection_stage",
                                    "driver_name",
                                    "driver_version",
                                    "hostname",
                                    "port",
                                    "protocol_version",
                                    "request_count",
                                    "ssl_cipher_suite",
                                    "ssl_enabled",
                                    "ssl_protocol",
                                    "username",
                                ],
                            );
                            assert.deepEqual(table.clusteringOrder, ["ASC"]);
                            assert.deepEqual(
                                table.partitionKeys.map((c) => c.name),
                                ["address"],
                            );
                            assert.deepEqual(
                                table.clusteringKeys.map((c) => c.name),
                                ["port"],
                            );
                        });
                },
            );
            it("should retrieve the updated metadata after a schema change", function (done) {
                const client = newInstance();
                const nonSyncClient = newInstance({
                    isMetadataSyncEnabled: false,
                });
                const clients = [client, nonSyncClient];
                utils.series(
                    [
                        client.connect.bind(client),
                        nonSyncClient.connect.bind(nonSyncClient),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE TABLE ks_tbl_meta.tbl_changing (id uuid PRIMARY KEY, text_sample text)",
                        ),
                        function checkTable1(next) {
                            utils.each(
                                clients,
                                function (client, eachNext) {
                                    client.metadata.getTable(
                                        "ks_tbl_meta",
                                        "tbl_changing",
                                        function (err, table) {
                                            assert.ifError(err);
                                            assert.ok(table);
                                            assert.strictEqual(
                                                table.columns.length,
                                                2,
                                            );
                                            eachNext();
                                        },
                                    );
                                },
                                next,
                            );
                        },
                        helper.toTask(
                            client.execute,
                            client,
                            "ALTER TABLE ks_tbl_meta.tbl_changing ADD new_col1 timeuuid",
                        ),
                        function checkTable2(next) {
                            utils.each(
                                clients,
                                function (clien, eachNext) {
                                    client.metadata.getTable(
                                        "ks_tbl_meta",
                                        "tbl_changing",
                                        function (err, table) {
                                            assert.ifError(err);
                                            assert.ok(table);
                                            assert.strictEqual(
                                                table.columns.length,
                                                3,
                                            );
                                            assert.ok(
                                                table.columnsByName["new_col1"],
                                            );
                                            assert.strictEqual(
                                                table.columnsByName["new_col1"]
                                                    .type.code,
                                                types.dataTypes.timeuuid,
                                            );
                                            eachNext();
                                        },
                                    );
                                },
                                next,
                            );
                        },
                        client.shutdown.bind(nonSyncClient),
                        nonSyncClient.shutdown.bind(nonSyncClient),
                    ],
                    done,
                );
            });
            describe("with no callback specified", function () {
                it("should return the metadata in a promise", function () {
                    const client = newInstance();
                    return client
                        .connect()
                        .then(function () {
                            return client.metadata.getTable(keyspace, "tbl1");
                        })
                        .then(function (table) {
                            assert.ok(table);
                            assert.strictEqual(table.name, "tbl1");
                            assert.ok(table.columns.length);
                            return client.shutdown();
                        });
                });
            });

            context("with ECMAScript Map and Set", () => {
                const client = new Client(
                    Object.assign({}, helper.baseOptions, {
                        keyspace,
                        encoding: { map: Map, set: Set },
                    }),
                );

                before(() => client.connect());
                after(() => client.shutdown());

                it("should retrieve the table metadata using the same representation", () =>
                    client.metadata.getTable(keyspace, "tbl7").then((table) => {
                        assert.ok(table);
                        assert.strictEqual(table.columns.length, 4);
                        assert.isString(table.compactionClass);

                        assert.isObject(table.compactionOptions);
                        assert.notInstanceOf(table.compactionOptions, Map);
                        assert.strictEqual(
                            table.compactionOptions.constructor,
                            Object,
                        );

                        assert.isObject(table.compression);
                        assert.strictEqual(
                            table.compression.constructor,
                            Object,
                        );

                        if (helper.isDseGreaterThan("5.0")) {
                            assert.isString(table.compression.class);
                        }
                    }));

                vit(
                    "2.1",
                    "should retrieve the secondary indexes metadata using the same representation",
                    () =>
                        client.metadata
                            .getTable(keyspace, "tbl_indexes1")
                            .then((table) => {
                                assert.ok(table.indexes.length > 0);
                                const index = table.indexes.filter(
                                    (x) => x.name === "map_values_index",
                                )[0];
                                assert.ok(index, "Index not found");
                                assert.strictEqual(
                                    index.name,
                                    "map_values_index",
                                );
                                assert.strictEqual(
                                    index.isCompositesKind(),
                                    true,
                                );
                                assert.strictEqual(index.isCustomKind(), false);
                                assert.strictEqual(index.isKeysKind(), false);
                                assert.ok(index.options);
                                assert.strictEqual(
                                    index.options.constructor,
                                    Object,
                                );
                            }),
                );
            });
        });
        vdescribe("3.0", "#getMaterializedView()", function () {
            const keyspace = "ks_view_meta";
            before(function createTables(done) {
                const client = newInstance();
                const queries = [
                    "CREATE KEYSPACE ks_view_meta WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3}",
                    "CREATE TABLE ks_view_meta.scores (user TEXT, game TEXT, year INT, month INT, day INT, score INT, PRIMARY KEY (user, game, year, month, day))",
                    "CREATE MATERIALIZED VIEW ks_view_meta.dailyhigh AS SELECT game, year, month, score, user, day FROM scores WHERE game IS NOT NULL AND year IS NOT NULL AND month IS NOT NULL AND day IS NOT NULL AND score IS NOT NULL AND user IS NOT NULL PRIMARY KEY ((game, year, month, day), score, user) WITH CLUSTERING ORDER BY (score DESC, user ASC)",
                ];
                if (helper.isDseGreaterThan("6")) {
                    queries.push(
                        "CREATE MATERIALIZED VIEW ks_view_meta.dailyhigh_nodesync AS SELECT game, year, month, score, user, day FROM scores WHERE game IS NOT NULL AND year IS NOT NULL AND month IS NOT NULL AND day IS NOT NULL AND score IS NOT NULL AND user IS NOT NULL PRIMARY KEY ((game, year, month, day), score, user) WITH CLUSTERING ORDER BY (score DESC, user ASC) AND nodesync = { 'enabled': 'true', 'deadline_target_sec': '86400'}",
                    );
                }
                utils.eachSeries(
                    queries,
                    client.execute.bind(client),
                    function (err) {
                        client.shutdown();
                        if (err) {
                            return done(err);
                        }
                        done();
                    },
                );
            });
            it("should retrieve the view and table metadata", function (done) {
                const client = newInstance();
                utils.series(
                    [
                        client.connect.bind(client),
                        function checkMeta(next) {
                            client.metadata.getMaterializedView(
                                keyspace,
                                "dailyhigh",
                                function (err, view) {
                                    assert.ifError(err);
                                    assert.ok(view);
                                    assert.strictEqual(view.name, "dailyhigh");
                                    assert.strictEqual(
                                        view.tableName,
                                        "scores",
                                    );
                                    assert.strictEqual(
                                        view.whereClause,
                                        "game IS NOT NULL AND year IS NOT NULL AND month IS NOT NULL AND day IS NOT NULL AND score IS NOT NULL AND user IS NOT NULL",
                                    );
                                    assert.strictEqual(
                                        view.includeAllColumns,
                                        false,
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys.length,
                                        2,
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys[0].name,
                                        "score",
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys[1].name,
                                        "user",
                                    );
                                    assert.strictEqual(
                                        view.partitionKeys.length,
                                        4,
                                    );
                                    assert.strictEqual(
                                        view.partitionKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "game, year, month, day",
                                    );
                                    assert.strictEqual(view.nodesync, null);
                                    next();
                                },
                            );
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });

            it("should refresh the view metadata via events", function (done) {
                const client = newInstance({
                    keyspace: "ks_view_meta",
                    refreshSchemaDelay: 50,
                });
                const nonSyncClient = newInstance({
                    keyspace: "ks_view_meta",
                    isMetadataSyncEnabled: false,
                });
                const clients = [client, nonSyncClient];
                utils.series(
                    [
                        client.connect.bind(client),
                        nonSyncClient.connect.bind(nonSyncClient),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE MATERIALIZED VIEW monthlyhigh AS " +
                                "SELECT game, year, month, score, user, day FROM scores WHERE game IS NOT NULL AND year IS NOT NULL AND" +
                                " month IS NOT NULL AND score IS NOT NULL AND user IS NOT NULL AND day IS NOT NULL" +
                                " PRIMARY KEY ((game, year, month), score, user, day)" +
                                " WITH CLUSTERING ORDER BY (score DESC, user ASC, day ASC) AND compaction = { 'class' :" +
                                " 'SizeTieredCompactionStrategy' }",
                        ),
                        function checkView1(next) {
                            utils.each(
                                clients,
                                function (client, eachNext) {
                                    client.metadata.getMaterializedView(
                                        "ks_view_meta",
                                        "monthlyhigh",
                                        function (err, view) {
                                            assert.ifError(err);
                                            assert.ok(view);
                                            assert.strictEqual(
                                                view.partitionKeys.length,
                                                3,
                                            );
                                            assert.strictEqual(
                                                view.partitionKeys
                                                    .map((x) => x.name)
                                                    .join(", "),
                                                "game, year, month",
                                            );
                                            assert.strictEqual(
                                                view.clusteringKeys
                                                    .map((x) => x.name)
                                                    .join(", "),
                                                "score, user, day",
                                            );
                                            helper.assertContains(
                                                view.compactionClass,
                                                "SizeTieredCompactionStrategy",
                                            );
                                            eachNext();
                                        },
                                    );
                                },
                                next,
                            );
                        },
                        helper.toTask(
                            client.execute,
                            client,
                            "ALTER MATERIALIZED VIEW monthlyhigh" +
                                " WITH compaction = { 'class' : 'LeveledCompactionStrategy' }",
                        ),
                        function checkView1(next) {
                            utils.each(
                                clients,
                                function (client, eachNext) {
                                    client.metadata.getMaterializedView(
                                        "ks_view_meta",
                                        "monthlyhigh",
                                        function (err, view) {
                                            assert.ifError(err);
                                            assert.ok(view);
                                            assert.strictEqual(
                                                view.partitionKeys.length,
                                                3,
                                            );
                                            assert.strictEqual(
                                                view.clusteringKeys.length,
                                                3,
                                            );
                                            helper.assertContains(
                                                view.compactionClass,
                                                "LeveledCompactionStrategy",
                                            );
                                            eachNext();
                                        },
                                    );
                                },
                                next,
                            );
                        },
                        helper.toTask(
                            client.execute,
                            client,
                            "DROP MATERIALIZED VIEW monthlyhigh",
                        ),
                        function checkDropped(next) {
                            utils.each(
                                clients,
                                function (client, eachNext) {
                                    client.metadata.getMaterializedView(
                                        "ks_view_meta",
                                        "monthlyhigh",
                                        function (err, view) {
                                            assert.ifError(err);
                                            assert.strictEqual(view, null);
                                            eachNext();
                                        },
                                    );
                                },
                                next,
                            );
                        },
                        client.shutdown.bind(client),
                        nonSyncClient.shutdown.bind(nonSyncClient),
                    ],
                    done,
                );
            });
            it("should refresh the view metadata as result of table change via events", function (done) {
                const client = newInstance({
                    keyspace: "ks_view_meta",
                    refreshSchemaDelay: 50,
                });
                utils.series(
                    [
                        client.connect.bind(client),
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE TABLE users (user TEXT PRIMARY KEY, first_name TEXT)",
                        ),
                        // create a view using 'select *'.
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE MATERIALIZED VIEW users_by_first_all AS SELECT * FROM users" +
                                " WHERE user IS NOT NULL AND first_name IS NOT NULL PRIMARY KEY (first_name, user)",
                        ),
                        // create same view using 'select <columns>'.
                        helper.toTask(
                            client.execute,
                            client,
                            "CREATE MATERIALIZED VIEW users_by_first AS" +
                                " SELECT user, first_name FROM users WHERE user IS NOT NULL AND first_name IS NOT NULL" +
                                " PRIMARY KEY (first_name, user)",
                        ),
                        function checkAllView(next) {
                            client.metadata.getMaterializedView(
                                "ks_view_meta",
                                "users_by_first_all",
                                function (err, view) {
                                    assert.ifError(err);
                                    assert.ok(view);
                                    assert.strictEqual(
                                        view.partitionKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "first_name",
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "user",
                                    );
                                    // includeAllColumns should be true since 'select *' was used.
                                    assert.strictEqual(
                                        view.includeAllColumns,
                                        true,
                                    );
                                    next();
                                },
                            );
                        },
                        function checkView(next) {
                            client.metadata.getMaterializedView(
                                "ks_view_meta",
                                "users_by_first",
                                function (err, view) {
                                    assert.ifError(err);
                                    assert.ok(view);
                                    assert.strictEqual(
                                        view.partitionKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "first_name",
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "user",
                                    );
                                    assert.strictEqual(
                                        view.includeAllColumns,
                                        false,
                                    );
                                    next();
                                },
                            );
                        },
                        helper.toTask(
                            client.execute,
                            client,
                            "ALTER TABLE users ADD last_name text",
                        ),
                        function checkForNewColumnsInAllView(next) {
                            // ensure that the newly added column 'last_name' in 'users' was propagated to users_by_first_all.
                            client.metadata.getMaterializedView(
                                "ks_view_meta",
                                "users_by_first_all",
                                function (err, view) {
                                    assert.ifError(err);
                                    assert.ok(view);
                                    assert.strictEqual(
                                        view.partitionKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "first_name",
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "user",
                                    );
                                    assert.ok(view.columnsByName["last_name"]);
                                    assert.ok(
                                        view.columnsByName["last_name"].type
                                            .code === types.dataTypes.varchar ||
                                            view.columnsByName["last_name"].type
                                                .code === types.dataTypes.text,
                                    );
                                    assert.strictEqual(view.columns.length, 3);
                                    assert.strictEqual(
                                        view.includeAllColumns,
                                        true,
                                    );
                                    next();
                                },
                            );
                        },
                        function checkColumnNotAddedInView(next) {
                            // since 'users_by_first' does not include all columns it should not detect the new column.
                            client.metadata.getMaterializedView(
                                "ks_view_meta",
                                "users_by_first",
                                function (err, view) {
                                    assert.ifError(err);
                                    assert.ok(view);
                                    assert.strictEqual(
                                        view.partitionKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "first_name",
                                    );
                                    assert.strictEqual(
                                        view.clusteringKeys
                                            .map((x) => x.name)
                                            .join(", "),
                                        "user",
                                    );
                                    assert.strictEqual(
                                        view.columnsByName["last_name"],
                                        undefined,
                                    );
                                    assert.strictEqual(view.columns.length, 2);
                                    assert.strictEqual(
                                        view.includeAllColumns,
                                        false,
                                    );
                                    next();
                                },
                            );
                        },
                        client.shutdown.bind(client),
                    ],
                    done,
                );
            });
            describe("with no callback specified", function () {
                it("should return the metadata in a promise", function () {
                    const client = newInstance();
                    return client
                        .connect()
                        .then(function () {
                            return client.metadata.getMaterializedView(
                                keyspace,
                                "dailyhigh",
                            );
                        })
                        .then(function (view) {
                            assert.ok(view);
                            assert.strictEqual(view.name, "dailyhigh");
                            assert.ok(view.clusteringKeys.length);
                            return client.shutdown();
                        });
                });
            });

            context("with ECMAScript Map and Set", () => {
                const client = new Client(
                    Object.assign({}, helper.baseOptions, {
                        keyspace,
                        encoding: { map: Map, set: Set },
                    }),
                );

                before(() => client.connect());
                after(() => client.shutdown());

                it("should retrieve the view metadata using the same representation", () =>
                    client.metadata
                        .getMaterializedView(keyspace, "dailyhigh")
                        .then((view) => {
                            assert.ok(view);
                            assert.strictEqual(view.tableName, "scores");
                            assert.strictEqual(view.partitionKeys.length, 4);
                            assert.strictEqual(view.clusteringKeys.length, 2);

                            assert.ok(view.compactionOptions);
                            assert.strictEqual(
                                view.compactionOptions.constructor,
                                Object,
                            );

                            assert.ok(view.compression);
                            assert.strictEqual(
                                view.compression.constructor,
                                Object,
                            );
                        }));
            });
        });

        describe("#isDbaas()", () => {
            it("should return false for any product type except cloud", () => {
                assert.strictEqual(setupInfo.client.metadata.isDbaas(), false);
            });
        });
    });

    // No planned support for Client.getState()
    /* describe("Client#getState()", function () {    }); */

    describe("Client#hosts", () => {
        it("should contain the hosts metadata information", () => {
            setupInfo.client.hosts.values().forEach((host) => {
                assert.strictEqual(host.datacenter, "dc1");
                assert.strictEqual(typeof host.rack, "string");
                helper.assertInstanceOf(host.hostId, types.Uuid);
                helper.assertInstanceOf(host.tokens, Array);
            });
        });
    });

    describe("ResultSet", function () {
        describe("#info.isSchemaInAgreement", function () {
            const client = setupInfo.client;

            it("should return true when executing DML queries", () =>
                client
                    .execute(helper.queries.basic)
                    .then((rs) =>
                        assert.strictEqual(rs.info.isSchemaInAgreement, true),
                    ));

            it("should return true when executing DDL queries", () =>
                client
                    .execute(
                        "CREATE KEYSPACE ks_rs_is_schema_in_agreement" +
                            " WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 1}",
                    )
                    .then((rs) =>
                        assert.strictEqual(rs.info.isSchemaInAgreement, true),
                    ));
        });
    });

    describe("Client information", () => {
        vit("4.0", "should send driver name and version", () => {
            const query =
                "select driver_name, driver_version from system_views.clients";
            return setupInfo.client.execute(query).then((rs) => {
                const row = rs.first();
                assert.strictEqual(row["driver_name"], packageInfo.description);
                assert.strictEqual(row["driver_version"], packageInfo.version);
            });
        });
    });
});

/** @returns {Client}  */
function newInstance(options) {
    return helper.shutdownAfterThisTest(
        new Client(utils.deepExtend({}, helper.baseOptions, options)),
    );
}
