/**
 * Provides database connection functions through REST API.
 *
 * @module com_dbconn_rest
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
 * @default [plugins_rest/dbconn]
 */
var IDLOG = '[plugins_rest/dbconn]';

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
 * The dbconn architect component used for dbconn functions.
 *
 * @property compDbConn
 * @type object
 * @private
 */
var compDbConn;

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
    if (typeof log === 'object' && typeof log.info === 'function' &&
      typeof log.warn === 'function' && typeof log.error === 'function') {

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
 * Set dbconn architect component used by dbconn functions.
 *
 * @method setCompDbConn
 * @param {object} cp The dbconn architect component.
 */
function setCompDbConn(cp) {
  try {
    compDbConn = cp;
    logger.info(IDLOG, 'set dbconn architect component');
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
    * REST plugin that provides database connection functions through the following REST API:
    *
    * # POST requests
    *
    * 1. [`dbconn/test`](#testpost)
    *
    * ---
    *
    * ### <a id="testpost">**`dbconn/test`**</a>
    *
    * Test a connection to a database.
    *
    * Example of the body of the request:
    *
    *  {
    *    "host":"localhost",
    *    "port": "1433",
    *    "type": "mssql:7_3_A",
    *    "user": "testuser",
    *    "pass": "testpass",
    *    "name": "test"
    *  }
    *
    * ---
    *
    * @class plugin_rest_dbconn
    * @static
    */
    var dbconn = {
      // the REST api
      api: {
        'root': 'dbconn',

        /**
         * REST API to be requested using HTTP GET request.
         *
         * @property post
         * @type {array}
         *
         *   @param {object} connection parameters
         */
        'post': [
          'test',
        ]
      },

      /**
       * Test a database connections with the following REST API:
       *
       *     test
       *
       * @method test
       * @param {object} req The client request.
       * @param {object} res The client response.
       * @param {function} next Function to run the next handler in the chain.
       */
      test: function(req, res, next) {
        try {
          var params = req.body;

          compDbConn.testConnection(params.host, params.port, params.type,
            params.user, params.pass, params.name, function(err) {
              if (err) {
                res.send(503);
              } else {
                res.send(200);
              }
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }

    };

    exports.api = dbconn.api;
    exports.test = dbconn.test;
    exports.setLogger = setLogger;
    exports.setCompUtil = setCompUtil;
    exports.setCompDbConn = setCompDbConn;
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
})();