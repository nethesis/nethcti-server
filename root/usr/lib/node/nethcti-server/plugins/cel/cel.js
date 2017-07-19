/**
 * Provides the cel (Channel Event Logging) functions.
 *
 * @module cel
 * @main arch_cel
 */

/**
 * Provides the cel (Channel Event Logging) functions.
 *
 * @class cel
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
 * @default [cel]
 */
var IDLOG = '[cel]';

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
 * The architect component to be used for database.
 *
 * @property compDbconn
 * @type object
 * @private
 */
var compDbconn;

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
 * Get call trace from linkedid.
 *
 * @method getCallTrace
 * @param {string}   linkedid   The call identifier
 * @param {string}   privacyStr The privacy string to be used to hide the phone numbers. It can be undefined
 * @param {function} cb         The callback function
 */
function getCallTrace(linkedid, privacyStr, cb) {
  try {
    // check parameters
    if (typeof linkedid !== 'string' || typeof cb !== 'function' || (typeof privacyStr !== 'string' && privacyStr !== undefined)) {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    logger.log.info(IDLOG, 'search cel for linkedid "' + linkedid + '"');
    compDbconn.getCallTrace(linkedid, privacyStr, cb);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Get call information from uniqueid.
 *
 * @method getCallInfo
 * @param {string}   uniqueid   The call identifier
 * @param {string}   privacyStr The privacy string to be used to hide the phone numbers. It can be undefined
 * @param {function} cb         The callback function
 */
function getCallInfo(uniqueid, privacyStr, cb) {
  try {
    // check parameters
    if (typeof uniqueid !== 'string' ||
      typeof cb !== 'function' ||
      (typeof privacyStr !== 'string' && privacyStr !== undefined)) {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    logger.log.info(IDLOG, 'search cel for uniqueid "' + uniqueid + '"');
    compDbconn.getCallInfo(uniqueid, privacyStr, cb);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}


/**
 * Sets the database architect component.
 *
 * @method setCompDbconn
 * @param {object} comp The database architect component.
 */
function setCompDbconn(comp) {
  try {
    compDbconn = comp;
    logger.log.info(IDLOG, 'set database architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

// public interface
exports.setLogger = setLogger;
exports.getCallInfo = getCallInfo;
exports.getCallTrace = getCallTrace;
exports.setCompDbconn = setCompDbconn;
