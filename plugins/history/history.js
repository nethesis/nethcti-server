/**
* Provides the history call functions.
*
* @module history
* @main history
*/

/**
* Provides the history call functionalities.
*
* @class history
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
* @default [history]
*/
var IDLOG = '[history]';

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
* The dbconn module.
*
* @property dbconn
* @type object
* @private
*/
var dbconn;

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
* Set the module to be used for database functionalities.
*
* @method setDbconn
* @param {object} dbConnMod The dbconn module.
*/
function setDbconn(dbconnMod) {
    try {
        // check parameter
        if (typeof dbconnMod !== 'object') { throw new Error('wrong dbconn object'); }
        dbconn = dbconnMod;
        logger.info(IDLOG, 'set dbconn module');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Get the history call of the specified extension into the interval time.
* It can be possible to filter the results.
*
* @method getHistoryCallInterval
* @param {object} data
*   @param {string} data.endpoint The endpoint involved in the research, e.g. the extension identifier
*   @param {string} data.from The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used
* @param {function} cb The callback function
*/
function getHistoryCallInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data          !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            ||  typeof data.endpoint !== 'string'
            || (typeof data.filter   !== 'string' && data.filter !== undefined)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search history call between ' + data.from + ' to ' + data.to + ' for ' +
                           'endpoint ' + data.endpoint + ' and filter ' + (data.filter ? data.filter : '""'));
        dbconn.getHistoryCallInterval(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.setLogger              = setLogger;
exports.setDbconn              = setDbconn;
exports.getHistoryCallInterval = getHistoryCallInterval;
