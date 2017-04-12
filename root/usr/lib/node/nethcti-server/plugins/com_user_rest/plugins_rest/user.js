/**
 * Provides user functions through REST API.
 *
 * @module com_user_rest
 * @submodule plugins_rest
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [plugins_rest/user]
 */
var IDLOG = '[plugins_rest/user]';

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
 * The architect component to be used for authorization.
 *
 * @property compAuthorization
 * @type object
 * @private
 */
var compAuthorization;

/**
 * The configuration manager architect component.
 *
 * @property compConfigManager
 * @type object
 * @private
 */
var compConfigManager;

/**
 * The architect component to be used for user functions.
 *
 * @property compUser
 * @type object
 * @private
 */
var compUser;

/**
 * The utility architect component.
 *
 * @property compUtil
 * @type object
 * @private
 */
var compUtil;

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
 * Set user architect component used for user functions.
 *
 * @method setCompUser
 * @param {object} comp The user architect component.
 */
function setCompUser(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong parameter');
    }

    compUser = comp;
    logger.info(IDLOG, 'set user architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set authorization architect component.
 *
 * @method setCompAuthorization
 * @param {object} ca The authorization architect component.
 */
function setCompAuthorization(ca) {
  try {
    compAuthorization = ca;
    logger.info(IDLOG, 'set authorization architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Sets the utility architect component.
 *
 * @method setCompUtil
 * @param {object} comp The utility architect component.
 */
function setCompUtil(comp) {
  try {
    compUtil = comp;
    logger.info(IDLOG, 'set util architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

(function() {
  try {
    /**
     * REST plugin that provides user functions through the following REST API:
     *
     * # GET requests
     *
     * 1. [`user/presencelist`](#presencelistget)
     * 1. [`user/presence`](#presenceget)
     * 1. [`user/me`](#meget)
     * 1. [`user/all/endpoints`](#userallendpointsget)
     *
     * ---
     *
     * ### <a id="presencelistget">**`user/presencelist`**</a>
     *
     * Returns the list of the possible user presence status.
     *
     * Example JSON response:
     *
     *     ["online", "dnd", "voicemail", "cellphone"]
     *
     * ---
     *
     * ### <a id="presenceget">**`user/presence`**</a>
     *
     * Returns the user presence status.
     *
     * Example JSON response:
     *
     *     { "status": "online" }
     *
     * ---
     *
     * ### <a id="meget">**`user/me`**</a>
     *
     * Returns the information about the user.
     *
     * Example JSON response:
     *
     *      {
        "presence": "online",
        "name": "user admin",
        "username": "user",
        "endpoints": {
          "email": [
            {
              "id": "user@nethesis.it"
            }
          ],
          "extension": [
            {
              "id": "91301",
              "description": "Yealink SIP-T22P 7.73.0.50",
              "type": "physical",
              "web_user": "admin",
              "web_password": "admin"
            },
            {
              "id": "92301",
              "description": "janus",
              "type": "webrtc",
              "secret": "password"
            },
            {
              "id": "92304",
              "description": "janus",
              "type": "webrtc_mobile",
              "secret": "password"
            }
          ],
          "cellphone": [
            {
              "id": "1234567890"
            }
          ],
          "voicemail": [
            {
              "id": "301"
            }
          ],
          "mainextension": [
            {
              "id": "301",
              "description": "Yealink SIP-T22P 7.73.0.50"
            }
          ]
        }
      }
     *
     * ---
     *
     * ### <a id="userallendpointsget">**`user/all/endpoints`**</a>
     *
     * Returns the information about all users endpoints.
     *
     * <br>
     *
     * # POST requests
     *
     * 1. [`user/presence`](#presencepost)
     * 1. [`user/default_device`](#default_devicepost)
     *
     * ---
     *
     * ### <a id="#presencepost">**`user/presence`**</a>
     *
     * Set the user presence status. The request must contain the following parameters:
     *
     * * `status: valid status obtained by GET user/presencelist`
     *
     * Example JSON request parameters:
     *
     *     { "status": "online" }
     *
     * ---
     *
     * ### <a id="#default_devicepost">**`user/default_device`**</a>
     *
     * Set the user default device to be used for call operations. The request must contain the following parameters:
     *
     * * `id: the extension identifier`
     *
     * Example JSON request parameters:
     *
     *     { "id": "214" }
     *
     * @class plugin_rest_user
     * @static
     */
    var user = {

      // the REST api
      api: {
        'root': 'user',

        /**
         * REST API to be requested using HTTP GET request.
         *
         * @property get
         * @type {array}
         *
         *   @param {string} me To get the user information
         *   @param {string} presence To get the user presence status
         *   @param {string} presencelist To get the list of possible presence status
         */
        'get': [
          'me',
          'presence',
          'presencelist',
          'endpoints/all'
        ],

        /**
         * REST API to be requested using HTTP POST request.
         *
         * @property post
         * @type {array}
         *
         *   @param {string} presence Set a presence status for the user
         *   @param {string} default_device Set a default extension for the user
         */
        'post': [
          'presence',
          'default_device'
        ],
        'head': [],
        'del': []
      },

      /**
       * Get the information about the user by the following REST API:
       *
       *     me
       *
       * @method me
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      me: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var result = compUser.getUserInfoJSON(username);
          result.profile = compAuthorization.getUserProfileJSON(username);

          if (typeof result === 'object') {

            var defExt = compConfigManager.getDefaultUserExtensionConf(username);
            var i, defextObj;

            // create default_device key to return with result
            for (i = 0; i < result.endpoints[compUser.ENDPOINT_TYPES.extension].length; i++) {
              if (result.endpoints[compUser.ENDPOINT_TYPES.extension][i].id === defExt) {
                defextObj = result.endpoints[compUser.ENDPOINT_TYPES.extension][i];
                break;
              }
            }
            for (i = 0; i < result.endpoints[compUser.ENDPOINT_TYPES.mainextension].length; i++) {
              if (result.endpoints[compUser.ENDPOINT_TYPES.mainextension][i].id === defExt) {
                defextObj = result.endpoints[compUser.ENDPOINT_TYPES.extension][i];
                break;
              }
            }
            result.default_device = defextObj;
            logger.info(IDLOG, 'send user info to user "' + username + '"');
            res.send(200, result);
          } else {
            var strerr = 'sending user info to user "' + username + '": wrong format';
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);
          }
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Get all endpoints by the following REST API:
       *
       *     endpoints
       *
       * @method endpoints
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      endpoints: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = compUser.getAllUsersEndpointsJSON();

          logger.info(IDLOG, 'send endpoints to user "' + username + '"');
          res.send(200, results);
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Get the list of possible presence status by the following REST API:
       *
       *     presencelist
       *
       * @method presencelist
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      presencelist: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = compUser.getPresenceList(username);
          if (results instanceof Array) {
            logger.info(IDLOG, 'send user presence list to user "' + username + '"');
            res.send(200, results);
          } else {
            var strerr = 'sending user presence list to user "' + username + '": wrong format';
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);
          }
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Manages GET and POST requests to get/set the status presence of
       * the user with the following REST API:
       *
       *     GET  presence
       *     POST presence
       *
       * @method presence
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      presence: function(req, res, next) {
        try {
          if (req.method.toLowerCase() === 'get') {
            presenceGet(req, res, next);
          } else if (req.method.toLowerCase() === 'post') {
            presenceSet(req, res, next);
          } else {
            logger.warn(IDLOG, 'unknown requested method ' + req.method);
          }
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Set the default extension for the user by the following REST API:
       *
       *     default_device
       *
       * @method default_device
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      default_device: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          if (typeof req.params.id !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
          }

          compConfigManager.setDefaultUserExtensionConf(username, req.params.id, function(err) {
            try {
              if (err) {
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
              } else {
                compUtil.net.sendHttp200(IDLOG, res);
              }

            } catch (error) {
              logger.error(IDLOG, error.stack);
              compUtil.net.sendHttp500(IDLOG, res, error.toString());
            }
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }
    };
    exports.api = user.api;
    exports.me = user.me;
    exports.endpoints = user.endpoints;
    exports.presence = user.presence;
    exports.setLogger = setLogger;
    exports.setCompUtil = setCompUtil;
    exports.setCompUser = setCompUser;
    exports.presencelist = user.presencelist;
    exports.default_device = user.default_device;
    exports.setCompAuthorization = setCompAuthorization;
    exports.setCompConfigManager = setCompConfigManager;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
})();

/**
 * Set configuration manager architect component.
 *
 * @method setCompConfigManager
 * @param {object} comp The configuration manager architect component.
 */
function setCompConfigManager(comp) {
  try {
    compConfigManager = comp;
    logger.info(IDLOG, 'set configuration manager architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Get the user presence status.
 *
 * @method presenceGet
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next
 */
function presenceGet(req, res, next) {
  try {
    var username = req.headers.authorization_user;
    var status = compUser.getPresence(username);

    logger.info(IDLOG, 'send presence status "' + status + '" to user "' + username + '"');
    res.send(200, {
      status: status
    });
  } catch (error) {
    logger.error(IDLOG, error.stack);
    compUtil.net.sendHttp500(IDLOG, res, error.toString());
  }
}

/**
 * Set the user presence status.
 *
 * @method presenceSet
 * @param {object} req The request object
 * @param {object} res The response object
 * @param {object} next
 */
function presenceSet(req, res, next) {
  try {
    var status = req.params.status;
    var username = req.headers.authorization_user;

    if (!compUser.isValidUserPresence(status)) {
      compUtil.net.sendHttp400(IDLOG, res);
      return;
    }

    compUser.setPresence(username, status, function(err) {
      try {
        if (err) {
          logger.error(IDLOG, 'setting presence "' + status + '" to user "' + username + '"');
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
          return;
        }
        logger.info(IDLOG, 'presence "' + status + '" has been set successfully to user "' + username + '" ');
        compUtil.net.sendHttp200(IDLOG, res);

      } catch (err1) {
        logger.error(IDLOG, err1.stack);
        compUtil.net.sendHttp500(IDLOG, res, err1.toString());
      }
    });
  } catch (error) {
    logger.error(IDLOG, error.stack);
    compUtil.net.sendHttp500(IDLOG, res, error.toString());
  }
}
