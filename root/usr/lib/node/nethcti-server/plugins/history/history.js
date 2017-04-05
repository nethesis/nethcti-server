/**
* Provides the history call functions.
*
* @module history
* @main history
*/
var fs   = require('fs');
var path = require('path');

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
* The asterisk proxy architect component.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

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
* Sets the asterisk proxy architect component.
*
* @method setCompAstProxy
* @param {object} comp The asterisk proxy architect component.
*/
function setCompAstProxy(comp) {
    try {
        compAstProxy = comp;
        logger.info(IDLOG, 'set asterisk proxy architect component');
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
*   @param {string}  data.endpoint  The endpoint involved in the research, e.g. the extension identifier
*   @param {string}  data.from      The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string}  data.to        The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {boolean} data.recording True if the data about recording audio file must be returned
*   @param {string}  [data.filter]  The filter to be used
*   @param {integer}  [offset]   The results offset
*   @param {integer}  [limit]    The results limit
* @param {function}  cb The callback function
*/
function getHistoryCallInterval(data, offset, limit, cb) {
    try {
        // check parameters
        if (    typeof data        !== 'object'   || typeof data.recording !== 'boolean'
            ||  typeof cb          !== 'function' || typeof data.to        !== 'string'
            ||  typeof data.from   !== 'string'   || typeof data.endpoint  !== 'string'
            || (typeof data.filter !== 'string'   && data.filter           !== undefined)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search history call between ' + data.from + ' to ' + data.to + ' for ' +
                           'endpoint ' + data.endpoint + ' and filter ' + (data.filter ? data.filter : '""') +
                           (data.recording ? ' with recording data' : '') );
        dbconn.getHistoryCallInterval(data, offset, limit, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Get the switchboard history call of all endpoints into the interval time.
* It can be possible to filter the results.
*
* @method getHistorySwitchCallInterval
* @param {object} data
*   @param {string}  data.from         The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string}  data.to           The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {boolean} data.recording    True if the data about recording audio file must be returned
*   @param {string}  [data.filter]     The filter to be used
*   @param {string}  [data.privacyStr] The sequence to be used to hide the numbers to respect the privacy
*   @param {integer} [offset]          The results offset
*   @param {integer} [limit]           The results limit
* @param {function} cb                 The callback function
*/
function getHistorySwitchCallInterval(data, offset, limit, cb) {
    try {
        // check parameters
        if (    typeof data            !== 'object'
            ||  typeof cb              !== 'function' || typeof data.recording !== 'boolean'
            ||  typeof data.to         !== 'string'   || typeof data.from      !== 'string'
            || (typeof data.filter     !== 'string'   && data.filter           !== undefined)
            || (typeof data.privacyStr !== 'string'   && data.privacyStr       !== undefined) ) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search switchboard history call between ' + data.from + ' to ' + data.to + ' for ' +
                           'all endpoints and filter ' + (data.filter ? data.filter : '""') +
                           (data.recording ? ' with recording data' : '') );

        // add trunks name to the results as explained in #3621
        // It will be removed when #3622 will be done: when calls direction
        // will be calculated by the server
        var k;
        var trunkNames = compAstProxy.getJSONTrunks();
        // remove trunk details
        for (k in trunkNames) { trunkNames[k] = ''; }

        dbconn.getHistoryCallInterval(data, offset, limit, function (err, results) {
            cb(err, { results: results, trunkNames: trunkNames });
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Checks if at least one of the specified list of extensions is implied in the recorded call.
*
* @method isAtLeastExtenInCallRecording
* @param {string}   id         The call identifier
* @param {array}    extensions The list of the extensions to check
* @param {function} cb         The callback function
*/
function isAtLeastExtenInCallRecording(id, extensions, cb) {
    try {
        // check parameters
        if (   typeof cb !== 'function'
            || typeof id !== 'string'   || !(extensions instanceof Array)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'check if at least one extension ' + extensions.toString() + ' is involved in the call recording with id "' + id + '"');
        dbconn.isAtLeastExtenInCall(id, extensions, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the data about call recording audio file.
*
* @method getCallRecordingFileData
* @param {string}   id The call identifier
* @param {function} cb The callback function
*/
function getCallRecordingFileData(id, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function' || typeof id !== 'string') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'get the data informations about call recording audio file of the call with id "' + id + '"');
        dbconn.getCallRecordingFileData(id, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Reads the specified file of the recorded call using base64 encoding and
* return the content in the callback.
*
* @method getCallRecordingContent
* @param {object} data
*   @param {string} data.year     The creation year of the file
*   @param {string} data.month    The creation month of the file
*   @param {string} data.day      The creation day of the file
*   @param {string} data.filename The name of the file
* @param {function} cb            The callback function
*/
function getCallRecordingContent(data, cb) {
    try {
        // check parameters
        if (   typeof cb        !== 'function' || typeof data.filename !== 'string'
            || typeof data      !== 'object'   || typeof data.month    !== 'string'
            || typeof data.year !== 'string'   || typeof data.day      !== 'string') {

            throw new Error('wrong parameters');
        }

        // get base path of the call recordings and then construct the filepath using the arguments
        var basepath = compAstProxy.getBaseCallRecAudioPath();
        var filepath = path.join(basepath, data.year, data.month, data.day, data.filename);

        // read the audio file using base64 enconding
        logger.info(IDLOG, 'read call recording file ' + filepath);
        fs.readFile(filepath, 'base64', function (err, result) {
            cb(err, result);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Deletes the specified file of the recorded call. It deletes the file from the
* filesystem and updates the database entry of the call.
*
* @method deleteCallRecording
* @param {string} id              The identifier of the call
* @param {object} data
*   @param {string} data.year     The creation year of the file
*   @param {string} data.month    The creation month of the file
*   @param {string} data.day      The creation day of the file
*   @param {string} data.filename The name of the file
* @param {function} cb            The callback function
*/
function deleteCallRecording(id, data, cb) {
    try {
        // check parameters
        if (   typeof cb            !== 'function'
            || typeof data.filename !== 'string'   || typeof id         !== 'string'
            || typeof data          !== 'object'   || typeof data.month !== 'string'
            || typeof data.year     !== 'string'   || typeof data.day   !== 'string') {

            throw new Error('wrong parameters');
        }

        // get base path of the call recordings and then construct the filepath using the arguments
        var basepath = compAstProxy.getBaseCallRecAudioPath();
        var filepath = path.join(basepath, data.year, data.month, data.day, data.filename);

        // delete the audio file from the filesystem
        logger.info(IDLOG, 'delete call recording file ' + filepath);
        fs.unlink(filepath, function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'removing call recording file ' + filepath);
                    cb(err);
                }

                // update the database entry of the call to remove the link to the file
                else {
                    logger.info(IDLOG, 'delete call recording from the database for call with id ' + id);
                    dbconn.deleteCallRecording(id, function (err) {
                        cb(err);
                    });
                }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

// public interface
exports.setLogger                     = setLogger;
exports.setDbconn                     = setDbconn;
exports.setCompAstProxy               = setCompAstProxy;
exports.deleteCallRecording           = deleteCallRecording;
exports.getHistoryCallInterval        = getHistoryCallInterval;
exports.getCallRecordingContent       = getCallRecordingContent;
exports.getCallRecordingFileData      = getCallRecordingFileData;
exports.getHistorySwitchCallInterval  = getHistorySwitchCallInterval;
exports.isAtLeastExtenInCallRecording = isAtLeastExtenInCallRecording;
