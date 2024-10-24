"use strict";

/**
 * DSE Authentication module.
 * <p>
 *   Contains the classes used for connecting to a DSE cluster secured with DseAuthenticator.
 * </p>
 * @module auth
 */

const { Authenticator, AuthProvider } = require("./provider");
const { PlainTextAuthProvider } = require("./plain-text-auth-provider");
const DseGssapiAuthProvider = require("./dse-gssapi-auth-provider");
const DsePlainTextAuthProvider = require("./dse-plain-text-auth-provider");
const NoAuthProvider = require("./no-auth-provider");

module.exports = {
    Authenticator,
    AuthProvider,
    DseGssapiAuthProvider,
    DsePlainTextAuthProvider,
    NoAuthProvider,
    PlainTextAuthProvider,
};
