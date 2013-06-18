/**
* Provides the functions for caller notes.
*
* @module caller_note
* @main arch_controller_caller_note
*/
var CallerNote = require('./caller_note');

/**
* Provides the caller note functionalities.
*
* @class controller_caller_note
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
* @default [controller_caller_note]
*/
var IDLOG = '[controller_caller_note]';

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
* New caller note is created and saved.
*
* @method newCallerNote
* @param {object} data
*   @param {string} data.number The caller/called number that is associated
*       with the note
*   @param {string} data.creator The creator of the caller note
*   @param {string} data.callid The identifier of the call. It can be the "uniqueid" field
*       of the database table "asteriskcdrdb.cdr" in the asterisk scenario
*   @param {string} data.text The text of the note
*   @param {string} data.booking The reservation option. If the creator has booked
*       the callback from the expressed number
*   @param {string} data.visibility It can be "private" or "public"
*   @param {string} data.expiration It's the expiration date of the note. It must
*       use the YYYYMMDD format, e.g. to express the date of "12 june 2013" you must
*       use 20130612
* @param {function} cb The callback function
*/
function newCallerNote(data, cb) {
    try {
        // check parameter
        if (typeof data               !== 'object' || typeof data.text       !== 'string'
            || typeof data.creator    !== 'string' || typeof data.number     !== 'string'
            || typeof data.booking    !== 'string' || typeof data.expiration !== 'string'
            || typeof data.visibility !== 'string' || typeof data.callid     !== 'string'
            || CallerNote.isValidVisibility(data.visibility) === false) {

            throw new Error('wrong parameter');
        }

        save(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Save the the caller note data into the database using dbconn module.
*
* @method save
* @param {object} data
*   @param {string} data.number The caller/called number that is associated
*       with the note
*   @param {string} data.creator The creator of the caller note
*   @param {string} data.callid The identifier of the call. It can be the "uniqueid" field
*       of the database table "asteriskcdrdb.cdr" in the asterisk scenario
*   @param {string} data.text The text of the note
*   @param {string} data.booking The reservation option. If the creator has booked
*       the callback from the expressed number
*   @param {string} data.visibility It can be "private" or "public"
*   @param {string} data.expiration It's the expiration date of the note. It must
*       use the YYYYMMDD format, e.g. to express the date of "12 june 2013" you must
*       use 20130612
* @param {function} cb The callback function
*/
function save(data, cb) {
    try {
        // check parameter
        if (typeof data               !== 'object' || typeof data.text       !== 'string'
            || typeof data.creator    !== 'string' || typeof data.number     !== 'string'
            || typeof data.booking    !== 'string' || typeof data.expiration !== 'string'
            || typeof data.visibility !== 'string' || typeof data.callid     !== 'string'
            || CallerNote.isValidVisibility(data.visibility) === false) {

            throw new Error('wrong parameter');
        }

        // set data.public property used by dbconn module to save the caller note
        // into the database
        if (data.visibility === CallerNote.VISIBILITY.public) { data.public = true; }
        else { data.public = false; }

        // set data.booking property as boolean to adapt it to dbconn module
        if (data.booking === 'true') { data.booking = true; }
        else { data.booking = false; }

        logger.info(IDLOG, 'save caller note by means dbconn module');
        dbconn.saveCallerNote(data, cb);

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
* Get the history of the caller note created by the user into the interval time.
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

        logger.info(IDLOG, 'search history caller note between ' + data.from + ' to ' + data.to + ' for ' +
                           'username "' + data.username + '" and filter ' + (data.filter ? data.filter : '""'));
        dbconn.getHistoryCallerNoteInterval(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.setLogger          = setLogger;
exports.setDbconn          = setDbconn;
exports.newCallerNote      = newCallerNote;
exports.getHistoryInterval = getHistoryInterval;
