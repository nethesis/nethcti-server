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
          "webrtc": [
            {
              "id": "98301",
              "secret": "xyz"
            }
          ],
          "extension": [
            {
              "id": "91301"
            },
            {
              "id": "92301"
            },
            {
              "id": "93301"
            },
            {
              "id": "94301"
            },
            {
              "id": "95301"
            },
            {
              "id": "96301"
            },
            {
              "id": "97301"
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
          "webrtc_mobile": [
            {
              "id": "99301",
              "secret": "xyz"
            }
          ],
          "mainextension": [
            {
              "id": "301"
            }
          ]
        }
      }
     *
     * <br>
     *
     * # POST requests
     *
     * 1. [`user/presence`](#presencepost)
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
          'presencelist'
        ],

        /**
         * REST API to be requested using HTTP POST request.
         *
         * @property post
         * @type {array}
         *
         *   @param {string} presence Set a presence status for the user
         */
        'post': [
          'presence'
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
          var results = compUser.getUserInfo(username);
          if (typeof results === 'object') {
            logger.info(IDLOG, 'send user info to user "' + username + '"');
            res.send(200, results);
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
          var results = compUser.getPresenceListJSON();
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
      }
    };
    exports.api = user.api;
    exports.me = user.me;
    exports.presence = user.presence;
    exports.setLogger = setLogger;
    exports.setCompUtil = setCompUtil;
    exports.setCompUser = setCompUser;
    exports.presencelist = user.presencelist;
    exports.setCompAuthorization = setCompAuthorization;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
})();

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
