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
var fs           = require('fs');
var ldap         = require('ldapjs');
var crypto       = require('crypto');
var EventEmitter = require('events').EventEmitter;

/**
* Fired when the component is ready.
*
* @event ready
*/
/**
* The name of the component ready event.
*
* @property EVT_COMP_READY
* @type string
* @default "ready"
*/
var EVT_COMP_READY = 'ready';

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
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

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
    "ldap":            "ldap",
    "file":            "file",
    "activeDirectory": "activeDirectory"
};
*/
var AUTH_TYPE = {
    'ldap':            'ldap',
    'file':            'file',
    'activeDirectory': 'activeDirectory'
};

/**
* Asterisk call without user authentication and permissions. It is disabled by default
* but can be enabled by the JSON configuration file in the _config_ method.
*
* @property unauthenticatedCall
* @type string
* @private
* @default "disabled"
*/
var unauthenticatedCall = 'disabled';

/**
* The type of authentication chosen. It can be one of the
* _AUTH\_TYPE_ properties. The authentication type is selected
* with the configuration file. It's used to choose the correct
* authentication method.
*
* @property authenticationType
* @type string
* @private
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
* The credentials used by remote sites.
*
* @property authRemoteSites
* @type object
* @private
* @default {}
*/
var authRemoteSites = {};

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
* The active directory domain.
*
* @property adDomain
* @type {string}
* @private
*/
var adDomain;

/**
* The LDAP client.
*
* @property client
* @type {object}
* @private
*/
var client;

/**
* The authentication LDAP server address.
*
* @property server
* @type {string}
* @private
*/
var server;

/**
* The authentication LDAP server port.
*
* @property port
* @type {string}
* @private
*/
var port;

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
* with a list of tokens. Each permission has an expiration date of _expires_
* milliseconds. Each user can have more than one token because he can login
* from more than one place.
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
        if (typeof log       === 'object'   &&
            typeof log.info  === 'function' &&
            typeof log.warn  === 'function' &&
            typeof log.error === 'function') {

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
* It reads the authentication configuration file for remote
* sites. The file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method configRemoteAuthentications
* @param {string} path The path of the configuration file
*/
function configRemoteAuthentications(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.error(IDLOG, path + ' does not exist');
            return;
        }

        logger.info(IDLOG, 'configure authentication for remote sites by file ' + path);

        // read configuration file
        var json = require(path);

        if (typeof json !== 'object') {
            logger.error(IDLOG, 'wrong content in ' + path);
            return;
        }

        var user;
        for (user in json) {
            if (typeof json[user].username !== 'string' ||
                typeof json[user].password !== 'string' ||
                (json[user].allowed_ip instanceof Array) !== true) {

                logger.error(IDLOG, 'wrong authentication content for "' + user + '" in ' + path);
            }
            else {
                authRemoteSites[user] = {
                    username:   json[user].username,
                    password:   json[user].password,
                    allowed_ip: json[user].allowed_ip
                };
            }
        }
        logger.info(IDLOG, 'configuration authentication for remote sites by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the authentication configuration file and call
* the appropriate function to configure authentication by
* LDAP or by file. The file must use the JSON syntax.
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
    if (!fs.existsSync(path)) { throw new Error(path + ' does not exist'); }

    // read configuration file
    var json = require(path);

    if (typeof json      !== 'object' ||
        typeof json.type !== 'string' || typeof json.expiration_timeout !== 'string' ||
        !AUTH_TYPE[json.type]         ||
        (json.type === AUTH_TYPE.ldap            && typeof json[AUTH_TYPE.ldap] !== 'object') ||
        (json.type === AUTH_TYPE.file            && typeof json[AUTH_TYPE.file] !== 'object') ||
        (json.type === AUTH_TYPE.activeDirectory && typeof json[AUTH_TYPE.ldap] !== 'object')) {

        throw new Error('wrong configuration file for authentication ' + path);
    }

    logger.info(IDLOG, 'configure authentication with ' + path);

    // set the authentication type
    authenticationType = json.type;

    // set the expiration timeout of the token
    expires = parseInt(json.expiration_timeout, 10) * 1000;

    // configure LDAP authentication
    if (json.type === AUTH_TYPE.ldap) {
        logger.info(IDLOG, 'configure authentication with LDAP');
        configLDAP(json[AUTH_TYPE.ldap]);

    } else if (json.type === AUTH_TYPE.file) {
        // configure authentication with a credentials file
        logger.info(IDLOG, 'configure authentication with credentials file');
        configFile(json[AUTH_TYPE.file]);

    } else if (json.type === AUTH_TYPE.activeDirectory) {
        // configure authentication with Active Directory. It uses ldap configuration
        // object, because the data are the same
        logger.info(IDLOG, 'configure authentication with active directory');
        configActiveDirectory(json[AUTH_TYPE.ldap]);
    }

    if ( typeof json.unauthe_call !== 'string'   ||
        (json.unauthe_call        !== 'disabled' && json.unauthe_call !== 'enabled')) {

        logger.warn(IDLOG, 'bad "unauthe_call" configuration in ' + path + ': use default "' + unauthenticatedCall + '"');

    } else {
        unauthenticatedCall = json.unauthe_call;
    }

    startIntervalRemoveExpiredTokens();

    // emit the event to tell other modules that the component is ready to be used
    logger.info(IDLOG, 'emit "' + EVT_COMP_READY + '" event');
    emitter.emit(EVT_COMP_READY);
}

/**
* Checks if the unauthenticated asterisk call has been enabled by the JSON configuration file.
*
* @method isUnautheCallEnabled
* @return {boolean} True if the unauthenticated asterisk call has been enabled.
*/
function isUnautheCallEnabled() {
    try {
        if (unauthenticatedCall === 'enabled') { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Starts the removing of expired authentication tokens each interval of time. The interval time
* is equal to the expiration time, because the tokens are updated each half of expiration time.
*
* @method startIntervalRemoveExpiredTokens
* @private
*/
function startIntervalRemoveExpiredTokens() {
    try {
        logger.info(IDLOG, 'start remove expired tokens interval each ' + expires + ' msec');

        setInterval(function () {
            try {
                var username, userTokens, tokenid;
                var currentTimestamp = (new Date()).getTime();

                // cycle in all users
                for (username in grants) {

                    userTokens = grants[username]; // all user tokens

                    // cycle in all tokens of the user
                    for (tokenid in userTokens) {

                        // check the token expiration
                        if (currentTimestamp > userTokens[tokenid].expires) {

                            logger.info(IDLOG, 'the token "' + tokenid + '" of user "' + username + '" has expired: remove it');
                            removeToken(username, tokenid); // remove the token
                        }
                    }
                }
            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        }, expires);

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
    if (typeof json !== 'object'  ||
        json.path   === undefined || json.path === '') {

        throw new Error('wrong file authentication configuration');
    }

    // check file presence
    if (!fs.existsSync(json.path)) { throw new Error(json.path + ' doesn\'t exist'); }

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
    if (typeof json        !== 'object' ||
        typeof json.ou     !== 'string' || typeof json.baseDn !== 'string' ||
        typeof json.server !== 'string' || typeof json.port   !== 'string') {

        throw new Error('wrong LDAP auhtentication configuration');
    }

    port   = json.port;
    server = json.server;
    ou     = json.ou;
    baseDn = json.baseDn;

    var proto = (port === '636' ? 'ldaps' : 'ldap');
    var ldapurl = proto + '://' + server + ':' + port;

    // create ldap client
    client = ldap.createClient({
        url:            ldapurl,
        timeout:        5000,    // how long the client should let operations live for before timing out. Default is Infinity
        maxConnections: 10,      // whether or not to enable connection pooling, and if so, how many to maintain
        connectTimeout: 10000    // how long the client should wait before timing out on TCP connections. Default is up to the OS
    });
    logger.info(IDLOG, 'LDAP client created to ' + ldapurl);
    logger.info(IDLOG, 'LDAP authentication configuration ended');
}

/**
* Initialize the active directory client.
*
* **The method can throw an Exception.**
*
* @method configActiveDirectory
* @param {object} json The object with the active directory parameters
*/
function configActiveDirectory(json) {
    // check the parameter
    if (typeof json        !== 'object' || typeof json.baseDn !== 'string' ||
        typeof json.server !== 'string' || typeof json.port   !== 'string') {

        throw new Error('wrong active directory auhtentication configuration');
    }

    port     = json.port;
    server   = json.server;
    var arr  = json.baseDn.split(',');
    adDomain = arr[0].split('=')[1] + '.' + arr[1].split('=')[1];

    var proto = (port === '636' ? 'ldaps' : 'ldap');
    var adurl = proto + '://' + server + ':' + port;

    // create active directory client
    client = ldap.createClient({
        url:            adurl,
        timeout:        5000,    // how long the client should let operations live for before timing out. Default is Infinity
        maxConnections: 10,      // whether or not to enable connection pooling, and if so, how many to maintain
        connectTimeout: 10000    // how long the client should wait before timing out on TCP connections. Default is up to the OS
    });
    logger.info(IDLOG, 'active directory client created to ' + adurl);
    logger.info(IDLOG, 'active directory authentication configuration ended');
}

/**
* Calculates the HMAC-SHA1 token to be used in the authentication.
*
* @method calculateToken
* @param {string} accessKeyId The access key identifier, e.g. the username
* @param {string} password    The password of the account
* @param {string} nonce       It is used to create the HMAC-SHA1 token
*/
function calculateToken(accessKeyId, password, nonce) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string' ||
            typeof nonce       !== 'string' ||
            typeof password    !== 'string') {

            throw new Error('wrong parameters');
        }
        // generate token HMAC-SHA1
        var tohash = accessKeyId + ':' + password + ':' + nonce;
        return crypto.createHmac('sha1', password).update(tohash).digest('hex');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the remote site name.
*
* @method getRemoteSiteName
* @param  {string} accessKeyId The access key identifier, e.g. the username
* @param  {string} token       The authentication token
* @return {string} The name of the remote site
*/
function getRemoteSiteName(accessKeyId, token) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameters');
        }
        if (grants[accessKeyId] &&
            grants[accessKeyId][token] &&
            grants[accessKeyId][token].remoteSite === true &&
            typeof grants[accessKeyId][token].siteName === 'string') {

            return grants[accessKeyId][token].siteName;
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates an HMAC-SHA1 token to be used in the authentication and store it
* into the private _grants_ object.
*
* @method newToken
* @param {string}  accessKeyId  The access key identifier, e.g. the username
* @param {string}  password     The password of the account
* @param {string}  nonce        It is used to create the HMAC-SHA1 token
* @param {boolean} isRemoteSite True if the request is for a remote site
* @private
*/
function newToken(accessKeyId, password, nonce, isRemoteSite) {
    try {
        // check parameters
        if (typeof accessKeyId  !== 'string' ||
            typeof nonce        !== 'string' ||
            typeof password     !== 'string' ||
            typeof isRemoteSite !== 'boolean') {

            throw new Error('wrong parameters');
        }

        // generate token HMAC-SHA1
        var token  = calculateToken(accessKeyId, password, nonce);

        // store token
        if (!grants[accessKeyId]) { grants[accessKeyId] = {}; }

        var newTokenObj = {
            nonce:      nonce,
            token:      token,
            expires:    (new Date()).getTime() + expires,
            remoteSite: isRemoteSite
        };

        if (isRemoteSite) {
            var siteName;
            for (siteName in authRemoteSites) {
                if (authRemoteSites[siteName].username === accessKeyId &&
                    authRemoteSites[siteName].password === password) {

                    newTokenObj.siteName = siteName;
                    break;
                }
            }
        }
        grants[accessKeyId][token] = newTokenObj;
        logger.info(IDLOG, 'new token has been generated for accessKeyId ' + accessKeyId);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates an SHA1 nonce to be used in the authentication.
*
* @method getNonce
* @param  {string}  accessKeyId  The access key identifier used to create the token.
* @param  {string}  password     The password of the account
* @param  {boolean} isRemoteSite True if the request is for a remote site
* @return {string}  The SHA1 nonce.
*/
function getNonce(accessKeyId, password, isRemoteSite) {
    try {
        // check parameters
        if (typeof accessKeyId  !== 'string' ||
            typeof password     !== 'string' ||
            typeof isRemoteSite !== 'boolean') {

            throw new Error('wrong parameters');
        }

        // generate SHA1 nonce
        var random = crypto.randomBytes(256) + (new Date()).getTime();
        var shasum = crypto.createHash('sha1');
        var nonce  = shasum.update(random).digest('hex');

        // create new token
        newToken(accessKeyId, password, nonce, isRemoteSite);

        logger.info(IDLOG, 'nonce has been generated for accessKeyId ' + accessKeyId);
        return nonce;

    } catch (err) {
        logger.error(err.stack);
    }
}

/**
* Authenticate remote site using the credentials specified in the configuration file.
*
* @method authenticateRemoteSite
* @param {string}   accessKeyId The access key used to authenticate, e.g. the username
* @param {string}   password    The password of the account
* @param {string}   remoteIp    The remote ip address
* @param {function} cb          The callback function
*/
function authenticateRemoteSite(accessKeydId, password, remoteIp, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof remoteIp     !== 'string'   ||
            typeof password     !== 'string'   ||
            typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        // authenticate remote site by credentials read from the file
        logger.info(IDLOG, 'authenticate remote site "' + accessKeydId + '" "' + remoteIp + '" by credentials file');
        authRemoteSiteByFile(accessKeydId, password, remoteIp, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Authenticate the user using the choosen method in the configuration step.
*
* **It can throw an exception.**
*
* @method authenticate
* @param {string}   accessKeyId The access key used to authenticate, e.g. the username
* @param {string}   password    The password of the account
* @param {function} cb          The callback function
*/
function authenticate(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof password     !== 'string'   ||
            typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        if (authenticationType === AUTH_TYPE.ldap) {
            // authenticate the user by LDAP
            logger.info(IDLOG, 'authenticate the user "' + accessKeydId + '" by LDAP');
            authByLDAP(accessKeydId, password, cb);

        } else if (authenticationType === AUTH_TYPE.file) {
            // authenticate the user by credentials read from the file
            logger.info(IDLOG, 'authenticate the user "' + accessKeydId + '" by credentials file');
            authByFile(accessKeydId, password, cb);

        } else if (authenticationType === AUTH_TYPE.activeDirectory) {
            // authenticate the user by active directory
            logger.info(IDLOG, 'authenticate the user "' + accessKeydId + '" by active directory');
            authByActiveDirectory(accessKeydId, password, cb);

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
* @private
*/
function authByFile(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof password     !== 'string'   ||
            typeof accessKeydId !== 'string') {

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
* Authenticate the remote site user by the credentials read from the file.
*
* @method authRemoteSiteByFile
* @param {string}   accessKeyId The access key used to authenticate, e.g. the username
* @param {string}   password    The password of the account
* @param {string}   remoteIp    The remote ip address
* @param {function} cb          The callback function
* @private
*/
function authRemoteSiteByFile(accessKeydId, password, remoteIp, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof remoteIp     !== 'string'   ||
            typeof password     !== 'string'   ||
            typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        var site;
        var authenticated = false;
        for (site in authRemoteSites) {
            if (authRemoteSites[site].username === accessKeydId &&
                authRemoteSites[site].password === password     &&
                authRemoteSites[site].allowed_ip.indexOf(remoteIp) > -1) {

                authenticated = true;
                break;
            }
        }
        if (authenticated) {
            logger.info(IDLOG, 'remote site "' + accessKeydId + '" ' + remoteIp + ' has been authenticated successfully with file');
            cb(null);
        }
        else {
            var strerr = 'file authentication failed for remote site "' + accessKeydId + '"';
            logger.warn(IDLOG, strerr);
            cb(strerr);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb('file authentication failed for remote site "' + accessKeydId + '"');
    }
}

/**
* Authenticate the user by LDAP bind operation.
*
* @method authByLDAP
* @param {string}   accessKeyId The access key used to authenticate, e.g. the username
* @param {string}   password    The password of the account
* @param {function} cb          The callback function
*/
function authByLDAP(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof password     !== 'string'   ||
            typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        var dn = 'uid=' + accessKeydId + ',ou=' + ou + ',' + baseDn;

        // ldap authentication
        client.bind(dn, password, function (err, result) {
            ldapBindCb(accessKeydId, err, result, cb);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Authenticate the user by active directory bind operation.
*
* @method authByActiveDirectory
* @param {string}   accessKeyId The access key used to authenticate, e.g. the username
* @param {string}   password    The password of the account
* @param {function} cb          The callback function
*/
function authByActiveDirectory(accessKeydId, password, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof password     !== 'string'   ||
            typeof accessKeydId !== 'string') {

            throw new Error('wrong parameters');
        }

        var dn = accessKeydId + '@' + adDomain;

        // ldap authentication
        client.bind(dn, password, function (err, result) {
            adBindCb(accessKeydId, err, result, cb);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It's the callback of ldap bind operation.
*
* @method ldapBindCb
* @param {string}   accessKeydId The access key used for authentication
* @param {object}   err          The error response. If the bind is successfull it is null
* @param {object}   result       The result of the bind operation
* @param {function} cb           The callback function
* @private
*/
function ldapBindCb(accessKeydId, err, result, cb) {
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
* It is the callback of ldap bind operation done on Active Directory.
*
* @method adBindCb
* @param {string}   accessKeydId The access key used for authentication
* @param {object}   err          The error response. If the bind is successfull it is null
* @param {object}   result       The result of the bind operation
* @param {function} cb           The callback function
* @private
*/
function adBindCb(accessKeydId, err, result, cb) {
    try {
        // check parameters
        if(typeof accessKeydId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        if (err) {
            logger.warn(IDLOG, 'active directory authentication failed for user "' + accessKeydId + '"');
            cb(err);

        } else {
            logger.info(IDLOG, 'user "' + accessKeydId + '" has been successfully authenticated with active directory');
            cb(null);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb('active directory authentication failed for user "' + accessKeydId + '"');
    }
}

/**
* Removes the grant for an access key.
*
* @method removeToken
* @param  {string}  accessKeyId The access key
* @param  {string}  token       The token
* @return {boolean} True if the grant removing has been successful.
*/
function removeToken(accessKeyId, token) {
    try {
        // check the parameters
        if (typeof accessKeyId !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameters');
        }

        // check the grant presence
        if (grants[accessKeyId]) {
            delete grants[accessKeyId][token];
            logger.info(IDLOG, 'removed token "' + token + '" for accessKeyId ' + accessKeyId);
        }

        if (grants[accessKeyId][token] === undefined) { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the expiration of the token relative to the access key.
*
* @method updateTokenExpires
* @param {string} accessKeyId The access key relative to the token to be updated
* @param {string} token       The access token
*/
function updateTokenExpires(accessKeyId, token) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameters');
        }

        // check grants presence
        if (!grants[accessKeyId]) {
            logger.warn(IDLOG, 'update token expiration "' + token + '" failed: no grants for accessKeyId ' + accessKeyId);
            return;
        }

        // check token presence
        if (!grants[accessKeyId][token]) {
            logger.warn(IDLOG, 'update token expiration "' + token + '" failed: token is not present for accessKeyId ' + accessKeyId);
            return;
        }

        grants[accessKeyId][token].expires = (new Date()).getTime() + expires;
        logger.info(IDLOG, 'token expiration "' + token + '" has been updated for accessKeyId ' + accessKeyId);

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
* Authenticates the user through checking the token with the one
* that must be present in the _grants_ object. The _getNonce_ method
* must be used before this.
*
* @method verifyToken
* @param  {string}  accessKeyId The access key used to retrieve the token
* @param  {string}  token       The token to be checked
* @param  {boolean} isRemote    True if the token belongs to a remote site
* @return {boolean} True if the user has been authenticated succesfully.
*/
function verifyToken(accessKeyId, token, isRemote) {
    try {
        // check parameters
        if (typeof accessKeyId !== 'string' ||
            typeof token       !== 'string' ||
            typeof isRemote    !== 'boolean') {

            throw new Error('wrong parameters');
        }
        // check the grant presence
        if (!grants[accessKeyId]) {
            logger.warn(IDLOG, 'authentication failed for ' + (isRemote ? 'remote site ' : 'local ') + 'accessKeyId: "' + accessKeyId + '": no grant is present');
            return false;
        }

        // check if the user has the token
        var userTokens = grants[accessKeyId]; // all token of the user
        if (!userTokens[token] ||
            (userTokens[token] && userTokens[token].remoteSite !== isRemote)) {

            logger.warn(IDLOG, 'authentication failed for ' + (isRemote ? 'remote site ' : 'local ') + 'accessKeyId "' + accessKeyId + '": wrong token');
            return false;
        }

        // check the token expiration
        if ((new Date()).getTime() > userTokens[token].expires) {
            removeToken(accessKeyId, token); // remove the token
            logger.info(IDLOG, 'the token "' + token + '" has expired for ' + (isRemote ? 'remote site ' : 'local ') + 'accessKeyId ' + accessKeyId);
            return false;
        }

        // check whether update token expiration value
        if (autoUpdateTokenExpires) { updateTokenExpires(accessKeyId, token); }

        // authentication successfull
        logger.info(IDLOG, (isRemote ? 'remote site ' : 'local ') + 'accessKeyId "' + accessKeyId + '" has been successfully authenticated with token "' + token + '"');
        return true;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Returns the token expiration timeout.
*
* @method getTokenExpirationTimeout
* @return {number} The token expiration timeout in milliseconds.
*/
function getTokenExpirationTimeout() {
    try {
        return expires;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Subscribe a callback function to a custom event fired by this object.
* It's the same of nodejs _events.EventEmitter.on._
*
* @method on
* @param  {string}   type The name of the event
* @param  {function} cb   The callback to execute in response to the event
* @return {object}   A subscription handle capable of detaching that subscription.
*/
function on(type, cb) {
    try {
        return emitter.on(type, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.on                          = on;
exports.config                      = config;
exports.getNonce                    = getNonce;
exports.setLogger                   = setLogger;
exports.verifyToken                 = verifyToken;
exports.removeToken                 = removeToken;
exports.authenticate                = authenticate;
exports.EVT_COMP_READY              = EVT_COMP_READY;
exports.calculateToken              = calculateToken;
exports.getRemoteSiteName           = getRemoteSiteName;
exports.updateTokenExpires          = updateTokenExpires;
exports.isUnautheCallEnabled        = isUnautheCallEnabled;
exports.authenticateRemoteSite      = authenticateRemoteSite;
exports.isAutoUpdateTokenExpires    = isAutoUpdateTokenExpires;
exports.getTokenExpirationTimeout   = getTokenExpirationTimeout;
exports.configRemoteAuthentications = configRemoteAuthentications;
