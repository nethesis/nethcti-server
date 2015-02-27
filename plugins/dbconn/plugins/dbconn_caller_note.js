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
* @default [plugins/dbconn_caller_note]
*/
var IDLOG = '[plugins/dbconn_caller_note]';

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
* Returns the caller note. It searches the _id_ field in the
* _caller\_note_ database table.
*
* @method getCallerNote
* @param {string}   id The caller note identifier
* @param {function} cb The callback function
*/
function getCallerNote(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CALLER_NOTE].find({
            where: [ 'id=?', id  ]

        }).success(function (result) {

            if (result && result.selectedValues) {
                logger.info(IDLOG, 'search caller note with db id "' + id + '" has been successful');
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'search caller note with db id "' + id + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search caller note with db id "' + id + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save the the caller note in the database.
*
* @method saveCallerNote
* @param {object} data
*   @param {string}  data.number      The caller/called number that is associated with the note
*   @param {string}  data.creator     The creator of the caller note
*   @param {string}  data.text        The text of the note
*   @param {boolean} data.reservation The reservation option. If the creator has booked the callback from the expressed number
*   @param {boolean} data.public      True if the caller note visibility is public, false otherwise
*   @param {string}  data.expiration  The expiration date and time of the caller note. It must be expressed in YYYY-MM-DD HH:mm:ss format
* @param {function}  cb The callback function
*/
function saveCallerNote(data, cb) {
    try {
        // check parameter
        if (typeof data                   !== 'object'
            || typeof data.creator        !== 'string'  || typeof data.number     !== 'string'
            || typeof data.reservation    !== 'boolean' || typeof data.expiration !== 'string'
            || typeof data.public         !== 'boolean' || typeof data.text       !== 'string') {

            throw new Error('wrong parameter');
        }

        // get the sequelize model already loaded
        var callerNote = compDbconnMain.models[compDbconnMain.JSON_KEYS.CALLER_NOTE].build({
            text:        data.text,
            number:      data.number,
            public:      data.public,
            creator:     data.creator,
            creation:    moment().format('YYYY-MM-DD HH:mm:ss'),
            expiration:  data.expiration,
            reservation: data.reservation
        });

        // save the model into the database
        callerNote.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'caller note saved successfully');
            cb();

        }).error(function (err) { // manage the error
            logger.error(IDLOG, 'saving caller note: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Deletes the specified caller note from the _caller\_note_ database table.
*
* @method deleteCallerNote
* @param {string}   id The database caller note identifier
* @param {function} cb The callback function
*/
function deleteCallerNote(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CALLER_NOTE].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.destroy().success(function () {
                    logger.info(IDLOG, 'caller note with db id "' + id + '" has been deleted successfully');
                    cb();
                });

            } else {
                var str = 'deleting caller note with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching caller note with db id "' + id + '" to delete: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Modify the specified caller note in the _caller\_note_ database table.
*
* @method modifyCallerNote
* @param {object} data
*   @param {string}  data.id            The unique identifier of the caller note in the database
*   @param {string}  [data.number]      The caller/called number that is associated with the note
*   @param {string}  [data.text]        The text of the note
*   @param {boolean} [data.reservation] The reservation option. If the creator has booked the callback from the expressed number
*   @param {boolean} [data.public]      True if the caller note visibility is public, false otherwise
*   @param {string}  [data.expiration]  The expiration date and time of the caller note. It must be expressed in YYYY-MM-DD HH:mm:ss format
* @param {function}  cb The callback function
*/
function modifyCallerNote(data, cb) {
    try {
        // check parameters
        if (   typeof data    !== 'object'
            || typeof data.id !== 'string' || typeof cb !== 'function'
            || (data.number      && typeof data.number      !== 'string' )
            || (data.reservation && typeof data.reservation !== 'boolean')
            || (data.expiration  && typeof data.expiration  !== 'string' )
            || (data.public      && typeof data.public      !== 'boolean')
            || (data.text        && typeof data.text        !== 'string' ) ) {

            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CALLER_NOTE].find({
            where: [ 'id=?', data.id  ]

        }).success(function (task) {

            if (task) {

                task.updateAttributes(data).success(function () {
                    logger.info(IDLOG, 'caller note with db id "' + data.id + '" has been modified successfully');
                    cb();
                });

            } else {
                var str = 'modify caller note with db id "' + data.id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching caller note with db id "' + data.id + '" to modify: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
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

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.CALLER_NOTE].findAll({
            where: [
                'number=? AND expiration>=NOW()', number
            ],
            attributes: [
                [ 'DATE_FORMAT(creation,   "%d/%m/%Y")', 'creationdate'   ],
                [ 'DATE_FORMAT(creation,   "%H:%i:%S")', 'creationtime'   ],
                [ 'DATE_FORMAT(expiration, "%d/%m/%Y")', 'expirationdate' ],
                [ 'DATE_FORMAT(expiration, "%H:%i:%S")', 'expirationtime' ],
                'id',     'text',    'creator', 'number',
                'public', 'reservation'
            ]
        }).success(function (results) {

            // extract results to return them in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching all public and private valid caller notes for number ' + number);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching all public and private valid caller notes for number ' + number);
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the history caller note of the specified user into the interval time.
* If the username information is omitted, the results contains the
* history caller note of all users. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _caller\_note_ database.
*
* @method getHistoryCallerNoteInterval
* @param {object} data
*   @param {string} [data.username] The user involved in the research. It is used to filter
*                                   out the _creator_. If it is omitted the function treats it as '%' string. The '%'
*                                   matches any number of characters, even zero character.
*
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _number_ field. If it is omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getHistoryCallerNoteInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            || (typeof data.username !== 'string' && data.username !== undefined)
            || (typeof data.filter   !== 'string' && data.filter   !== undefined)) {

            throw new Error('wrong parameters');
        }

        // the mysql operator for the creator field
        var operator = '=';

        // check optional parameters
        if (data.filter   === undefined) { data.filter = '%';   }
        if (data.username === undefined) {
            data.username = '%';
            operator = ' LIKE ';
        }

        // define the mysql fields to be returned
        var attributes = [
            [ 'DATE_FORMAT(creation,   "%d/%m/%Y")', 'creationdate'   ],
            [ 'DATE_FORMAT(creation,   "%H:%i:%S")', 'creationtime'   ],
            [ 'DATE_FORMAT(expiration, "%d/%m/%Y")', 'expirationdate' ],
            [ 'DATE_FORMAT(expiration, "%H:%i:%S")', 'expirationtime' ],
            'id', 'public', 'reservation'
        ];

        // if the privacy string is present, than hide the numbers and names
        if (data.privacyStr) {
            // the numbers and names are hidden
            attributes.push([ 'CONCAT( SUBSTRING(number, 1, LENGTH(number) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'number' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'creator' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'text' ]);

        } else {
            // the numbers and names are clear
            attributes.push('number');
            attributes.push('creator');
            attributes.push('text');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.CALLER_NOTE].findAll({
            where: [
                'creator' + operator + '? AND ' +
                '(DATE(creation)>=? AND DATE(creation)<=?) AND ' +
                '(number LIKE ?) AND ' +
                'expiration>=NOW()',
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
            }

            logger.info(IDLOG, results.length + ' results searching history caller note interval between ' +
                               data.from + ' to ' + data.to + ' for username "' + data.username +
                               '" and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history caller note interval between ' + data.from + ' to ' + data.to +
                                ' for username "' + data.username + '" and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the history caller note of all the users into the interval time.
* It can be possible to filter the results specifying the filter. It search
* the results into the _caller\_note_ database.
*
* @method getAllUserHistoryCallerNoteInterval
* @param {object} data
*   @param {string} data.from     The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to       The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used in the _number_ field. If it is omitted the
*                                 function treats it as '%' string
* @param {function} cb            The callback function
*/
function getAllUserHistoryCallerNoteInterval(data, cb) {
    try {
        getHistoryCallerNoteInterval(data, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

apiList.getCallerNote                       = getCallerNote;
apiList.saveCallerNote                      = saveCallerNote;
apiList.deleteCallerNote                    = deleteCallerNote;
apiList.modifyCallerNote                    = modifyCallerNote;
apiList.getAllValidCallerNotesByNum         = getAllValidCallerNotesByNum;
apiList.getHistoryCallerNoteInterval        = getHistoryCallerNoteInterval;
apiList.getAllUserHistoryCallerNoteInterval = getAllUserHistoryCallerNoteInterval;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
