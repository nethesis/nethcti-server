/**
 * Provides authentication functions.
 *
 * @module dbconn
 * @submodule plugins
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [plugins/dbconn_auth]
 */
const IDLOG = '[plugins/dbconn_auth]';

/**
 * The logger. It must have at least three methods: _info, warn and error._
 *
 * @property logger
 * @type object
 * @private
 * @default console
 */
let logger = console;

/**
 * The exported apis.
 *
 * @property apiList
 * @type object
 */
let apiList = {};

/**
 * The main architect dbconn component.
 *
 * @property compDbconnMain
 * @type object
 * @private
 */
let compDbconnMain;

/**
 * Set the main dbconn architect component.
 *
 * @method setCompDbconnMain
 * @param {object} comp The architect main dbconn component
 * @static
 */
function setCompDbconnMain(comp) {
  try {
    if (typeof comp !== 'object') {
      throw new Error('wrong parameter');
    }
    compDbconnMain = comp;
    logger.log.info(IDLOG, 'main dbconn component has been set');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

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
 * Save an authentication token overwriting if it is already present.
 * The `id` of the database will be incremented.
 *
 * @method saveAuthToken
 * @param {object} data
 *   @param {string} data.user The username
 *   @param {string} data.token The authentication token
 * @param {function} cb The callback function
 */
function saveAuthToken(data, cb) {
  try {
    let query = 'REPLACE INTO `auth` (`user`, `token`) VALUES (?,?)';
    compDbconnMain.dbConn['auth'].query(
      query,
      [data.user, data.token],
      (err, results, fields) => {
      try {
        if (err) {
          logger.log.error(IDLOG, `saving auth token: ${err.toString()}`);
          cb(err.toString());
          return;
        }
        logger.log.info(IDLOG, 'auth token saved successfully');
        cb();
      } catch (error) {
        logger.log.error(IDLOG, error.stack);
        cb(error);
      }
    });
    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Returns all the authentication tokens.
 *
 * @method getAllTokens
 * @param {function} cb The callback function
 */
function getAllTokens(cb) {
  try {
    let query = 'SELECT * FROM `auth`';
    compDbconnMain.dbConn['auth'].query(
      query,
      (err, results, fields) => {
      try {
        if (err) {
          logger.log.error(IDLOG, `getting all auth tokens failed: ${err.toString()}`);
          cb(err.toString());
          return;
        }
        logger.log.info(IDLOG, `get #${results.length} auth tokens`);
        cb(null, results);
      } catch (error) {
        logger.log.error(IDLOG, error.stack);
        cb(error);
      }
    });
    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

apiList.getAllTokens = getAllTokens;
apiList.saveAuthToken = saveAuthToken;
exports.apiList = apiList;
exports.setLogger = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
