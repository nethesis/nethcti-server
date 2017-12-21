/**
* Provides database functions.
*
* @module dbconn
* @submodule plugins
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins/dbconn_history]
*/
var IDLOG = '[plugins/dbconn_history]';

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
* The exported apis.
*
* @property apiList
* @type object
*/
var apiList = {};

/**
* The main architect dbconn component.
*
* @property compDbconnMain
* @type object
* @private
*/
var compDbconnMain;

/**
* Set the main dbconn architect component.
*
* @method setCompDbconnMain
* @param {object} comp The architect main dbconn component
* @static
*/
function setCompDbconnMain(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compDbconnMain = comp;
        logger.log(IDLOG, 'main dbconn component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

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
* Gets all the history sms of all the users into the interval time.
* It can be possible to filter out the results specifying the filter. It search
* the results into the _sms\_history_ database.
*
* @method getAllUserHistorySmsInterval
* @param {object} data
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _recipient_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getAllUserHistorySmsInterval(data, cb) {
    try {
        getHistorySmsInterval(data, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get the history call of the specified endpoint into the interval time.
* If the endpoint information is omitted, the results contains the
* history call of all endpoints. Moreover, it can be possible to filter
* the results specifying the filter and hide the phone numbers specifying
* the privacy sequence to be used. It search the results into the
* _asteriskcdrdb.cdr_ database.
*
* @method getHistoryCallInterval
* @param {object} data
*   @param {string}  [data.endpoint]   The endpoint involved in the research, e.g. the extesion
*                                      identifier. It is used to filter out the _channel_ and _dstchannel_.
*                                      It is wrapped with '%' characters. If it is omitted the function treats
*                                      it as '%' string. The '%' matches any number of characters, even zero character
*   @param {string}  data.from         The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string}  data.to           The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {boolean} data.recording    True if the data about recording audio file must be returned
*   @param {string}  [data.filter]     The filter to be used in the _src, clid_ and _dst_ fields. If it is
*                                      omitted the function treats it as '%' string
*   @param {string}  [data.privacyStr] The sequence to be used to hide the numbers to respect the privacy
* @param {function} cb The callback function
*/
function getHistoryCallInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb              !== 'function' || typeof data.recording !== 'boolean'
            ||  typeof data.to         !== 'string'   || typeof data.from      !== 'string'
            || (typeof data.endpoint   !== 'string'   && data.endpoint         !== undefined)
            || (typeof data.filter     !== 'string'   && data.filter           !== undefined)
            || (typeof data.privacyStr !== 'string'   && data.privacyStr       !== undefined)) {

            throw new Error('wrong parameters');
        }

        // check optional parameters
        if (data.filter   === undefined) { data.filter   = '%'; }
        if (data.endpoint === undefined) { data.endpoint = '%'; }
        else { data.endpoint = '%' + data.endpoint + '%'; }

        // define the mysql field to be returned. The "recordingfile" field
        // is returned only if the "data.recording" argument is true
        var attributes = [
            [ 'DATE_FORMAT(calldate, "%d/%m/%Y")', 'date'],
            [ 'DATE_FORMAT(calldate, "%H:%i:%S")', 'time'],
            'channel', 'dstchannel', 'uniqueid', 'userfield',
            'duration', 'billsec', 'disposition', 'dcontext'
        ];
        if (data.recording === true) { attributes.push('recordingfile'); }

        // if the privacy string is present, than hide the numbers
        if (data.privacyStr) {
            // the numbers are hidden
            attributes.push([ 'CONCAT( SUBSTRING(src, 1, LENGTH(src) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'src' ]);
            attributes.push([ 'CONCAT( SUBSTRING(dst, 1, LENGTH(dst) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'dst' ]);
            attributes.push([ 'CONCAT( "", "\\"' + data.privacyStr + '\\"")', 'clid' ]);

        } else {
            // the numbers are clear
            attributes.push('src');
            attributes.push('dst');
            attributes.push('clid');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].findAll({
            where: [
                '(channel LIKE ? OR dstchannel LIKE ?) AND ' +
                '(DATE(calldate)>=? AND DATE(calldate)<=?) AND ' +
                '(src LIKE ? OR clid LIKE ? OR dst LIKE ?)',
                data.endpoint, data.endpoint,
                data.from,     data.to,
                data.filter,   data.filter,   data.filter
            ],
            attributes: attributes

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching history call interval between ' +
                               data.from + ' to ' + data.to + ' for endpoint ' + data.endpoint +
                               ' and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history call interval between ' + data.from + ' to ' + data.to +
                                ' for endpoint ' + data.endpoint + ' and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Get the history sms sent by the specified user into the interval time.
* If the username information is omitted, the results contains the
* history sms of all users. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _sms_history_ database.
*
* @method getHistorySmsInterval
* @param {object} data
*   @param {string} [data.username] The user involved in the research. It is used to filter
*                                   out the _sender_. If it is omitted the function treats it as '%' string. The '%'
*                                   matches any number of characters, even zero character.
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _destination_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb              The callback function
*/
function getHistorySmsInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data          !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string' || typeof data.from !== 'string'
            || (typeof data.username !== 'string' && data.username    !== undefined)
            || (typeof data.filter   !== 'string' && data.filter      !== undefined)) {

            throw new Error('wrong parameters');
        }

        // the mysql operator for the sender field
        var operator = '=';

        // check optional parameters
        if (data.filter   === undefined) { data.filter = '%';   }
        if (data.username === undefined) {
            data.username = '%';
            operator = ' LIKE ';
        }

        // define the mysql fields to be returned
        var attributes = ['id', 'status', 'date'];

        // if the privacy string is present, than hide the numbers and names
        if (data.privacyStr) {
            // the numbers and names are hidden
            attributes.push([ 'CONCAT( SUBSTRING(destination, 1, LENGTH(destination) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'destination' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'sender' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'text' ]);

        } else {
            // the numbers and names are clear
            attributes.push('destination');
            attributes.push('sender');
            attributes.push('text');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.SMS_HISTORY].findAll({
            where: [
                'sender' + operator + '? AND ' +
                '(DATE(date)>=? AND DATE(date)<=?) AND ' +
                '(destination LIKE ?)',
                data.username,
                data.from, data.to,
                data.filter
            ],
            attributes: attributes

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {

                results[i] = results[i].selectedValues;
                results[i].datesent = moment(results[i].date).utc().format('DD/MM/YYYY');
                results[i].timesent = moment(results[i].date).utc().format('HH:mm:ss');
            }

            logger.info(IDLOG, results.length + ' results searching history sms interval between ' +
                               data.from + ' to ' + data.to + ' sent by username "' + data.username + '" and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history sms interval between ' + data.from + ' to ' + data.to +
                                ' sent by username "' + data.username + '" and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Checks if at least one of the specified list of extensions is implied in the recorded call.
*
* @method isAtLeastExtenInCall
* @param {string}   uniqueid   The call identifier: is the _uniqueid_ field of the _asteriskcdrdb.cdr_ database table
* @param {array}    extensions The list of the extensions to check
* @param {function} cb         The callback function. If none of the extensions is involved in the call, the callback
*                              is called with a false boolean value. Otherwise it's called with the entry of the database
*/
function isAtLeastExtenInCall(uniqueid, extensions, cb) {
    try {
        // check parameters
        if (   typeof cb       !== 'function'
            || typeof uniqueid !== 'string'   || !(extensions instanceof Array) ) {

            throw new Error('wrong parameters');
        }

        extensions = extensions.join('|');

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].find({
            where: [
                'uniqueid=? AND ' +
                '(channel REGEXP ? OR dstchannel REGEXP ?)',
                uniqueid, extensions, extensions
            ],
            attributes: [
                [ 'DATE_FORMAT(calldate, "%Y")', 'year'  ],
                [ 'DATE_FORMAT(calldate, "%m")', 'month' ],
                [ 'DATE_FORMAT(calldate, "%d")', 'day'   ],
                [ 'recordingfile', 'filename'            ]
            ]

        }).success(function (result) {

            // extract result to return in the callback function
            if (result &&  result.selectedValues) {
                logger.info(IDLOG, 'at least one extensions ' + extensions.toString() + ' is involved in the call with uniqueid ' + uniqueid);
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'none of the extensions ' + extensions.toString() + ' is involved in the call with uniqueid ' + uniqueid);
                cb(null, false);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'checking if at least one extension of ' + extensions.toString() + ' is involved in the call with uniqueid ' + uniqueid);
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

apiList.isAtLeastExtenInCall         = isAtLeastExtenInCall;
apiList.getHistorySmsInterval        = getHistorySmsInterval;
apiList.getHistoryCallInterval       = getHistoryCallInterval;
apiList.getAllUserHistorySmsInterval = getAllUserHistorySmsInterval;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
