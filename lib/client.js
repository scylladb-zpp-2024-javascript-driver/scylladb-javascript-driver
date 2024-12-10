"use strict";

const events = require("events");
const util = require("util");
const { throwNotSupported } = require("./new-utils.js");

const utils = require("./utils.js");
const errors = require("./errors.js");
const types = require("./types");
const { ProfileManager } = require("./execution-profile");
const clientOptions = require("./client-options");
const ClientState = require("./metadata/client-state");
const description = require("../package.json").description;
const { version } = require("../package.json");
const { DefaultExecutionOptions } = require("./execution-options");
const ControlConnection = require("./control-connection");
const promiseUtils = require("./promise-utils");
const rust = require("../index");
const ResultSet = require("./types/result-set.js");
const { parseParams } = require("./types/cql-utils.js");

/**
 * Query options
 * @typedef {Object} QueryOptions
 * [TODO: Add support for this field]
 * @property {boolean} [autoPage] Determines if the driver must retrieve the following result pages automatically.
 *
 * This setting is only considered by the [Client#eachRow()]{@link Client#eachRow} method. For more information,
 * check the
 * [paging results documentation]{@link https://docs.datastax.com/en/developer/nodejs-driver/latest/features/paging/}.
 *
 * [TODO: Add support for this field]
 * @property {boolean} [captureStackTrace] Determines if the stack trace before the query execution should be
 * maintained.
 *
 * Useful for debugging purposes, it should be set to ``false`` under production environment as it adds an
 * unnecessary overhead to each execution.
 *
 * Default: false.
 * [TODO: Add support for this field]
 * @property {number} [consistency] [Consistency level]{@link module:types~consistencies}.
 *
 * Defaults to ``localOne`` for Apache Cassandra and DSE deployments.
 * For DataStax Astra, it defaults to ``localQuorum``.
 *
 * [TODO: Add support for this field]
 * @property {Object} [customPayload] Key-value payload to be passed to the server. On the Cassandra side,
 * implementations of QueryHandler can use this data.
 * [TODO: Add support for this field]
 * @property {string} [executeAs] The user or role name to act as when executing this statement.
 *
 * When set, it executes as a different user/role than the one currently authenticated (a.k.a. proxy execution).
 *
 * This feature is only available in DSE 5.1+.
 *
 * [TODO: Add support for this field Delete?]
 * @property {string|ExecutionProfile} [executionProfile] Name or instance of the [profile]{@link ExecutionProfile} to
 * be used for this execution. If not set, it will the use "default" execution profile.
 * [TODO: Add support for this field]
 * @property {number} [fetchSize] Amount of rows to retrieve per page.
 * [TODO: Add support for this field]
 * @property {Array|Array<Array>} [hints] Type hints for parameters given in the query, ordered as for the parameters.
 *
 * For batch queries, an array of such arrays, ordered as with the queries in the batch.
 * [TODO: Add support for this field]
 * @property {Host} [host] The host that should handle the query.
 *
 * Use of this option is **heavily discouraged** and should only be used in the following cases:
 *
 * 1. Querying node-local tables, such as tables in the ``system`` and ``system_views`` keyspaces.
 * 2. Applying a series of schema changes, where it may be advantageous to execute schema changes in sequence on the
 *    same node.
 *
 * Configuring a specific host causes the configured
 * [LoadBalancingPolicy]{@link module:policies/loadBalancing~LoadBalancingPolicy} to be completely bypassed.
 * However, if the load balancing policy dictates that the host is at a
 * [distance of ignored]{@link module:types~distance} or there is no active connectivity to the host, the request will
 * fail with a [NoHostAvailableError]{@link module:errors~NoHostAvailableError}.
 *
 * [TODO: Add support for this field]
 * @property {boolean} [isIdempotent] Defines whether the query can be applied multiple times without changing the result
 * beyond the initial application.
 *
 * The query execution idempotence can be used at [RetryPolicy]{@link module:policies/retry~RetryPolicy} level to
 * determine if an statement can be retried in case of request error or write timeout.
 *
 * Default: ``false``.
 *
 * [TODO: Add support for this field]
 * @property {string} [keyspace] Specifies the keyspace for the query. It is used for the following:
 *
 * 1. To indicate what keyspace the statement is applicable to (protocol V5+ only).  This is useful when the
 * query does not provide an explicit keyspace and you want to override the current {@link Client#keyspace}.
 * 2. For query routing when the query operates on a different keyspace than the current {@link Client#keyspace}.
 *
 * [TODO: Add support for this field]
 * @property {boolean} [logged] Determines if the batch should be written to the batchlog. Only valid for
 * [Client#batch()]{@link Client#batch}, it will be ignored by other methods. Default: true.
 * [TODO: Add support for this field]
 * @property {boolean} [counter] Determines if its a counter batch. Only valid for
 * [Client#batch()]{@link Client#batch}, it will be ignored by other methods. Default: false.
 * [TODO: Add support for this field]
 * @property {Buffer|string} [pageState] Buffer or string token representing the paging state.
 *
 * Useful for manual paging, if provided, the query will be executed starting from a given paging state.
 * [TODO: Add support for this field]
 * @property {boolean} [prepare] Determines if the query must be executed as a prepared statement.
 * [TODO: Add support for this field]
 * @property {number} [readTimeout] When defined, it overrides the default read timeout
 * (``socketOptions.readTimeout``) in milliseconds for this execution per coordinator.
 *
 * Suitable for statements for which the coordinator may allow a longer server-side timeout, for example aggregation
 * queries.
 *
 * A value of ``0`` disables client side read timeout for the execution. Default: ``undefined``.
 *
 * [TODO: Add support for this field]
 * @property {RetryPolicy} [retry] Retry policy for the query.
 *
 * This property can be used to specify a different [retry policy]{@link module:policies/retry} to the one specified
 * in the {@link ClientOptions}.policies.
 * [TODO: Add support for this field]
 * @property {Array} [routingIndexes] Index of the parameters that are part of the partition key to determine
 * the routing.
 * [TODO: Add support for this field]
 * @property {Buffer|Array} [routingKey] Partition key(s) to determine which coordinator should be used for the query.
 * [TODO: Add support for this field]
 * @property {Array} [routingNames] Array of the parameters names that are part of the partition key to determine the
 * routing. Only valid for non-prepared requests, it's recommended that you use the prepare flag instead.
 * [TODO: Add support for this field]
 * @property {number} [serialConsistency] Serial consistency is the consistency level for the serial phase of
 * conditional updates.
 * This option will be ignored for anything else that a conditional update/insert.
 * [TODO: Add support for this field]
 * @property {number|Long} [timestamp] The default timestamp for the query in microseconds from the unix epoch
 * (00:00:00, January 1st, 1970).
 *
 * If provided, this will replace the server side assigned timestamp as default timestamp.
 *
 * Use [generateTimestamp()]{@link module:types~generateTimestamp} utility method to generate a valid timestamp
 * based on a Date and microseconds parts.
 * [TODO: Add support for this field]
 * @property {boolean} [traceQuery] Enable query tracing for the execution. Use query tracing to diagnose performance
 * problems related to query executions. Default: false.
 *
 * To retrieve trace, you can call [Metadata.getTrace()]{@link module:metadata~Metadata#getTrace} method.
 */

/**
 * Represents a database client that maintains multiple connections to the cluster nodes, providing methods to
 * execute CQL statements.
 *
 * The ``Client`` uses [policies]{@link module:policies} to decide which nodes to connect to, which node
 * to use per each query execution, when it should retry failed or timed-out executions and how reconnection to down
 * nodes should be made.
 * @extends EventEmitter
 * @example <caption>Creating a new client instance</caption>
 * const client = new Client({
 *   contactPoints: ['10.0.1.101', '10.0.1.102'],
 *   localDataCenter: 'datacenter1'
 * });
 * @example <caption>Executing a query</caption>
 * const result = await client.connect();
 * console.log(`Connected to ${client.hosts.length} nodes in the cluster: ${client.hosts.keys().join(', ')}`);
 * @example <caption>Executing a query</caption>
 * const result = await client.execute('SELECT key FROM system.local');
 * const row = result.first();
 * console.log(row['key']);
 */
class Client extends events.EventEmitter {
    /**
     * Creates a new instance of {@link Client}.
     * @param {ClientOptions} options The options for this instance.
     */
    constructor(options) {
        super();
        let rustOptions = rust.SessionOptions.empty();
        rustOptions.connectPoints = options.contactPoints;
        rustOptions.applicationName = options.applicationName;
        rustOptions.applicationVersion = options.applicationVersion;
        this.rustOptions = rustOptions;

        this.options = clientOptions.extend(
            { logEmitter: this.emit.bind(this), id: types.Uuid.random() },
            options,
        );
        Object.defineProperty(this, "profileManager", {
            value: new ProfileManager(this.options),
        });
        Object.defineProperty(this, "controlConnection", {
            value: new ControlConnection(this.options, this.profileManager),
            writable: true,
        });
        // Unlimited amount of listeners for internal event queues by default
        this.setMaxListeners(0);
        this.connected = false;
        this.isShuttingDown = false;
        /**
         * Gets the schema and cluster metadata information.
         * @type {Metadata}
         */
        this.metadata = this.controlConnection.metadata;
        /**
         * Gets an associative array of cluster hosts.
         * @type {HostMap}
         */
        this.hosts = this.controlConnection.hosts;

        /**
         * The [ClientMetrics]{@link module:metrics~ClientMetrics} instance used to expose measurements of its internal
         * behavior and of the server as seen from the driver side.
         *
         * By default, a [DefaultMetrics]{@link module:metrics~DefaultMetrics} instance is used.
         * @type {ClientMetrics}
         */
        this.metrics = this.options.metrics;
    }

    /**
     * Emitted when a new host is added to the cluster.
     * - {@link Host} The host being added.
     * @event Client#hostAdd
     */
    /**
     * Emitted when a host is removed from the cluster
     * - {@link Host} The host being removed.
     * @event Client#hostRemove
     */
    /**
     * Emitted when a host in the cluster changed status from down to up.
     * - {@link Host host} The host that changed the status.
     * @event Client#hostUp
     */
    /**
     * Emitted when a host in the cluster changed status from up to down.
     * - {@link Host host} The host that changed the status.
     * @event Client#hostDown
     */

    /**
     * Gets the name of the active keyspace.
     * @type {string | undefined}
     */
    get keyspace() {
        return this.rust_client.getKeyspace();
    }

    set keyspace(_) {
        throw new SyntaxError("Client keyspace is read-only");
    }

    /**
     * Attempts to connect to one of the [contactPoints]{@link ClientOptions} and discovers the rest the nodes of the
     * cluster.
     *
     * When the {@link Client} is already connected, it resolves immediately.
     *
     * It returns a ``Promise`` when a ``callback`` is not provided.
     * @param {function} [callback] The optional callback that is invoked when the pool is connected or it failed to
     * connect.
     * @example <caption>Usage example</caption>
     * await client.connect();
     */
    connect(callback) {
        if (this.connected && callback) {
            // Avoid creating Promise to immediately resolve them
            return callback();
        }

        return promiseUtils.optionalCallback(this.#connect(), callback);
    }

    /**
     * Async-only version of {@link Client#connect()}.
     * @private
     */
    async #connect() {
        if (this.connected) {
            return;
        }

        if (this.isShuttingDown) {
            // it is being shutdown, don't allow further calls to connect()
            throw new errors.NoHostAvailableError(
                null,
                "Connecting after shutdown is not supported",
            );
        }

        if (this.connecting) {
            return promiseUtils.fromEvent(this, "connected");
        }

        this.connecting = true;
        this.log(
            "info",
            util.format(
                "Connecting to cluster using '%s' version %s",
                description,
                version,
            ),
        );

        try {
            this.rustClient = await rust.SessionWrapper.createSession(
                this.rustOptions,
            );

            this.hosts = this.controlConnection.hosts;
        } catch (err) {
            // We should close the pools (if any) and reset the state to allow successive calls to connect()
            await this.controlConnection.reset();
            this.connected = false;
            this.connecting = false;
            this.emit("connected", err);
            throw err;
        }

        this.#setHostListeners();

        this.connected = true;
        this.connecting = false;
        this.emit("connected");
    }

    /**
     * Executes a query on an available connection.
     *
     * The query can be prepared (recommended) or not depending on the [prepare]{@linkcode QueryOptions} flag.
     *
     * Some execution failures can be handled transparently by the driver, according to the
     * [RetryPolicy]{@linkcode module:policies/retry~RetryPolicy} or the
     * [SpeculativeExecutionPolicy]{@linkcode module:policies/speculativeExecution} used.
     *
     * It returns a ``Promise`` when a ``callback`` is not provided.
     *
     * @param {string} query The query to execute.
     * @param {Array|Object} [params] Array of parameter values or an associative array (object) containing parameter names
     * as keys and its value.
     * @param {QueryOptions} [options] The query options for the execution.
     * @param {ResultCallback} [callback] Executes callback(err, result) when execution completed. When not defined, the
     * method will return a promise.
     * @example <caption>Promise-based API, using async/await</caption>
     * const query = 'SELECT name, email FROM users WHERE id = ?';
     * const result = await client.execute(query, [ id ], { prepare: true });
     * const row = result.first();
     * console.log('%s: %s', row['name'], row['email']);
     * @example <caption>Callback-based API</caption>
     * const query = 'SELECT name, email FROM users WHERE id = ?';
     * client.execute(query, [ id ], { prepare: true }, function (err, result) {
     *   assert.ifError(err);
     *   const row = result.first();
     *   console.log('%s: %s', row['name'], row['email']);
     * });
     * @see {@link ExecutionProfile} to reuse a set of options across different query executions.
     */
    execute(query, params, options, callback) {
        // This method acts as a wrapper for the async method #execute(), replaced by #rustyExecute()

        if (!callback) {
            // Set default argument values for optional parameters
            if (typeof options === "function") {
                callback = options;
                options = null;
            } else if (typeof params === "function") {
                callback = params;
                params = null;
            }
        }

        try {
            const execOptions = DefaultExecutionOptions.create(options, this);
            return promiseUtils.optionalCallback(
                this.#rustyExecute(query, params, execOptions),
                callback,
            );
        } catch (err) {
            // There was an error when parsing the user options
            if (callback) {
                return callback(err);
            }

            return Promise.reject(err);
        }
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    executeGraph() {
        throwNotSupported("Client.executeGraph");
    }

    /**
     * Executes the query and calls ``rowCallback`` for each row as soon as they are received. Calls the final
     * ``callback`` after all rows have been sent, or when there is an error.
     *
     * The query can be prepared (recommended) or not depending on the [prepare]{@linkcode QueryOptions} flag.
     *
     * @param {string} query The query to execute
     * @param {Array|Object} [params] Array of parameter values or an associative array (object) containing parameter names
     * as keys and its value.
     * @param {QueryOptions} [options] The query options.
     * @param {function} rowCallback Executes ``rowCallback(n, row)`` per each row received, where n is the row
     * index and row is the current Row.
     * @param {function} [callback] Executes ``callback(err, result)`` after all rows have been received.
     *
     * When dealing with paged results, [ResultSet#nextPage()]{@link module:types~ResultSet#nextPage} method can be used
     * to retrieve the following page. In that case, ``rowCallback()`` will be again called for each row and
     * the final callback will be invoked when all rows in the following page has been retrieved.
     *
     * @example <caption>Using per-row callback and arrow functions</caption>
     * client.eachRow(query, params, { prepare: true }, (n, row) => console.log(n, row), err => console.error(err));
     * @example <caption>Overloads</caption>
     * client.eachRow(query, rowCallback);
     * client.eachRow(query, params, rowCallback);
     * client.eachRow(query, params, options, rowCallback);
     * client.eachRow(query, params, rowCallback, callback);
     * client.eachRow(query, params, options, rowCallback, callback);
     */
    eachRow(query, params, options, rowCallback, callback) {
        if (!callback && rowCallback && typeof options === "function") {
            callback = utils.validateFn(rowCallback, "rowCallback");
            rowCallback = options;
        } else {
            callback = callback || utils.noop;
            rowCallback = utils.validateFn(
                rowCallback || options || params,
                "rowCallback",
            );
        }

        params = typeof params !== "function" ? params : null;

        let execOptions;
        try {
            execOptions = DefaultExecutionOptions.create(
                options,
                this,
                rowCallback,
            );
        } catch (e) {
            return callback(e);
        }

        let rowLength = 0;

        const nextPage = () =>
            promiseUtils.toCallback(
                this.#rustyExecute(query, params, execOptions),
                pageCallback,
            );

        function pageCallback(err, result) {
            if (err) {
                return callback(err);
            }
            // Next requests in case paging (auto or explicit) is used
            rowLength += result.rowLength;

            if (result.rawPageState !== undefined) {
                // Use new page state as next request page state
                execOptions.setPageState(result.rawPageState);
                if (execOptions.isAutoPage()) {
                    // Issue next request for the next page
                    return nextPage();
                }
                // Allows for explicit (manual) paging, in case the caller needs it
                result.nextPage = nextPage;
            }

            // Finished auto-paging
            result.rowLength = rowLength;
            callback(null, result);
        }

        promiseUtils.toCallback(
            this.#rustyExecute(query, params, execOptions),
            pageCallback,
        );
    }

    /**
     * Executes the query and pushes the rows to the result stream as soon as they received.
     *
     * The stream is a [ReadableStream]{@linkcode https://nodejs.org/api/stream.html#stream_class_stream_readable} object
     * that emits rows.
     * It can be piped downstream and provides automatic pause/resume logic (it buffers when not read).
     *
     * The query can be prepared (recommended) or not depending on {@link QueryOptions}.prepare flag. Retries on multiple
     * hosts if needed.
     *
     * @param {string} query The query to prepare and execute.
     * @param {Array|Object} [params] Array of parameter values or an associative array (object) containing parameter names
     * as keys and its value
     * @param {QueryOptions} [options] The query options.
     * @param {function} [callback] executes callback(err) after all rows have been received or if there is an error
     * @returns {ResultStream}
     */
    stream(query, params, options, callback) {
        callback = callback || utils.noop;
        // NOTE: the nodejs stream maintains yet another internal buffer
        // we rely on the default stream implementation to keep memory
        // usage reasonable.
        const resultStream = new types.ResultStream({ objectMode: 1 });
        function onFinish(err, result) {
            if (err) {
                resultStream.emit("error", err);
            }
            if (result && result.nextPage) {
                // allows for throttling as per the
                // default nodejs stream implementation
                resultStream._valve(function pageValve() {
                    try {
                        result.nextPage();
                    } catch (ex) {
                        resultStream.emit("error", ex);
                    }
                });
                return;
            }
            // Explicitly dropping the valve (closure)
            resultStream._valve(null);
            resultStream.add(null);
            callback(err);
        }
        let sync = true;
        this.eachRow(
            query,
            params,
            options,
            function rowCallback(n, row) {
                resultStream.add(row);
            },
            function eachRowFinished(err, result) {
                if (sync) {
                    // Prevent sync callback
                    return setImmediate(function eachRowFinishedImmediate() {
                        onFinish(err, result);
                    });
                }
                onFinish(err, result);
            },
        );
        sync = false;
        return resultStream;
    }

    /**
     * Executes batch of queries on an available connection to a host.
     *
     * It returns a ``Promise`` when a ``callback`` is not provided.
     *
     * @param {Array.<string>|Array.<{query, params}>} queries The queries to execute as an Array of strings or as an array
     * of object containing the query and params
     * @param {QueryOptions} [options] The query options.
     * @param {ResultCallback} [callback] Executes callback(err, result) when the batch was executed
     */
    batch(queries, options, callback) {
        if (!callback && typeof options === "function") {
            callback = options;
            options = null;
        }

        return promiseUtils.optionalCallback(
            this.#rustyBatch(queries, options),
            callback,
        );
    }

    /**
     * Async-only version of {@link Client#batch()} .
     * @param {Array.<string>|Array.<{query, params}>}queries
     * @param {QueryOptions} options
     * @returns {Promise<ResultSet>}
     * @private
     */
    async #rustyBatch(queries, options) {
        if (!Array.isArray(queries)) {
            throw new errors.ArgumentError("Queries should be an Array");
        }

        if (queries.length === 0) {
            throw new errors.ArgumentError("Queries array should not be empty");
        }

        await this.#connect();

        const _execOptions = DefaultExecutionOptions.create(options, this);

        let preparedQueries = [];
        let parametersRows = [];
        for (let i = 0; i < queries.length; i++) {
            let element = queries[i];
            if (typeof element === "string") {
                preparedQueries.push(
                    await this.rustClient.prepareStatement(element),
                );
                parametersRows.push([]);
            } else {
                let query = queries[i].query;
                let params = queries[i].params;
                let prepared = await this.rustClient.prepareStatement(query);
                let parameters = parseParams(prepared, params);
                preparedQueries.push(prepared);
                parametersRows.push(parameters);
            }
        }

        let batch = rust.createBatch(preparedQueries);
        let wrappedResult = await this.rustClient.queryBatch(
            batch,
            parametersRows,
        );
        return new ResultSet(wrappedResult);
    }

    /**
     * Gets the host that are replicas of a given token.
     * @param {string} keyspace
     * @param {Buffer} token
     * @returns {Array<Host>}
     */
    getReplicas(keyspace, token) {
        return this.metadata.getReplicas(keyspace, token);
    }

    /**
     * Gets a snapshot containing information on the connections pools held by this Client at the current time.
     *
     * The information provided in the returned object only represents the state at the moment this method was called and
     * it's not maintained in sync with the driver metadata.
     *
     * @returns {ClientState} A [ClientState]{@linkcode module:metadata~ClientState} instance.
     */
    getState() {
        return ClientState.from(this);
    }

    log = utils.log;

    /**
     * Closes all connections to all hosts.
     *
     * It returns a ``Promise`` when a ``callback`` is not provided.
     *
     * @param {Function} [callback] Optional callback to be invoked when finished closing all connections.
     */
    shutdown(callback) {
        return promiseUtils.optionalCallback(this.#shutdown(), callback);
    }

    /** @private */
    async #shutdown() {
        this.log("warning", "Rust driver doesn't support explicit shutdown!");
        this.log("info", "Shutting down");

        if (!this.hosts || !this.connected) {
            // not initialized
            this.connected = false;
            return;
        }

        if (this.connecting) {
            this.log("warning", "Shutting down while connecting");
            // wait until finish connecting for easier troubleshooting
            await promiseUtils.fromEvent(this, "connected");
        }

        this.connected = false;
        this.isShuttingDown = true;

        // Shutdown the ControlConnection before shutting down the pools
        this.controlConnection.shutdown();
        this.options.policies.speculativeExecution.shutdown();

        if (this.options.requestTracker) {
            this.options.requestTracker.shutdown();
        }
    }

    /**
     * Waits until that the schema version in all nodes is the same or the waiting time passed.
     * @param {Connection} connection
     * @returns {Promise<boolean>}
     * @ignore
     */
    async #waitForSchemaAgreement(connection) {
        if (this.hosts.length === 1) {
            return true;
        }

        const start = process.hrtime();
        const maxWaitSeconds =
            this.options.protocolOptions.maxSchemaAgreementWaitSeconds;

        this.log("info", "Waiting for schema agreement");

        let versionsMatch;

        while (!versionsMatch && process.hrtime(start)[0] < maxWaitSeconds) {
            versionsMatch =
                await this.metadata.compareSchemaVersions(connection);

            if (versionsMatch) {
                this.log("info", "Schema versions match");
                break;
            }

            // Let some time pass before the next check
            await promiseUtils.delay(500);
        }

        return versionsMatch;
    }

    /**
     * Waits for schema agreements and schedules schema metadata refresh.
     * @param {Connection} connection
     * @param event
     * @returns {Promise<boolean>}
     * @ignore
     * @internal
     */
    async handleSchemaAgreementAndRefresh(connection, event) {
        let agreement = false;

        try {
            agreement = await this.#waitForSchemaAgreement(connection);
        } catch (err) {
            // we issue a warning but we continue with the normal flow
            this.log(
                "warning",
                "There was an error while waiting for the schema agreement between nodes",
                err,
            );
        }

        if (!this.options.isMetadataSyncEnabled) {
            return agreement;
        }

        // Refresh metadata immediately
        try {
            await this.controlConnection.handleSchemaChange(event, true);
        } catch (err) {
            this.log(
                "warning",
                "There was an error while handling schema change",
                err,
            );
        }

        return agreement;
    }

    /**
     * Wrapper for executing queries by rust driver
     * @param {string} query
     * @param {Array} params
     * @param {ExecutionOptions} execOptions
     * @returns {Promise<ResultSet>}
     * @private
     */
    async #rustyExecute(query, params, execOptions) {
        if (
            // !execOptions.isPrepared() &&
            params &&
            !Array.isArray(params)
            // && !types.protocolVersion.supportsNamedParameters(version)
        ) {
            throw new Error(`TODO: Implement any support for named parameters`);
            // // Only Cassandra 2.1 and above supports named parameters
            // throw new errors.ArgumentError(
            //   "Named parameters for simple statements are not supported, use prepare flag",
            // );
        }

        if (!this.connected) {
            // TODO: Check this logic and decide if it's needed. Probably do it while implementing (better) connection
            // // Micro optimization to avoid an async execution for a simple check
            await this.#connect();
        }

        return new Promise((resolve, reject) => {
            this.#executePromise(resolve, reject, query, params);
        });
    }

    async #executePromise(resolve, reject, query, params) {
        try {
            let statement = await this.rustClient.prepareStatement(query);
            let parsedParams = parseParams(statement, params);
            let rusty = await this.rustClient.executePrepared(
                statement,
                parsedParams,
            );
            resolve(new ResultSet(rusty));
        } catch (e) {
            reject(e);
        }
    }
    /**
     * Sets the listeners for the nodes.
     * @private
     */
    #setHostListeners() {
        function getHostUpListener(emitter, h) {
            return () => emitter.emit("hostUp", h);
        }

        function getHostDownListener(emitter, h) {
            return () => emitter.emit("hostDown", h);
        }

        const self = this;

        // Add status listeners when new nodes are added and emit hostAdd
        this.hosts.on("add", function hostAddedListener(h) {
            h.on("up", getHostUpListener(self, h));
            h.on("down", getHostDownListener(self, h));
            self.emit("hostAdd", h);
        });

        // Remove all listeners and emit hostRemove
        this.hosts.on("remove", function hostRemovedListener(h) {
            h.removeAllListeners();
            self.emit("hostRemove", h);
        });

        // Add status listeners for existing hosts
        this.hosts.forEach(function (h) {
            h.on("up", getHostUpListener(self, h));
            h.on("down", getHostDownListener(self, h));
        });
    }
}
/**
 * Callback used by execution methods.
 * @callback ResultCallback
 * @param {Error} err Error occurred in the execution of the query.
 * @param {ResultSet} [result] Result of the execution of the query.
 */

module.exports = Client;
