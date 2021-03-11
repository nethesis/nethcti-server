/**
 * Provides the videoconf functions.
 *
 * @module videoconf
 * @main videoconf
 */
/**
 * Provides the videoconf functionalities.
 *
 * @class videoconf
 * @static
 */
const fs = require('fs');
const https = require('https');
const uuidv4 = require('uuid').v4;

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [videoconf]
 */
var IDLOG = '[videoconf]';

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
 * The base URL of the video conf platform.
 *
 * @property baseUrl
 * @type string
 * @private
 */
let baseUrl;

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
 * Configure the component.
 *
 * @method config
 * @param {string} path The path of the configuration file
 */
function config(path) {
  try {
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }
    const json = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (json && json.jitsi && json.jitsi.url) {
      baseUrl = json.jitsi.url;
    } else {
      logger.log.warn(IDLOG, 'wrong config file ' + path);
    }
    logger.log.info(IDLOG, 'configuration done by ' + path);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Returns the base URL of the video conf platform.
 *
 * @method getBaseUrl
 * @return {string} The base URL of the video conf platform
 */
function getBaseUrl() {
  return baseUrl;
}

/**
 * Returns an URL to be used for a new room.
 *
 * @method getNewRoomUrl
 * @return {string} The url for the new room.
 */
function getNewRoomUrl() {
  try {
    if (typeof baseURL !== 'string' || baseURL === '') {
      return null;
    }
    const id = uuidv4();
    const url = baseUrl + '/' + id;
    logger.log.info(IDLOG, `created new URL for vc room ${url}`);
    return {
      id: id,
      url: url,
      provider: 'jitsi'
    };
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}
exports.config = config;
exports.setLogger = setLogger;
exports.getBaseUrl = getBaseUrl;
exports.getNewRoomUrl = getNewRoomUrl;