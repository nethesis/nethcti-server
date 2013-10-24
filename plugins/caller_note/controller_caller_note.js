/**
* Provides the functions for caller notes.
*
* @module caller_note
* @main arch_controller_caller_note
*/
var moment     = require('moment');
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
*   @param {string} data.number          The caller/called number that is associated with the note
*   @param {string} data.creator         The creator of the caller note
*   @param {string} data.text            The text of the note
*   @param {string} data.reservation     The reservation option. If the creator has booked the callback from the expressed number
*   @param {string} data.visibility      It can be "private" or "public"
*   @param {string} data.expirationDate  It's the expiration date of the note. It must use the YYYYMMDD format, e.g. to express the date of "12 june 2013" you must use "20130612"
*   @param {string} data.expirationTime  It's the expiration time of the note. It must use the HHmmss format, e.g. to express the time of "21:00:45" you must use "210045"
* @param {function} cb The callback function
*/
function newCallerNote(data, cb) {
    try {
        // check parameter
        if (typeof data                   !== 'object'
            || typeof data.creator        !== 'string' || typeof data.number                            !== 'string'
            || typeof data.reservation    !== 'string' || typeof data.expirationDate                    !== 'string'
            || typeof data.visibility     !== 'string' || typeof data.text                              !== 'string'
            || typeof data.expirationTime !== 'string' || CallerNote.isValidVisibility(data.visibility) === false
            || (data.visibility           !== 'public' && data.visibility                               !== 'private') ) {

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
*   @param {string} data.number          The caller/called number that is associated with the note
*   @param {string} data.creator         The creator of the caller note
*   @param {string} data.text            The text of the note
*   @param {string} data.reservation     The reservation option. If the creator has booked the callback from the expressed number
*   @param {string} data.visibility      It can be "private" or "public"
*   @param {string} data.expirationDate  It's the expiration date of the note. It must use the YYYYMMDD format, e.g. to express the date of "12 june 2013" you must use "20130612"
*   @param {string} data.expirationTime  It's the expiration time of the note. It must use the HHmmss format, e.g. to express the time of "21:00:45" you must use "210045"
* @param {function} cb The callback function
*/
function save(data, cb) {
    try {
        // check parameter
        if (typeof data                   !== 'object'
            || typeof data.creator        !== 'string' || typeof data.number                            !== 'string'
            || typeof data.reservation    !== 'string' || typeof data.expirationDate                    !== 'string'
            || typeof data.visibility     !== 'string' || typeof data.text                              !== 'string'
            || typeof data.expirationTime !== 'string' || CallerNote.isValidVisibility(data.visibility) === false
            || (data.visibility           !== 'public' && data.visibility                               !== 'private') ) {

            throw new Error('wrong parameter');
        }

        // set data.public property used by dbconn module to save the caller note
        // into the database
        if (data.visibility === CallerNote.VISIBILITY.public) { data.public = true; }
        else { data.public = false; }

        // set data.reservation property as boolean to adapt it to dbconn module
        if (data.reservation === 'true') { data.reservation = true; }
        else { data.reservation = false; }

        // set data.expiration property to adapt it to dbconn module
        data.expiration = moment(data.expirationDate + ' ' + data.expirationTime, 'YYYYMMDD HHmmss').format('YYYY-MM-DD HH:mm:ss');

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

/**
* Gets the history of the caller note created by all users into the interval time.
* It can be possible to filter the results.
*
* @method getAllUserHistoryInterval
* @param {object} data
*   @param {string} data.from     The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to       The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used
* @param {function} cb            The callback function
*/
function getAllUserHistoryInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data          !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            || (typeof data.filter   !== 'string' && data.filter !== undefined)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search history caller note of all users between ' + data.from + ' to ' + data.to + ' with filter ' + (data.filter ? data.filter : '""'));
        dbconn.getAllUserHistoryCallerNoteInterval(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all the public and private caller notes for the specified number that hasn't expired.
*
* @method getAllValidCallerNotesByNum
* @param {string}   number The phone number used to search the associated caller note
* @param {function} cb     The callback function
*/
function getAllValidCallerNotesByNum(number, cb) {
    try {
        // check parameters
        if (typeof number !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search all valid caller notes of number ' + number + ' of all users');
        dbconn.getAllValidCallerNotesByNum(number, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the caller note.
*
* @method getCallerNote
* @param {string}   id The caller note identifier in the caller note database
* @param {function} cb The callback function
*/
function getCallerNote(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search caller note using db contact id "' + id + '" by means dbconn module');
        dbconn.getCallerNote(id, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Modify the caller note.
*
* @method modifyCallerNote
* @param {object} data
*   @param {string} data.id                The unique identifier of the caller note
*   @param {string} [data.number]          The caller/called number that is associated with the note
*   @param {string} [data.text]            The text of the note
*   @param {string} [data.reservation]     The reservation option. If the creator has booked the callback from the expressed number
*   @param {string} [data.visibility]      It can be "private" or "public"
*   @param {string} [data.expirationDate]  It's the expiration date of the note. It must use the YYYYMMDD format, e.g. to express the date of "12 june 2013" you must use "20130612"
*   @param {string} [data.expirationTime]  It's the expiration time of the note. It must use the HHmmss format, e.g. to express the time of "21:00:45" you must use "210045"
* @param {function} cb The callback function
*/
function modifyCallerNote(data, cb) {
    try {
        // check parameters
        if (   typeof data    !== 'object'
            || typeof data.id !== 'string' || typeof cb !== 'function'
            || (data.number         && typeof data.number         !== 'string')
            || (data.reservation    && typeof data.reservation    !== 'string')
            || (data.visibility     && typeof data.visibility     !== 'string')
            || (data.text           && typeof data.text           !== 'string')
            || (data.expirationDate && typeof data.expirationDate !== 'string')
            || (data.expirationTime && typeof data.expirationTime !== 'string')
            || (data.expirationDate && !data.expirationTime)
            || (data.expirationTime && !data.expirationDate) ) {

            throw new Error('wrong parameters');
        }

        if (data.visibility) {
            // set data.public property used by dbconn module to modify the caller note into the database
            if (data.visibility === CallerNote.VISIBILITY.public) { data.public = true; }
            else { data.public = false; }
        }

        if (data.reservation) {
            // set data.reservation property as boolean to adapt it to dbconn module
            if (data.reservation === 'true') { data.reservation = true; }
            else { data.reservation = false; }
        }

        if (data.expirationDate && data.expirationTime) {
            // set data.expiration property to adapt it to dbconn module
            data.expiration = moment(data.expirationDate + ' ' + data.expirationTime, 'YYYYMMDD HHmmss').format('YYYY-MM-DD HH:mm:ss');
        }

        logger.info(IDLOG, 'modify caller note using db contact id "' + data.id + '" by means dbconn module');
        dbconn.modifyCallerNote(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

// public interface
exports.setLogger                   = setLogger;
exports.setDbconn                   = setDbconn;
exports.newCallerNote               = newCallerNote;
exports.getCallerNote               = getCallerNote;
exports.modifyCallerNote            = modifyCallerNote;
exports.getHistoryInterval          = getHistoryInterval;
exports.getAllUserHistoryInterval   = getAllUserHistoryInterval;
exports.getAllValidCallerNotesByNum = getAllValidCallerNotesByNum;
