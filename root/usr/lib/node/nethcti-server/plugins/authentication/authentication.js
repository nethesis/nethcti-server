/**
 * Provides the authentication functions.
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
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var EventEmitter = require('events').EventEmitter;
var childProcess = require('child_process');

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
    "pam": "pam"
};
*/
var AUTH_TYPE = {
  'pam': 'pam'
};

/**
 * The path of the pam authentication script.
 *
 * @property PAM_SCRIPT_PATH
 * @type string
 * @private
 */
var PAM_SCRIPT_PATH = path.join(process.cwd(), 'scripts/pam-authenticate.pl');

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
 * The credentials used by remote sites.
 *
 * @property authRemoteSites
 * @type object
 * @private
 * @default {}
 */
var authRemoteSites = {};

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
    if (typeof log === 'object' &&
      typeof log.info === 'function' &&
      typeof log.warn === 'function' &&
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
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check file presence
    if (!fs.existsSync(path)) {
      logger.error(IDLOG, path + ' does not exist');
      return;
    }

    logger.info(IDLOG, 'configure remote sites authentication by ' + path);

    var json = require(path);

    if (typeof json !== 'object') {
      logger.error(IDLOG, 'wrong ' + path);
      return;
    }

    var user;
    for (user in json) {
      if (typeof json[user].username !== 'string' ||
        typeof json[user].password !== 'string' ||
        (json[user].allowed_ip instanceof Array) !== true) {

        logger.error(IDLOG, 'wrong ' + path + ': authentication content for "' + user + '"');
      } else {
        authRemoteSites[user] = {
          username: json[user].username,
          password: json[user].password,
          allowed_ip: json[user].allowed_ip
        };
      }
    }
    logger.info(IDLOG, 'configuration done for remote sites by ' + path);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * It reads the authentication configuration file.
 *
 * **The method can throw an Exception.**
 *
 * @method config
 * @param {string} path The path of the configuration file
 */
function config(path) {
  // check parameter
  if (typeof path !== 'string') {
    throw new TypeError('wrong parameter');
  }

  // check file presence
  if (!fs.existsSync(path)) {
    throw new Error(path + ' does not exist');
  }

  // read configuration file
  var json = require(path);

  logger.info(IDLOG, 'configuring authentication by ' + path);

  // set the authentication type
  authenticationType = json.type;

  // set the expiration timeout of the token
  expires = parseInt(json.expiration_timeout, 10) * 1000;

  if (json.type === AUTH_TYPE.pam) {
    // configure authentication with PAM
    logger.info(IDLOG, 'configure authentication with pam');
  }

  if (json.unauthe_call !== 'disabled' && json.unauthe_call !== 'enabled') {
    logger.warn(IDLOG, 'wrong ' + path + ': bad "unauthe_call" key: use default "' + unauthenticatedCall + '"');
  } else {
    unauthenticatedCall = json.unauthe_call;
  }

  startIntervalRemoveExpiredTokens();

  // emit the event to tell other modules that the component is ready to be used
  logger.info(IDLOG, 'emit "' + EVT_COMP_READY + '" event');
  emitter.emit(EVT_COMP_READY);
  logger.info(IDLOG, 'configuration done by ' + path);
}

/**
 * Checks if the unauthenticated asterisk call has been enabled by the JSON configuration file.
 *
 * @method isUnautheCallEnabled
 * @return {boolean} True if the unauthenticated asterisk call has been enabled.
 */
function isUnautheCallEnabled() {
  try {
    if (unauthenticatedCall === 'enabled') {
      return true;
    }
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

    setInterval(function() {
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
 * Calculates the HMAC-SHA1 token to be used in the authentication.
 *
 * @method calculateToken
 * @param {string} username The access key identifier, e.g. the username
 * @param {string} password The password of the account
 * @param {string} nonce    It is used to create the HMAC-SHA1 token
 */
function calculateToken(username, password, nonce) {
  try {
    // check parameters
    if (typeof username !== 'string' ||
      typeof nonce !== 'string' ||
      typeof password !== 'string') {

      throw new Error('wrong parameters');
    }
    // generate token HMAC-SHA1
    var tohash = username + ':' + password + ':' + nonce;
    return crypto.createHmac('sha1', password).update(tohash).digest('hex');

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns the remote site name.
 *
 * @method getRemoteSiteName
 * @param  {string} username The access key identifier, e.g. the username
 * @param  {string} token       The authentication token
 * @return {string} The name of the remote site
 */
function getRemoteSiteName(username, token) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof token !== 'string') {
      throw new Error('wrong parameters');
    }
    if (grants[username] &&
      grants[username][token] &&
      grants[username][token].remoteSite === true &&
      typeof grants[username][token].siteName === 'string') {

      return grants[username][token].siteName;
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
 * @param {string}  username  The access key identifier, e.g. the username
 * @param {string}  password     The password of the account
 * @param {string}  nonce        It is used to create the HMAC-SHA1 token
 * @param {boolean} isRemoteSite True if the request is for a remote site
 * @private
 */
function newToken(username, password, nonce, isRemoteSite) {
  try {
    // check parameters
    if (typeof username !== 'string' ||
      typeof nonce !== 'string' ||
      typeof password !== 'string' ||
      typeof isRemoteSite !== 'boolean') {

      throw new Error('wrong parameters');
    }

    // generate token HMAC-SHA1
    var token = calculateToken(username, password, nonce);

    // store token
    if (!grants[username]) {
      grants[username] = {};
    }

    var newTokenObj = {
      nonce: nonce,
      token: token,
      expires: (new Date()).getTime() + expires,
      remoteSite: isRemoteSite
    };

    if (isRemoteSite) {
      var siteName;
      for (siteName in authRemoteSites) {
        if (authRemoteSites[siteName].username === username &&
          authRemoteSites[siteName].password === password) {

          newTokenObj.siteName = siteName;
          break;
        }
      }
    }
    grants[username][token] = newTokenObj;
    logger.info(IDLOG, 'new token has been generated for username ' + username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Checks if the remote username has already been logged in.
 *
 * @method isRemoteSiteAlreadyLoggedIn
 * @param  {string}  username  The access key identifier, e.g. the username
 * @return {boolean} True if the remote username has been already logged in
 * @private
 */
function isRemoteSiteAlreadyLoggedIn(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var tk, user, tokens;
    for (user in grants) { // cycle all users
      if (user === username) {
        tokens = grants[user]; // all tokens of the user

        for (tk in tokens) { // cycle in all tokens
          if (tokens[tk].remoteSite === true) {
            // an authentication token for the specified user has been found,
            // so the remote site has already been logged in
            return true;
          }
        }
      }
    }
    // no token has been found, so the remote site has not been logged in
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Creates an SHA1 nonce to be used in the authentication.
 *
 * @method getNonce
 * @param  {string}  username  The access key identifier used to create the token.
 * @param  {string}  password     The password of the account
 * @param  {boolean} isRemoteSite True if the request is for a remote site
 * @return {string}  The SHA1 nonce.
 */
function getNonce(username, password, isRemoteSite) {
  try {
    // check parameters
    if (typeof username !== 'string' ||
      typeof password !== 'string' ||
      typeof isRemoteSite !== 'boolean') {

      throw new Error('wrong parameters');
    }

    // generate SHA1 nonce
    var random = crypto.randomBytes(256) + (new Date()).getTime();
    var shasum = crypto.createHash('sha1');
    var nonce = shasum.update(random).digest('hex');

    // create new token
    newToken(username, password, nonce, isRemoteSite);

    logger.info(IDLOG, 'nonce has been generated for username ' + username);
    return nonce;

  } catch (err) {
    logger.error(err.stack);
  }
}

/**
 * Authenticate remote site using the credentials specified in the configuration file.
 *
 * @method authenticateRemoteSite
 * @param {string}   username The access key used to authenticate, e.g. the username
 * @param {string}   password    The password of the account
 * @param {string}   remoteIp    The remote ip address
 * @param {function} cb          The callback function
 */
function authenticateRemoteSite(username, password, remoteIp, cb) {
  try {
    // check parameters
    if (typeof cb !== 'function' ||
      typeof remoteIp !== 'string' ||
      typeof password !== 'string' ||
      typeof username !== 'string') {

      throw new Error('wrong parameters');
    }

    // authenticate remote site by credentials read from the file
    logger.info(IDLOG, 'authenticate remote site "' + username + '" "' + remoteIp + '" by credentials file');
    authRemoteSiteByFile(username, password, remoteIp, cb);

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
 * @param {string}   username The access key used to authenticate, e.g. the username
 * @param {string}   password The password of the account
 * @param {function} cb       The callback function
 */
function authenticate(username, password, cb) {
  try {
    // check parameters
    if (typeof cb !== 'function' ||
      typeof password !== 'string' ||
      typeof username !== 'string') {

      throw new Error('wrong parameters');
    }
    if (authenticationType === AUTH_TYPE.pam) {
      logger.info(IDLOG, 'authenticating user "' + username + '" by pam');
      authByPam(username, password, cb);
    } else {
      logger.error(IDLOG, 'unknown authentication type "' + authenticationType + '"');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    throw err;
  }
}

/**
 * Authenticate the user by pam.
 *
 * @method authByPam
 * @param {string} username The access key used to authenticate, e.g. the username
 * @param {string} password The password of the account
 * @param {function} cb The callback function
 * @private
 */
function authByPam(username, password, cb) {
  try {
    // check parameters
    if (typeof cb !== 'function' ||
      typeof password !== 'string' ||
      typeof username !== 'string') {

      throw new Error('wrong parameters');
    }
    var cmd = ['echo -e "', username, '\n', password, '" | ', PAM_SCRIPT_PATH].join('');
    childProcess.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        logger.warn('pam authentication failed for user "' + username + '"');
        cb(error);
      } else {
        logger.info(IDLOG, 'user "' + username + '" successfully authenticated with pam');
        cb(null);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb('pam authentication failed for user "' + username + '"');
  }
}

/**
 * Authenticate the remote site user by the credentials read from the file.
 *
 * @method authRemoteSiteByFile
 * @param {string}   username The access key used to authenticate, e.g. the username
 * @param {string}   password The password of the account
 * @param {string}   remoteIp The remote ip address
 * @param {function} cb       The callback function
 * @private
 */
function authRemoteSiteByFile(username, password, remoteIp, cb) {
  try {
    // check parameters
    if (typeof cb !== 'function' ||
      typeof remoteIp !== 'string' ||
      typeof password !== 'string' ||
      typeof username !== 'string') {

      throw new Error('wrong parameters');
    }
    var site;
    var authenticated = false;
    for (site in authRemoteSites) {
      if (authRemoteSites[site].username === username &&
        authRemoteSites[site].password === password &&
        authRemoteSites[site].allowed_ip.indexOf(remoteIp) > -1) {

        authenticated = true;
        break;
      }
    }
    if (authenticated) {
      logger.info(IDLOG, 'remote site "' + username + '" ' + remoteIp + ' has been authenticated successfully with file');
      cb(null);
    } else {
      var strerr = 'file authentication failed for remote site "' + username + '"';
      logger.warn(IDLOG, strerr);
      cb(strerr);
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb('file authentication failed for remote site "' + username + '"');
  }
}

/**
 * Removes the grant for an access key.
 *
 * @method removeToken
 * @param  {string}  username The access key
 * @param  {string}  token       The token
 * @return {boolean} True if the grant removing has been successful.
 */
function removeToken(username, token) {
  try {
    // check the parameters
    if (typeof username !== 'string' || typeof token !== 'string') {
      throw new Error('wrong parameters');
    }
    // check the grant presence
    if (grants[username]) {
      delete grants[username][token];
      logger.info(IDLOG, 'removed token "' + token + '" for username ' + username);
    }

    if (grants[username][token] === undefined) {
      return true;
    }
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Update the expiration of the token relative to the access key.
 *
 * @method updateTokenExpires
 * @param {string} username The access key relative to the token to be updated
 * @param {string} token       The access token
 */
function updateTokenExpires(username, token) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof token !== 'string') {
      throw new Error('wrong parameters');
    }

    // check grants presence
    if (!grants[username]) {
      logger.warn(IDLOG, 'update token expiration "' + token + '" failed: no grants for username ' + username);
      return;
    }

    // check token presence
    if (!grants[username][token]) {
      logger.warn(IDLOG, 'update token expiration "' + token + '" failed: token is not present for username ' + username);
      return;
    }

    grants[username][token].expires = (new Date()).getTime() + expires;
    logger.info(IDLOG, 'token expiration "' + token + '" has been updated for username ' + username);

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
  try {
    return autoUpdateTokenExpires;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Authenticates the user through checking the token with the one
 * that must be present in the _grants_ object. The _getNonce_ method
 * must be used before this.
 *
 * @method verifyToken
 * @param  {string}  username The access key used to retrieve the token
 * @param  {string}  token    The token to be checked
 * @param  {boolean} isRemote True if the token belongs to a remote site
 * @return {boolean} True if the user has been authenticated succesfully.
 */
function verifyToken(username, token, isRemote) {
  try {
    // check parameters
    if (typeof username !== 'string' ||
      typeof token !== 'string' ||
      typeof isRemote !== 'boolean') {

      throw new Error('wrong parameters');
    }
    // check the grant presence
    if (!grants[username]) {
      logger.warn(IDLOG, 'authentication failed for ' + (isRemote ? 'remote site ' : 'local ') + 'username: "' + username + '": no grant is present');
      return false;
    }

    // check if the user has the token
    var userTokens = grants[username]; // all token of the user
    if (!userTokens[token] ||
      (userTokens[token] && userTokens[token].remoteSite !== isRemote)) {

      logger.warn(IDLOG, 'authentication failed for ' + (isRemote ? 'remote site ' : 'local ') + 'username "' + username + '": wrong token');
      return false;
    }

    // check the token expiration
    if ((new Date()).getTime() > userTokens[token].expires) {
      removeToken(username, token); // remove the token
      logger.info(IDLOG, 'the token "' + token + '" has expired for ' + (isRemote ? 'remote site ' : 'local ') + 'username ' + username);
      return false;
    }

    // check whether update token expiration value
    if (autoUpdateTokenExpires) {
      updateTokenExpires(username, token);
    }

    // authentication successfull
    logger.info(IDLOG, (isRemote ? 'remote site ' : 'local ') + 'username "' + username + '" has been successfully authenticated with token "' + token + '"');
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
exports.on = on;
exports.config = config;
exports.getNonce = getNonce;
exports.setLogger = setLogger;
exports.verifyToken = verifyToken;
exports.removeToken = removeToken;
exports.authenticate = authenticate;
exports.EVT_COMP_READY = EVT_COMP_READY;
exports.calculateToken = calculateToken;
exports.getRemoteSiteName = getRemoteSiteName;
exports.updateTokenExpires = updateTokenExpires;
exports.isUnautheCallEnabled = isUnautheCallEnabled;
exports.authenticateRemoteSite = authenticateRemoteSite;
exports.isAutoUpdateTokenExpires = isAutoUpdateTokenExpires;
exports.getTokenExpirationTimeout = getTokenExpirationTimeout;
exports.configRemoteAuthentications = configRemoteAuthentications;
exports.isRemoteSiteAlreadyLoggedIn = isRemoteSiteAlreadyLoggedIn;
