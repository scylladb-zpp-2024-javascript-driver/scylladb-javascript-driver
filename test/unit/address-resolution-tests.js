"use strict";
const assert = require("assert");
const dns = require("dns");

const addressResolution = require("../../lib/policies/address-resolution");
const EC2MultiRegionTranslator = addressResolution.EC2MultiRegionTranslator;

// Those unit tests check the JS side version of the logic.
// Rust version of this policy is tested on the rust side with cargo test
describe("EC2MultiRegionTranslator", function () {
    this.timeout(10000);
    describe("#translate()", function () {
        it("should return the same address when it could not be resolved", function (done) {
            const t = new EC2MultiRegionTranslator();
            t.translate("192.0.2.1", 9042, function (endPoint) {
                assert.strictEqual(endPoint, "192.0.2.1:9042");
                done();
            });
        });
        it("should do a reverse and a forward dns lookup", function (done) {
            const t = new EC2MultiRegionTranslator();
            dns.lookup("datastax.com", function (err, address) {
                assert.ifError(err);
                assert.ok(address);
                t.translate(address, 9001, function (endPoint) {
                    assert.strictEqual(endPoint, address + ":9001");
                    done();
                });
            });
        });
    });
});
