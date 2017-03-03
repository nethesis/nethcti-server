/**
 * Provides the user functions.
 *
 * @module user
 * @main controller_user
 */

/**
 * Provides the user functionalities.
 *
 * @class controller_user
 * @static
 */
var fs = require('fs');
var User = require('./user').User;
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var userPresence = require('./user_presence');
var endpointTypes = require('./endpoint_types');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [controller_user]
 */
var IDLOG = '[controller_user]';

/**
* Fired when the presence of an endpoint of the user changes.
*
* @event endpointPresenceChanged
* @param {string} username     The username of the endpoint owner
* @param {string} endpointType The type of the updated endpoint
* @param {object} endpoint     The updated endpoint object of the user
..
*/
/**
 * The name of the user endpoint presence changed event.
 *
 * @property EVT_ENDPOINT_PRESENCE_CHANGED
 * @type string
 * @default "endpointPresenceChanged"
 */
var EVT_ENDPOINT_PRESENCE_CHANGED = 'endpointPresenceChanged';

/**
 * Fired when the creation of the _User_ objects is completed.
 *
 * @event usersReady
 */
/**
 * The name of the users ready event.
 *
 * @property EVT_USERS_READY
 * @type string
 * @default "usersReady"
 */
var EVT_USERS_READY = 'usersReady';

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
 * The asterisk proxy architect component.
 *
 * @property compAstProxy
 * @type object
 * @private
 */
var compAstProxy;

/**
 * The event emitter.
 *
 * @property emitter
 * @type object
 * @private
 */
var emitter = new EventEmitter();

/**
 * The list of the user objects. The keys is the user identification
 * and the value is a _User_ object.
 *
 * @property users
 * @type {object}
 * @private
 * @default {}
 */
var users = {};

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
    if (typeof log === 'object' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function') {

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
 * Set the asterisk proxy architect component.
 *
 * @method setCompAstProxy
 * @param {object} comp The asterisk proxy architect component.
 */
function setCompAstProxy(comp) {
  try {
    compAstProxy = comp;
    logger.info(IDLOG, 'set asterisk proxy architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Initialize the users by file. The file must use the JSON syntax and
 * must report user/endpoint associations and authorization data.
 *
 * **Emits _"users\_ready"_ event when the user creation is completed.**
 *
 * @method config
 * @param {string} path The path of the JSON file with the user/endpoints associations and the authorization data
 * @private
 */
function config(path) {
  try {
    if (typeof path !== 'string') {
      throw new Error('wrong parameter');
    }

    // check file presence
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }

    // read JSON file with the user/endpoint associations
    var json = require(path);

    // initialize user objects
    var userid, newuser;
    for (userid in json) { // cycle users
      // add new user in memory
      newuser = new User(userid, json[userid].name);
      users[userid] = newuser;
      logger.info(IDLOG, 'new user "' + newuser.getUsername() + '" has been created');
    }
    logger.info(IDLOG, Object.keys(users).length + ' users has been created');

    // set endpoints to the users
    initializeEndpointsUsersByJSON(json);
    // set user presence
    initializeUsersPresence();
    // initialize asterisk proxy listeners
    initializeAstProxyListeners();

    // emit the event for tell to other modules that the user objects are ready
    logger.info(IDLOG, 'emit event "' + EVT_USERS_READY + '"');
    emitter.emit(EVT_USERS_READY);

    logger.info(IDLOG, 'configuration done by ' + path);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Handler for the _extenDndChanged_ event emitted by _ast\_proxy_ component.
 *
 * @method evtExtenDndChanged
 * @param {object} data The data received by the event
 * @private
 */
function evtExtenDndChanged(data) {
  try {
    if (typeof data !== 'object' || typeof data.exten !== 'string' || typeof data.enabled !== 'boolean') {
      throw new Error('wrong parameters');
    }
    logger.info(IDLOG, 'received "' + compAstProxy.proxyLogic.EVT_EXTEN_DND_CHANGED + '" event for exten "' + data.exten + '"');
    var username = getUserFromMainExten(data.exten);
    udpateUserPresence(username);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Handler for the _extenCfChanged_ event emitted by _ast\_proxy_ component.
 *
 * @method evtExtenCfChanged
 * @param {object} data The data received by the event
 * @private
 */
function evtExtenCfChanged(data) {
  try {
    if (typeof data !== 'object' || typeof data.exten !== 'string' || typeof data.enabled !== 'boolean') {
      throw new Error('wrong parameters');
    }
    logger.info(IDLOG, 'received "' + compAstProxy.proxyLogic.EVT_EXTEN_CF_CHANGED + '" event for exten "' + data.exten + '"');
    var username = getUserFromMainExten(data.exten);
    udpateUserPresence(username);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Handler for the _extenCfVmChanged_ event emitted by _ast\_proxy_ component.
 *
 * @method evtExtenCfVmChanged
 * @param {object} data The data received by the event
 * @private
 */
function evtExtenCfVmChanged(data) {
  try {
    if (typeof data !== 'object' || typeof data.exten !== 'string' || typeof data.enabled !== 'boolean') {
      throw new Error('wrong parameters');
    }
    logger.info(IDLOG, 'received "' + compAstProxy.proxyLogic.EVT_EXTEN_CFVM_CHANGED + '" event for exten "' + data.exten + '"');
    var username = getUserFromMainExten(data.exten);
    udpateUserPresence(username);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns the username that has the main extension associated.
 *
 * @method getUserFromMainExten
 * @param {string} extenId The identifier of the main extension
 * @private
 */
function getUserFromMainExten(extenId) {
  try {
    var u, mainExtId;
    for (u in users) {
      mainExtId = getEndpointMainExtension(u).getId();
      if (mainExtId === extenId) {
        return u;
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Initialize the listeners for asterisk proxy component.
 *
 * @method initializeAstProxyListeners
 * @private
 */
function initializeAstProxyListeners() {
  try {
    compAstProxy.on(compAstProxy.proxyLogic.EVT_EXTEN_CF_CHANGED, evtExtenCfChanged);
    compAstProxy.on(compAstProxy.proxyLogic.EVT_EXTEN_CFVM_CHANGED, evtExtenCfVmChanged);
    compAstProxy.on(compAstProxy.proxyLogic.EVT_EXTEN_DND_CHANGED, evtExtenDndChanged);
    logger.info(IDLOG, 'set asterisk proxy listeners done');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the user presence status.
 *
 * @method setPresence
 * @param {string} username The username of the user to be set
 * @param {string} status The presence status
 * @param {function} cb The callback function
 */
function setPresence(username, status, cb) {
  try {
    if (typeof username !== 'string' || typeof status !== 'string' || typeof cb !== 'function') {
      throw new Error('wrong parameters');
    }
    if (users[username] && userPresence.isValidUserPresence(status)) {

      var mainExtId = getEndpointMainExtension(username).getId();

      if (status === userPresence.STATUS.online) {
        // disable "dnd", "call forward" and "call forward to voicemail"
        async.parallel([
            // disable dnd
            function(callback) {
              compAstProxy.proxyLogic.setDnd(mainExtId, false, callback);
            },
            // disable call forward
            function(callback) {
              compAstProxy.proxyLogic.setUnconditionalCf(mainExtId, false, null, callback);
            },
            // disable call forward to voicemail
            function(callback) {
              compAstProxy.proxyLogic.setUnconditionalCfVm(mainExtId, false, null, callback);
            }
          ],
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" (mainExt: ' + mainExtId + ') to "' + userPresence.STATUS.online + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.online + '" to user "' + username + '" (mainExt: ' + mainExtId + ')');
            }
          }
        );
      } else if (status === userPresence.STATUS.dnd) {
        async.parallel([
            // enable dnd
            function(callback) {
              compAstProxy.proxyLogic.setDnd(mainExtId, true, callback);
            },
            // disable call forward
            function(callback) {
              compAstProxy.proxyLogic.setUnconditionalCf(mainExtId, false, null, callback);
            },
            // disable call forward to voicemail
            function(callback) {
              compAstProxy.proxyLogic.setUnconditionalCfVm(mainExtId, false, null, callback);
            }
          ],
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" (mainExt: ' + mainExtId + ') to "' + userPresence.STATUS.dnd + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.dnd + '" to user "' + username + '" (mainExt: ' + mainExtId + ')');
            }
          }
        );
      } else if (status === userPresence.STATUS.cellphone) {
        async.parallel([
            // disable dnd
            function(callback) {
              compAstProxy.proxyLogic.setDnd(mainExtId, false, callback);
            },
            // enable call forward to cellphone
            function(callback) {
              var cellphoneId = getAllEndpointsCellphone(username)[
                Object.keys(getAllEndpointsCellphone(username))[0]
              ];
              if (cellphoneId) {
                cellphoneId = cellphoneId.getId();
                compAstProxy.proxyLogic.setUnconditionalCf(mainExtId, true, cellphoneId, callback);
              } else {
                var str = 'setting "' + userPresence.STATUS.cellphone + '" presence to user "' + username + '" ' +
                  '(mainExt: ' + mainExtId + '): no cellphone associated';
                logger.warn(IDLOG, str);
                callback(str);
              }
            }
          ],
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" (mainExt: ' + mainExtId + ') to "' + userPresence.STATUS.cellphone + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.cellphone + '" to user "' + username + '" (mainExt: ' + mainExtId + ')');
            }
          }
        );
      } else if (status === userPresence.STATUS.voicemail) {
        async.parallel([
            // disable dnd
            function(callback) {
              compAstProxy.proxyLogic.setDnd(mainExtId, false, callback);
            },
            // enable call forward to voicemail
            function(callback) {
              var vmId = getAllEndpointsVoicemail(username)[
                Object.keys(getAllEndpointsVoicemail(username))[0]
              ];
              if (vmId) {
                vmId = vmId.getId();
                compAstProxy.proxyLogic.setUnconditionalCfVm(mainExtId, true, vmId, callback);
              } else {
                var str = 'setting "' + userPresence.STATUS.voicemail + '" presence to user "' + username + '" ' +
                  '(mainExt: ' + mainExtId + '): no voicemail associated';
                logger.warn(IDLOG, str);
                callback(str);
              }
            }
          ],
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" (mainExt: ' + mainExtId + ') to "' + userPresence.STATUS.voicemail + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.voicemail + '" to user "' + username + '" (mainExt: ' + mainExtId + ')');
            }
          }
        );
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Get the user presence status.
 *
 * @method getPresence
 * @param {string} username The username
 * @return {string} The presence status.
 */
function getPresence(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameters');
    }
    if (users[username]) {
      return users[username].getPresence();
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Get the user information in JSON format.
 *
 * @method getUserInfo
 * @param {string} username The username
 * @return {string} The user information in JSON format.
 */
function getUserInfo(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    if (users[username]) {
      return users[username].toJSON();
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Adds the endpoint objects to the user by json configuration.
 *
 * @method initializeEndpointsUsersByJSON
 * @param {object} json The JSON configuration
 * @private
 */
function initializeEndpointsUsersByJSON(json) {
  try {
    if (typeof json !== 'object') {
      throw new Error('wrong parameter');
    }

    var userid, endpoType;
    for (userid in json) { // cycle users

      // set the endpoints to the user
      for (endpoType in json[userid].endpoints) {

        // check the validity of the endpoint type
        if (endpointTypes.isValidEndpointType(endpoType) === false) {
          logger.error(IDLOG, 'wrong users config file: invalid endpoint type "' + endpoType + '" for user "' + userid + '"');
        } else {
          // add all endpoints of the current type to the user
          addEndpointsToUser(userid, endpoType, json[userid].endpoints[endpoType]);
        }
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Get the main extension endpoint of the user.
 *
 * @method getEndpointMainExtension
 * @param {string} username The name of the user
 * @return {object} The main extension endpoint.
 */
function getEndpointMainExtension(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'getting main extension endpoint: user "' + username + '" does not exist');
      return {};
    }
    // gets all endpoints, extracts the main extension endpoint
    var endpoints = users[username].getAllEndpoints();
    return endpoints[endpointTypes.TYPES.mainextension][
      Object.keys(endpoints[endpointTypes.TYPES.mainextension])[0]
    ];
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Update the user presence.
 *
 * @method udpateUserPresence
 * @param {string} username The username to be updated
 * @private
 */
function udpateUserPresence(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    var mainExtId = getEndpointMainExtension(username).getId();
    var cellphone = (getAllEndpointsCellphone(username))[
      Object.keys(getAllEndpointsCellphone(username))[0]
    ];
    if (cellphone) {
      cellphone = cellphone.getId();
    }
    var dnd = compAstProxy.proxyLogic.isExtenDnd(mainExtId);
    var cf = compAstProxy.proxyLogic.isExtenCf(mainExtId);
    var cfvm = compAstProxy.proxyLogic.isExtenCfVm(mainExtId);
    var cfval;
    if (cf) {
      cfval = compAstProxy.proxyLogic.getExtenCfValue(mainExtId);
    }
    // set presence
    if (dnd) {
      logger.info(IDLOG, 'set user presence of "' + username + '" to "' + userPresence.STATUS.dnd + '"');
      users[username].setPresence(userPresence.STATUS.dnd);
    } else if (cf && cfval === cellphone) {
      logger.info(IDLOG, 'set user presence of "' + username + '" to "' + userPresence.STATUS.cellphone + '"');
      users[username].setPresence(userPresence.STATUS.cellphone);
    } else if (cfvm) {
      logger.info(IDLOG, 'set user presence of "' + username + '" to "' + userPresence.STATUS.voicemail + '"');
      users[username].setPresence(userPresence.STATUS.voicemail);
    } else {
      logger.info(IDLOG, 'set user presence of "' + username + '" to "' + userPresence.STATUS.online + '"');
      users[username].setPresence(userPresence.STATUS.online);
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Initialize the presence of all users.
 *
 * @method initializeUsersPresence
 * @private
 */
function initializeUsersPresence() {
  try {
    var username;
    for (username in users) {
      udpateUserPresence(username);
    }
    logger.info(IDLOG, 'set all users presence done');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Adds all endpoints to the user.
 *
 * @method addEndpointsToUser
 * @param {object} user The user object
 * @param {string} endpoType The type of the endpoint
 * @param {object} obj Contains the list of the endpoints with their relative object
 * @private
 */
function addEndpointsToUser(userid, endpoType, obj) {
  try {
    if (typeof userid !== 'string' || typeof endpoType !== 'string' || typeof obj !== 'object') {
      throw new Error('wrong parameters');
    }
    // adds all endpoints of the specified type to the user
    var id;
    for (id in obj) { // cycle endpoints
      users[userid].addEndpoint(endpoType, id, obj[id]);
      logger.info(IDLOG, 'added endpoint "' + endpoType + ' ' + id + '" to user "' + users[userid].getUsername() + '"');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Sets the configurations to the specified user.
 *
 * **It can throw an Exception.**
 *
 * @method setConfigurations
 * @param {string} userid The user identifier
 * @param {object} config The user configurations
 */
function setConfigurations(userid, config) {
  try {
    if (typeof userid !== 'string' || typeof config !== 'object') {
      throw new Error('wrong parameters');
    }

    if (users[userid] !== undefined) { // the user exists
      users[userid].setConfigurations(config);
      logger.info(IDLOG, 'configurations has been set for user "' + userid + '"');
    } else {
      throw new Error('setting configurations of unknown user "' + userid + '"');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    throw err;
  }
}

/**
 * Gets the user configurations.
 *
 * @method getConfigurations
 * @param {string} userid The user identifier
 * @return {object} The configurations of the user or an empty object if some errors occurs.
 */
function getConfigurations(userid) {
  try {
    // check parameter
    if (typeof userid !== 'string') {
      throw new Error('wrong parameter');
    }
    if (users[userid] !== undefined) { // the user exits
      logger.info(IDLOG, 'return configurations of user "' + userid + '"');
      return users[userid].getConfigurations();
    } else {
      throw new Error('getting configurations of unknown user "' + userid + '"');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Sets an authorization to the specified user.
 *
 * @method setAuthorization
 * @param {string} userid The user identifier
 * @param {string} typeAutho The type of the authorization
 * @param {string|array} value The value of the autorization. It can be "true" or "false"
 *                              or an array of value as in the case of customer card or
 *                              streaming authorizations.
 */
function setAuthorization(userid, typeAutho, value) {
  try {
    if (typeof userid !== 'string' || typeof typeAutho !== 'string' || value === undefined) {
      throw new Error('wrong parameters');
    }

    if (users[userid] !== undefined) { // the user exists
      users[userid].setAuthorization(typeAutho, value);
      logger.info(IDLOG, 'authorization ' + typeAutho + ' has been set for user ' + userid);
    } else {
      logger.error(IDLOG, 'setting authorization of unknown user "' + userid + '"');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Gets an authorization of the specified user.
 *
 * @method getAuthorization
 * @param {string} userid The user identifier
 * @return {object} The authorization of the user or undefined value if the user doesn\'t exist.
 */
function getAuthorization(userid, type) {
  try {
    if (typeof userid !== 'string' || typeof type !== 'string') {
      throw new Error('wrong parameters');
    }

    if (users[userid] !== undefined) { // the user exits
      return users[userid].getAuthorization(type);
    } else {
      logger.warn(IDLOG, 'getting authorization "' + type + '" of unknown user "' + userid + '"');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Emit an event. It's the same of nodejs _events.EventEmitter.emit_ method.
 *
 * @method emit
 * @param {string} ev The name of the event
 * @param {object} data The object to be emitted
 */
function emit(ev, data) {
  try {
    emitter.emit(ev, data);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Subscribe a callback function to a custom event fired by this object.
 * It's the same of nodejs _events.EventEmitter.on_ method.
 *
 * @method on
 * @param {string} type The name of the event
 * @param {function} cb The callback to execute in response to the event
 * @return {object} A subscription handle capable of detaching that subscription.
 */
function on(type, cb) {
  try {
    return emitter.on(type, cb);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Check if the user has an extension endpoint.
 *
 * @method hasExtensionEndpoint
 * @param  {string}  username The name of the user to check
 * @param  {string}  exten    The extension identifier
 * @return True if the user has the extension endpoint, false otherwise.
 */
function hasExtensionEndpoint(username, exten) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof exten !== 'string') {
      throw new Error('wrong parameters');
    }

    if (users[username] === undefined) { // the user is not present
      logger.warn(IDLOG, 'checking the user-extension endpoint association: no user "' + username + '" is present');
      return false;
    }
    var ext;
    var obj = users[username].getAllEndpoints();
    obj = obj[endpointTypes.TYPES.extension];
    for (ext in obj) {
      if (ext === exten) {
        return true;
      }
    }
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Check if the user has the cellphone endpoint.
 *
 * @method hasCellphoneEndpoint
 * @param  {string}  username The name of the user to check
 * @param  {string}  exten    The cellphone identifier
 * @return True if the user has the cellphone endpoint, false otherwise.
 */
function hasCellphoneEndpoint(username, cellphone) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof cellphone !== 'string') {
      throw new Error('wrong parameters');
    }

    if (users[username] === undefined) { // the user is not present
      logger.warn(IDLOG, 'checking the user-cellphone endpoint association: no user "' + username + '" is present');
      return false;
    }
    var cel;
    var obj = users[username].getAllEndpoints();
    obj = obj[endpointTypes.TYPES.cellphone];
    for (cel in obj) {
      if (cel === cellphone) {
        return true;
      }
    }
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Check if the user has the specified voicemail endpoint.
 *
 * @method hasVoicemailEndpoint
 * @param {string} username  The name of the user to check
 * @param {string} voicemail The voicemail endpoint identifier
 * @return {boolean} True if the user has the voicemail endpoint, false otherwise.
 */
function hasVoicemailEndpoint(username, voicemail) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof voicemail !== 'string') {
      throw new Error('wrong parameters');
    }

    if (users[username] === undefined) { // the user is not present
      throw new Error('checking the user-voicemail endpoint association: no user "' + username + '" is present');
    }
    var vm;
    var obj = users[username].getAllEndpoints();
    obj = obj[endpointTypes.TYPES.voicemail];
    for (vm in obj) {
      if (vm === voicemail) {
        return true;
      }
    }
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Returns the voicemail list of the user.
 *
 * @method getVoicemailList
 * @param {string} username The name of the user to check
 * @return {array} The voicemail list of the user.
 */
function getVoicemailList(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the user presence
    if (users[username] === undefined) {
      throw new Error('no user "' + username + '" is present');
    }

    // get voicemail endpoints object
    var evms = users[username].getAllEndpoints();
    evms = evms[endpointTypes.TYPES.voicemail];

    if (typeof evms !== 'object') {
      throw new Error('wrong voicemail endpoint result for user "' + username + '"');
    }
    return Object.keys(evms);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    throw err;
  }
}

/**
 * Returns the endpoints of the user.
 *
 * @method getEndpointsJSON
 * @param {string} userid The user identifier
 * @return {object} The endpoints of the user in JSON format.
 */
function getEndpointsJSON(userid) {
  try {
    // check parameter
    if (typeof userid !== 'string') {
      throw new Error('wrong parameter');
    }
    // check the user presence
    if (users[userid] === undefined) {
      throw new Error('no user "' + userid + '" is present');
    }

    // get all endpoints of the user
    return users[userid].getAllEndpointsJSON();

  } catch (err) {
    logger.error(IDLOG, err.stack);
    throw err;
  }
}

/**
 * Returns the endpoints of all users.
 *
 * @method getAllUsersEndpointsJSON
 * @return {object} The endpoints of all users in JSON format.
 */
function getAllUsersEndpointsJSON() {
  try {
    var obj = {};

    var keyusername;
    for (keyusername in users) {
      // get all endpoints of the user
      obj[keyusername] = users[keyusername].getAllEndpointsJSON();
    }
    return obj;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    throw err;
  }
}

/**
 * Returns the list of all the usernames.
 *
 * @method getUsernames
 * @return {array} The list of all the usernames.
 */
function getUsernames() {
  try {
    return Object.keys(users);
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return [];
  }
}

/**
 * Checks if the user exists. To be present, it must be configured.
 *
 * @method isUserPresent
 * @param  {string}  username  The name of the user to be checked.
 * @return {boolean} True if the user exists.
 */
function isUserPresent(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    if (users[username]) {
      return true;
    }
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Returns the list of all the usernames with their names.
 *
 * @method getUsernamesWithData
 * @return {object} The list of all the usernames with their names.
 */
function getUsernamesWithData() {
  try {
    var username;
    var obj = {};
    for (username in users) {
      obj[username] = {
        name: users[username].getName()
      };
    }
    return obj;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns all the email endpoints of the user.
 *
 * @method getAllEndpointsEmail
 * @param  {string} username The username
 * @return {object} Returns all the email endpoints of the user.
 */
function getAllEndpointsEmail(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'gettings all the email endpoints: the user "' + username + '" doesn\'t exist');
      return {};
    }

    // gets all endpoints, extracts the email endpoints
    var endpoints = users[username].getAllEndpoints();
    return endpoints[endpointTypes.TYPES.email];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns all the cellphone endpoints of the user.
 *
 * @method getAllEndpointsCellphone
 * @param  {string} username The username
 * @return {object} Returns all the cellphone endpoints of the user.
 */
function getAllEndpointsCellphone(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'gettings all the cellphone endpoints: the user "' + username + '" does not exist');
      return {};
    }

    // gets all endpoints, extracts the cellphone endpoints
    var endpoints = users[username].getAllEndpoints();
    return endpoints[endpointTypes.TYPES.cellphone];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns all the voicemail endpoints of the user.
 *
 * @method getAllEndpointsVoicemail
 * @param  {string} username The username
 * @return {object} Returns all the voicemail endpoints of the user.
 */
function getAllEndpointsVoicemail(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'gettings all the voicemail endpoints: the user "' + username + '" does not exist');
      return {};
    }
    // gets all endpoints, extracts the voicemail endpoints
    var endpoints = users[username].getAllEndpoints();
    return endpoints[endpointTypes.TYPES.voicemail];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns all the extension endpoints of the user.
 *
 * @method getAllEndpointsExtension
 * @param  {string} username The username
 * @return {object} Returns all the extension endpoints of the user.
 */
function getAllEndpointsExtension(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'gettings all the extension endpoints: the user "' + username + '" doesn\'t exist');
      return {};
    }

    // gets all endpoints, extracts the extension endpoints
    var endpoints = users[username].getAllEndpoints();
    return endpoints[endpointTypes.TYPES.extension];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns all the extension endpoints of all users.
 *
 * @method getAllUsersEndpointsExtension
 * @return {object} Returns all the extension endpoints of all users.
 */
function getAllUsersEndpointsExtension() {
  try {
    var res = {};
    var username, endpoints;

    for (username in users) {
      endpoints = users[username].getAllEndpoints();
      res[username] = endpoints[endpointTypes.TYPES.extension];
    }
    return res;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns all users associated with the specified extension endpoint.
 *
 * @method getUsersUsingEndpointExtension
 * @param  {string} exten The extension endpoint identifier
 * @return {array}  Returns all the users associated with the specified extension endpoint.
 */
function getUsersUsingEndpointExtension(exten) {
  try {
    // check parameter
    if (typeof exten !== 'string') {
      throw new Error('wrong parameter');
    }

    var result = [];

    var extenKey, userExtens, username, endpoints;
    for (username in users) {

      // get all the extension endpoints of the user
      endpoints = users[username].getAllEndpoints();
      userExtens = endpoints[endpointTypes.TYPES.extension];

      for (extenKey in userExtens) {

        if (extenKey === exten) {
          // the user have the specified extension endpoint
          result.push(username);
        }
      }
    }
    return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return [];
  }
}

/**
 * Returns all users associated with the specified voicemail endpoint.
 *
 * @method getUsersUsingEndpointVoicemail
 * @param  {string} voicemail The voicemail endpoint identifier
 * @return {array}  Returns all the users associated with the specified voicemail endpoint.
 */
function getUsersUsingEndpointVoicemail(voicemail) {
  try {
    // check parameter
    if (typeof voicemail !== 'string') {
      throw new Error('wrong parameter');
    }
    var result = [];
    var vmKey, userVms, username, endpoints;
    for (username in users) {
      // get all the voicemail endpoints of the user
      endpoints = users[username].getAllEndpoints();
      userVms = endpoints[endpointTypes.TYPES.voicemail];

      for (vmKey in userVms) {
        if (vmKey === voicemail) {
          // the user have the specified voicemail endpoint
          result.push(username);
        }
      }
    }
    return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return [];
  }
}

// public interface
exports.on = on;
exports.config = config;
exports.setLogger = setLogger;
exports.setPresence = setPresence;
exports.getPresence = getPresence;
exports.getUserInfo = getUserInfo;
exports.getUsernames = getUsernames;
exports.isUserPresent = isUserPresent;
exports.EVT_USERS_READY = EVT_USERS_READY;
exports.setCompAstProxy = setCompAstProxy;
exports.getEndpointsJSON = getEndpointsJSON;
exports.getVoicemailList = getVoicemailList;
exports.setAuthorization = setAuthorization;
exports.getAuthorization = getAuthorization;
exports.getConfigurations = getConfigurations;
exports.setConfigurations = setConfigurations;
exports.hasExtensionEndpoint = hasExtensionEndpoint;
exports.hasCellphoneEndpoint = hasCellphoneEndpoint;
exports.hasVoicemailEndpoint = hasVoicemailEndpoint;
exports.getUsernamesWithData = getUsernamesWithData;
exports.getAllEndpointsExtension = getAllEndpointsExtension;
exports.getAllEndpointsCellphone = getAllEndpointsCellphone;
exports.getEndpointMainExtension = getEndpointMainExtension;
exports.getAllEndpointsEmail = getAllEndpointsEmail;
exports.getAllUsersEndpointsJSON = getAllUsersEndpointsJSON;
exports.getAllUsersEndpointsExtension = getAllUsersEndpointsExtension;
exports.EVT_ENDPOINT_PRESENCE_CHANGED = EVT_ENDPOINT_PRESENCE_CHANGED;
exports.getUsersUsingEndpointExtension = getUsersUsingEndpointExtension;
exports.getUsersUsingEndpointVoicemail = getUsersUsingEndpointVoicemail;
