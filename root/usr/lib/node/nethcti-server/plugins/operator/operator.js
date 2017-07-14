/**
 * Provides the operator functions.
 *
 * @module operator
 * @main operator
 */

/**
 * Provides the operator functions.
 *
 * @class operator
 * @static
 */
var fs = require('fs');
var Group = require('./group').Group;

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [operator]
 */
var IDLOG = '[operator]';

/**
 * The configuration file path.
 *
 * @property CONFIG_FILEPATH
 * @type string
 * @private
 */
var CONFIG_FILEPATH;

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
 * The list of the groups of the operator panel. The keys are
 * the names of the groups and the values are the _Group_ objects.
 *
 * @property groups
 * @type object
 * @private
 * @default {}
 */
var groups = {};

/**
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object
 * @static
 */
function setLogger(log) {
  try {
    if (typeof log === 'object') {

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
 * Configures the groups of the operator panel.
 *
 * **The method can throw an Exception.**
 *
 * @method config
 * @param {string} path The file path of the configuration file. It must use the JSON syntax.
 */
function config(path) {
  try {
    // check parameter
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check file presence
    if (!fs.existsSync(path)) {
      logger.log.warn(IDLOG, path + ' does not exist');
      return;
    }
    CONFIG_FILEPATH = path;

    // read groups part from the JSON file
    var json = (JSON.parse(fs.readFileSync(CONFIG_FILEPATH, 'utf8'))).groups;

    // create the Group objects
    var g, newgroup;
    for (g in json) {
      newgroup = new Group(g);

      // json[g] is an array as readed from the JSON file
      newgroup.addUsers(json[g]);
      groups[g] = newgroup;
    }
    logger.log.info(IDLOG, 'ended configuration by JSON file ' + CONFIG_FILEPATH);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Returns the JSON representation of operator panel groups.
 *
 * @method getJSONGroups
 * @return {object} The JSON representation of operator panel groups.
 */
function getJSONGroups() {
  try {
    var obj = {};

    // construct the object to return
    var g;
    for (g in groups) {
      obj[g] = {
        users: groups[g].getUserList()
      };
    }

    return obj;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reload the component.
 *
 * @method reset
 * @private
 */
function reset() {
  try {
    var k;
    for (k in groups) {
      delete groups[k];
    }
    groups = {};
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reload the component.
 *
 * @method reload
 * @private
 */
function reload() {
  try {
    reset();
    config(CONFIG_FILEPATH);
    logger.log.warn(IDLOG, 'reloaded');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

// public interface
exports.config = config;
exports.reload = reload;
exports.setLogger = setLogger;
exports.getJSONGroups = getJSONGroups;
