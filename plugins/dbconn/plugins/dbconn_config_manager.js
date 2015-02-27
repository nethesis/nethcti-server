/**
* Provides database functions.
*
* @module dbconn
* @submodule plugins
*/
var async = require('async');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins/dbconn_config_manager]
*/
var IDLOG = '[plugins/dbconn_config_manager]';

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
* Gets the settings of the user. The settings are
* stored in mysql table _user\_settings_.
*
* @method getUserSettings
* @param {string}   username The user identifier
* @param {function} cb       The callback function
*/
function getUserSettings(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.USER_SETTINGS].findAll({
            where: [ 'username=?', username ]

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results getting settings of user "' + username + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'getting settings of user "' + username + '": ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save the user notification settings. The settings are
* stored in mysql table _user\_settings_.
*
* @method saveUserNotifySetting
* @param {object}   data
*   @param {string} data.type     The type of the notification, e.g. "voicemail"
*   @param {string} data.when     When receive the notification type
*   @param {string} data.method   The method to use by the notification, e.g. "email"
*   @param {string} data.username The username to set the notification setting
* @param {function} cb            The callback function
*/
function saveUserNotifySetting(data, cb) {
    try {
        // check parameter
        if (   typeof data          !== 'object' || typeof data.type   !== 'string'
            || typeof data.when     !== 'string' || typeof data.method !== 'string'
            || typeof data.username !== 'string' || typeof cb          !== 'function') {

            throw new Error('wrong parameter');
        }

        // key name used into the database field "key_name"
        var keyName = 'notify_' + data.type + '_' + data.method + '_when';
        saveUserSetting(data.username, keyName, data.when, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save the user automatic queue login setting into mysql table _user\_settings_.
*
* @method saveUserAutoQueueLogin
* @param {object}   data
*   @param {string} data.username The username to set the notification setting
*   @param {string} data.enable   The value
* @param {function} cb            The callback function
*/
function saveUserAutoQueueLogin(data, cb) {
    try {
        // check parameter
        if (   typeof data        !== 'object'  || typeof data.username !== 'string'
            || typeof data.enable !== 'boolean' || typeof cb            !== 'function') {

            throw new Error('wrong parameter');
        }

        var value = (data.enable ? 'true' : 'false');
        saveUserSetting(data.username, 'auto_queue_login', value, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save the user automatic queue logout setting into mysql table _user\_settings_.
*
* @method saveUserAutoQueueLogout
* @param {object}   data
*   @param {string} data.username The username to set the notification setting
*   @param {string} data.enable   The value
* @param {function} cb            The callback function
*/
function saveUserAutoQueueLogout(data, cb) {
    try {
        // check parameter
        if (   typeof data        !== 'object'  || typeof data.username !== 'string'
            || typeof data.enable !== 'boolean' || typeof cb            !== 'function') {

            throw new Error('wrong parameter');
        }

        var value = (data.enable ? 'true' : 'false');
        saveUserSetting(data.username, 'auto_queue_logout', value, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save the user default extension setting into mysql table _user\_settings_.
*
* @method saveUserDefaultExtension
* @param {object}   data
*   @param {string} data.username The username to set the notification setting
*   @param {string} data.exten    The extension identifier
* @param {function} cb            The callback function
*/
function saveUserDefaultExtension(data, cb) {
    try {
        // check parameter
        if (   typeof data       !== 'object' || typeof data.username !== 'string'
            || typeof data.exten !== 'string' || typeof cb            !== 'function') {

            throw new Error('wrong parameter');
        }

        saveUserSetting(data.username, 'default_extension', data.exten, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save the user click 2 call setting into mysql table _user\_settings_.
*
* @method saveUserClick2CallSetting
* @param {object} data
*   @param {string} data.username   The user identifier
*   @param {string} data.type       The click to call type
*   @param {string} [data.user]     The username of the device
*   @param {string} [data.password] The password of the device
* @param {function} cb              The callback function
*/
function saveUserClick2CallSetting(data, cb) {
    try {
        // check parameters
        if (   typeof data !== 'object'    || typeof data.username !== 'string'
            || typeof cb   !== 'function'  || typeof data.type     !== 'string'
            || (data.type  !== 'automatic' && data.type            !== 'manual')
            || (data.type  === 'automatic' && typeof data.user     !== 'string')
            || (data.type  === 'automatic' && typeof data.password !== 'string')) {

            throw new Error('wrong parameters');
        }

        if (data.type === 'manual') {
            saveUserSetting(data.username, 'click2call_type', data.type, cb);

        } else if (data.type === 'automatic') {

            async.parallel([
                function (callback) {
                    saveUserSetting(data.username, 'click2call_type', data.type, function (err) {
                        try {
                            if (err) {
                                logger.error(IDLOG, err);
                                callback(err);
                            }
                            else { callback(); }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            callback(err);
                        }
                    });
                },
                function (callback) {
                    saveUserSetting(data.username, 'click2call_auto_user', data.user, function (err) {
                        try {
                            if (err) {
                                logger.error(IDLOG, err);
                                callback(err);
                            }
                            else { callback(); }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            callback(err);
                        }
                    });
                },
                function (callback) {
                    saveUserSetting(data.username, 'click2call_auto_pwd', data.password, function (err) {
                        try {
                            if (err) {
                                logger.error(IDLOG, err);
                                callback(err);
                            }
                            else { callback(); }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            callback(err);
                        }
                    });
                }

            ], function (err) {
                if (err) { logger.error(IDLOG, err); }
                cb(err);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Saves a key-value pair representing a user setting. The setting are
* stored in mysql table _user\_settings_.
*
* @method saveUserSetting
* @param {string}   username The username to set the setting
* @param {string}   keyName  The name of the key to store
* @param {string}   value    The value of the key
* @param {function} cb       The callback function
*/
function saveUserSetting(username, keyName, value, cb) {
    try {
        // check parameters
        if (   typeof username !== 'string' || typeof keyName !== 'string'
            || typeof value    !== 'string' || typeof cb      !== 'function') {

            throw new Error('wrong parameters');
        }

        // sequelize does not support mysql "INSERT ... ON DUPLICATE KEY UPDATE" statement
        // so if the entry is already present update it, otherwise create a new one
        compDbconnMain.models[compDbconnMain.JSON_KEYS.USER_SETTINGS].find({
            where: [ 'username=? AND key_name=?', username, keyName ]

        }).success(function (result) {

            if (!result) {
                // the key-value pair is not already present, so save the model into the database

                // get the sequelize model already loaded
                var userSetting = compDbconnMain.models[compDbconnMain.JSON_KEYS.USER_SETTINGS].build({
                    username: username,
                    key_name: keyName,
                    value:    value
                });

                userSetting.save()
                .success(function () { // the save was successful
                    logger.info(IDLOG, 'setting "' + keyName + ': ' + value + '" of user "' + username + '" saved successfully');
                    cb(null);

                }).error(function (err) { // manage the error
                    logger.error(IDLOG, 'saving settings "' + keyName + ': ' + value + '" of user "' + username + '": ' + err.toString());
                    cb(err.toString());
                });

                compDbconnMain.incNumExecQueries();

            } else {
                // the entry is already present, so updates it
                result.updateAttributes({
                    key_name: keyName,
                    value:    value

                }).success(function () {
                    logger.info(IDLOG, 'settings "' + keyName + ': ' + value + '" of user "' + username + '" has been updated successfully');
                    cb();
                });

                compDbconnMain.incNumExecQueries();
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search setting "' + keyName + '" for user "' + username + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

apiList.getUserSettings           = getUserSettings;
apiList.saveUserNotifySetting     = saveUserNotifySetting;
apiList.saveUserAutoQueueLogin    = saveUserAutoQueueLogin;
apiList.saveUserAutoQueueLogout   = saveUserAutoQueueLogout;
apiList.saveUserDefaultExtension  = saveUserDefaultExtension;
apiList.saveUserClick2CallSetting = saveUserClick2CallSetting;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
