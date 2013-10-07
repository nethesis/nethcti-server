/**
* Provides the authentication functions by LDAP.
*
* @module authentication
* @main authentication
*/

/**
* Provides the authentication functions by LDAP.
*
* @class authentication
* @static
*/
var fs     = require('fs');
var ldap   = require('ldapjs');
var crypto = require('crypto');

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
* The types of the authentication that can be used.
*
* @property AUTH_TYPE
* @type object
* @private
* @default {
    "ldap": "ldap",
    "file": "file"
};
*/
var AUTH_TYPE = {
    'ldap': 'ldap',
    'file': 'file'
};

/**
* The type of authentication chosen. It can be one of the
* _AUTH\_TYPE_ properties. The authentication type is selected
* with the configuration file. It's used to choose the correct
* authentication method.
*
* @property authenticationType
* @type string
* @private
* @default {}
*/
var authenticationType;

/**
* The user credentials used in the case of file authentication type.
*
* @property authFileCredentials
* @type object
* @private
* @default {}
*/
var authFileCredentials = {};

/**
* The LDAP organizational unit.
*
* @property ou
* @type {string}
* @private
*/
var ou;

/**
* The LDAP base DN.
*
* @property baseDn
* @type {string}
* @private
*/
var baseDn;

/**
* The LDAP client.
*
* @property client
* @type {object}
* @private
*/
var client;

/**
* The LDAP server address. It can be customized by the configuration
* file. The configuration file must use the JSON syntax.
*
* @property server
* @type {string}
* @private
* @default "localhost"
*/
var server = 'localhost';

/**
* The LDAP server port. It can be customized by the configuration
* file. The configuration file must use the JSON syntax.
*
* @property port
* @type {string}
* @private
* @default "389"
*/
var port = '389';

/**
* The token expiration expressed in milliseconds. It can be customized
* with the configuration file.
*
* @property expires
* @type number
* @private
* @default 3600000 (1h)
*/
var expires = 3600000;

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
* with his token. Each permission has an expiration date of _expires_
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
* It reads the authentication configuration file and call
* the appropriate function to configure authentication by
* LDAP or by file. The file must use JSON syntax.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    // read configuration file
    var json = require(path);

    if (   typeof json      !== 'object'
        || typeof json.type !== 'string' || typeof json.expiration_timeout !== 'string'
        || !AUTH_TYPE[json.type]) {

        throw new Error('wrong configuration file for authentication ' + path);
    }

    logger.info(IDLOG, 'configure authentication with ' + path);

    // set the authentication type
    authenticationType = json.type;

    // set the expiration timeout of the token
    expires = json.expiration_timeout * 1000;

    // configure LDAP authentication
    if (json.type === AUTH_TYPE.ldap) {
        logger.info(IDLOG, 'configure authentication with LDAP');
        configLDAP(json.ldap);

    } else if (json.type === AUTH_TYPE.file) {
        // configure authentication with a credentials file
        logger.info(IDLOG, 'configure authentication with credentials file');
        configFile(json.file);
    }
}

/**
* Initialize the user credentials reading the file. The file must
* use the JSON format.
*
* **The method can throw an Exception.**
*
* @method configFile
* @param {object} json The object with the path of the file
*   @param {string} json.path The path of the credentials file
*/
function configFile(json) {
    // check the parameter
    if (typeof  json !== 'object'
        || json.path === undefined || json.path === '') {

        throw new Error('wrong file authentication configuration');
    }

    // check file presence
    if (!fs.existsSync(json.path)) { throw new Error(json.path + ' not exists'); }

    // read configuration file
    var cred = require(json.path);

    // initialize user credentials
    var user;
    for (user in cred) {

        if (cred[user].authentication && cred[user].authentication.password) {
            authFileCredentials[user] = cred[user].authentication.password;

        } else {
            logger.warn(IDLOG, 'no authentication password for user "' + user + '" in ' + json.path);
        }
    }
    logger.info(IDLOG, 'file authentication configuration ended');
}

/**
* Initialize the LDAP client.
*
* **The method can throw an Exception.**
*
* @method configLDAP
* @param {object} json The object with the LDAP parameters
*/
function configLDAP(json) {
    // check the parameter
    if (   typeof json    !== 'object'
        || typeof json.ou !== 'string' || typeof json.baseDn !== 'string') {

        throw new Error('wrong LDAP auhtentication configuration');
    }

    // customize server and port by the configuration file
    if (json.port)   { port   = json.port;   }
    if (json.server) { server = json.server; }

    ou     = json.ou;
    baseDn = json.baseDn;

    var ldapurl = 'ldap://' + server + ':' + port;

    // create ldap client
    client = ldap.createClient({ url: ldapurl });
    logger.info(IDLOG, 'LDAP client created to ' + ldapurl);
    logger.info(IDLOG, 'LDAP authentication configuration ended');
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
            expires: (new Date()).getTime() + expires
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
* Authenticate the user using the choosen method in the configuration step.
*
* **It can throw an exception.**
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

        // authenticate the user by LDAP
        if (authenticationType === AUTH_TYPE.ldap) {
            logger.info(IDLOG, 'authenticate the user "' + accessKeydId + '" by LDAP');
            authByLDAP(accessKeydId, password, cb);

        } else if (authenticationType === AUTH_TYPE.file) {
            // authenticate the user by credentials read from the file
            logger.info(IDLOG, 'authenticate the user "' + accessKeydId + '" by credentials file');
            authByFile(accessKeydId, password, cb);

        } else {
            logger.error(IDLOG, 'unknown authentication type "' + authenticationType + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        throw err;
    }
}

/**
* Authenticate the user by the credentials read from the file.
*
* @method authByFile
* @param {string} accessKeyId The access key used to authenticate, e.g. the username
* @param {string} password The password of the account
* @param {function} cb The callback function
*/
function authByFile(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof password     !== 'string'
            || typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        if (authFileCredentials[accessKeydId] === password) {
            logger.info(IDLOG, 'user "' + accessKeydId + '" has been authenticated successfully with file');
            cb(null);

        } else {
            var strerr = 'file authentication failed for user "' + accessKeydId + '"';
            logger.warn(IDLOG, strerr);
            cb(strerr);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb('file authentication failed for user "' + accessKeydId + '"');
    }
}

/**
* Authenticate the user by LDAP bind operation.
*
* @method authByLDAP
* @param {string} accessKeyId The access key used to authenticate, e.g. the username
* @param {string} password The password of the account
* @param {function} cb The callback function
*/
function authByLDAP(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof password     !== 'string'
            || typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        var dn = 'uid=' + accessKeydId + ',ou=' + ou + ',' + baseDn;

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
            logger.warn(IDLOG, 'LDAP authentication failed for user "' + accessKeydId + '"');
            cb(err);

        } else {
            logger.info(IDLOG, 'user "' + accessKeydId + '" has been successfully authenticated with LDAP');
            cb(null);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb('LDAP authentication failed for user "' + accessKeydId + '"');
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
        grants[accessKeyId].expires = (new Date()).getTime() + expires;
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
