/**
* Provides the authentication functions by LDAP.
*
* @module authentication
* @main authentication
*/

/**
* Provides the authentication functions by LDAP.
*
* @class authenticationLDAP
* @static
*/
var fs        = require('fs');
var ldap      = require('ldapjs');
var crypto    = require('crypto');
var iniparser = require('iniparser');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [authenticationLDAP]
*/
var IDLOG = '[authenticationLDAP]';

/**
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The LDAP organizational unit.
*
* @property ou
* @type {string}
* @private
*/
var ou;

/**
* The LDAP domain component 1. E.g. ...nethesis...
*
* @property dc1
* @type {string}
* @private
*/
var dc1;

/**
* The LDAP domain component 2. E.g. ...it
*
* @property dc2
* @type {string}
* @private
*/
var dc2;

/**
* The LDAP client.
*
* @property client
* @type {object}
* @private
*/
var client;

/**
* The server address.
*
* @property server
* @type {string}
* @private
*/
var server;

/**
* The token expiration expressed in milliseconds.
*
* @property EXPIRES
* @type number
* @private
* @default 60000
*/
var EXPIRES = 60000;

/**
* If true, every authentication request also causes the update of the
* token expiration value.
*
* @property autoUpdateTokenExpires
* @type boolean
* @private
* @default true
*/
var autoUpdateTokenExpires = true;

/**
* The temporary permissions assigned to the users. Associates each user
* with his token. Each permission has an expiration date of _EXPIRES_
* milliseconds.
*
* @property grants
* @type {object}
* @private
*/
var grants = {};

/**
* Set the logger to be used.
*
* @method setLogger
* @param {object} log The logger object. It must have at least
* three methods: _info, warn and error_ as console object.
* @static
*/
function setLogger(log) {
    try {
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the authentication configuration file and initialize
* the LDAP client.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path The configuration file
*/
function config(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    // read configuration file
    var ini = iniparser.parseSync(path);

    // check the file content
    if (ini.AUTHENTICATION.type !== 'ldap'
        || ini.AUTHENTICATION.ou     === undefined || ini.AUTHENTICATION.ou     === ''
        || ini.AUTHENTICATION.dc1    === undefined || ini.AUTHENTICATION.dc1    === ''
        || ini.AUTHENTICATION.dc2    === undefined || ini.AUTHENTICATION.dc2    === ''
        || ini.AUTHENTICATION.server === undefined || ini.AUTHENTICATION.server === '') {

        throw new Error('wrong LDAP configuration file ' + path);
    }
    ou     = ini.AUTHENTICATION.ou;
    dc1    = ini.AUTHENTICATION.dc1;
    dc2    = ini.AUTHENTICATION.dc2;
    server = ini.AUTHENTICATION.server;

    // create ldap client
    client = ldap.createClient({
        url: 'ldap://' + server
    });
    logger.info(IDLOG, 'LDAP client created');
    logger.info(IDLOG, 'LDAP configuration by file ' + path + ' ended');
}

/**
* Creates an HMAC-SHA1 token to be used in the authentication and store it
* into the private _grants_ object. The _accessKeyId_ must be present into
* the _creds_ property.
*
* @method newToken
* @param {string} accessKeyId The access key identifier, e.g. the username
* @param {string} password The password of the account
* @param {string} nonce Used to create the HMAC-SHA1 token.
* @private
*/
function newToken(accessKeyId, password, nonce) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string'
            || typeof nonce    !== 'string'
            || typeof password !== 'string') {

            throw new Error('wrong parameters');
        }

        // generate token HMAC-SHA1
        var tohash = accessKeyId + ':' + password + ':' + nonce;
        var token  = crypto.createHmac('sha1', password).update(tohash).digest('hex');

        // store token
        grants[accessKeyId] = {
            nonce:   nonce,
            token:   token,
            expires: (new Date()).getTime() + EXPIRES
        };

        logger.info(IDLOG, 'new token has been generated for accessKeyId ' + accessKeyId);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates an SHA1 nonce to be used in the authentication.
*
* @method getNonce
* @param {string} accessKeyId The access key identifier used to create the token.
* @param {string} password The password of the account
* @return {string} The SHA1 nonce.
*/
function getNonce(accessKeyId, password) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string' || typeof password !== 'string') {
            throw new Error('wrong parameters');
        }

        // generate SHA1 nonce
        var random = crypto.randomBytes(256) + (new Date()).getTime();
        var shasum = crypto.createHash('sha1');
        var nonce  = shasum.update(random).digest('hex');

        // create new token
        newToken(accessKeyId, password, nonce);

        logger.info(IDLOG, 'nonce has been generated for accessKeyId ' + accessKeyId);
        return nonce;

    } catch (err) {
        logger.error(err.stack);
    }
}

/**
* Authenticate the user by LDAP bind operation. 
*
* @method authenticate
* @param {string} accessKeyId The access key used to authenticate, e.g. the username
* @param {string} password The password of the account
* @param {function} cb The callback function
*/
function authenticate(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof password     !== 'string'
            || typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }
        var dn = 'uid=' + accessKeydId + ',ou=' + ou + ',dc=' + dc1 + ',dc=' + dc2;

        // ldap authentication
        client.bind(dn, password, function (err, result) {
            bindCb(accessKeydId, err, result, cb);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It's the callback of ldap bind operation.
*
* @method bindCb
* @param {string} accessKeydId The access key used for authentication
* @param {object} err The error response. If the bind is successfull it is null
* @param {object} result The result of the bind operation
* @param {function} cb The callback function
* @private
*/
function bindCb(accessKeydId, err, result, cb) {
    try {
        // check parameters
        if(typeof accessKeydId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        if (err) {
            logger.warn(IDLOG, 'authentication failed for user "' + accessKeydId + '"');
            cb(err);

        } else {
            logger.info(IDLOG, 'user "' + accessKeydId + '" has been successfully authenticated');
            cb(null);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Remove the grant for an access key.
*
* @method removeGrant
* @param {string} accessKeyId The access key.
*/
function removeGrant(accessKeyId) {
    try {
        // check the parameter
        if (typeof accessKeyId !== 'string') { throw new Error('wrong parameter'); }

        // check the grant presence
        if (grants[accessKeyId]) {
            delete grants[accessKeyId];
            logger.info(IDLOG, 'removed grant for accessKeyId ' + accessKeyId);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the expiration of the token relative to the access key.
*
* @method updateTokenExpires
* @param {string} accessKeyId The access key relative to the token
* to be updated.
* @private
*/
function updateTokenExpires(accessKeyId) {
    try {
        // check grants presence
        if (!grants[accessKeyId]) {
            throw new Error('update token expiration failed for accessKeyId: ' + accessKeyId);
        }
        grants[accessKeyId].expires = (new Date()).getTime() + EXPIRES;
        logger.info(IDLOG, 'token expiration has been updated for accessKeyId ' + accessKeyId);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Check if the automatic update of token expiration is active for each
* authentication request.
*
* @method isAutoUpdateTokenExpires
* @return {boolean} True if the automatic update is active.
*/
function isAutoUpdateTokenExpires() {
    try { return autoUpdateTokenExpires; }
    catch (err) { logger.error(IDLOG, err.stack); }
}

/**
* Authenticate the user through checking the token with the one
* that must be present in the _grants_ object. The _getNonce_ method
* must be used before this.
*
* @method verifyToken
* @param {string} accessKeyId The access key used to retrieve the token.
* @param {string} token The token to be checked.
* @return {boolean} It's true if the user has been authenticated succesfully.
*/
function verifyToken(accessKeyId, token) {
    try {
        // check parameter
        if (typeof accessKeyId !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameter');
        }

        // check the grant presence
        if (!grants[accessKeyId]) {

            logger.warn(IDLOG, 'authentication failed for accessKeyId: "' + accessKeyId + '": no grant is present');
             return false;
        }

        // check the tokens equality
        if (grants[accessKeyId].token !== token) {
            logger.warn(IDLOG, 'authentication failed for accessKeyId "' + accessKeyId + '": wrong token');
            return false;
        }

        // check the token expiration
        if ((new Date()).getTime() > grants[accessKeyId].expires) {
            removeGrant(accessKeyId); // remove the grant
            logger.info(IDLOG, 'the token has expired for accessKeyId ' + accessKeyId);
            return false;
        }

        // check whether update token expiration value
        if (autoUpdateTokenExpires) { updateTokenExpires(accessKeyId); }

        // authentication successfull
        logger.info(IDLOG, 'accessKeyId "' + accessKeyId + '" has been successfully authenticated');
        return true;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.config        = config;
exports.getNonce      = getNonce;
exports.setLogger     = setLogger;
exports.verifyToken   = verifyToken;
exports.removeGrant   = removeGrant;
exports.authenticate  = authenticate;
exports.isAutoUpdateTokenExpires = isAutoUpdateTokenExpires;
