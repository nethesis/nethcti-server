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
 * Fired when the user presence has changed.
 *
 * @event userPresenceChanged
 */
/**
 * The name of the user presence changed event.
 *
 * @property EVT_USER_PRESENCE_CHANGED
 * @type string
 * @default "userPresenceChanged"
 */
var EVT_USER_PRESENCE_CHANGED = 'userPresenceChanged';

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
 * The dbconn architect component.
 *
 * @property compDbconn
 * @type object
 * @private
 */
var compDbconn;

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
 * Set the dbconn architect component.
 *
 * @method setCompDbconn
 * @param {object} comp The dbconn architect component.
 */
function setCompDbconn(comp) {
  try {
    compDbconn = comp;
    logger.info(IDLOG, 'set dbconn architect component');
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
    var json = JSON.parse(fs.readFileSync(path, 'utf8'));

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
 * Handler for the _extenDndChanged_ event emitted by _astproxy_ component.
 * This event is generated from asterisk and so it could be generated from physical
 * phone dnd setting using freepbx features code (*78 to enable and *79 to disable).
 * If the event is dnd off, it check for all extensions of the user and disable dnd
 * for each of them. If the event is dnd on and it does not involve the main extension,
 * it enbales dnd for the main extension of the user.
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
    logger.info(IDLOG, 'received "' + compAstProxy.EVT_EXTEN_DND_CHANGED + '" event for exten "' + data.exten + '"');

    var i, e;
    var username = getUserFromExten(data.exten);
    var allext = getAllUserExtensions(username);
    var mainExtId = getEndpointMainExtension(username).getId();

    // dnd off
    if (data.enabled === false) {

      // dnd has been removed, so check if it is disabled from all extensions of the user.
      // If it is not, it disable dnd on all extensions of the user
      for (i = 0; i < allext.length; i++) {

        if (compAstProxy.isExtenDnd(allext[i])) {

          compAstProxy.setDnd(allext[i], false, function(err) {
            if (err) {
              logger.error(IDLOG, 'disabling dnd of extension "' + allext[i] + '"');
            } else {
              logger.info(IDLOG, 'disabled dnd of extension "' + allext[i] + '"');
            }
            updateUserPresence(username);
          });

        }
      }
    } else if (data.enabled === true && !isMainExtension(data.exten)) {

      // dnd has been activated in a seconday extension of a user, so enable it on main extension
      if (!compAstProxy.isExtenDnd(mainExtId)) {

        compAstProxy.setDnd(mainExtId, true, function(err) {
          if (err) {
            logger.error(IDLOG, 'enabling dnd of main extension "' + e + '"');
          } else {
            logger.info(IDLOG, 'enabled dnd of main extension "' + e + '"');
          }
          updateUserPresence(username);
        });

      }
    }
    updateUserPresence(username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Handler for the _extenCfChanged_ event emitted by _astproxy_ component.
 * This event is generated from asterisk and so it could be generated from physical
 * phone dnd setting using freepbx features code (*72<DEST> to enable and *73 to disable).
 * If the event is cf off, it check for all extensions of the user and disable cf
 * for each of them. If the event is cf on and it does not involve the main extension,
 * it enbales cf for the main extension of the user.
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
    logger.info(IDLOG, 'received "' + compAstProxy.EVT_EXTEN_CF_CHANGED + '" event for exten "' + data.exten + '"');

    var i, e;
    var username = getUserFromExten(data.exten);
    var allext = getAllUserExtensions(username);
    var mainExtId = getEndpointMainExtension(username).getId();

    // cf off
    if (data.enabled === false) {

      // cf has been removed, so check if it is disabled from all extensions of the user.
      // If it is not, it disable cf on all extensions of the user
      for (i = 0; i < allext.length; i++) {

        if (compAstProxy.isExtenCf(allext[i])) {

          compAstProxy.setUnconditionalCf(allext[i], false, null, function(err) {
            if (err) {
              logger.error(IDLOG, 'disabling cf of extension "' + allext[i] + '"');
            } else {
              logger.info(IDLOG, 'disabled cf of extension "' + allext[i] + '"');
            }
            updateUserPresence(username);
          });

        }
      }
    } else if (data.enabled === true && !isMainExtension(data.exten)) {

      // cf has been activated in a seconday extension of a user, so enable it on main extension
      if (!compAstProxy.isExtenCf(mainExtId)) {

        compAstProxy.setUnconditionalCf(mainExtId, true, data.to, function(err) {
          if (err) {
            logger.error(IDLOG, 'enabling cf of main extension "' + e + '" to "' + data.to + '"');
          } else {
            logger.info(IDLOG, 'enabled cf of main extension "' + e + '" to "' + data.to + '"');
          }
          updateUserPresence(username);
        });

      }
    }
    updateUserPresence(username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Handler for the _extenCfVmChanged_ event emitted by _astproxy_ component.
 * This event is generated from asterisk and so it could be generated from physical
 * phone dnd setting using freepbx features code (*72vmu<DEST> to enable and *73 to disable).
 * If the event is cfvm off, it check for all extensions of the user and disable cfvm
 * for each of them. If the event is cfvm on and it does not involve the main extension,
 * it enbales cfvm for the main extension of the user.
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
    logger.info(IDLOG, 'received "' + compAstProxy.EVT_EXTEN_CFVM_CHANGED + '" event for exten "' + data.exten + '"');

    var i, e;
    var username = getUserFromExten(data.exten);
    var allext = getAllUserExtensions(username);
    var mainExtId = getEndpointMainExtension(username).getId();

    // cfvm off
    if (data.enabled === false) {

      // cfvm has been removed, so check if it is disabled from all extensions of the user.
      // If it is not, it disable cfvm on all extensions of the user
      for (i = 0; i < allext.length; i++) {

        if (compAstProxy.isExtenCfVm(allext[i])) {

          compAstProxy.setUnconditionalCfVm(allext[i], false, null, function(err) {
            if (err) {
              logger.error(IDLOG, 'disabling cfvm of extension "' + allext[i] + '"');
            } else {
              logger.info(IDLOG, 'disabled cfvm of extension "' + allext[i] + '"');
            }
            updateUserPresence(username);
          });

        }
      }
    } else if (data.enabled === true && !isMainExtension(data.exten)) {

      // cf has been activated in a seconday extension of a user, so enable it on main extension
      if (!compAstProxy.isExtenCfVm(mainExtId)) {

        compAstProxy.setUnconditionalCfVm(mainExtId, true, data.vm, function(err) {
          if (err) {
            logger.error(IDLOG, 'enabling cfvm of main extension "' + e + '" to "' + data.vm + '"');
          } else {
            logger.info(IDLOG, 'enabled cfvm of main extension "' + e + '" to "' + data.vm + '"');
          }
          updateUserPresence(username);
        });

      }
    }
    updateUserPresence(username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Check if the extension is a main extension.
 *
 * @method isMainExtension
 * @param {string} extenId The identifier of the extension to be checked
 * @return {boolean} True if the extension is a main extension of a user
 * @private
 */
function isMainExtension(extenId) {
  try {
    var u, mainExtId;
    for (u in users) {
      mainExtId = getEndpointMainExtension(u).getId();
      if (mainExtId === extenId) {
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
 * Returns the username that has the extension associated.
 *
 * @method getUserFromExten
 * @param {string} extenId The identifier of the extension
 * @return {string} The name of the user that has the extension.
 * @private
 */
function getUserFromExten(extenId) {
  try {
    var u, i, allext;
    for (u in users) {
      allext = getAllUserExtensions(u);
      for (i = 0; i < allext.length; i++) {
        if (allext[i] === extenId) {
          return u;
        }
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
    compAstProxy.on(compAstProxy.EVT_EXTEN_CF_CHANGED, evtExtenCfChanged);
    compAstProxy.on(compAstProxy.EVT_EXTEN_CFVM_CHANGED, evtExtenCfVmChanged);
    compAstProxy.on(compAstProxy.EVT_EXTEN_DND_CHANGED, evtExtenDndChanged);
    logger.info(IDLOG, 'set asterisk proxy listeners done');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Enable DND for the extension.
 *
 * @method enableDndExten
 * @param {string} ext The extension identifier
 * @return {function} The function to be called by _setPresence_.
 */
function enableDndExten(ext) {
  return function(callback) {
    compAstProxy.setDnd(ext, true, callback);
  };
}

/**
 * Disable DND for the extension.
 *
 * @method disableDndExten
 * @param {string} ext The extension identifier
 * @return {function} The function to be called by _setPresence_.
 */
function disableDndExten(ext) {
  return function(callback) {
    compAstProxy.setDnd(ext, false, callback);
  };
}

/**
 * Disable CF for the extension.
 *
 * @method disableCfExten
 * @param {string} ext The extension identifier
 * @return {function} The function to be called by _setPresence_.
 */
function disableCfExten(ext) {
  return function(callback) {
    compAstProxy.setUnconditionalCf(ext, false, null, callback);
  };
}

/**
 * Disable CFVM for the extension.
 *
 * @method disableCfVmExten
 * @param {string} ext The extension identifier
 * @return {function} The function to be called by _setPresence_.
 */
function disableCfVmExten(ext) {
  return function(callback) {
    compAstProxy.setUnconditionalCfVm(ext, false, null, callback);
  };
}

/**
 * Enable CFVM for the extension.
 *
 * @method disableCfVmExten
 * @param {string} ext The extension identifier
 * @param {string} username The username
 * @return {function} The function to be called by _setPresence_.
 */
function enableCfVmExten(ext, username) {
  return function(callback) {
    var vmId = getAllEndpointsVoicemail(username)[
      Object.keys(getAllEndpointsVoicemail(username))[0]
    ];
    if (vmId) {
      vmId = vmId.getId();
      compAstProxy.setUnconditionalCfVm(ext, true, vmId, callback);
    } else {
      var str = 'setting "' + userPresence.STATUS.voicemail + '" presence to user "' + username + '": no voicemail associated';
      logger.warn(IDLOG, str);
      callback(str);
    }
  };
}

/**
 * Enable CF to cellphone for the extension.
 *
 * @method enableCfCellphoneExten
 * @param {string} ext The extension identifier
 * @param {string} username The username
 * @return {function} The function to be called by _setPresence_.
 */
function enableCfCellphoneExten(ext, username) {
  return function(callback) {
    var cellphoneId = getAllEndpointsCellphone(username)[
      Object.keys(getAllEndpointsCellphone(username))[0]
    ];
    if (cellphoneId) {
      cellphoneId = cellphoneId.getId();
      compAstProxy.setUnconditionalCf(ext, true, cellphoneId, callback);
    } else {
      var str = 'setting "' + userPresence.STATUS.cellphone + '" presence to user "' + username + '": no cellphone associated';
      logger.warn(IDLOG, str);
      callback(str);
    }
  };
}

/**
 * Returns all extension of a user.
 *
 * @method getAllUserExtensions
 * @param {string} username The username of the user to be set
 * @return {array} All the extensions of a user.
 */
function getAllUserExtensions(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter: username "' + username + '"');
    }
    if (users[username]) {
      var endpoints = users[username].getAllEndpoints();
      return Object.keys(endpoints[endpointTypes.TYPES.extension])
        .concat(Object.keys(endpoints[endpointTypes.TYPES.mainextension]));

    } else {
      logger.warn(IDLOG, 'getting all user extensions: user "' + username + '" not exists');
      return [];
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return [];
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

      var i, e;
      var arr = [];
      var mainExtId = getEndpointMainExtension(username).getId();
      var allext = getAllUserExtensions(username);

      // set presence to online
      if (status === userPresence.STATUS.online) {

        // disable "dnd", "call forward" and "call forward to voicemail" for all extensions of the user
        for (i = 0; i < allext.length; i++) {
          arr.push(disableDndExten(allext[i]));
          arr.push(disableCfExten(allext[i]));
          arr.push(disableCfVmExten(allext[i]));
        }
        arr.push( // set presence in Asterisk
          function(callback) {
            compAstProxy.setAsteriskPresence(mainExtId, 'AVAILABLE', callback);
          }
        );

        async.parallel(arr,
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" to "' + userPresence.STATUS.online + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.online + '" to user "' + username + '"');
            }
          }
        );
      }
      // set presence to dnd
      else if (status === userPresence.STATUS.dnd) {

        for (i = 0; i < allext.length; i++) {
          arr.push(enableDndExten(allext[i]));
          arr.push(disableCfExten(allext[i]));
          arr.push(disableCfVmExten(allext[i]));
        }
        arr.push( // set presence in Asterisk
          function(callback) {
            compAstProxy.setAsteriskPresence(mainExtId, 'DND', callback);
          }
        );

        async.parallel(arr,
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" to "' + userPresence.STATUS.dnd + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.dnd + '" to user "' + username + '"');
            }
          }
        );
      }
      // set presence to cellphone
      else if (status === userPresence.STATUS.cellphone) {

        for (i = 0; i < allext.length; i++) {
          arr.push(disableDndExten(allext[i]));
          arr.push(enableCfCellphoneExten(allext[i], username));
        }
        arr.push( //set presence in Asterisk
          function(callback) {
            compAstProxy.setAsteriskPresence(mainExtId, 'AWAY,CELLPHONE', callback);
          }
        );

        async.parallel(arr,
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" to "' + userPresence.STATUS.cellphone + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.cellphone + '" to user "' + username + '"');
            }
          }
        );
      }
      // set presence to voicemail
      else if (status === userPresence.STATUS.voicemail) {

        for (i = 0; i < allext.length; i++) {
          arr.push(disableDndExten(allext[i]));
          arr.push(enableCfVmExten(allext[i], username));
        }
        arr.push( // set presence in Asterisk
          function(callback) {
            compAstProxy.setAsteriskPresence(mainExtId, 'XA,VOICEMAIL', callback);
          }
        );

        async.parallel(arr,
          function(err) {
            cb(err);
            if (err) {
              logger.error(IDLOG, 'setting presence of user "' + username + '" to "' + userPresence.STATUS.voicemail + '"');
              logger.error(IDLOG, err);
            } else {
              logger.info(IDLOG, 'set presence "' + userPresence.STATUS.voicemail + '" to user "' + username + '"');
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
 * Return the list of all possible user presence.
 *
 * @method getPresenceList
 * @param {string} username The username
 * @return {array} All the possible presence of the user.
 */
function getPresenceList(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    var result = [
      userPresence.STATUS.online,
      userPresence.STATUS.dnd
    ];
    var allendpoints = users[username].getAllEndpoints();
    if (allendpoints && Object.keys(allendpoints[endpointTypes.TYPES.cellphone]).length > 0) {
      result.push(endpointTypes.TYPES.cellphone);
    }
    if (allendpoints && Object.keys(allendpoints[endpointTypes.TYPES.voicemail]).length > 0) {
      result.push(endpointTypes.TYPES.voicemail);
    }
    return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Get the user information in JSON format.
 *
 * @method getUserInfoJSON
 * @param {string} username The username
 * @return {string} The user information in JSON format.
 */
function getUserInfoJSON(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    var i, result;
    if (users[username]) {
      result = users[username].toJSON();
    }
    // add model and type for extension endpoints
    for (i = 0; i < result.endpoints[endpointTypes.TYPES.mainextension].length; i++) {
      result.endpoints[endpointTypes.TYPES.mainextension][i].description = compAstProxy.getExtensionAgent(result.endpoints[endpointTypes.TYPES.mainextension][i].id);
    }
    for (i = 0; i < result.endpoints[endpointTypes.TYPES.extension].length; i++) {
      result.endpoints[endpointTypes.TYPES.extension][i].description = compAstProxy.getExtensionAgent(result.endpoints[endpointTypes.TYPES.extension][i].id);
    }
    return result;

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
 * @method updateUserPresence
 * @param {string} username The username to be updated
 * @private
 */
function updateUserPresence(username) {
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
    var dnd = compAstProxy.isExtenDnd(mainExtId);
    var cf = compAstProxy.isExtenCf(mainExtId);
    var cfvm = compAstProxy.isExtenCfVm(mainExtId);
    var cfval;
    if (cf) {
      cfval = compAstProxy.getExtenCfValue(mainExtId);
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

    // emit the event for tell to other modules that the user presence has changed
    logger.info(IDLOG, 'emit event "' + EVT_USER_PRESENCE_CHANGED + '"');
    emitter.emit(EVT_USER_PRESENCE_CHANGED, {
      username: username,
      presence: users[username].getPresence()
    });

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
      updateUserPresence(username);
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
 * @param {string} username The name of the user to check
 * @param {string} exten The extension identifier
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
    var i;
    var endpoints = users[username].getAllEndpoints();
    if (endpoints[endpointTypes.TYPES.extension][exten] ||
      endpoints[endpointTypes.TYPES.mainextension][exten]) {

      return true;
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
 * @param {string} username The name of the user to check
 * @param {string} exten The cellphone identifier
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
    var endpoints = getAllEndpointsCellphone(username);
    for (cel in endpoints) {
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
 * Checks if the extension is of webrtc type.
 *
 * @method isExtenWebrtc
 * @param {string} exten The extension identifier
 * @return {boolean} True if the extension is of webrtc type.
 */
function isExtenWebrtc(exten) {
  try {
    if (typeof exten !== 'string') {
      throw new Error('wrong parameter: ' + exten);
    }
    var u, e, extensions;
    for (u in users) {
      extensions = (users[u].getAllEndpoints())[endpointTypes.TYPES.extension];
      for (e in extensions) {
        if (e === exten && extensions[e].isWebrtc()) {
          return true;
        }
      }
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
      logger.warn(IDLOG, 'gettings all the extension endpoints: the user "' + username + '" does not exist');
      return {};
    }

    // gets all endpoints, extracts the extension endpoints
    var endpoints = users[username].getAllEndpoints();
    var result = {};
    var e;
    for (e in endpoints[endpointTypes.TYPES.mainextension]) {
      result[e] = endpoints[endpointTypes.TYPES.mainextension][e];
    }
    for (e in endpoints[endpointTypes.TYPES.extension]) {
      result[e] = endpoints[endpointTypes.TYPES.extension][e];
    }
    return result;

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
      res[username] = getAllEndpointsExtension(username);
    }
    return res;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns the user associated with the specified extension endpoint.
 *
 * @method getUserUsingEndpointExtension
 * @param {string} exten The extension endpoint identifier
 * @return {string} The username associated with the specified extension endpoint.
 */
function getUserUsingEndpointExtension(exten) {
  try {
    // check parameter
    if (typeof exten !== 'string') {
      throw new Error('wrong parameter');
    }

    var extenKey, userExtens, username;
    for (username in users) {

      userExtens = getAllEndpointsExtension(username);

      for (extenKey in userExtens) {
        if (extenKey === exten) {
          // the user have the specified extension endpoint
          return username;
        }
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
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

/**
 * Returns the phone password to be used to invoce HTTP apis.
 *
 * @method getPhoneWebPass
 * @param  {string} username The username
 * @param  {string} exten The extension identifier
 * @return {object} The phone web password used to invoke HTTP apis.
 */
function getPhoneWebPass(username, exten) {
  try {
    if (typeof username !== 'string' || typeof exten !== 'string') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'getting the phone web username: the user "' + username + '" does not exist');
      return {};
    }

    // gets all endpoints, extracts the extension endpoints
    var extens = (users[username].getAllEndpoints())[endpointTypes.TYPES.extension];
    var e;
    for (e in extens) {
      if (e === exten) {
        return extens[e].getWebApiPassword();
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns the phone username to be used to invoce HTTP apis.
 *
 * @method getPhoneWebUser
 * @param  {string} username The username
 * @param  {string} exten The extension identifier
 * @return {object} The phone web username used to invoke HTTP apis.
 */
function getPhoneWebUser(username, exten) {
  try {
    if (typeof username !== 'string' || typeof exten !== 'string') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      logger.warn(IDLOG, 'getting the phone web username: the user "' + username + '" does not exist');
      return {};
    }

    // gets all endpoints, extracts the extension endpoints
    var extens = (users[username].getAllEndpoints())[endpointTypes.TYPES.extension];
    var e;
    for (e in extens) {
      if (e === exten) {
        return extens[e].getWebApiUser();
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Save the user settings into the database.
 *
 * @method saveSettings
 * @param {string} username The username
 * @param {object} data The JSON data object
 * @param {function} cb The callback function
 */
function saveSettings(username, data, cb) {
  try {
    if (typeof username !== 'string' ||
      typeof data !== 'object' ||
      typeof cb !== 'function') {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    // check the user existence
    if (typeof users[username] !== 'object') {
      var msg = 'saving user settings: user "' + username + '" does not exist';
      logger.warn(IDLOG, msg);
      cb(msg);
      return;
    }
    compDbconn.saveUserSettings(username, data, cb);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

// public interface
exports.on = on;
exports.config = config;
exports.setLogger = setLogger;
exports.setPresence = setPresence;
exports.getPresence = getPresence;
exports.saveSettings = saveSettings;
exports.getUsernames = getUsernames;
exports.isUserPresent = isUserPresent;
exports.isExtenWebrtc = isExtenWebrtc;
exports.setCompDbconn = setCompDbconn;
exports.getUserInfoJSON = getUserInfoJSON;
exports.EVT_USERS_READY = EVT_USERS_READY;
exports.getPhoneWebUser = getPhoneWebUser;
exports.setCompAstProxy = setCompAstProxy;
exports.getPresenceList = getPresenceList;
exports.getPhoneWebPass = getPhoneWebPass;
exports.getEndpointsJSON = getEndpointsJSON;
exports.getVoicemailList = getVoicemailList;
exports.getConfigurations = getConfigurations;
exports.setConfigurations = setConfigurations;
exports.getAllEndpointsEmail = getAllEndpointsEmail;
exports.hasExtensionEndpoint = hasExtensionEndpoint;
exports.hasCellphoneEndpoint = hasCellphoneEndpoint;
exports.hasVoicemailEndpoint = hasVoicemailEndpoint;
exports.getUsernamesWithData = getUsernamesWithData;
exports.getAllEndpointsExtension = getAllEndpointsExtension;
exports.getAllEndpointsCellphone = getAllEndpointsCellphone;
exports.getEndpointMainExtension = getEndpointMainExtension;
exports.getAllUsersEndpointsJSON = getAllUsersEndpointsJSON;
exports.EVT_USER_PRESENCE_CHANGED = EVT_USER_PRESENCE_CHANGED;
exports.getAllUsersEndpointsExtension = getAllUsersEndpointsExtension;
exports.getUserUsingEndpointExtension = getUserUsingEndpointExtension;
exports.getUsersUsingEndpointVoicemail = getUsersUsingEndpointVoicemail;
