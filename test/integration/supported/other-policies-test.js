"use strict";
const assert = require("assert");

const helper = require("../../test-helper");
const {
    EC2MultiRegionTranslator,
} = require("../../../lib/policies/address-resolution");
const { Client } = require("../../../main");
const commonKs = helper.getRandomName("ks");

describe("Client", function () {
    this.timeout(120000);
    describe("#client({policies.addressResolution = new EC2MultiRegionTranslator()}", function () {
        // Those test do not check if the translation actually happens.
        // They only verify, that if the address translation is set, nothing fails.
        // Those do not check if the translation policy is used correctly.
        // This was done manually, when creating those tests.
        const commonTable = commonKs + "." + helper.getRandomName("table");
        const commonTable2 = commonKs + "." + helper.getRandomName("table");
        const yaml = ["batch_size_warn_threshold_in_kb:5"];

        helper.setup(3, {
            keyspace: commonKs,
            queries: [
                helper.createTableWithClusteringKeyCql(commonTable),
                helper.createTableCql(commonTable2),
            ],
            ccmOptions: { yaml },
            initClient: false,
        });

        // This test is based on the "should return the same address when it could not be resolved" unit test.
        // It's the address that will fail on the translation path and should be returned untranslated
        it("should connect when provided with untranslatable address", function (done) {
            let options = helper.baseOptions;
            options.policies.addressResolution = new EC2MultiRegionTranslator();
            const client = newInstance(options);
            ensureConnected(client, done);
        });
        // Ensuring that translation policy will not fail, when creating the instance with hostname, instead of IP
        it("should connect when provided with localhost", function (done) {
            let options = helper.baseOptions;
            options.policies.addressResolution = new EC2MultiRegionTranslator();
            // Overriding default contact points
            options.contactPoints = ["localhost"];
            const client = newInstance(options);
            ensureConnected(client, done);
        });
    });
});

function ensureConnected(client, done) {
    client.execute(
        helper.queries.basic,
        null,
        { prepare: 1 },
        function (err, result) {
            assert.ifError(err);
            assert.ok(result);
            assert.strictEqual(typeof result.rows.length, "number");
            done();
        },
    );
}
function newInstance(options) {
    return new Client(options);
}
