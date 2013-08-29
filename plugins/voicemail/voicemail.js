/**
* Provides the voicemail functions.
*
* @module voicemail
* @main voicemail
*/
var async           = require('async');
var EventEmitter    = require('events').EventEmitter;
var vmFromDbAdapter = require('./voicemail_from_db_adapter');

/**
* Provides the voicemail functionalities.
*
* @class voicemail
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
* @default [voicemail]
*/
var IDLOG = '[voicemail]';

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
* Fired when new voice messages has been left in a voicemail.
*
* @event newVoicemail
* @param {object} voicemails The list of all the new voice messages of the voicemail
*/
/**
* The name of the new voicemail event.
*
* @property EVT_NEW_VOICEMAIL
* @type string
* @default "newVoicemail"
*/
var EVT_NEW_VOICEMAIL = 'newVoicemail';

/**
* The dbconn module.
*
* @property dbconn
* @type object
* @private
*/
var dbconn;

/**
* The asterisk proxy.
*
* @property astProxy
* @type object
* @private
*/
var astProxy;

/**
* The architect component to be used for user functions.
*
* @property compUser
* @type object
* @private
*/
var compUser;

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
* Set the user architect component.
*
* @method setCompUser
* @param {object} cu The architect user component
* @static
*/
function setCompUser(cu) {
    try {
        // check parameter
        if (typeof cu !== 'object') { throw new Error('wrong parameter'); }
        compUser = cu;
        logger.log(IDLOG, 'user component has been set');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the asterisk proxy to be used by the module.
*
* @method setAstProxy
* @param ap
* @type object The asterisk proxy.
*/
function setAstProxy(ap) {
    try {
        if (typeof ap !== 'object') {
            throw new Error('wrong asterisk proxy object');
        }
        astProxy = ap;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the list of all voice messages of the user, new and old. If the user
* doesn't have the voicemail, it calls the callback with false value as
* a result.
*
* @method getAllVoiceMessagesByUser
* @param {string}   username The username
* @param {function} cb       The callback function
*/
function getAllVoiceMessagesByUser(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var objres = {}; // object to return

        // get the voicemail list of the user
        var vms = compUser.getVoicemailList(username);

        // the user has no voicemail: call the callback with false value as result
        if (vms.length === 0) {
            var strlog = 'getting all voice messages: user "' + username + '" does not have the voicemail association';
            logger.info(IDLOG, strlog);
            cb(null, false);
            return;
        }

        logger.info(IDLOG, 'getting all voice messages: user "' + username + '" has the voicemail ' + vms.toString());

        // cycle in all user voicemail
        async.each(vms, function (vm, callback) {

            logger.info(IDLOG, 'get all voice messages (old & new) of voicemail "' + vm + '" of user "' + username + '"');

            // add voicemail object to return
            objres[vm] = { old: [], new: [] };

            // get old and new voice messages in parallel by dbconn module
            async.parallel([
                function (callback) {
                    logger.info(IDLOG, 'get all "old" voice messages of voicemail "' + vm + '" of user "' + username + '" by means dbconn module');
                    dbconn.getVoicemailOldMsg(vm, function (err, vmId, results) {
                        try {
                            if (err) { // some error in the query
                                logger.error(IDLOG, err);

                            } else { // add the result
                                objres[vmId].old = results;
                            }
                            callback();
    
                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            callback();
                        }
                    });
                },
                function (callback) {
                    logger.info(IDLOG, 'get all "new" voice messages of voicemail "' + vm + '" of user "' + username + '" by means dbconn module');
                    dbconn.getVoicemailNewMsg(vm, function (err, vmId, results) {
                        try {
                            if (err) { // some error in the query
                                logger.error(IDLOG, err);

                            } else { // add the result
                                objres[vmId].new = results;
                            }
                            callback();

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            callback();
                        }
                    });
                }
            ], function (err) { // async.parallel
                if (err) { logger.error(IDLOG, err); }
                callback();
            });


        }, function (err) { // async.each
            if (err) { logger.error(IDLOG, err); }

            // construct the output log
            var strlog = 'found ';
            var vm;
            for (vm in objres) {
                strlog += '[' + objres[vm].old.length + ' old ' + objres[vm].new.length + ' new - vm ' + vm + '] ';
            }
            strlog += 'all voicemail messages for user "' + username + '"';
            logger.info(IDLOG, strlog);

            cb(null, objres);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Gets the list of new voice messages of the user. If the user
* doesn't have the voicemail, it calls the callback with false value as
* a result.
*
* @method getNewVoiceMessagesByUser
* @param {string}   username The username
* @param {function} cb       The callback function
*/
function getNewVoiceMessagesByUser(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var objres = {}; // object to return

        // get the voicemail list of the user
        var vms = compUser.getVoicemailList(username);

        // the user has no voicemail: call the callback with false value as result
        if (vms.length === 0) {
            var strlog = 'getting new voice messages: user "' + username + '" does not have the voicemail association';
            logger.info(IDLOG, strlog);
            cb(null, false);
            return;
        }

        logger.info(IDLOG, 'getting new voice messages: user "' + username + '" has the voicemail ' + vms.toString());

        // cycle in all user voicemail
        async.each(vms, function (vm, callback) {

            logger.info(IDLOG, 'get new voice messages of voicemail "' + vm + '" of user "' + username + '"');

            // add voicemail object to return
            objres[vm] = { new: [] };

            // get new voice messages by dbconn module
            logger.info(IDLOG, 'get "new" voice messages of voicemail "' + vm + '" of user "' + username + '" by means dbconn module');
            dbconn.getVoicemailNewMsg(vm, function (err, results) {
                try {
                    if (err) { // some error in the query
                        logger.error(IDLOG, err);

                    } else { // add the result
                        objres[vm].new = results;
                    }
                    callback();

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    callback();
                }
            });

        }, function (err) { // async.each
            if (err) { logger.error(IDLOG, err); }

            // construct the output log
            var strlog = 'found ';
            var vm;
            for (vm in objres) {
                strlog += '[' + objres[vm].new.length + ' new - vm ' + vm + '] ';
            }
            strlog += 'new voicemail messages for user "' + username + '"';
            logger.info(IDLOG, strlog);

            cb(null, objres);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Gets the list of new messages of the specified voicemail.
*
* @method getNewMessagesOfVoicemail
* @param {string}   vm The voicemail identifier
* @param {function} cb The callback function
*/
function getNewMessagesOfVoicemail(vm, cb) {
    try {
        // check parameters
        if (typeof vm !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // get new voice messages by dbconn module
        logger.info(IDLOG, 'get "new" voice messages of voicemail "' + vm + '" by means dbconn module');
        dbconn.getVoicemailNewMsg(vm, function (err, results) {
            try {
                if (err) { // some error in the query
                    logger.error(IDLOG, err);
                    cb(err);

                } else { // add the result
                    logger.info(IDLOG, 'found [' + results.length + ' new - vm ' + vm + '] new voicemail message');
                    cb(null, results);
                }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
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
* Adds the listener to the asterisk proxy component.
*
* @method start
*/
function start() {
    try {
        // set the listener for the aterisk proxy module
        setAstProxyListeners();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the asterisk proxy component.
*
* @method setAstProxyListeners
* @private
*/
function setAstProxyListeners() {
    try {
        // check astProxy object
        if (!astProxy || typeof astProxy.on !== 'function') {
            throw new Error('wrong astProxy object');
        }

        astProxy.on(astProxy.EVT_NEW_VOICEMAIL, newVoicemail); // new voice message has been left in a voicemail
        logger.info(IDLOG, 'new listener has been set for "' + astProxy.EVT_NEW_VOICEMAIL + '" event from the asterisk proxy component');

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* New voicemail message has been left in a voicemail. It gets all the new voice messages
* of the voicemail and emits the _EVT\_NEW\_VOICEMAIL_ event with all the new voice messages.
*
* @method newVoicemail
* @param {object} ev The event data
* @private
*/
function newVoicemail(ev) {
    try {
        // check parameter
        if (   typeof ev           !== 'object'
            && typeof ev.voicemail !== 'string' && typeof ev.context  !== 'string'
            && typeof ev.countOld  !== 'string' && typeof ev.countNew !== 'string') {

            throw new Error('wrong parameter');
        }

        // get all the new voice messages of the voicemail
        dbconn.getVoicemailNewMsg(ev.voicemail, getVoicemailNewMsgCb);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Delete the specified voice message.
*
* @method deleteVoiceMessage
* @param {string}   id The voice message identifier in the database
* @param {function} cb The callback function
* @private
*/
function deleteVoiceMessage(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        dbconn.deleteVoiceMessage(id, cb);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the voicemail identifier from the voice message identifier of the database.
*
* @method getVmIdFromDbId
* @param {string}   dbid The voice message identifier in the database
* @param {function} cb   The callback function
* @private
*/
function getVmIdFromDbId(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        dbconn.getVmMailboxFromDbId(dbid, cb);

    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* It's the callback functino called when get new voicemail
* messages from the database component.
*
* @method getVoicemailNewMsgCb
* @param {object} err       The error
* @param {string} voicemail The voicemail identifier
* @param {object} results   The results
* @private
*/
function getVoicemailNewMsgCb(err, voicemail, results) {
    try {
        if (err) {
            var str = 'getting new voicemail messages: ';
            if (typeof err === 'string') { str += err; }
            else { str += err.stack; }

            logger.error(IDLOG, str);
            return [];
        }

        // check the parameters
        if (typeof voicemail !== 'string' || results instanceof Array === false) {
            throw new Error('wrong parameters');
        }

        var i;
        var arr = [];
        for (i = 0; i < results.length; i++) {

            // adapt current voice message data from the database
            // format to a uniform format
            arr.push(vmFromDbAdapter.adaptVoicemailData(results[i]));
        }

        // emits the new voicemail event with all the new voice messages of the voicemail
        emitter.emit(EVT_NEW_VOICEMAIL, voicemail, arr);

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

// public interface
exports.on                        = on;
exports.start                     = start;
exports.setLogger                 = setLogger;
exports.setDbconn                 = setDbconn;
exports.setAstProxy               = setAstProxy;
exports.setCompUser               = setCompUser;
exports.getVmIdFromDbId           = getVmIdFromDbId;
exports.EVT_NEW_VOICEMAIL         = EVT_NEW_VOICEMAIL;
exports.deleteVoiceMessage        = deleteVoiceMessage;
exports.getAllVoiceMessagesByUser = getAllVoiceMessagesByUser;
exports.getNewVoiceMessagesByUser = getNewVoiceMessagesByUser;
exports.getNewMessagesOfVoicemail = getNewMessagesOfVoicemail;
