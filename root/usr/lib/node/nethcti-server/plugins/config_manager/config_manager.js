/**
 * Provides the fuctions for the configuration manager.
 *
 * @module config_manager
 * @main arch_config_manager
 */
var fs = require('fs');
var async = require('async');
var NOTIF_WHEN = require('./user_config_keys').NOTIF_WHEN;
var USER_CONFIG_KEYS = require('./user_config_keys').USER_CONFIG_KEYS;

/**
 * Provides the configuration manager functionalities. It sets the
 * user configurations and stores it into the relative section of the
 * configuration file.
 *
 * @class config_manager
 * @static
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [config_manager]
 */
var IDLOG = '[config_manager]';

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
 * The dbconn module.
 *
 * @property compDbconn
 * @type object
 * @private
 */
var compDbconn;

/**
 * The user module.
 *
 * @property compUser
 * @type object
 * @private
 */
var compUser;

/**
 * The asterisk proxy module.
 *
 * @property compAstProxy
 * @type object
 * @private
 */
var compAstProxy;

/**
 * The websocket communication module.
 *
 * @property compComNethctiWs
 * @type object
 * @private
 */
var compComNethctiWs;

/**
 * The hostname of the server. It will be customized by the _config_ method.
 *
 * @property serverHostname
 * @type string
 * @private
 * @default ""
 */
var serverHostname = '';

/**
 * The server chat parameters. It can be customized using the JSON
 * configuration file by means _configChat_ method.
 *
 * @property chatServer
 * @type object
 * @private
 * @default {}
 */
var chatServer = {};

/**
 * The phone urls used to directly intercat with the phone, e.g. to
 * originate a new call.
 *
 * @property phoneUrls
 * @type object
 * @private
 * @default {}
 */
var phoneUrls = {};

/**
 * The settings of all users. It is needed because methods to retrieve
 * user settings from db are asynchronous while some components needs
 * a synchronous response. Each time a user save a new setting, the data
 * are stored into the db _nethcti3.user\_settings_ and into this object.
 *
 * @property userSettings
 * @type object
 * @private
 * @default {}
 */
var userSettings = {};

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
 * Set the dbconn module to be used.
 *
 * @method setCompDbconn
 * @param {object} comp The dbconn module.
 */
function setCompDbconn(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong dbconn object');
    }
    compDbconn = comp;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the user module to be used.
 *
 * @method setCompUser
 * @param {object} comp The user module.
 */
function setCompUser(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong user object');
    }
    compUser = comp;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Sets the websocket communication module to be used.
 *
 * @method setCompComNethctiWs
 * @param {object} comp The module.
 */
function setCompComNethctiWs(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong user object');
    }
    compComNethctiWs = comp;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Sets the asterisk proxy module to be used.
 *
 * @method setCompAstProxy
 * @param {object} comp The module.
 */
function setCompAstProxy(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong asterisk proxy object');
    }
    compAstProxy = comp;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Initialize all user settings reading data from the _nethcti3.user\_settings_ database.
 *
 * @method configUser
 */
function configUser(path) {
  try {
    // sequentially executes two operations:
    //     1. sanitize default user extensions on "nethcti3.user_settings" db
    //     2. load all users settings
    //
    // sanitize is needed because when the admin changes a user extension association
    // the default user extension into "nethcti3.user_settings" db is wrong. So it checks
    // if the default user extension belongs to the user and if is not it replaces the value
    // with an associated extension of the user
    async.waterfall([

      // get all users default extension from db nethcti3.user_settings
      function(callbackWaterfall) {
        compDbconn.getAllUsersDefaultExtension(function(err, results) {
          try {
            if (err) {
              logger.error(IDLOG, 'getting all users default extension from db: ' + err);
              callbackWaterfall(err);

            } else {
              callbackWaterfall(null, results);
            }
          } catch (error) {
            logger.error(IDLOG, error.stack);
            callbackWaterfall(error);
          }
        });
      },

      // for each user check if the default extension belongs to him. If it's not it
      // fixes it into the database with an associated extension of the user
      function(arrDbAllUsersDefaultExtension, callbackWaterfall) {
        try {
          logger.info(IDLOG, 'consistency checking of db default extensions');
          var i, username, defaultExten, replaceValue;

          // contains default extensions to be fixed into the database
          // each object contains the following keys:
          //     1. "username"
          //     2. "replaceValue": value to be used to replace the wrong value
          var arrUsersToBeFixed = [];

          for (i = 0; i < arrDbAllUsersDefaultExtension.length; i++) {

            username = arrDbAllUsersDefaultExtension[i].username;
            defaultExten = arrDbAllUsersDefaultExtension[i].default_exten;

            if (!compUser.hasExtensionEndpoint(username, defaultExten)) {

              // default extension present into the db does not belong to its user, so it
              // is wrong and must be replaced with an extension associated with the user.
              // The value can be undefined in the case the user is no longer configured
              // for the cti, but it is present into the database
              replaceValue = Object.keys(compUser.getAllEndpointsExtension(username))[0] || '';
              arrUsersToBeFixed.push({
                username: username,
                replaceValue: replaceValue
              });
            }
          }

          if (arrUsersToBeFixed.length === 0) {
            logger.info(IDLOG, 'no db default extension to fix');
            callbackWaterfall(null);

          } else {
            logger.info(IDLOG, 'found #' + arrUsersToBeFixed.length + ' db default extension to be fixed');

            // replace value into the database
            async.eachSeries(arrUsersToBeFixed, function(obj, seriesCb) {

              compDbconn.saveUserDefaultExtension({
                username: obj.username,
                exten: obj.replaceValue
              }, function(err) {
                try {
                  if (err) {
                    logger.error(IDLOG, 'fixing db default extension "' + obj.replaceValue + '" for user "' + obj.username + '"');
                    seriesCb(err);
                  } else {
                    logger.info(IDLOG, 'fixed db default extension "' + obj.replaceValue + '" for user "' + obj.username + '"');
                    seriesCb(null);
                  }
                } catch (error) {
                  logger.error(IDLOG, error.stack);
                  seriesCb(error);
                }
              });

            }, function(err) {

              if (err) {
                logger.error(IDLOG, 'fixing db default extension: ' + err.toString());
                callbackWaterfall(err);
              } else {
                callbackWaterfall(null);
              }
            });
          }

        } catch (err) {
          logger.error(IDLOG, err.stack);
          callbackWaterfall(err);
        }
      }

    ], function(err) {

      if (err) {
        logger.error(IDLOG, err);
      }
      logger.info(IDLOG, 'checking database default extensions completed');
      loadAllUsersSettings();
    });

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Load settings of all the users in memory. See documentation about the
 * _userSettings_ property.
 *
 * @method loadAllUsersSettings
 * @private
 */
function loadAllUsersSettings() {
  try {
    // initialize settings of all the users getting data from db
    var i, username;
    var users = compUser.getUsernames();
    for (i = 0; i < users.length; i++) {
      (function(username) {

        compDbconn.getUserSettings(username, function(err, results) {
          try {
            if (err) {
              logger.error(IDLOG, 'getting settings of user "' + username + '" from db: ' + err);
            } else {
              userSettings[username] = fromDbUserSettingsToJSON(results, username);
            }
          } catch (error) {
            logger.error(IDLOG, error.stack);
            cb(error);
          }
        });
      })(users[i]);
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * It reads the configuration file and set the chat options. The
 * file must use the JSON syntax.
 *
 * @method configChat
 * @param {string} path The path of the configuration file
 */
function configChat(path) {
  try {
    // check parameter
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check file presence
    if (!fs.existsSync(path)) {
      logger.warn(IDLOG, path + ' doesn\'t exist');
      return;
    }

    logger.info(IDLOG, 'configure server chat with ' + path);

    // read configuration file
    var json = require(path);

    // check JSON file
    if (typeof json !== 'object' || typeof json.url !== 'string' || typeof json.domain !== 'string') {

      logger.warn(IDLOG, 'wrong JSON file ' + path);
      return;
    }

    chatServer.url = json.url;
    chatServer.domain = json.domain;
    logger.info(IDLOG, 'server chat configuration by file ' + path + ' ended');

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * It reads the JSON configuration file and set the server ip address.
 *
 * @method config
 * @param {string} path The path of the configuration file
 */
function config(path) {
  try {
    // check parameter
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check file presence
    if (!fs.existsSync(path)) {
      logger.warn(IDLOG, path + ' does not exist');
      return;
    }

    // read configuration file
    var json = require(path);

    // check JSON file
    if (typeof json !== 'object' || typeof json.hostname !== 'string') {
      logger.warn(IDLOG, 'wrong ' + path + ': no "hostname" key');
      return;
    }
    serverHostname = json.hostname;

    // set the listener for the websocket communication module
    setComNethctiWsListeners();

    logger.info(IDLOG, 'configuration done by ' + path);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Sets the event listeners for the websocket communication component.
 *
 * @method setComNethctiWsListeners
 * @private
 */
function setComNethctiWsListeners() {
  try {
    // check component object
    if (!compComNethctiWs || typeof compComNethctiWs.on !== 'function') {
      throw new Error('wrong websocket communication object');
    }

    compComNethctiWs.on(compComNethctiWs.EVT_WS_CLIENT_LOGGEDIN, checkQueueAutoLogin);
    compComNethctiWs.on(compComNethctiWs.EVT_WS_CLIENT_LOGGEDIN, checkAutoDndOffLogin);
    compComNethctiWs.on(compComNethctiWs.EVT_ALL_WS_CLIENT_DISCONNECTION, checkQueueAutoLogout);
    compComNethctiWs.on(compComNethctiWs.EVT_ALL_WS_CLIENT_DISCONNECTION, checkAutoDndOnLogout);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Check the "queue automatic login" setting of the user and if it is enabled it
 * does the login of all dynamic extension of the user into their relative queues.
 *
 * @method checkQueueAutoLogin
 * @param {string} username The name of the user logged in
 * @private
 */
function checkQueueAutoLogin(username) {
  try {
    // check the event data
    if (typeof username !== 'string') {
      throw new Error('wrong username "' + username + '"');
    }

    logger.info(IDLOG, 'received "new logged in user by ws" event for username "' + username + '"');

    // get the prefence of the user: automatic login into dynamic queues when login to cti
    var queueAutoLoginEnabled = userSettings[username][USER_CONFIG_KEYS.queue_auto_login];
    if (queueAutoLoginEnabled) {

      var extens = compUser.getAllEndpointsExtension(username);

      // login all dynamic extensions of the user into the belonging queue
      var e, q, queueIds;
      for (e in extens) {

        // get all queues to which the extension belongs
        queueIds = compAstProxy.getQueueIdsOfExten(e);

        // do the login of the member into the queue only if it is a dynamic member
        for (q in queueIds) {

          if (compAstProxy.isExtenDynMemberQueue(e, q) && // check if the member is of dynamic type
            !compAstProxy.isDynMemberLoggedInQueue(e, q)) { // check if the member is logged out from queue

            // login dynamic queue member into the relative queue
            logger.info(IDLOG, 'login queue member "' + e + '" into the queue "' + q + '" due to automatic login setting');
            compAstProxy.queueMemberAdd('extension', e, q, undefined, undefined, function(err, resp) {
              try {
                if (err) {
                  logger.warn(IDLOG, err);
                } else {
                  logger.info(IDLOG, 'dynamic extension "' + e + '" has been added to queue "' + q + '" due to "queue auto login" setting of user "' + username + '"');
                }
              } catch (err1) {
                logger.error(IDLOG, err1.stack);
              }
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Checks the "auto dnd off on login" setting of the user and if it
 * is enabled it does the DND OFF of all user extensions.
 *
 * @method checkAutoDndOffLogin
 * @param {string} username The name of the user logged in
 * @private
 */
function checkAutoDndOffLogin(username) {
  try {
    // check the event data
    if (typeof username !== 'string') {
      throw new Error('wrong username "' + username + '"');
    }

    logger.info(IDLOG, 'received "new logged in user by ws" event for username "' + username + '"');

    // get the prefence of the user: automatic dnd off when login to cti
    var autoDndOffLoginEnabled = userSettings[username][USER_CONFIG_KEYS.auto_dndoff_login];
    if (autoDndOffLoginEnabled) {

      var extens = compUser.getAllEndpointsExtension(username);
      var e;
      for (e in extens) {

        logger.info(IDLOG, 'set DND OFF for exten "' + e + '" due to automatic DND OFF on login setting');
        compAstProxy.setDnd(e, false, function(err, resp) {
          try {
            if (err) {
              logger.warn(IDLOG, err);
            } else {
              logger.info(IDLOG, 'DND OFF has been set for exten "' + e + '" due to "auto dnd off login" setting of user "' + username + '"');
            }
          } catch (err1) {
            logger.error(IDLOG, err1.stack);
          }
        });
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Checks the "queue automatic logout" setting of the user and if it is enabled it
 * does the logout of all dynamic extension of the user from their relative queues.
 *
 * @method checkQueueAutoLogout
 * @param {string} username The name of the user disonnected
 * @private
 */
function checkQueueAutoLogout(username) {
  try {
    // check the event data
    if (typeof username !== 'string') {
      throw new Error('wrong username "' + username + '"');
    }

    logger.info(IDLOG, 'received "new websocket disconnection" event for username "' + username + '"');

    // get the prefence of the user: automatic logout from dynamic queues when logout from cti
    var queueAutoLogoutEnabled = userSettings[username][USER_CONFIG_KEYS.queue_auto_logout];
    if (queueAutoLogoutEnabled) {

      var extens = compUser.getAllEndpointsExtension(username);

      // logout all dynamic extensions of the user from the belonging queue
      var e, q, queueIds;
      for (e in extens) {

        // get all queues to which the extension belongs
        queueIds = compAstProxy.getQueueIdsOfExten(e);

        // do the logout of the member from the queue only if it is a dynamic member
        for (q in queueIds) {

          if (compAstProxy.isExtenDynMemberQueue(e, q) && // check if the member is of dynamic type
            compAstProxy.isDynMemberLoggedInQueue(e, q)) { // check if the member is logged into the queue

            // remove dynamic queue member from the relative queue
            logger.info(IDLOG, 'remove queue member "' + e + '" from queue "' + q + '" due to automatic logout setting');
            compAstProxy.queueMemberRemove('extension', e, q, function(err, resp) {
              try {
                if (err) {
                  logger.warn(IDLOG, err);
                } else {
                  logger.info(IDLOG, 'removed dynamic extension "' + e + '" from queue "' + q + '" due to "queue auto logout" setting of user "' + username + '"');
                }
              } catch (err1) {
                logger.error(IDLOG, err1.stack);
              }
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Checks the "auto dnd on logout" setting of the user and if it is enabled it
 * does the DND ON on all user extensions.
 *
 * @method checkAutoDndOnLogout
 * @param {string} username The name of the user disonnected
 * @private
 */
function checkAutoDndOnLogout(username) {
  try {
    // check the event data
    if (typeof username !== 'string') {
      throw new Error('wrong username "' + username + '"');
    }

    logger.info(IDLOG, 'received "new websocket disconnection" event for username "' + username + '"');

    // get the prefence of the user: automatic dnd on when logout from cti
    var autoDndOnLogoutEnabled = userSettings[username][USER_CONFIG_KEYS.auto_dndon_logout];
    if (autoDndOnLogoutEnabled) {

      var extens = compUser.getAllEndpointsExtension(username);
      var e;
      for (e in extens) {

        logger.info(IDLOG, 'set DND ON for exten "' + e + '" due to automatic DND ON on logout setting');
        compAstProxy.setDnd(e, true, function(err, resp) {
          try {
            if (err) {
              logger.warn(IDLOG, err);
            } else {
              logger.info(IDLOG, 'DND ON has been set for exten "' + e + '" due to "auto dnd on logout" setting of user "' + username + '"');
            }
          } catch (err1) {
            logger.error(IDLOG, err1.stack);
          }
        });
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns the server hostname.
 *
 * @method getServerHostname
 * @return {string} The server hostname.
 */
function getServerHostname() {
  try {
    return serverHostname;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * It reads the JSON configuration file of phone urls used to
 * directly interact with the phones, e.g. to originate a new call.
 * The keys contained by file must be sorted from more restrictive
 * to the least, because they are sequentially checked.
 *
 * **The method can throw an Exception.**
 *
 * @method configPhoneUrls
 * @param {string} path The path of the configuration file
 */
function configPhoneUrls(path) {
  try {
    // check parameter
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check file presence
    if (!fs.existsSync(path)) {
      logger.warn(IDLOG, path + ' does not exist');
      return;
    }

    logger.info(IDLOG, 'configure phone urls reading ' + path);

    // read configuration file
    var json = require(path);

    // check JSON file
    if (typeof json !== 'object') {
      logger.warn(IDLOG, 'wrong JSON file ' + path);
      return;
    }

    phoneUrls = json;
    logger.info(IDLOG, 'phone urls configuration by file ' + path + ' ended');

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * It sequentially test a match of specified agent with the keys of _phoneUrls_
 * object. If the match exists than returns the url phone to originate a new call,
 * otherwise it returns an empty string. The keys of _phoneUrls_ are sequentially
 * checked, so they must be present from the more restrictive to the least.
 *
 * @method getCallUrlFromAgent
 * @param  {string} agent The phone user agent
 * @return {string} The phone url used to originate a new call
 */
function getCallUrlFromAgent(agent) {
  try {
    // check parameter
    if (typeof agent !== 'string') {
      throw new TypeError('wrong parameter');
    }

    var re;
    for (re in phoneUrls) {
      // case insensitive 'i'
      if (agent.search(new RegExp(re, 'i')) >= 0) {
        return phoneUrls[re].urls.call;
      }
    }
    return '';

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * It sequentially test a match of specified agent with the keys of _phoneUrls_
 * object. If the match exists than returns the url phone to hold/unhold the conversation,
 * otherwise it returns an empty string. The keys of _phoneUrls_ are sequentially
 * checked, so they must be present from the more restrictive to the least.
 *
 * @method getHoldUnholdUrlFromAgent
 * @param  {string} agent The phone user agent
 * @return {string} The phone url used to hold/unhold the conversation
 */
function getHoldUnholdUrlFromAgent(agent) {
  try {
    // check parameter
    if (typeof agent !== 'string') {
      throw new TypeError('wrong parameter: ' + agent);
    }

    var re;
    for (re in phoneUrls) {
      // case insensitive 'i'
      if (agent.search(new RegExp(re, 'i')) >= 0) {
        return phoneUrls[re].urls.hold_unhold;
      }
    }
    return '';

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Returns true if the specified phone is supported by HTTP api.
 * It sequentially test a match of specified agent with the keys of _phoneUrls_
 * object. If the match exists than returns a true value, false otherwise.
 *
 * @method phoneSupportHttpApi
 * @param  {string}  agent The phone user agent
 * @return {boolean} True is the phone supports HTTP api.
 */
function phoneSupportHttpApi(agent) {
  try {
    // check parameter
    if (typeof agent !== 'string') {
      throw new TypeError('wrong parameter');
    }

    var re;
    for (re in phoneUrls) {
      // case insensitive 'i'
      if (agent.search(new RegExp(re, 'i')) >= 0) {
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
 * It sequentially test a match of specified agent with the keys of _phoneUrls_
 * object. If the match exists than returns the url phone to answer a call,
 * otherwise it returns an empty string. The keys of _phoneUrls_ are sequentially
 * checked, so they must be present from the more restrictive to the least.
 *
 * @method getAnswerUrlFromAgent
 * @param  {string} agent The phone user agent
 * @return {string} The phone url used to answer a call
 */
function getAnswerUrlFromAgent(agent) {
  try {
    // check parameter
    if (typeof agent !== 'string') {
      throw new TypeError('wrong parameter');
    }

    var re;
    for (re in phoneUrls) {
      // case insensitive 'i'
      if (agent.search(new RegExp(re, 'i')) >= 0) {
        return phoneUrls[re].urls.answer;
      }
    }
    return '';

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Return the server chat configurations.
 *
 * @method getChatConf
 * @return {object} The server chat configurations.
 */
function getChatConf() {
  try {
    return chatServer;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Saves the specified notification setting for the user.
 *
 * @method setUserNotifySetting
 * @param {object}   data
 *   @param {string} data.type     The type of the notification, e.g. "voicemail"
 *   @param {string} data.when     When receive the notification type
 *   @param {string} data.method   The method to use by the notification, e.g. "email"
 *   @param {string} data.username The username to set the notification setting
 * @param {function} cb            The callback function
 */
function setUserNotifySetting(data, cb) {
  try {
    // check parameter
    if (typeof data !== 'object' || typeof data.type !== 'string' || typeof data.when !== 'string' || typeof data.method !== 'string' || typeof data.username !== 'string' || typeof cb !== 'function') {

      throw new Error('wrong parameter');
    }

    // save the setting into the database
    compDbconn.saveUserNotifySetting(data, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'saving setting "' + data.method + '" notification for "' + data.type + '" to "' + data.when + '" for user "' + data.username + '"');
          cb(err);
        } else {

          // update the configuration in mem
          userSettings[data.username][USER_CONFIG_KEYS.notifications][data.type][data.method].when = data.when;
          cb(null);
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err.stack);
  }
}

/**
 * Returns the user settings.
 *
 * @method getUserSettings
 * @param  {string} user The user identifier
 * @return {object} The user settings.
 */
function getUserSettings(user) {
  try {
    // check parameter
    if (typeof user !== 'string') {
      throw new Error('wrong parameter');
    }

    return userSettings[user] || {};

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Adapts user settings taken from db to JSON format.
 *
 * @method fromDbUserSettingsToJSON
 * @param  {array}  arr      The user settings received from the database
 * @param  {string} username The name of the user
 * @return {object} The user settings in JSON format.
 */
function fromDbUserSettingsToJSON(arr, username) {
  try {
    // check parameter
    if (!(arr instanceof Array) || typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get the first extension, cellphone and email endpoint of the user
    var firstExten = Object.keys(compUser.getAllEndpointsExtension(username))[0];
    var firstEmail = Object.keys(compUser.getAllEndpointsEmail(username))[0];
    var firstCellphone = Object.keys(compUser.getAllEndpointsCellphone(username))[0];
    firstExten = (firstExten ? firstExten : '');
    firstEmail = (firstEmail ? firstEmail : '');
    firstCellphone = (firstCellphone ? firstCellphone : '');

    // initialize default values. They are used if the user has never set
    // any values from the client, so no data are present into the database
    var json = {
      notifications: {
        postit: {
          sms: {
            when: 'never',
            to: firstCellphone
          },
          email: {
            when: 'never',
            to: firstEmail
          }
        },
        voicemail: {
          sms: {
            when: 'never',
            to: firstCellphone
          },
          email: {
            when: 'never',
            to: firstEmail
          }
        }
      },
      queue_auto_login: false,
      queue_auto_logout: false,
      auto_dndon_logout: false,
      auto_dndoff_login: false,
      default_extension: firstExten
    };

    // overwrite default values with those taken from the database
    // if they are present
    var i;
    for (i = 0; i < arr.length; i++) {

      if (arr[i].key_name === 'auto_queue_login') {
        json.queue_auto_login = (arr[i].value === 'true');

      } else if (arr[i].key_name === 'auto_queue_logout') {
        json.queue_auto_logout = (arr[i].value === 'true');

      } else if (arr[i].key_name === 'auto_dndon_logout') {
        json.auto_dndon_logout = (arr[i].value === 'true');

      } else if (arr[i].key_name === 'auto_dndoff_login') {
        json.auto_dndoff_login = (arr[i].value === 'true');

      } else if (arr[i].key_name === 'default_extension') {
        json.default_extension = arr[i].value;

      } else if (arr[i].key_name === 'notify_postit_email_when') {
        json.notifications.postit.email.when = arr[i].value;

      } else if (arr[i].key_name === 'notify_postit_sms_when') {
        json.notifications.postit.sms.when = arr[i].value;

      } else if (arr[i].key_name === 'notify_voicemail_email_when') {
        json.notifications.voicemail.email.when = arr[i].value;

      } else if (arr[i].key_name === 'notify_voicemail_sms_when') {
        json.notifications.voicemail.sms.when = arr[i].value;
      }
    }
    return json;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Return the user endpoints.
 *
 * @method getUserEndpointsJSON
 * @param {string} userid The user identifier
 * @return {object} The user endpoints in JSON format.
 */
function getUserEndpointsJSON(userid) {
  try {
    // check parameter
    if (typeof userid !== 'string') {
      throw new Error('wrong parameter');
    }

    return compUser.getEndpointsJSON(userid);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns the endpoints of all users.
 *
 * @method getAllUserEndpointsJSON
 * @return {object} The endpoints of all users in JSON format.
 */
function getAllUserEndpointsJSON() {
  try {
    return compUser.getAllUsersEndpointsJSON();
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns the total number of configured users.
 *
 * @method getTotNumUsers
 * @return {number} The total number of configured users.
 */
function getTotNumUsers() {
  try {
    return Object.keys(compUser.getAllUsersEndpointsJSON()).length;
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return -1;
  }
}

/**
 * Saves the specified default extension for the user.
 *
 * @method setDefaultUserExtensionConf
 * @param {string}   username The username to set the defaul extension
 * @param {string}   exten    The extension identifier
 * @param {function} cb       The callback function
 */
function setDefaultUserExtensionConf(username, exten, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof exten !== 'string' || typeof cb !== 'function') {
      throw new Error('wrong parameters');
    }

    // save the setting into the database
    compDbconn.saveUserDefaultExtension({
      username: username,
      exten: exten
    }, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'saving setting "default extension: ' + exten + '" for user "' + username + '"');
          cb(err);
        } else {
          // update the configuration in mem
          userSettings[username][USER_CONFIG_KEYS.default_extension] = exten;
          cb(null);
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err.stack);
  }
}

/**
 * Returns the default extension of the user.
 *
 * @method getDefaultUserExtensionConf
 * @param  {string} username The username to get the default extension
 * @return {string} The default extension identifier.
 */
function getDefaultUserExtensionConf(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return userSettings[username][USER_CONFIG_KEYS.default_extension];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Saves the automatic queue logout when user logout from cti.
 *
 * @method setQueueAutoLogoutConf
 * @param {string}   username The username to set the automatic queue logout
 * @param {boolean}  enable   The enable value: true if it is to enable
 * @param {function} cb       The callback function
 */
function setQueueAutoLogoutConf(username, enable, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof enable !== 'boolean' || typeof cb !== 'function') {

      throw new Error('wrong parameters');
    }

    // save the setting into the database
    compDbconn.saveUserAutoQueueLogout({
      username: username,
      enable: enable
    }, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'saving setting "auto queue logout: ' + enable + '" for user "' + username + '"');
          cb(err);
        } else {
          // update the configuration in mem
          userSettings[username][USER_CONFIG_KEYS.queue_auto_logout] = enable;
          cb(null);
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err.stack);
  }
}

/**
 * Saves the automatic DND OFF status when user login to cti.
 *
 * @method setAutoDndOffLoginConf
 * @param {string}   username The username to set the automatic DND OFF status
 * @param {boolean}  enable   The enable value: true if it is to enable
 * @param {function} cb       The callback function
 */
function setAutoDndOffLoginConf(username, enable, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof enable !== 'boolean' || typeof cb !== 'function') {

      throw new Error('wrong parameters');
    }

    // save the setting into the database
    compDbconn.saveUserAutoDndOffLogin({
      username: username,
      enable: enable
    }, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'saving setting "auto DND OFF login": ' + enable + '" for user "' + username + '"');
          cb(err);
        } else {
          // update the configuration in mem
          userSettings[username][USER_CONFIG_KEYS.auto_dndoff_login] = enable;
          cb(null);
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err.stack);
  }
}

/**
 * Saves the automatic DND ON status when user logout from cti.
 *
 * @method setAutoDndOnLogoutConf
 * @param {string}   username The username to set the automatic DND ON status
 * @param {boolean}  enable   The enable value: true if it is to enable
 * @param {function} cb       The callback function
 */
function setAutoDndOnLogoutConf(username, enable, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof enable !== 'boolean' || typeof cb !== 'function') {

      throw new Error('wrong parameters');
    }

    // save the setting into the database
    compDbconn.saveUserAutoDndOnLogout({
      username: username,
      enable: enable
    }, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'saving setting "auto DND ON logout": ' + enable + '" for user "' + username + '"');
          cb(err);
        } else {
          // update the configuration in mem
          userSettings[username][USER_CONFIG_KEYS.auto_dndon_logout] = enable;
          cb(null);
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err.stack);
  }
}

/**
 * Returns the automatic queue logout value of the user.
 *
 * @method getQueueAutoLogoutConf
 * @param  {string}  username The username to get the value
 * @return {boolean} True if it is enabled.
 */
function getQueueAutoLogoutConf(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return userSettings[username][USER_CONFIG_KEYS.queue_auto_logout];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Returns the automatic DND ON status when user logout from cti.
 *
 * @method getAutoDndOnLogoutConf
 * @param  {string}  username The username to get the value
 * @return {boolean} True if it is enabled.
 */
function getAutoDndOnLogoutConf(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return userSettings[username][USER_CONFIG_KEYS.auto_dndon_logout];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}


/**
 * Returns the automatic DND OFF status when user login to cti.
 *
 * @method getAutoDndOffLoginConf
 * @param  {string}  username The username to get the value
 * @return {boolean} True if it is enabled.
 */
function getAutoDndOffLoginConf(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return userSettings[username][USER_CONFIG_KEYS.auto_dndoff_login];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Saves the automatic queue login when user login to cti.
 *
 * @method setQueueAutoLoginConf
 * @param {string}   username The username to set the automatic queue login
 * @param {boolean}  enable   The enable value: true if it is to enable
 * @param {function} cb       The callback function
 */
function setQueueAutoLoginConf(username, enable, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof enable !== 'boolean' || typeof cb !== 'function') {

      throw new Error('wrong parameters');
    }

    // save the setting into the database
    compDbconn.saveUserAutoQueueLogin({
      username: username,
      enable: enable
    }, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'saving setting "auto queue login: ' + enable + '" for user "' + username + '"');
          cb(err);
        } else {
          // update the configuration in mem
          userSettings[username][USER_CONFIG_KEYS.queue_auto_login] = enable;
          cb(null);
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err.stack);
  }
}

/**
 * Returns the automatic queue login value of the user.
 *
 * @method getQueueAutoLoginConf
 * @param  {string}  username The username to get the value
 * @return {boolean} True if it is enabled.
 */
function getQueueAutoLoginConf(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return userSettings[username][USER_CONFIG_KEYS.queue_auto_login];

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Checks the user voicemail notification configurations and returns true if he
 * wants to receives the voicemail notification by the specified delivery method.
 *
 * @method verifySendVoicemailNotification
 * @param  {string}  username       The username identifier
 * @param  {string}  deliveryMethod The delivery method, e.g. email or sms
 * @return {boolean} True if the user wants to receive the voicemail notification
 *                   by the specified delivery method.
 */
function verifySendVoicemailNotification(username, deliveryMethod) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof deliveryMethod !== 'string') {
      throw new Error('wrong parameters');
    }

    // check the configurations of the user
    if (typeof userSettings !== 'object' || typeof userSettings[username] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail[deliveryMethod] !== 'object') {

      logger.warn(IDLOG, 'checking if send voicemail notification by "' + deliveryMethod + '" for user "' + username + '": ' +
        'wrong notification configurations');
      return false;
    }

    var when = userSettings[username][USER_CONFIG_KEYS.notifications].voicemail[deliveryMethod].when;

    if (when === NOTIF_WHEN.always) {
      return true;
    } else if (when === NOTIF_WHEN.never) {
      return false;
    } else if (when === NOTIF_WHEN.offline) {
      // check if the user is logged into the cti (desktop & mobile) and returns true only
      // in the case he is logged out from both
      if (!compUser.isDesktopLoggedIn(username) && !compUser.isMobileLoggedIn(username)) {
        return true;
      }
    } else {
      logger.warn(IDLOG, 'checking if send voicemail notification by "' + deliveryMethod + '" for user "' + username + '": ' +
        'wrong "when" value "' + when + '"');
      return false;
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Checks the user post-it notification configurations and returns true if he
 * wants to receives the new post-it notification by the specified delivery method.
 *
 * @method verifySendPostitNotification
 * @param  {string}  username       The username identifier
 * @param  {string}  deliveryMethod The delivery method, e.g. email or sms
 * @return {boolean} True if the user wants to receive the new post-it notification by the specified delivery method.
 */
function verifySendPostitNotification(username, deliveryMethod) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof deliveryMethod !== 'string') {
      throw new Error('wrong parameters');
    }

    // check the configurations of the user
    if (typeof userSettings !== 'object' || typeof userSettings[username] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit[deliveryMethod] !== 'object') {

      logger.warn(IDLOG, 'checking if send new post-it notification by "' + deliveryMethod + '" for user "' + username + '": ' +
        'wrong notification configurations');
      return false;
    }

    var when = userSettings[username][USER_CONFIG_KEYS.notifications].postit[deliveryMethod].when;

    if (when === NOTIF_WHEN.always) {
      return true;
    } else if (when === NOTIF_WHEN.never) {
      return false;
    } else if (when === NOTIF_WHEN.offline) {
      // check if the user is logged into the cti (desktop & mobile) and returns true only
      // in the case he is logged out from both
      if (!compUser.isDesktopLoggedIn(username) && !compUser.isMobileLoggedIn(username)) {
        return true;
      }
    } else {
      logger.warn(IDLOG, 'checking if send new post-it notification by "' + deliveryMethod + '" for user "' + username + '": ' +
        'wrong "when" value "' + when + '"');
      return false;
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Checks the user voicemail notification configurations and returns true if he
 * wants to receives the voicemail notification by email.
 *
 * @method verifySendVoicemailNotificationByEmail
 * @param  {string}  username The username identifier
 * @return {boolean} True if the user wants to receive the voicemail notification by email
 */
function verifySendVoicemailNotificationByEmail(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return verifySendVoicemailNotification(username, 'email');

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Checks the user post-it notification configurations and returns true if he
 * wants to receives the new post-it notification by email.
 *
 * @method verifySendPostitNotificationByEmail
 * @param  {string}  username The username identifier
 * @return {boolean} True if the user wants to receive the new post-it notification by email
 */
function verifySendPostitNotificationByEmail(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return verifySendPostitNotification(username, 'email');

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Checks the user voicemail notification configurations and returns true if he
 * wants to receives the voicemail notification by sms.
 *
 * @method verifySendVoicemailNotificationBySms
 * @param  {string}  username The username identifier
 * @return {boolean} True if the user wants to receive the voicemail notification by sms
 */
function verifySendVoicemailNotificationBySms(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return verifySendVoicemailNotification(username, 'sms');

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Checks the user post-it notification configurations and returns true if he
 * wants to receives the new post-it notification by sms.
 *
 * @method verifySendPostitNotificationBySms
 * @param  {string}  username The username identifier
 * @return {boolean} True if the user wants to receive the new post-it notification by sms
 */
function verifySendPostitNotificationBySms(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return verifySendPostitNotification(username, 'sms');

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Returns the destination email address for the voicemail notification of the user.
 *
 * @method getVoicemailNotificationEmailTo
 * @param  {string} username The username identifier
 * @return {string} The destination email address.
 */
function getVoicemailNotificationEmailTo(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the configurations of the user
    if (typeof userSettings !== 'object' || typeof userSettings[username] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail.email !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail.email.to !== 'string') {

      logger.warn(IDLOG, 'getting email destination for voicemail notification of user "' + username + '": wrong configurations');
      return '';
    }
    return userSettings[username][USER_CONFIG_KEYS.notifications].voicemail.email.to;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Returns the destination email address for the new post-it notification of the user.
 *
 * @method getPostitNotificationEmailTo
 * @param  {string} username The username identifier
 * @return {string} The destination email address.
 */
function getPostitNotificationEmailTo(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the configurations of the user
    if (typeof userSettings !== 'object' || typeof userSettings[username] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit.email !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit.email.to !== 'string') {

      logger.warn(IDLOG, 'getting email destination for new post-it notification of user "' + username + '": wrong configurations');
      return '';
    }
    return userSettings[username][USER_CONFIG_KEYS.notifications].postit.email.to;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Returns the destination sms number for the voicemail notification of the user.
 *
 * @method getVoicemailNotificationSmsTo
 * @param  {string} username The username identifier
 * @return {string} The destination sms number.
 */
function getVoicemailNotificationSmsTo(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the configurations of the user
    if (typeof userSettings !== 'object' || typeof userSettings[username] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail.sms !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].voicemail.sms.to !== 'string') {

      logger.warn(IDLOG, 'getting sms destination number for voicemail notification of user "' + username + '": wrong configurations');
      return '';
    }
    return userSettings[username][USER_CONFIG_KEYS.notifications].voicemail.sms.to;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Returns the destination sms number for the post-it notification of the user.
 *
 * @method getPostitNotificationSmsTo
 * @param  {string} username The username identifier
 * @return {string} The destination sms number.
 */
function getPostitNotificationSmsTo(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the configurations of the user
    if (typeof userSettings !== 'object' || typeof userSettings[username] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications] !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit.sms !== 'object' || typeof userSettings[username][USER_CONFIG_KEYS.notifications].postit.sms.to !== 'string') {

      logger.warn(IDLOG, 'getting sms destination number for post-it notification of user "' + username + '": wrong configurations');
      return '';
    }
    return userSettings[username][USER_CONFIG_KEYS.notifications].postit.sms.to;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return '';
  }
}

// public interface
exports.config = config;
exports.setLogger = setLogger;
exports.configUser = configUser;
exports.configChat = configChat;
exports.getChatConf = getChatConf;
exports.setCompUser = setCompUser;
exports.setCompDbconn = setCompDbconn;
exports.getTotNumUsers = getTotNumUsers;
exports.getUserSettings = getUserSettings;
exports.setCompAstProxy = setCompAstProxy;
exports.configPhoneUrls = configPhoneUrls;
exports.getServerHostname = getServerHostname;
exports.setCompComNethctiWs = setCompComNethctiWs;
exports.getCallUrlFromAgent = getCallUrlFromAgent;
exports.phoneSupportHttpApi = phoneSupportHttpApi;
exports.getUserEndpointsJSON = getUserEndpointsJSON;
exports.setUserNotifySetting = setUserNotifySetting;
exports.getAnswerUrlFromAgent = getAnswerUrlFromAgent;
exports.getQueueAutoLoginConf = getQueueAutoLoginConf;
exports.setQueueAutoLoginConf = setQueueAutoLoginConf;
exports.setAutoDndOffLoginConf = setAutoDndOffLoginConf;
exports.setAutoDndOnLogoutConf = setAutoDndOnLogoutConf;
exports.getQueueAutoLogoutConf = getQueueAutoLogoutConf;
exports.setQueueAutoLogoutConf = setQueueAutoLogoutConf;
exports.getAutoDndOffLoginConf = getAutoDndOffLoginConf;
exports.getAutoDndOnLogoutConf = getAutoDndOnLogoutConf;
exports.getAllUserEndpointsJSON = getAllUserEndpointsJSON;
exports.getHoldUnholdUrlFromAgent = getHoldUnholdUrlFromAgent;
exports.getPostitNotificationSmsTo = getPostitNotificationSmsTo;
exports.setDefaultUserExtensionConf = setDefaultUserExtensionConf;
exports.getDefaultUserExtensionConf = getDefaultUserExtensionConf;
exports.getPostitNotificationEmailTo = getPostitNotificationEmailTo;
exports.getVoicemailNotificationSmsTo = getVoicemailNotificationSmsTo;
exports.getVoicemailNotificationEmailTo = getVoicemailNotificationEmailTo;
exports.verifySendPostitNotificationBySms = verifySendPostitNotificationBySms;
exports.verifySendPostitNotificationByEmail = verifySendPostitNotificationByEmail;
exports.verifySendVoicemailNotificationBySms = verifySendVoicemailNotificationBySms;
exports.verifySendVoicemailNotificationByEmail = verifySendVoicemailNotificationByEmail;
