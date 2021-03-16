/**
 * Provides videoconf functions through REST API.
 *
 * @module com_videoconf_rest
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
 * @default [plugins_rest/videoconf]
 */
var IDLOG = '[plugins_rest/videoconf]';

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
 * The videoconf architect component used for videoconf functions.
 *
 * @property compVideoconf
 * @type object
 * @private
 */
var compVideoconf;

/**
 * The user architect component used for videoconf functions.
 *
 * @property compUser
 * @type object
 * @private
 */
var compUser;

/**
 * The architect component to be used for authorization.
 *
 * @property compAuthorization
 * @type object
 * @private
 */
var compAuthorization;

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
    if (typeof log === 'object' && typeof log.log.info === 'function' && typeof log.log.warn === 'function' && typeof log.log.error === 'function') {

      logger = log;
      logger.log.info(IDLOG, 'new logger has been set');

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Set videoconf architect component used by videoconf functions.
 *
 * @method setCompVideoconf
 * @param {object} cp The videoconf architect component.
 */
function setCompVideoconf(cp) {
  try {
    compVideoconf = cp;
    logger.log.info(IDLOG, 'set videoconf architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Set user architect component used by videoconf functions.
 *
 * @method setCompUser
 * @param {object} cp The user architect component.
 */
function setCompUser(cp) {
  try {
    compUser = cp;
    logger.log.info(IDLOG, 'set user architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Set the authorization architect component.
 *
 * @method setCompAuthorization
 * @param {object} comp The architect authorization component
 * @static
 */
function setCompAuthorization(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong parameter');
    }

    compAuthorization = comp;
    logger.log.info(IDLOG, 'authorization component has been set');

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.info(IDLOG, 'set util architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

(function() {
  try {
    /**
    * REST plugin that provides videoconf functions through the following REST API:
    *
    *
    * # POST requests
    *
    * 1. [`videoconf/newroom`](#newroompost)
    *
    * ---
    *
    * ### <a id="newroompost">**`videoconf/newroom`**</a>
    *
    * Creates a new room in the NethCTI videoconf. The members to be invited have to be
    * specified in the POST request in JSON format:
    *
    * * `members`: the list of the members to be invited
    *
    * Example JSON request parameters:
    *
    *     { "members": { "john": { "email": "john@john.com" }, ... } }
    *
    * 
    * @class plugin_rest_videoconf
    * @static
    */
    var videoconf = {
      // the REST api
      api: {
        'root': 'videoconf',
        'get': [],
        /**
         * REST API to be requested using HTTP POST request.
         *
         * @property post
         * @type {array}
         *
         *   @param {string} newroom Creates a room
         */
        'post': [
          'newroom'
        ],
        'head': [],
        'del': []
      },
      /**
       * Create a room in the videoconf platform with the following REST API:
       *
       *     create
       *
       * @method newroom
       * @param {object} req The client request
       * @param {object} res The client response
       * @param {function} next Function to run the next handler in the chain
       */
      newroom: function(req, res, next) {
        try {
          const data = req.params;
          if (typeof data !== 'object' || typeof data.members !== 'object') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
          }
          const username = req.headers.authorization_user;
          if (compAuthorization.authorizeVideoconf(username) === false) {
            logger.log.warn(IDLOG, 'creating new video conf room: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
          }
          const name = compUser.getUserInfoJSON(username).name || 'unknown';
          const result = compVideoconf.getNewRoomUrl(username, name);
          if (result === null) {
            logger.log.warn(IDLOG, 'no vc room URL configured: send null to "' + username + '"');
          } else {
            logger.log.info(IDLOG, 'new URL for vc room (' + result.url + ') craeted for user "' + username + '"');
          }
          res.send(200, result);
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }
    };
    exports.api = videoconf.api;
    exports.newroom = videoconf.newroom;
    exports.setLogger = setLogger;
    exports.setCompUtil = setCompUtil;
    exports.setCompVideoconf = setCompVideoconf;
    exports.setCompUser = setCompUser;
    exports.setCompAuthorization = setCompAuthorization;
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
})();