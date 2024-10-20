"use strict";

const { AuthProvider, Authenticator } = require("./provider");
const { PlainTextAuthenticator } = require("./plain-text-auth-provider");
const errors = require("../errors");

const dseAuthenticator = "com.datastax.bdp.cassandra.auth.DseAuthenticator";

/**
 * Internal authentication provider that is used when no provider has been set by the user.
 * @ignore
 */
class NoAuthProvider extends AuthProvider {
  newAuthenticator(endpoint, name) {
    if (name === dseAuthenticator) {
      // Try to use transitional mode
      return new TransitionalModePlainTextAuthenticator();
    }

    // Use an authenticator that doesn't allow auth flow
    return new NoAuthAuthenticator(endpoint);
  }
}

/**
 * An authenticator throws an error when authentication flow is started.
 * @ignore
 */
class NoAuthAuthenticator extends Authenticator {
  constructor(endpoint) {
    super();
    this.endpoint = endpoint;
  }

  initialResponse(callback) {
    callback(
      new errors.AuthenticationError(
        `Host ${this.endpoint} requires authentication, but no authenticator found in the options`,
      ),
    );
  }
}

/**
 * Authenticator that accounts for DSE authentication configured with transitional mode: normal.
 *
 * In this situation, the client is allowed to connect without authentication, but DSE
 * would still send an AUTHENTICATE response. This Authenticator handles this situation
 * by sending back a dummy credential.
 */
class TransitionalModePlainTextAuthenticator extends PlainTextAuthenticator {
  constructor() {
    super("", "");
  }
}

module.exports = NoAuthProvider;
