/**
* Provides the post-it functions.
*
* @module postit
* @main arch_controller_postit
*/

/**
* Provides the post-it functionalities.
*
* @class controller_postit
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
* @default [controller_postit]
*/
var IDLOG = '[controller_postit]';

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
* New post-it is created and saved.
*
* @method newPostit
* @param {object} data
*   @param {string} data.recipient The recipient of the post-it
*   @param {string} data.creator The creator of the post-it
*   @param {string} data.text The text of the message
* @param {function} cb The callback function
*/
function newPostit(data, cb) {
    try {
        // check parameter
        if (typeof data            !== 'object' || typeof data.text      !== 'string'
            || typeof data.creator !== 'string' || typeof data.recipient !== 'string') {

            throw new Error('wrong parameter');
        }

        save(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Save the post-it data into the database using dbconn module.
*
* @method save
* @param {object} data
*   @param {string} data.recipient The recipient of the post-it
*   @param {string} data.creator The creator of the post-it
*   @param {string} data.text The text of the message
* @param {function} cb The callback function
*/
function save(data, cb) {
    try {
        // check parameter
        if (typeof data            !== 'object' || typeof data.text      !== 'string'
            || typeof data.creator !== 'string' || typeof data.recipient !== 'string') {

            throw new Error('wrong parameter');
        }

        logger.info(IDLOG, 'save postit by means dbconn module');
        dbconn.savePostit(data.creator, data.text, data.recipient, cb);

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
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Get the history of the post-it created by the user into the interval time.
* It can be possible to filter the results.
*
* @method getHistoryInterval
* @param {object} data
*   @param {string} data.username The username involved in the research
*   @param {string} data.from The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used
* @param {function} cb The callback function
*/
function getHistoryInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data          !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            ||  typeof data.username !== 'string'
            || (typeof data.filter   !== 'string' && data.filter !== undefined)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search history post-it between ' + data.from + ' to ' + data.to + ' for ' +
                           'username "' + data.username + '" and filter ' + (data.filter ? data.filter : '""'));
        dbconn.getHistoryPostitInterval(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.newPostit          = newPostit;
exports.setLogger          = setLogger;
exports.setDbconn          = setDbconn;
exports.getHistoryInterval = getHistoryInterval;
