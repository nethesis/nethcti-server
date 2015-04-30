/**
* Provides database functions.
*
* @module dbconn
* @submodule plugins
*/
var moment = require('moment');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins/dbconn_postit]
*/
var IDLOG = '[plugins/dbconn_postit]';

/**
* Fired when a post-it has been deleted from the database by the _deletePostit_ method.
*
* @event deletedPostit
* @param {object} user The recipient of the deleted post-it
*/
/**
* The name of the deleted post-it message event.
*
* @property EVT_DELETED_POSTIT
* @type string
* @default "deletedPostit"
*/
var EVT_DELETED_POSTIT = 'deletedPostit';

/**
* Fired when the read status of a post-it has been set in the database by the _updatePostitReadIt_ method.
*
* @event postitReadIt
* @param {object} user The recipient of the read post-it
*/
/**
* The name of the "udpate post-it read it" message event.
*
* @property EVT_POSTIT_READIT
* @type string
* @default "postitReadIt"
*/
var EVT_READ_POSTIT = 'readPostit';

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
* Save new post-it in the database.
*
* @method savePostit
* @param {string}   creator   The creator name of the post-it
* @param {string}   text      The message text
* @param {string}   recipient The recipient of the message
* @param {function} cb        The callback function
*/
function savePostit(creator, text, recipient, cb) {
    try {
        // check parameters
        if (   typeof creator   !== 'string' || typeof text !== 'string'
            || typeof recipient !== 'string' || typeof cb   !== 'function') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var postit = compDbconnMain.models[compDbconnMain.JSON_KEYS.POSTIT].build({
            text:      text,
            creator:   creator,
            creation:  moment().format('YYYY-MM-DD HH:mm:ss'),
            recipient: recipient
        });

        // save the model into the database
        postit.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'postit saved successfully');
            cb();

        }).error(function (err) { // manage the error
            logger.error(IDLOG, 'saving postit: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns the post-it from the _postit_ database table using its unique database identifier.
* Then it sets the status read for the required postit updating the _readdate_ column of the
* _postit_ database table.
*
* @method getPostit
* @param {string}   id The post-it unique identifier. It's the _id_ column of the _postit_ database table
* @param {function} cb The callback function
*/
function getPostit(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.POSTIT].find({
            where: [ 'id=?', id  ]

        }).success(function (result) {

            if (result && result.selectedValues) {
                logger.info(IDLOG, 'search postit with db id "' + id + '" has been successful');
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'search postit with db id "' + id + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search postit with db id "' + id + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Deletes the specified postit from the _cti\postit_ database table.
*
* @method deletePostit
* @param {string}   id The post-it identifier
* @param {function} cb The callback function
*/
function deletePostit(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.POSTIT].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.destroy().success(function () {

                    logger.info(IDLOG, 'post-it with db id "' + id + '" has been deleted successfully');
                    cb();

                    // emits the event for a deleted post-it
                    logger.info(IDLOG, 'emit event "' + EVT_DELETED_POSTIT + '" of post-it with db id ' + id + ' of recipient user ' + task.selectedValues.recipient);
                    emitter.emit(EVT_DELETED_POSTIT, task.selectedValues.recipient);
                });

            } else {
                var str = 'deleting post-it with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching post-it with db id "' + id + '" to delete: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Updates the _readdate_ column of the specified postit with the current date.
*
* @method updatePostitReadIt
* @param {string}  id The post-it unique identifier. It's the _id_ column of the _postit_ database table
* @param {funcion} cb The callback function
*/
function updatePostitReadIt(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.POSTIT].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.updateAttributes({
                    readdate: moment().format('YYYY-MM-DD HH:mm:ss')

                }).success(function () {

                    logger.info(IDLOG, 'read date of the postit with db id "' + id + '" has been updated successfully');
                    cb();

                    // emits the event for a read post-it
                    logger.info(IDLOG, 'emit event "' + EVT_READ_POSTIT + '" of post-it with db id ' + id + ' of recipient user ' + task.selectedValues.recipient);
                    emitter.emit(EVT_READ_POSTIT, task.selectedValues.recipient);
                });

            } else {
                var str = 'updating read date of the postit with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error
            logger.error(IDLOG, 'searching posit with db id "' + data.id + '" to update read date: ' + err1.toString());
            cb(err1);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get the history post-it of the specified user into the interval time.
* If the username information is omitted, the results contains the
* history post-it of all users. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _postit_ database.
*
* @method getHistoryPostitInterval
* @param {object} data
*   @param {string} [data.username] The user involved in the research. It is used to filter
*                                   out the _creator_. If it is omitted the function treats it as '%' string. The '%'
*                                   matches any number of characters, even zero character.
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _recipient_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getHistoryPostitInterval(data, cb) {
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
            [ 'DATE_FORMAT(creation, "%d/%m/%Y")', 'creationdate'],
            [ 'DATE_FORMAT(creation, "%H:%i:%S")', 'creationtime'],
            [ 'DATE_FORMAT(readdate, "%d/%m/%Y")', 'readdate'],
            [ 'DATE_FORMAT(readdate, "%H:%i:%S")', 'timeread'],
            'id'
        ];

        // if the privacy string is present, than hide the numbers and names
        if (data.privacyStr) {
            // the numbers and names are hidden
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'recipient' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'creator' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'text' ]);

        } else {
            // the numbers and names are clear
            attributes.push('recipient');
            attributes.push('creator');
            attributes.push('text');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.POSTIT].findAll({
            where: [
                '(creator' + operator + '? OR recipient=?) AND ' +
                '(DATE(creation)>=? AND DATE(creation)<=?) AND ' +
                '(recipient LIKE ?)',
                data.username, data.username,
                data.from,     data.to,
                data.filter
            ],
            attributes: attributes

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching history post-it interval between ' +
                               data.from + ' to ' + data.to + ' for username "' + data.username + '" and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history post-it interval between ' + data.from + ' to ' + data.to +
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
* Returns all the unread post-it of the recipient user from the _postit_ database table.
*
* @method getAllUnreadPostitOfRecipient
* @param {string}   username The username of the recipient
* @param {function} cb       The callback function
*/
function getAllUnreadPostitOfRecipient(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.POSTIT].findAll({
            where: [ 'recipient=? ' +
            'AND readdate IS NULL',
            username ],
            order: 'creation DESC',
            attributes: [
                [ 'DATE_FORMAT(creation, "%d/%m/%Y")', 'creationdate'],
                [ 'DATE_FORMAT(creation, "%H:%i:%S")', 'creationtime'],
                [ 'DATE_FORMAT(readdate, "%d/%m/%Y")', 'readdate'],
                [ 'DATE_FORMAT(readdate, "%H:%i:%S")', 'timeread'],
                'id', 'text', 'creator', 'recipient'
            ]

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching all unread postit of the recipient user "' + username + '"');
            cb(null, username, results);

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search all unread postit of the recipient user "' + username + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the history post-it of all the users into the interval time.
* It can be possible to filter out the results specifying the filter. It search
* the results into the _postit_ database.
*
* @method getAllUserHistoryPostitInterval
* @param {object} data
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _recipient_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getAllUserHistoryPostitInterval(data, cb) {
    try {
        getHistoryPostitInterval(data, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

apiList.getPostit                       = getPostit;
apiList.savePostit                      = savePostit;
apiList.deletePostit                    = deletePostit;
apiList.updatePostitReadIt              = updatePostitReadIt;
apiList.EVT_DELETED_POSTIT              = EVT_DELETED_POSTIT;
apiList.getHistoryPostitInterval        = getHistoryPostitInterval;
apiList.getAllUnreadPostitOfRecipient   = getAllUnreadPostitOfRecipient;
apiList.getAllUserHistoryPostitInterval = getAllUserHistoryPostitInterval;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
