/**
* Provides the fuctions for the configuration manager.
*
* @module config_manager
* @main arch_config_manager
*/
var fs               = require('fs');
var NOTIF_WHEN       = require('./user_config_keys').NOTIF_WHEN;
var USER_CONFIG_KEYS = require('./user_config_keys').USER_CONFIG_KEYS;

/**
* Provides the configuration manager functionalities. It sets the
* user configurations and stores it into the relative section of the
* configuration file.
*
* @class config_manager
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
* @default [config_manager]
*/
var IDLOG = '[config_manager]';

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
* The path of the file that contains the user configurations.
*
* @property configUserPath
* @type string
* @private
*/
var configUserPath;

/**
* The head key of the JSON configuration file that contains all user
* configuration settings.
*
* @property CONFIG_FILE_HEAD
* @type string
* @private
* @default "configurations"
*/
var CONFIG_FILE_HEAD = 'configurations';

/**
* The content of the JSON configuration file.
*
* @property contentJsonConfigFile
* @type object
* @private
*/
var contentJsonConfigFile;

/**
* The user module.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The server chat parameters. It can be customized using the JSON
* configuration file by means _configChat_ method.
*
* @property chatServer
* @type object
* @private
* @default { "url": "" }
*/
var chatServer = { 'url': '' };

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
* Set the user module to be used.
*
* @method setCompUser
* @param {object} cu The user module.
*/
function setCompUser(cu) {
    try {
        // check parameter
        if (typeof cu !== 'object') { throw new Error('wrong user object'); }
        compUser = cu;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the configuration file and set the options in the User
* objects using the _user_ module.
*
* **The method can throw an Exception.**
*
* @method configUser
* @param {string} path The path of the configuration file
*/
function configUser(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    configUserPath = path;
    logger.info(IDLOG, 'configure user configurations with ' + configUserPath);

    // read configuration file
    contentJsonConfigFile = require(configUserPath);

    // check JSON file
    if (typeof contentJsonConfigFile !== 'object') { throw new Error('wrong JSON file ' + configUserPath); }

    // cycle user configurations and set the configuration in the
    // User objects using user module
    var userTemp;
    for (userTemp in contentJsonConfigFile) {

        // check the configuration object of the user
        if (   typeof contentJsonConfigFile[userTemp]                   === 'object'
            && typeof contentJsonConfigFile[userTemp][CONFIG_FILE_HEAD] === 'object') {

            // with this operation, the configuration set in the User object is a reference link to the
            // "contentJsonConfigFile" property. So the future change in the configurations of the User
            // object is reported in the "contentJsonConfigFile" property
            compUser.setConfigurations(userTemp, contentJsonConfigFile[userTemp][CONFIG_FILE_HEAD]);

        } else {
            logger.error(IDLOG, 'wrong configuration for user "' + userTemp + '" in file ' + configUserPath);
        }
    }
    logger.info(IDLOG, 'user configuration by file ' + path + ' ended');
}

/**
* It reads the configuration file and set the chat options. The
* file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method configChat
* @param {string} path The path of the configuration file
*/
function configChat(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    logger.info(IDLOG, 'configure server chat with ' + path);

    // read configuration file
    var json = require(path);

    // check JSON file
    if (typeof json !== 'object') { throw new Error('wrong JSON file ' + path); }

    // configure chat url
    if (typeof json.url === 'string') {
        chatServer.url = json.url;
        logger.info(IDLOG, 'configured chat URL as ' + chatServer.url);
    }
    logger.info(IDLOG, 'server chat configuration by file ' + path + ' ended');
}

/**
* Return the server chat configurations.
*
* @method getChatConf
* @return {object} The server chat configurations.
*/
function getChatConf() {
    try {
        return chatServer;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the user configurations.
*
* @method getUserConfigurations
* @param {string} user The user identifier
* @return {object} The user configurations.
*/
function getUserConfigurations(user) {
    try {
        // check parameter
        if (typeof user !== 'string') { throw new Error('wrong parameter'); }

        return compUser.getConfigurations(user);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the user endpoints.
*
* @method getUserEndpointsJSON
* @param {string} userid The user identifier
* @return {object} The user endpoints in JSON format.
*/
function getUserEndpointsJSON(userid) {
    try {
        // check parameter
        if (typeof userid !== 'string') { throw new Error('wrong parameter'); }

        return compUser.getEndpointsJSON(userid);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the endpoints of all users.
*
* @method getAllUserEndpointsJSON
* @return {object} The endpoints of all users in JSON format.
*/
function getAllUserEndpointsJSON() {
    try {
        return compUser.getAllUsersEndpointsJSON();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Saves the specified notification setting for the user.
*
* @method setUserNotificationConf
* @param {object}   data
*   @param {string} data.type     The type of the notification, e.g. "voicemail"
*   @param {string} data.when     When receive the notification type
*   @param {string} data.method   The method to use by the notification, e.g. "email"
*   @param {string} data.username The username to set the notification setting
* @param {function} cb            The callback function
*/
function setUserNotificationConf(data, cb) {
    try {
        // check parameter
        if (   typeof data          !== 'object' || typeof data.type   !== 'string'
            || typeof data.when     !== 'string' || typeof data.method !== 'string'
            || typeof data.username !== 'string' || typeof cb          !== 'function'
            || typeof data.to       !== 'string') {

            throw new Error('wrong parameter');
        }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(data.username);

        // update the User object. Change the specified notification settings.
        // This update is automatically reported in the User object because
        // it's a reference link to it.
        // Also the relative section of "contentJsonConfigFile" property is automatically
        // updated, because the "configUser" function sets the user configurations to be
        // a reference link to it.
        logger.info(IDLOG, 'update notifications settings of user "' + data.username + '"');
        config[USER_CONFIG_KEYS.notifications][data.type][data.method].to   = data.to;
        config[USER_CONFIG_KEYS.notifications][data.type][data.method].when = data.when;

        // update the notification settings section in the configuration file in the filesystem
        // store the configurations of all the users. This is because the _contentJsonConfigFile_
        // property contains all the users
        storeAllUsersConfigurations(data.username, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Stores the configurations of all the users.
*
* @method storeAllUsersConfigurations
* @param {object}   username The username to update the notification settings
* @param {function} cb       The callback function
* @private
*/
function storeAllUsersConfigurations(username, cb) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // store the configurations of all the users in the JSON configuration file
        updateAllUsersConfInJSONFile(cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Stores the configurations of all the users in the JSON configuration file.
*
* @method updateAllUsersConfInJSONFile
* @param {function} cb The callback function
* @private
*/
function updateAllUsersConfInJSONFile(cb) {
    try {
        // check parameter
        if (typeof cb !== 'function') { throw new Error('wrong parameter'); }

        // updated JSON configuration file with the "contentJsonConfigFile" property. It's updated
        // changing the configuration settings of the users
        fs.writeFile(configUserPath, JSON.stringify(contentJsonConfigFile, null, 4), function (err) {
            try {

                if (err) {
                    logger.error(IDLOG, 'updating configurations file ' + configUserPath);
                    cb(err.toString());

                } else {
                    logger.info(IDLOG, configUserPath + ' has been updated successfully');
                    cb(null);
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

/**
* Saves the specified notification setting for the user.
*
* @method setUserClick2CallConf
* @param {object} data
*   @param {string} data.type     The click to call type
*   @param {string} data.device   The device brand or the "url" string
*   @param {string} data.model    The model of the device
*   @param {string} data.user     The username of the device
*   @param {string} data.password The password of the device
*   @param {string} data.url      The HTTP url to use the device for click to call
* @param {function} cb            The callback function
*/
function setUserClick2CallConf(data, cb) {
    try {
        // check parameters
        if (typeof data   !== 'object'    || typeof cb !== 'function' || typeof data.type !== 'string'
            || (data.type !== 'automatic' && data.type !== 'manual')
            || (data.type === 'automatic' && typeof data.device !== 'string')
            || (data.type === 'automatic' && data.device === 'yealink' && (typeof data.user !== 'string' || typeof data.password !== 'string' || typeof data.model !== 'string'))
            || (data.type === 'automatic' && data.device === 'snom'    && (typeof data.user !== 'string' || typeof data.password !== 'string'))
            || (data.type === 'automatic' && data.device === 'url'     &&  typeof data.url  !== 'string')) {

            throw new Error('wrong parameter');
        }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(data.username);

        // update the User object. Change the specified click2call setting.
        // This update is automatically reported in the User object because
        // it's a reference link to it.
        // Also the relative section of "contentJsonConfigFile" property is automatically
        // updated, because the "configUser" function sets the user configurations to be
        // a reference link to it.
        logger.info(IDLOG, 'update click2call setting of user "' + data.username + '"');

        config[USER_CONFIG_KEYS.click2call].type = data.type;

        if (data.type === 'automatic' && data.device === 'yealink') {
            config[USER_CONFIG_KEYS.click2call].automatic.device           = data.device;
            config[USER_CONFIG_KEYS.click2call].automatic.yealink.user     = data.user;
            config[USER_CONFIG_KEYS.click2call].automatic.yealink.model    = data.model;
            config[USER_CONFIG_KEYS.click2call].automatic.yealink.password = data.password;

        } else if (data.type === 'automatic' && data.device === 'snom') {
            config[USER_CONFIG_KEYS.click2call].automatic.device        = data.device;
            config[USER_CONFIG_KEYS.click2call].automatic.snom.user     = data.user;
            config[USER_CONFIG_KEYS.click2call].automatic.snom.password = data.password;

        } else if (data.type === 'automatic' && data.device === 'url') {
            config[USER_CONFIG_KEYS.click2call].automatic.device = data.device;
            config[USER_CONFIG_KEYS.click2call].automatic.url    = data.url;

        } else if (data.type !== 'manual') {
            logger.error(IDLOG, 'setting click2call setting for user "' + data.username + '"');
        }

        // update the notification settings section in the configuration file in the filesystem
        // store the configurations of all the users. This is because the _contentJsonConfigFile_
        // property contains all the users
        storeAllUsersConfigurations(data.username, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Checks the user voicemail notification configurations and returns true if he
* wants to receives the voicemail notification by the specified delivery method.
*
* @method verifySendVoicemailNotification
* @param  {string}  username       The username identifier
* @param  {string}  deliveryMethod The delivery method, e.g. email or sms
* @return {boolean} True if the user wants to receive the voicemail notification
*   by the specified delivery method.
*/
function verifySendVoicemailNotification(username, deliveryMethod) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof deliveryMethod !== 'string') {
            throw new Error('wrong parameters');
        }

        var conf = compUser.getConfigurations(username);

        // check the configurations of the user
        if (   typeof conf                                                           !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications]                           !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail                 !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail[deliveryMethod] !== 'object') {

            logger.warn(IDLOG, 'checking if send voicemail notification by "' + deliveryMethod + '" for user "' + username + '": ' +
                               'wrong notification configurations');
            return false;
        }

        var when = conf[USER_CONFIG_KEYS.notifications].voicemail[deliveryMethod].when;

        if      (when === NOTIF_WHEN.always)  { return true;  }
        else if (when === NOTIF_WHEN.never)   { return false; }
        else if (when === NOTIF_WHEN.offline) {
            // checks if the presence of all the nethcti user endpoints is offline
            var nethctiEndpoints = compUser.getAllEndpointsNethcti(username);
            var end;
            var allOffline = true;
            for (end in nethctiEndpoints) {
                allOffline = allOffline && (nethctiEndpoints[end].getStatus() === NOTIF_WHEN.offline);
            }
            return allOffline;

        } else {
            logger.warn(IDLOG, 'checking if send voicemail notification by "' + deliveryMethod + '" for user "' + username + '": ' +
                               'wrong when value "' + when + '"');
            return false;
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Checks the user voicemail notification configurations and returns true if he
* wants to receives the voicemail notification by email.
*
* @method verifySendVoicemailNotificationByEmail
* @param  {string}  username The username identifier
* @return {boolean} True if the user wants to receive the voicemail notification by email
*/
function verifySendVoicemailNotificationByEmail(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return verifySendVoicemailNotification(username, 'email');

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Checks the user voicemail notification configurations and returns true if he
* wants to receives the voicemail notification by sms.
*
* @method verifySendVoicemailNotificationBySms
* @param  {string}  username The username identifier
* @return {boolean} True if the user wants to receive the voicemail notification by sms
*/
function verifySendVoicemailNotificationBySms(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return verifySendVoicemailNotification(username, 'sms');

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Returns the destination email address for the voicemail notification of the user.
*
* @method getVoicemailNotificationEmailTo
* @param  {string} username The username identifier
* @return {string} The destination email address.
*/
function getVoicemailNotificationEmailTo(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        var conf = compUser.getConfigurations(username);

        // check the configurations of the user
        if (   typeof conf                                                    !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications]                    !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail          !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail.email    !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail.email.to !== 'string') {

            logger.warn(IDLOG, 'getting email destination for voicemail notification of user "' + username + '": wrong configurations');
            return '';
        }

        return conf[USER_CONFIG_KEYS.notifications].voicemail.email.to;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Returns the destination sms number for the voicemail notification of the user.
*
* @method getVoicemailNotificationSmsTo
* @param  {string} username The username identifier
* @return {string} The destination sms number.
*/
function getVoicemailNotificationSmsTo(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        var conf = compUser.getConfigurations(username);

        // check the configurations of the user
        if (   typeof conf                                                  !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications]                  !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail        !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail.sms    !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].voicemail.sms.to !== 'string') {

            logger.warn(IDLOG, 'getting sms destination number for voicemail notification of user "' + username + '": wrong configurations');
            return '';
        }

        return conf[USER_CONFIG_KEYS.notifications].voicemail.sms.to;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

// public interface
exports.setLogger                              = setLogger;
exports.configUser                             = configUser;
exports.configChat                             = configChat;
exports.getChatConf                            = getChatConf;
exports.setCompUser                            = setCompUser;
exports.getUserEndpointsJSON                   = getUserEndpointsJSON;
exports.getUserConfigurations                  = getUserConfigurations;
exports.setUserClick2CallConf                  = setUserClick2CallConf;
exports.getAllUserEndpointsJSON                = getAllUserEndpointsJSON;
exports.setUserNotificationConf                = setUserNotificationConf;
exports.getVoicemailNotificationSmsTo          = getVoicemailNotificationSmsTo;
exports.getVoicemailNotificationEmailTo        = getVoicemailNotificationEmailTo;
exports.verifySendVoicemailNotificationBySms   = verifySendVoicemailNotificationBySms;
exports.verifySendVoicemailNotificationByEmail = verifySendVoicemailNotificationByEmail;
