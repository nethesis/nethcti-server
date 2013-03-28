/**
* Provides the authentication functions. Once the user has taken
* the nonce, he must create the token and use it to authenticate.
*
* @module authentication
* @main authentication
*/

/**
* Provides the authentication functions.
*
* @class authentication
* @static
*/
var fs        = require('fs');
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
* @default [authentication]
*/
var IDLOG = '[authentication]';

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
* Contains the credentials of all extensions. The keys
* correspond to extension number and the values to passwords.
*
* @property creds
* @type {object}
* @private
*/
var creds = {};

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
* Set configuration to use and initialize the user credentials.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path Credentials ini file path. The file must
* have the extension number as section and a secret key for each
* section.
*/
function config(path) {
    // check parameter
    if (typeof path === 'string') {

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

        // read credential file
        var ini = iniparser.parseSync(path);
        var key;

        // initialize credentials
        for (key in ini) {
            creds[key] = ini[key].secret;
        }

        logger.info(IDLOG, 'configuration ok');

    } else {
        throw new TypeError('wrong parameter');
    }
}

/**
* Creates an HMAC-SHA1 token to be used in the authentication and store it
* into the private _grants_ object.
*
* @method newToken
* @param {string} accessKeyId The key used to get the secret key and to store
* the grant.
* @param {string} nonce Used to create the HMAC-SHA1 token.
* @private
*/
function newToken(accessKeyId, nonce) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string'
            || typeof nonce !== 'string') {

            throw new Error('wrong parameters');
        }

        // generate token HMAC-SHA1
        var tohash = accessKeyId + ':' + creds[accessKeyId] + ':' + nonce;
        var token  = crypto.createHmac('sha1', creds[accessKeyId]).update(tohash).digest('hex');

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
* @param {string} accessKeyId The access key used to create the token.
* @return {string} The SHA1 nonce.
*/
function getNonce(accessKeyId) {
    try {
        // check parameter
        if (typeof accessKeyId !== 'string') { throw new Error('wrong parameter'); }

        // generate SHA1 nonce
        var random = crypto.randomBytes(256) + (new Date()).getTime();
        var shasum = crypto.createHash('sha1');
        var nonce = shasum.update(random).digest('hex');

        // create new token
        newToken(accessKeyId, nonce);

        logger.info(IDLOG, 'nonce has been generated for accessKeyId ' + accessKeyId);
        return nonce;

    } catch (err) {
        logger.error(err.stack);
    }
}

/**
* Authenticate the user through checking the token with the one 
* that must be present in the _grants_ object. The _getNonce_ method
* must be used before this.
*
* @method authenticate
* @param {string} accessKeyId The access key used to retrieve secret key and token.
* @param {string} token The token to be checked.
* @return {boolean} It's true if the user has been authenticated succesfully.
*/
function authenticate(accessKeyId, token) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameters');
        }

        if (!creds[accessKeyId] // the user's credentials don't exist
            || !grants[accessKeyId]) { // the permission token don't exist

            logger.warn(IDLOG, 'authentication failed for accessKeyId: "' + accessKeyId + '": no cred or grant');
            return false;
        }

        // check the equality of the tokens
        if (grants[accessKeyId].token !== token) {
            logger.warn(IDLOG, 'authentication failed for accessKeyId "' + accessKeyId + '": wrong token');
            return false;
        }

        // check the expiration of the token
        if ((new Date()).getTime() > grants[accessKeyId].expires) {
            removeGrant(accessKeyId); // remove the grant
            logger.info(IDLOG, 'the token has expired for accessKeyId ' + accessKeyId);
            return false;
        }

        // check whether update token expiration value
        if (autoUpdateTokenExpires) { updateTokenExpires(accessKeyId); }

        logger.info(IDLOG, 'accessKeyId "' + accessKeyId + '" has been successfully authenticated');
        return true;

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
* Update the expiration of the token relative to the
* passed access key.
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

// public interface
exports.config       = config;
exports.getNonce     = getNonce;
exports.setLogger    = setLogger;
exports.removeGrant  = removeGrant;
exports.authenticate = authenticate;
exports.isAutoUpdateTokenExpires = isAutoUpdateTokenExpires;
