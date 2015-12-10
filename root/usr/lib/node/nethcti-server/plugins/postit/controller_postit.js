/**
* Provides the post-it functions.
*
* @module postit
* @main arch_controller_postit
*/
var EventEmitter = require('events').EventEmitter;

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
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

/**
* Fired when new post-it has been created for a user, or a post-it has been read or deleted.
*
* @event updateNewPostit
* @param {object} postits The list of all unread post-it of the recipient user
*/
/**
* The name of the event for update of the new post-it messages.
*
* @property EVT_UPDATE_NEW_POSTIT
* @type string
* @default "updateNewPostit"
*/
var EVT_UPDATE_NEW_POSTIT = 'updateNewPostit';

/**
* Fired when new post-it has been created for a user.
*
* @event newPostit
* @param {object} postits The list of all unread post-it of the recipient user
*/
/**
* The name of the new post-it event.
*
* @property EVT_NEW_POSTIT
* @type string
* @default "newPostit"
*/
var EVT_NEW_POSTIT = 'newPostit';

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
* Returns the post-it with the specified unique identifier.
*
* @method getPostit
* @param {string}   id The unique identifier of the post-it message
* @param {function} cb The callback function
*/
function getPostit(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'get postit by means dbconn module');
        dbconn.getPostit(id, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns all the new post-it messages of the user.
*
* @method getNewPostit
* @param {string}   username The name of the user
* @param {function} cb       The callback function
*/
function getNewPostit(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'get all new postit messages of user "' + username + '" by means dbconn module');
        dbconn.getAllUnreadPostitOfRecipient(username, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns the post-it with the specified unique identifier and update the
* read status of the post-it.
*
* @method readPostit
* @param {string}   username The username of the reader
* @param {string}   id       The unique identifier of the post-it message
* @param {function} cb       The callback function
*/
function readPostit(username, id, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // read the content of the post-it message to return, then update the read date of the message
        // only if the reader is the recipient. Then emits the event to update the new post-it messages
        // of the recipient only if the message was unread
        logger.info(IDLOG, 'get postit by means dbconn module');
        dbconn.getPostit(id, function (err1, result) {
            try {
                cb(err1, result);
                getPostitCb(err1, username, id, result);

            } catch (err2) {
                logger.error(IDLOG, err2.stack);
                cb(err2);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Updates the read date status of the postit only if the reader is the recipient
* of the post-it. Then emits the event to update all the new post-it messages of
* the recipient user. The event is emitted only if the message was new before read
* it and the read status has been updated.
*
* @method getPostitCb
* @param {object} err      The error object
* @param {string} username The username of the reader
* @param {string} id       The post-it database identifier
* @param {object} result   The result object of the query
*/
function getPostitCb(err, username, id, result) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof id !== 'string' || typeof result !== 'object') {
            throw new Error('wrong parameters');
        }

        // update the read date status of the postit only if the readere is the recipient of the post-it
        if (username === result.recipient) {

            logger.info(IDLOG, 'update the read date status of the postit with db id "' + id + '"');
            dbconn.updatePostitReadIt(id, function (err1) {
                try {
                    if (err1) {
                        logger.info(IDLOG, 'updating read date status of the postit with db id "' + id + '"');

                    } else {
                        logger.info(IDLOG, 'read date status of the postit with db id "' + id + '" has been updated successfully');

                        // emit the event to update all the new post-it messages of the recipient user only if
                        // the message was new before read it and the read status has been updated
                        // get all the new postit of the recipient to emit the events through the callback
                        dbconn.getAllUnreadPostitOfRecipient(result.recipient, readPostitCb);
                    }

                } catch (err2) {
                    logger.error(IDLOG, err2.stack);
                }
            });
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Deletes the post-it with the specified unique identifier.
*
* @method deletePostit
* @param {string}   id The unique identifier of the post-it message
* @param {function} cb The callback function
*/
function deletePostit(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'delete postit by means dbconn module');
        dbconn.deletePostit(id, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Changes the post-it with the specified unique identifier.
*
* @method modifyPostit
* @param {string}   id   The unique identifier of the post-it message
* @param {string}   text The text of the post-it message
* @param {function} cb   The callback function
*/
function modifyPostit(id, text, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof text !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'modify postit with id "' + id + '" by means dbconn module');
        dbconn.modifyPostit(id, text, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates a new post-it and save it in the database.
*
* @method newPostit
* @param {object} data
*   @param {string} data.recipient The recipient of the post-it
*   @param {string} data.creator   The creator of the post-it
*   @param {string} data.text      The text of the message
* @param {function} cb The callback function
*/
function newPostit(data, cb) {
    try {
        // check parameter
        if (typeof data         !== 'object' || typeof data.text      !== 'string' ||
            typeof data.creator !== 'string' || typeof data.recipient !== 'string') {

            throw new Error('wrong parameter');
        }

        save(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Save the post-it data into the database using dbconn module. Then gets
* all the unread post-it of the recipient user and emit the new post-it
* event EVT_NEW_POSTIT.
*
* @method save
* @param {object} data
*   @param {string} data.recipient The recipient of the post-it
*   @param {string} data.creator   The creator of the post-it
*   @param {string} data.text      The text of the message
* @param {function} cb The callback function
*/
function save(data, cb) {
    try {
        // check parameter
        if (typeof data         !== 'object' || typeof data.text      !== 'string' ||
            typeof data.creator !== 'string' || typeof data.recipient !== 'string') {

            throw new Error('wrong parameter');
        }

        logger.info(IDLOG, 'save postit by means dbconn module');
        dbconn.savePostit(data.creator, data.text, data.recipient, function (err) {
            try {
                if (err) {
                    cb(err);

                } else {
                    cb();

                    // get all the new postit of the recipient to emit the events through the callback
                    dbconn.getAllUnreadPostitOfRecipient(data.recipient, function (err, recipient, results) {
                        newPostitCb(err, data.creator, recipient, results);
                    });
                }
            } catch (err1) {
                logger.error(IDLOG, err1.stack);
                cb(err1);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* It's the callback function called when get all unread postit
* of a recipient user from the database component. It's called when
* a new post-it message has been created for a recipient user.
*
* @method newPostitCb
* @param {object} err       The error
* @param {string} creator   The creator username of the new post-it
* @param {string} recipient The recipient username of the new post-it
* @param {object} results   All the unread post-it of the recipient user
* @private
*/
function newPostitCb(err, creator, recipient, results) {
    try {
        if (err) {
            var str = 'getting all unread postit of recipient user ' + username + ': ';
            if (typeof err === 'string') { str += err; }
            else { str += err.stack; }

            logger.error(IDLOG, str);
            return;
        }

        // check the parameters
        if (typeof creator   !== 'string' ||
            typeof recipient !== 'string' || results instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        // emits the new postit event with all the unread postit of the recipient user. This event
        // is emitted only when a new post-it has been created
        logger.info(IDLOG, 'emit event ' + EVT_NEW_POSTIT + ' created by ' + creator + ' for ' + recipient);
        emitter.emit(EVT_NEW_POSTIT, creator, recipient, results);

        // emits the event with the update of new postit of the recipient user. This event is emitted
        // each time a new post-it has been left, when the user read it or delete it
        logger.info(IDLOG, 'emit event ' + EVT_UPDATE_NEW_POSTIT + ' for recipient user ' + recipient);
        emitter.emit(EVT_UPDATE_NEW_POSTIT, recipient, results);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* It's the callback function called when get all unread postit
* of a recipient user from the database component. It's called when
* a new post-it message has been created for a recipient user.
*
* @method updateNewPostitCb
* @param {object} err       The error
* @param {string} recipient The recipient username of the new post-it
* @param {object} results   All the unread post-it of the recipient user
* @private
*/
function updateNewPostitCb(err, recipient, results) {
    try {
        if (err) {
            var str = 'getting all unread postit of recipient user ' + username + ': ';
            if (typeof err === 'string') { str += err; }
            else { str += err.stack; }

            logger.error(IDLOG, str);
            return;
        }

        // check the parameters
        if (typeof recipient !== 'string' || results instanceof Array === false) {
            throw new Error('wrong parameters');
        }

        // emits the event with the update of new postit of the recipient user. This event is emitted
        // each time a new post-it has been left, when the user read it or delete it
        logger.info(IDLOG, 'emit event ' + EVT_UPDATE_NEW_POSTIT + ' for recipient user ' + recipient);
        emitter.emit(EVT_UPDATE_NEW_POSTIT, recipient, results);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Subscribe a callback function to a custom event fired by this object.
* It's the same of nodejs _events.EventEmitter.on_ method.
*
* @method on
* @param  {string}   type The name of the event
* @param  {function} cb   The callback to execute in response to the event
* @return {object}   A subscription handle capable of detaching that subscription.
*/
function on(type, cb) {
    try {
        return emitter.on(type, cb);
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
        cb(err);
    }
}

/**
* Gets the history of the post-it created by all the users into the interval time.
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

        logger.info(IDLOG, 'search all history post-it of all users between ' + data.from + ' to ' + data.to +
                           ' and filter ' + (data.filter ? data.filter : '""'));
        dbconn.getAllUserHistoryPostitInterval(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Start the components.
*
* @method start
*/
function start() {
    try {
        setDbconnListeners();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the database component.
*
* @method setDbconnListeners
* @private
*/
function setDbconnListeners() {
    try {
        // check dbconn object
        if (!dbconn || typeof dbconn.on !== 'function') {
            throw new Error('wrong dbconn object');
        }

        // a post-it has been deleted
        dbconn.on(dbconn.EVT_DELETED_POSTIT, evtDeletedPostit);
        logger.info(IDLOG, 'new listener has been set for "' + dbconn.EVT_DELETED_POSTIT + '" event from the dbconn component');

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* A post-it has been deleted from the database.
*
* @method evtDeletedPostit
* @param {object} recipient The username of the recipient
*/
function evtDeletedPostit(recipient) {
    try {
        // check parameter
        if (typeof recipient !== 'string') { throw new Error('wrong parameter'); }

        logger.info(IDLOG, 'received event "' + dbconn.EVT_DELETED_POSTIT + '" from dbconn component of recipient user ' + recipient);
        // get all the new postit of the recipient to emit the events through the callback
        dbconn.getAllUnreadPostitOfRecipient(recipient, deletedPostitCb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* A post-it has been deleted from the database.
* It's the callback function called when get new post-it messages from
* the database component, after a post-it has been deleted by a user.
*
* @method deletedPostitCb
* @param {object} err       The error
* @param {string} recipient The username of the recipient
* @param {object} results   All the unread post-it of the recipient user
*/
function deletedPostitCb(err, recipient, results) {
    try {
        updateNewPostitCb(err, recipient, results);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* A post-it has been read from the database.
* It's the callback function called when get new post-it messages from
* the database component, after a post-it has been read by a user.
*
* @method readPostitCb
* @param {object} err       The error
* @param {string} recipient The username of the recipient
* @param {object} results   All the unread post-it of the recipient user
*/
function readPostitCb(err, recipient, results) {
    try {
        updateNewPostitCb(err, recipient, results);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.on                        = on;
exports.start                     = start;
exports.newPostit                 = newPostit;
exports.getPostit                 = getPostit;
exports.setLogger                 = setLogger;
exports.setDbconn                 = setDbconn;
exports.readPostit                = readPostit;
exports.getNewPostit              = getNewPostit;
exports.deletePostit              = deletePostit;
exports.modifyPostit              = modifyPostit;
exports.EVT_NEW_POSTIT            = EVT_NEW_POSTIT;
exports.getHistoryInterval        = getHistoryInterval;
exports.EVT_UPDATE_NEW_POSTIT     = EVT_UPDATE_NEW_POSTIT;
exports.getAllUserHistoryInterval = getAllUserHistoryInterval;
