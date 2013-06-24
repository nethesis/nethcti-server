/**
* Provides the voicemail functions.
*
* @module voicemail
* @main voicemail
*/
var async = require('async');

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
* The dbconn module.
*
* @property dbconn
* @type object
* @private
*/
var dbconn;

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
* Gets the list of all voice messages of the user. If the user
* has no voicemail, it calls the callback with false value as
* result.
*
* @method getAllVoiceMessages
* @param {string} username The username
* @param {function} cb The callback function
*/
function getAllVoiceMessages(username, cb) {
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
            var strlog = 'user "' + username + '" has no voicemail';
            logger.warn(IDLOG, strlog);
            cb(null, false);
            return;
        }

        logger.info(IDLOG, 'user "' + username + '" has the voicemail ' + vms.toString());

        // cycle in all user voicemail
        async.each(vms, function (vm, callback) {

            logger.info(IDLOG, 'get all voice messages (old & new) of voicemail "' + vm + '" of user "' + username + '"');

            // add voicemail object to return
            objres[vm] = { old: [], new: [] };

            // get old and new voice messages in parallel by dbconn module
            async.parallel([
                function (callback) {
                    logger.info(IDLOG, 'get all "old" voice messages of voicemail "' + vm + '" of user "' + username + '" by means dbconn module');
                    dbconn.getVoicemailOldMsg(vm, function (err, results) {
                        try {
                            if (err) { // some error in the query
                                logger.error(IDLOG, err);

                            } else { // add the result
                                objres[vm].old = results;
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
            strlog += 'voicemail messages for user "' + username + '"';
            logger.info(IDLOG, strlog);

            cb(null, objres);
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

// public interface
exports.setLogger           = setLogger;
exports.setDbconn           = setDbconn;
exports.setCompUser         = setCompUser;
exports.getAllVoiceMessages = getAllVoiceMessages;
