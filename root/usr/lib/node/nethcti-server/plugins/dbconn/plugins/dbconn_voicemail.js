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
* @default [plugins/dbconn_voicemail]
*/
var IDLOG = '[plugins/dbconn_voicemail]';

/**
* Fired when a voice message has been deleted from the database by the _deleteVoiceMessage_ method.
*
* @event deleteVoiceMessage
* @param {object} voicemail The voicemail identifier
*/
/**
* The name of the listened voice message event.
*
* @property EVT_DELETED_VOICE_MESSAGE
* @type string
* @default "deleteVoiceMessage"
*/
var EVT_DELETED_VOICE_MESSAGE = 'deleteVoiceMessage';

/**
* Fired when a voice message content has been read from the database by the _listenVoiceMessage_ method.
*
* @event listenedVoiceMessage
* @param {object} voicemail The voicemail identifier
*/
/**
* The name of the listened voice message event.
*
* @property EVT_LISTENED_VOICE_MESSAGE
* @type string
* @default "listenedVoiceMessage"
*/
var EVT_LISTENED_VOICE_MESSAGE = 'listenedVoiceMessage';

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
* Gets all the voice messages of a voicemail of the specified type. It search the
* results into the _asteriskcdrdb.voicemessages_ database. The type can be "new" or "old".
*
* @method getVoicemailMsg
* @param {string} vmId The voicemail identifier
* @param {string} type The type of the voicemail to retrieve. It can be "new" or "old"
* @param {function} cb The callback function
*/
function getVoicemailMsg(vmId, type, cb) {
    try {
        // check parameters
        if (typeof vmId !== 'string' || typeof cb !== 'function'
            || (   type !== 'old'    && type      !== 'new')) {

            throw new Error('wrong parameters');
        }

        // convert the type if it's a "new" value. This is because the query search
        // on "dir" field that is the filesystem path that can terminate with "Old"
        // or "INBOX" values
        if (type === 'new') { type = 'inbox'; }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.VOICEMAIL].findAll({
            where: [
                'mailboxuser=? AND ' +
                'LOWER(RIGHT(dir, ' + type.length + '))=? ' +
                'ORDER BY origtime DESC',
                vmId, type
            ],
            attributes: [
                [ 'origtime * 1000', 'origtime' ],
                [ 'TIME_FORMAT(SEC_TO_TIME(duration), "%i:%s")', 'duration' ],
                'id', 'dir', 'callerid', 'mailboxuser'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching ' + type + ' voice messages of voicemail "' + vmId + '"');
            cb(null, vmId, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching ' + type + ' voice messages of voicemail "' + vmId + '"');
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the new voice messages of a voicemail. It search the
* results into the _asteriskcdrdb.voicemessages_ database.
*
* @method getVoicemailNewMsg
* @param {string} vmId The voicemail identifier
* @param {function} cb The callback function
*/
function getVoicemailNewMsg(vmId, cb) {
    try {
        // check parameters
        if (typeof vmId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        getVoicemailMsg(vmId, 'new', cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all the old voice messages of a voicemail. It search the
* results into the _asteriskcdrdb.voicemessages_ database.
*
* @method getVoicemailOldMsg
* @param {string} vmId The voicemail identifier
* @param {function} cb The callback function
*/
function getVoicemailOldMsg(vmId, cb) {
    try {
        // check parameters
        if (typeof vmId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        getVoicemailMsg(vmId, 'old', cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Delete a voice message from the database table _asteriskcdrdb.voicemessages_.
*
* @method deleteVoiceMessage
* @param {string}   dbid The database identifier of the voice message to delete
* @param {function} cb   The callback function
*/
function deleteVoiceMessage(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.VOICEMAIL].find({
            where: [ 'id=?', dbid  ]

        }).success(function (task) {
            try {
                if (task) {

                    task.destroy().success(function () {

                        logger.info(IDLOG, 'voice message with db id "' + dbid + '" has been deleted successfully');
                        cb();

                        // emits the event for a deleted voice message
                        logger.info(IDLOG, 'emit event "' + EVT_DELETED_VOICE_MESSAGE + '" for voicemail ' + task.selectedValues.mailboxuser);
                        emitter.emit(EVT_DELETED_VOICE_MESSAGE, task.selectedValues.mailboxuser);
                    });

                } else {
                    var str = 'deleting voice message with db id "' + dbid + '": entry not found';
                    logger.warn(IDLOG, str);
                    cb(str);
                }

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching voice message with db id "' + dbid + '" to delete not found: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns audio file from the id mailbox.
*
* @method listenVoiceMessage
* @param {string}   dbid The voicemail identifier in the database
* @param {function} cb   The callback function
*/
function listenVoiceMessage(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.VOICEMAIL].find({
            where: [ 'id=?', dbid  ]

        }).success(function (result) {

            if (result && result.selectedValues && result.selectedValues.recording) {

                logger.info(IDLOG, 'obtained voicemail audio file from voicemail db id "' + dbid + '"');
                cb(null, result.selectedValues.recording);

                // if the voice message has never been read, it updates its status as "read".
                // If the message has never been read the "dir" field contains the "INBOX" string.
                // So if it's present it updates the field replacing the "INBOX" string with the "Old" one
                var dir = result.selectedValues.dir;
                if (dir.split('/').pop() === 'INBOX') {

                    result.updateAttributes({
                        dir: dir.substring(0, dir.length - 5) + 'Old'

                    }, [ 'dir' ]).success(function () {

                        logger.info(IDLOG, 'read status of the voice message with db id "' + dbid + '" has been updated successfully');

                        // emits the event for a listened voice message
                        logger.info(IDLOG, 'emit event "' + EVT_LISTENED_VOICE_MESSAGE + '" for voicemail ' + result.selectedValues.mailboxuser);
                        emitter.emit(EVT_LISTENED_VOICE_MESSAGE, result.selectedValues.mailboxuser);
                    });
                }

            } else {
                var str = 'getting voicemail audio file from db voice message id "' + dbid + '"';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching voicemail audio file from voicemail db id "' + dbid + '"');
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns the voicemail mailbox from the identifier of the voicemail in the database.
*
* @method getVmMailboxFromDbId
* @param {string}   dbid The voicemail identifier in the database
* @param {function} cb   The callback function
*/
function getVmMailboxFromDbId(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.VOICEMAIL].findAll({
            where:      [ 'id=?', dbid  ],
            attributes: [ 'mailboxuser' ]

        }).success(function (result) {

            if (result instanceof Array && result[0]) {
                logger.info(IDLOG, 'obtained voicemail mailbox "' + result[0].selectedValues.mailboxuser + '" from voicemail db id "' + dbid + '"');
                cb(null, result[0].selectedValues.mailboxuser);

            } else {
                var str = 'getting voicemail mailbox from db voice message id "' + dbid + '"';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching voicemail mailbox from voicemail db id "' + dbid + '"');
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

apiList.getVoicemailNewMsg         = getVoicemailNewMsg;
apiList.getVoicemailOldMsg         = getVoicemailOldMsg;
apiList.deleteVoiceMessage         = deleteVoiceMessage;
apiList.listenVoiceMessage         = listenVoiceMessage;
apiList.getVmMailboxFromDbId       = getVmMailboxFromDbId;
apiList.EVT_DELETED_VOICE_MESSAGE  = EVT_DELETED_VOICE_MESSAGE;
apiList.EVT_LISTENED_VOICE_MESSAGE = EVT_LISTENED_VOICE_MESSAGE;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
