/**
 * Provides the functions to get the asterisk CEL information
 * call of all endpoints through REST API.
 *
 * @module com_history_rest
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
 * @default [plugins_rest/cel]
 */
var IDLOG = '[plugins_rest/cel]';

/**
 * The string used to hide phone numbers in privacy mode.
 *
 * @property privacyStrReplace
 * @type {string}
 * @private
 * @default "xxx"
 */
var privacyStrReplace = 'xxx';

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
 * The utility architect component.
 *
 * @property compUtil
 * @type object
 * @private
 */
var compUtil;

/**
 * The architect component to be used for authorization.
 *
 * @property compAuthorization
 * @type object
 * @private
 */
var compAuthorization;

/**
 * The CEL architect component used for CEL functions.
 *
 * @property compCel
 * @type object
 * @private
 */
var compCel;

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
 * Set cel architect component used by cel functions.
 *
 * @method setCompHistory
 * @param {object} ch The history architect component.
 */
function setCompCel(comp) {
  try {
    compCel = comp;
    logger.info(IDLOG, 'set cel architect component');
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

/**
 * Set authorization architect component used by history functions.
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

(function() {
  try {
    /**
        * REST plugin that provides switchboard history functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`cel/calltrace/:linkedid`](#calltraceget)
        * 1. [`cel/callinfo/:uniqueid`](#callinfoget)
        *
        * ---
        *
        * ### <a id="calltraceget">**`cel/calltrace/:linkedid`**</a>
        *
        * Returns a call trace of the given linkedid.
        * If an error occurs an HTTP 500 response is returned.
        *
        * Example JSON response:
        *
        *     [
         {
            eventtype: "CHAN_START"
            eventtime: "2014-01-20T11:51:14.000Z"
            context: "from-internal"
            channame: "SIP/209-0000001a"
            exten: "214"
            accountcode: "209"
            cid: "nome209 209"
         }
     ]
        *
        * ---
        *
        * ### <a id="callinfoget">**`cel/callinfo/:uniqueid`**</a>
        *
        * Returns call information of the given uniqueid
        * If an error occurs an HTTP 500 response is returned.
        *
        * Example JSON response:
        *
        *     [
         {
            eventtype: "CHAN_START"
            eventtime: "2014-01-20T11:51:14.000Z"
            context: "from-internal"
            channame: "SIP/209-0000001a"
            exten: "214"
            accountcode: "209"
            cid: "nome209 209"
         }
     ]
        *
        * @class plugin_rest_cel
        * @static
        */
    var cel = {

      // the REST api
      api: {
        'root': 'cel',

        /**
         * REST API to be requested using HTTP GET request.
         *
         * @property get
         * @type {array}
         *
         *   @param {string} cel/calltrace/:linkedid To get the call trace associated with the linkedid
         *   @param {string} cel/callinfo/:uniqueid  To get call information associated with the unqueid
         *
         */
        'get': [
          'calltrace/:linkedid',
          'callinfo/:uniqueid'
        ],
        'post': [],
        'head': [],
        'del': []
      },

      /**
       * Returns a call trace of the given linkedid using the following REST api:
       *
       *     calltrace/:linkedid
       *
       * @method calltrace
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      calltrace: function(req, res, next) {
        try {
          // get the username from the authorization header added by authentication step
          var username = req.headers.authorization_user;

          // check the switchboard cdr authorization
          if (compAuthorization.authorizeAdminCdrUser(username) === false) {
            logger.warn(IDLOG, 'switchboard cdr authorization failed for user "' + username + '"!');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
          }

          logger.info(IDLOG, 'switchboard cdr authorization successfully for user "' + username + '"');

          var linkedid = req.params.linkedid;

          // if the user has the privacy enabled, it adds the privacy string to be used to hide the phone numbers
          var privacyStr;
          if (compAuthorization.isPrivacyEnabled(username)) {
            privacyStr = privacyStrReplace;
          }

          // use the history component
          compCel.getCallTrace(linkedid, privacyStr, function(err, results) {

            if (err) {
              compUtil.net.sendHttp500(IDLOG, res, err.toString());
            } else {
              logger.info(IDLOG, 'send ' + results.length + ' results searching CEL to user "' + username + '"');
              res.send(200, results);
            }
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Returns call information of given uniqueid using the following REST api:
       *
       *     callinfo/:linkedid
       *
       * @method callinfo
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      callinfo: function(req, res, next) {
        try {
          // get the username from the authorization header added by authentication step
          var username = req.headers.authorization_user;

          // check the switchboard cdr authorization
          if (compAuthorization.authorizeAdminCdrUser(username) === false) {
            logger.warn(IDLOG, 'switchboard cdr authorization failed for user "' + username + '"!');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
          }

          logger.info(IDLOG, 'switchboard cdr authorization successfully for user "' + username + '"');

          var uniqueid = req.params.uniqueid;

          // if the user has the privacy enabled, it adds the privacy string to be used to hide the phone numbers
          var privacyStr;
          if (compAuthorization.isPrivacyEnabled(username)) {
            privacyStr = privacyStrReplace;
          }

          // use the history component
          compCel.getCallInfo(uniqueid, privacyStr, function(err, results) {

            if (err) {
              compUtil.net.sendHttp500(IDLOG, res, err.toString());
            } else {
              logger.info(IDLOG, 'send ' + results.length + ' results searching CEL to user "' + username + '"');
              res.send(200, results);
            }
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }
    };

    exports.api = cel.api;
    exports.callinfo = cel.callinfo;
    exports.calltrace = cel.calltrace;
    exports.setLogger = setLogger;
    exports.setPrivacy = setPrivacy;
    exports.setCompCel = setCompCel;
    exports.setCompUtil = setCompUtil;
    exports.setCompAuthorization = setCompAuthorization;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
})();

/**
 * Sets the string to be used to hide last digits of phone numbers in privacy mode.
 *
 * @method setPrivacy
 * @param {object} str The string used to hide last digits of phone numbers.
 */
function setPrivacy(str) {
  try {
    privacyStrReplace = str;
    logger.info(IDLOG, 'set privacy with string ' + privacyStrReplace);
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}
