"use strict";
const assert = require("assert");
const types = require("../../lib/types");
const policies = require("../../lib/policies");
const helper = require("../test-helper");
const ExecutionOptions =
    require("../../lib/execution-options").ExecutionOptions;
const RetryPolicy = policies.retry.RetryPolicy;
const FallthroughRetryPolicy = policies.retry.FallthroughRetryPolicy;

describe("RetryPolicy", function () {
    describe("#onUnavailable()", function () {
        it("should retry on the next host the first time", function () {
            const policy = new RetryPolicy();
            const result = policy.onUnavailable(
                getRequestInfo(0),
                types.consistencies.one,
                3,
                3,
            );
            assert.strictEqual(result.consistency, undefined);
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.retry,
            );
            assert.strictEqual(result.useCurrentHost, false);
        });
        it("should rethrow the following times", function () {
            const policy = new RetryPolicy();
            const result = policy.onUnavailable(
                getRequestInfo(1),
                types.consistencies.one,
                3,
                3,
            );
            assert.strictEqual(result.consistency, undefined);
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
    describe("#onWriteTimeout()", function () {
        it("should retry on the same host the first time when writeType is BATCH_LOG", function () {
            const policy = new RetryPolicy();
            const result = policy.onWriteTimeout(
                getRequestInfo(0),
                types.consistencies.one,
                1,
                1,
                "BATCH_LOG",
            );
            assert.strictEqual(result.consistency, undefined);
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.retry,
            );
            assert.strictEqual(result.useCurrentHost, true);
        });
        it("should rethrow the following times", function () {
            const policy = new RetryPolicy();
            const result = policy.onWriteTimeout(
                getRequestInfo(1),
                types.consistencies.one,
                1,
                1,
                "BATCH_LOG",
            );
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
        it("should rethrow when the writeType is not SIMPLE", function () {
            const policy = new RetryPolicy();
            const result = policy.onWriteTimeout(
                getRequestInfo(0),
                types.consistencies.one,
                3,
                2,
                "SIMPLE",
            );
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
        it("should rethrow when the writeType is not COUNTER", function () {
            const policy = new RetryPolicy();
            const result = policy.onWriteTimeout(
                getRequestInfo(0),
                types.consistencies.one,
                3,
                3,
                "COUNTER",
            );
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
    describe("#onReadTimeout()", function () {
        it("should retry on the same host the first time when received is greater or equal than blockFor", function () {
            const policy = new RetryPolicy();
            const result = policy.onReadTimeout(
                getRequestInfo(0),
                types.consistencies.one,
                2,
                2,
                false,
            );
            assert.strictEqual(result.consistency, undefined);
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.retry,
            );
            assert.strictEqual(result.useCurrentHost, true);
        });
        it("should rethrow the following times", function () {
            const policy = new RetryPolicy();
            const result = policy.onReadTimeout(
                getRequestInfo(1),
                types.consistencies.one,
                2,
                2,
                false,
            );
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
        it("should rethrow when the received is less than blockFor", function () {
            const policy = new RetryPolicy();
            const result = policy.onReadTimeout(
                getRequestInfo(0),
                types.consistencies.one,
                2,
                3,
                false,
            );
            assert.strictEqual(
                result.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
});
describe("FallthroughRetryPolicy", function () {
    describe("constructor", function () {
        it("should create instance of RetryPolicy", function () {
            const policy = new FallthroughRetryPolicy();
            helper.assertInstanceOf(policy, RetryPolicy);
        });
    });
    describe("#onReadTimeout()", function () {
        it("should return  rethrow decision", function () {
            const policy = new FallthroughRetryPolicy();
            const decisionInfo = policy.onReadTimeout();
            assert.ok(decisionInfo);
            assert.strictEqual(
                decisionInfo.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
    describe("#onRequestError()", function () {
        it("should return  rethrow decision", function () {
            const policy = new FallthroughRetryPolicy();
            const decisionInfo = policy.onRequestError();
            assert.ok(decisionInfo);
            assert.strictEqual(
                decisionInfo.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
    describe("#onUnavailable()", function () {
        it("should return  rethrow decision", function () {
            const policy = new FallthroughRetryPolicy();
            const decisionInfo = policy.onUnavailable();
            assert.ok(decisionInfo);
            assert.strictEqual(
                decisionInfo.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
    describe("#onWriteTimeout()", function () {
        it("should return  rethrow decision", function () {
            const policy = new FallthroughRetryPolicy();
            const decisionInfo = policy.onWriteTimeout();
            assert.ok(decisionInfo);
            assert.strictEqual(
                decisionInfo.decision,
                RetryPolicy.retryDecision.rethrow,
            );
        });
    });
});

function getRequestInfo(nbRetry) {
    return {
        nbRetry: nbRetry || 0,
        query: "SAMPLE",
        executionOptions: new ExecutionOptions(),
    };
}
