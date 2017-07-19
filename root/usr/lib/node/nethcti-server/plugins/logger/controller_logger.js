/**
 * Provides logger functions.
 *
 * @module logger
 */

/**
 * The architect module that offers the logger.
 *
 * @class arch_logger
 */
var fs = require('fs');
var moment = require('moment');
var winston = require('winston');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [logger]
 */
var IDLOG = '[logger]';

/**
 * The path of the JSON configuration file.
 *
 * @property PATH
 * @type {string}
 * @private
 * @final
 * @readOnly
 * @default "/etc/nethcti/nethcti.json"
 */
var PATH = '/etc/nethcti/nethcti.json';

/**
 * The logger to be used by other components.
 *
 * @property ctilog
 * @type {object}
 * @static
 * @default {}
 */
var ctilog = {};

/**
 * The number of the warning log entries.
 *
 * @property warnCounter
 * @type {number}
 * @private
 * @default 0
 */
var warnCounter = 0;

/**
 * The number of the error log entries.
 *
 * @property errorCounter
 * @type {number}
 * @private
 * @default 0
 */
var errorCounter = 0;

/**
 * Returns the number of the warning log entries.
 *
 * @method getWarnCounter
 * @return {number} The number of the warning log entries.
 */
function getWarnCounter() {
  try {
    return warnCounter;
  } catch (err1) {
    console.log(err1.stack);
    return -1;
  }
}

/**
 * Returns the number of the error log entries.
 *
 * @method getErrorCounter
 * @return {number} The number of the error log entries.
 */
function getErrorCounter() {
  try {
    return errorCounter;
  } catch (err1) {
    console.log(err1.stack);
    return -1;
  }
}

/**
 * Return a string representation of the date and time.
 *
 * @method getTimestamp
 * @return {string} A date and time.
 */
function getTimestamp() {
  return moment().format();
}

/**
 * Configure the component.
 *
 * @method config
 */
function config() {
  try {
    // check configuration file presence
    if (!fs.existsSync(PATH)) {
      throw new Error(PATH + ' does not exist');
    }

    // parse the configuration file
    var json = JSON.parse(fs.readFileSync(PATH, 'utf8'));

    // check the format of the JSON configuration file
    if (typeof json !== 'object') {
      throw new Error('wrong ' + PATH);
    }
    if (typeof json.logfile !== 'string') {
      throw new Error('wrong ' + PATH + ': no "logfile" key');
    }
    if (typeof json.loglevel !== 'string') {
      throw new Error('wrong ' + PATH + ': no "loglevel" key');
    }

    var logLevel = json.loglevel;
    if (process.env.NODE_ENV === 'development') {
      logLevel = 'info';
    }

    var log = new(winston.Logger)({
      transports: [
        new(winston.transports.File)({
          json: false,
          level: logLevel,
          filename: json.logfile,
          timestamp: getTimestamp
        })
      ]
    });

    // add the functions to retrieve the counters
    log.getWarnCounter = getWarnCounter;
    log.getErrorCounter = getErrorCounter;

    // a log event will be raised each time a transport successfully logs a message
    log.on('logging', function(transport, level, msg, meta) {
      try {
        if (level === 'warn') {
          warnCounter += 1;
        } else if (level === 'error') {
          errorCounter += 1;
        }
      } catch (err1) {
        console.log(err1.stack);
      }
    });

    ctilog.log = log;

  } catch (err) {
    console.log(err.stack);
  }
}
config();

/**
 * Reload the component.
 *
 * @method reload
 */
function reload() {
  try {
    config();
    ctilog.log.warn(IDLOG, 'reloaded');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

exports.ctilog = ctilog;
exports.reload = reload;
