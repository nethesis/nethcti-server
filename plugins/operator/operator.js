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
var fs        = require('fs');
var iniparser = require('iniparser');

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
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The list of the groups of extensions.
*
* @property groups
* @type object
* @private
*/
var groups = {};

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
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

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
* Set configuration to use and initialize the user credentials.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path Credentials ini file path. The file must
* have the extension number as section and a secret key for each
* section.
*/
function configGroups(path) {
    // check parameter
    if (typeof path === 'string') {

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

        // read credential file
        groups = iniparser.parseSync(path);
        logger.info(IDLOG, path + ' has been read');
         
    } else {
        throw new TypeError('wrong parameter');
    }
}

/**
* Return the list of the groups of extensions defined by the administrator.
*
* @method getGroups
* @return {boolean} Return The list of groups of extensions.
*/
function getGroups() {
    try { return groups; }
    catch (err) { logger.error(IDLOG, err.stack); }
}

// public interface
exports.setLogger    = setLogger;
exports.getGroups    = getGroups;
exports.configGroups = configGroups;
