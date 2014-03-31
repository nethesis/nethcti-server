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
* The path of the file that contains the user preferences.
*
* @property userPrefsPath
* @type string
* @private
*/
var userPrefsPath;

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
* The content of the JSON preferences and configurations file.
*
* @property contentConfPrefJson
* @type object
* @private
*/
var contentConfPrefJson;

/**
* The user module.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The server IP address. It will be customized by the _config_ method.
*
* @property serverIp
* @type string
* @private
* @default ""
*/
var serverIp = '';

/**
* The server chat parameters. It can be customized using the JSON
* configuration file by means _configChat_ method.
*
* @property chatServer
* @type object
* @private
* @default {}
*/
var chatServer = {};

/**
* The phone urls used to directly intercat with the phone, e.g. to
* originate a new call.
*
* @property phoneUrls
* @type object
* @private
* @default {}
*/
var phoneUrls = {};

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
* Returns the default user preferences.
*
* @method getDefaultUserPrefs
* @return {object} The default user preferences
*/
function getDefaultUserPrefs() {
    try {
        var obj = {
            click2call: {
                type: 'manual',
                automatic: {
                    user: 'admin',
                    password: 'admin'
                }
            },
            notifications: {
                postit: {
                    sms: {
                        when: 'never'
                    },
                    email: {
                        when: 'never'
                    }
                },
                voicemail: {
                    sms: {
                        when: 'never'
                    },
                    email: {
                        when: 'never'
                    }
                }
            },
            default_extension: ''
        };

        return obj;

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
* @param {object} obj
*   @param {string} obj.users     The path of the configuration file with user endpoints, authorizations, ...
*   @param {string} obj.userPrefs The path of the user preferences file, e.g. notification preferences
*/
function configUser(obj) {
    try {
        // check parameter
        if (typeof obj !== 'object' || typeof obj.users !== 'string' || typeof obj.userPrefs !== 'string') {
            throw new TypeError('wrong parameter');
        }

        // check file presence
        if (!fs.existsSync(obj.users)) { throw new Error(obj.users + ' doesn\'t exist'); }

        // global property used also by other methods
        userPrefsPath = obj.userPrefs;
        logger.info(IDLOG, 'configure user prefs with ' + userPrefsPath + ' and configs with ' + obj.users);

        // read the user configuration file (endpoint associations, authorizations, ...)
        contentConfPrefJson = require(obj.users);

        // read the user preferences file. If the user has never saved its preferences,
        // the file doesn't exist and so default preference values are used
        var userPrefs = {};
        if (!fs.existsSync(obj.userPrefs)) {
            logger.info(obj.userPrefs + ' doesn\'t exist');

        } else {
            userPrefs = require(userPrefsPath);
        }

        // merge configurations (from obj.users file) and preferences (from obj.userPrefs file) in one single object
        var username, emailEndpoints, firstEmailEndpoint, cellphoneEndpoints, firstCellphoneEndpoint, extenEndpoints, firstExtenEndpoint;
        for (username in contentConfPrefJson) {

            // get the extension endpoints associated with the user. It can be empty
            // get all extension endpoints of the user
            extenEndpoints = contentConfPrefJson[username].endpoints[compUser.ENDPOINT_TYPES.extension];
            // get the first extension endpoint of the user
            firstExtenEndpoint = Object.keys(extenEndpoints)[0];
            // check if the endpoint is present
            firstExtenEndpoint = (firstExtenEndpoint ? firstExtenEndpoint : '');

            // get the cellphone endpoint associated with the user. It can be empty
            // get all cellphone endpoints of the user
            cellphoneEndpoints = contentConfPrefJson[username].endpoints[compUser.ENDPOINT_TYPES.cellphone];
            // get the first cellphone endpoint of the user
            firstCellphoneEndpoint = Object.keys(cellphoneEndpoints)[0];
            // check if the endpoint is present
            firstCellphoneEndpoint = (firstCellphoneEndpoint ? firstCellphoneEndpoint : '');

            // get the email endpoint associated with the user. It can be empty
            // get all email endpoints of the user
            emailEndpoints = contentConfPrefJson[username].endpoints[compUser.ENDPOINT_TYPES.email];
            // get the first email endpoint of the user
            firstEmailEndpoint = Object.keys(emailEndpoints)[0];
            // check if the endpoint is present
            firstEmailEndpoint = (firstEmailEndpoint ? firstEmailEndpoint : '');

            // the user has never saved his preferences and so they doesn't exist in the
            // file of the preferences. So a default values are used
            if (!userPrefs[username]) {
                contentConfPrefJson[username].configurations = getDefaultUserPrefs();
            }
            // the user preferences are present in the file
            else {
                contentConfPrefJson[username].configurations = userPrefs[username].configurations;
            }

            // add the cellphone and email endpoints destination to the user configuration
            contentConfPrefJson[username].configurations.notifications.postit.sms.to      = firstCellphoneEndpoint;
            contentConfPrefJson[username].configurations.notifications.postit.email.to    = firstEmailEndpoint;
            contentConfPrefJson[username].configurations.notifications.voicemail.sms.to   = firstCellphoneEndpoint;
            contentConfPrefJson[username].configurations.notifications.voicemail.email.to = firstEmailEndpoint;

            // check if the default extension of the user has already been set, otherwise set it to the first extension endpoint.
            // Also set it if the firstExtenEndpoint is empty, because it means that the user has no extension endpoint associated with him.
            // Also check if the default extension of the user is associated with him. If it isn't the default extension is set
            // to the first extension endpoint. Initially the default_extension is empty
            var defaultExten  = contentConfPrefJson[username].configurations.default_extension;
            var allUserExtens = contentConfPrefJson[username].endpoints[compUser.ENDPOINT_TYPES.extension]; // all user extensions

            if (   defaultExten       === ''       // the default extension has never been set
                || firstExtenEndpoint === ''       // the user has no extension endpoint associated with him
                || !allUserExtens[defaultExten]) { // the default extension is not associated with the user

                contentConfPrefJson[username].configurations.default_extension = firstExtenEndpoint;
            }
        }

        // check created content of the JSON files
        if (typeof contentConfPrefJson !== 'object') {
            throw new Error('bad user confs and prefs object: check ' + userPrefsPath + ' and ' + obj.users);
        }

        // cycle user configurations and set the configuration in the User objects using user module
        for (username in contentConfPrefJson) {

            // check the configuration object of the user
            if (   typeof contentConfPrefJson[username]                   === 'object'
                && typeof contentConfPrefJson[username][CONFIG_FILE_HEAD] === 'object') {

                // with this operation, the configuration set in the User object is a reference link to the
                // "contentConfPrefJson" property. So the future change in the configurations of the User
                // object is reported in the "contentConfPrefJson" property
                compUser.setConfigurations(username, contentConfPrefJson[username][CONFIG_FILE_HEAD]);

            } else {
                logger.error(IDLOG, 'wrong preferences for user "' + username + '" in file ' + userPrefsPath);
            }
        }
        logger.info(IDLOG, 'user preferences by ' + userPrefsPath + ' and configurations by ' + obj.users + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the configuration file and set the chat options. The
* file must use the JSON syntax.
*
* @method configChat
* @param {string} path The path of the configuration file
*/
function configChat(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.warn(IDLOG, path + ' doesn\'t exist');
            return;
        }

        logger.info(IDLOG, 'configure server chat with ' + path);

        // read configuration file
        var json = require(path);

        // check JSON file
        if (   typeof json     !== 'object'
            || typeof json.url !== 'string' || typeof json.domain !== 'string') {

            logger.warn(IDLOG, 'wrong JSON file ' + path);
            return;
        }

        chatServer.url    = json.url;
        chatServer.domain = json.domain;
        logger.info(IDLOG, 'server chat configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the JSON configuration file and set the server ip address.
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.warn(IDLOG, path + ' does not exist');
            return;
        }

        logger.info(IDLOG, 'configure server ip address with ' + path);

        // read configuration file
        var json = require(path);

        // check JSON file
        if (typeof json !== 'object' || typeof json.ip !== 'string') {

            logger.warn(IDLOG, 'wrong JSON file ' + path);
            return;
        }

        serverIp = json.ip;
        logger.info(IDLOG, 'server IP address configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the server ip address.
*
* @method getServerIP
* @return {string} The server ip address.
*/
function getServerIP() {
    try {
        return serverIp;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the JSON configuration file of phone urls used to
* directly interact with the phones, e.g. to originate a new call.
* The keys contained by file must be sorted from more restrictive
* to the least, because they are sequentially checked.
*
* **The method can throw an Exception.**
*
* @method configPhoneUrls
* @param {string} path The path of the configuration file
*/
function configPhoneUrls(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.warn(IDLOG, path + ' does not exist');
            return;
        }

        logger.info(IDLOG, 'configure phone urls reading ' + path);

        // read configuration file
        var json = require(path);

        // check JSON file
        if (typeof json !== 'object') {
            logger.warn(IDLOG, 'wrong JSON file ' + path);
            return;
        }

        phoneUrls = json;
        logger.info(IDLOG, 'phone urls configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It sequentially test a match of specified agent with the keys of _phoneUrls_
* object. If the match exists than returns the url phone to originate a new call,
* otherwise it returns an empty string. The keys of _phoneUrls_ are sequentially
* checked, so they must be present from the more restrictive to the least.
*
* @method getCallUrlFromAgent
* @param  {string} agent The phone user agent
* @return {string} The phone url used to originate a new call
*/
function getCallUrlFromAgent(agent) {
    try {
        // check parameter
        if (typeof agent !== 'string') { throw new TypeError('wrong parameter'); }

        var re;
        for (re in phoneUrls) {
            // case insensitive 'i'
            if (agent.search(new RegExp(re, 'i')) >= 0) {
                return phoneUrls[re].urls.call;
            }
        }
        return '';

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Returns true if the specified phone is supported by the automatic click2call.
* It sequentially test a match of specified agent with the keys of _phoneUrls_
* object. If the match exists than returns a true value, false otherwise.
*
* @method phoneAgentSupportAutoC2C
* @param  {string}  agent The phone user agent
* @return {boolean} True is the phone support automatic click2call
*/
function phoneAgentSupportAutoC2C(agent) {
    try {
        // check parameter
        if (typeof agent !== 'string') { throw new TypeError('wrong parameter'); }

        var re;
        for (re in phoneUrls) {
            // case insensitive 'i'
            if (agent.search(new RegExp(re, 'i')) >= 0) {
                return true;
            }
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* It sequentially test a match of specified agent with the keys of _phoneUrls_
* object. If the match exists than returns the url phone to answer a call,
* otherwise it returns an empty string. The keys of _phoneUrls_ are sequentially
* checked, so they must be present from the more restrictive to the least.
*
* @method getAnswerUrlFromAgent
* @param  {string} agent The phone user agent
* @return {string} The phone url used to answer a call
*/
function getAnswerUrlFromAgent(agent) {
    try {
        // check parameter
        if (typeof agent !== 'string') { throw new TypeError('wrong parameter'); }

        var re;
        for (re in phoneUrls) {
            // case insensitive 'i'
            if (agent.search(new RegExp(re, 'i')) >= 0) {
                return phoneUrls[re].urls.answer;
            }
        }
        return '';

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
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
            || typeof data.username !== 'string' || typeof cb          !== 'function') {

            throw new Error('wrong parameter');
        }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(data.username);

        // update the User object. Change the specified notification settings.
        // This update is automatically reported in the User object because
        // it's a reference link to it.
        // Also the relative section of "contentConfPrefJson" property is automatically
        // updated, because the "configUser" function sets the user configurations to be
        // a reference link to it.
        logger.info(IDLOG, 'update notifications settings of user "' + data.username + '"');
        config[USER_CONFIG_KEYS.notifications][data.type][data.method].when = data.when;

        // update the notification settings section in the preference file in the filesystem
        storeAllUserPreferences(data.username, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Saves the specified default extension for the user.
*
* @method setDefaultUserExtensionConf
* @param {string}   username The username to set the defaul extension
* @param {string}   exten    The extension identifier
* @param {function} cb       The callback function
*/
function setDefaultUserExtensionConf(username, exten, cb) {
    try {
        // check parameters
        if (   typeof username !== 'string'
            || typeof exten    !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(username);

        // update the User object. Change the specified notification settings.
        // This update is automatically reported in the User object because
        // it's a reference link to it.
        // Also the relative section of "contentConfPrefJson" property is automatically
        // updated, because the "configUser" function sets the user configurations to be
        // a reference link to it.
        logger.info(IDLOG, 'update default extension of user "' + username + '"');
        config[USER_CONFIG_KEYS.default_extension] = exten;

        // update the default extension setting section in the preference file in the filesystem
        storeAllUserPreferences(username, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the default extension of the user.
*
* @method getDefaultUserExtensionConf
* @param  {string} username The username to get the default extension
* @return {string} The default extension identifier.
*/
function getDefaultUserExtensionConf(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(username);
        var exten  = config[USER_CONFIG_KEYS.default_extension];
        return exten;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Stores the preferences of all the users.
*
* @method storeAllUserPreferences
* @param {object}   username The username to update the notification settings
* @param {function} cb       The callback function
* @private
*/
function storeAllUserPreferences(username, cb) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // store the configurations of all the users in the JSON configuration file
        updateAllUserPrefsInJSONFile(cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Stores the configurations of all the users in the JSON configuration file.
*
* @method updateAllUserPrefsInJSONFile
* @param {function} cb The callback function
* @private
*/
function updateAllUserPrefsInJSONFile(cb) {
    try {
        // check parameter
        if (typeof cb !== 'function') { throw new Error('wrong parameter'); }

        // get only the preferences from the "contentConfPrefJson" property, because it
        // contains also the configurations as endpoints, authorizations, ...
        var content = {};
        var username;
        for (username in contentConfPrefJson) {
            content[username] = {};
            content[username][CONFIG_FILE_HEAD] = JSON.parse(JSON.stringify(contentConfPrefJson[username][CONFIG_FILE_HEAD])); // object copy

            // remove the cellphone and email destination, because in the /etc/nethcti/usr_prefs.json file they
            // don't be present. These informations are present in the /etc/nethcti/users.json file
            delete content[username][CONFIG_FILE_HEAD].notifications.postit.sms.to;
            delete content[username][CONFIG_FILE_HEAD].notifications.postit.email.to;
            delete content[username][CONFIG_FILE_HEAD].notifications.voicemail.sms.to;
            delete content[username][CONFIG_FILE_HEAD].notifications.voicemail.email.to;
        }

        // updated JSON preferences file. It's updated changing the configuration settings of the users
        fs.writeFile(userPrefsPath, JSON.stringify(content, null, 4), function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'updating preferences file ' + userPrefsPath);
                    cb(err.toString());

                } else {
                    logger.info(IDLOG, userPrefsPath + ' has been updated successfully');
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
*   @param {string} data.type       The click to call type
*   @param {string} [data.user]     The username of the device
*   @param {string} [data.password] The password of the device
* @param {function} cb              The callback function
*/
function setUserClick2CallConf(data, cb) {
    try {
        // check parameters
        if (   typeof data      !== 'object'
            || typeof cb        !== 'function'  || typeof data.type     !== 'string'
            || (data.type       !== 'automatic' && data.type            !== 'manual')
            || (data.type       === 'automatic' && typeof data.user     !== 'string')
            || (data.type       === 'automatic' && typeof data.password !== 'string')) {

            throw new Error('wrong parameters');
        }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(data.username);

        // update the User object. Change the specified click2call setting.
        // This update is automatically reported in the User object because
        // it's a reference link to it.
        // Also the relative section of "contentConfPrefJson" property is automatically
        // updated, because the "configUser" function sets the user configurations to be
        // a reference link to it.
        logger.info(IDLOG, 'update click2call setting of user "' + data.username + '"');

        config[USER_CONFIG_KEYS.click2call].type = data.type;

        if (data.type === 'automatic') {
            config[USER_CONFIG_KEYS.click2call].automatic.user     = data.user;
            config[USER_CONFIG_KEYS.click2call].automatic.password = data.password;
        }

        // update the notification settings section in the preference file in the filesystem
        storeAllUserPreferences(data.username, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns true if the user has enabled the automatic click2call.
*
* @method isAutomaticClick2callEnabled
* @param  {string}  username The username to check
* @return {boolean} True if the user has enabled the automatic click2call
*/
function isAutomaticClick2callEnabled(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(username);

        if (config && config[USER_CONFIG_KEYS.click2call].type === 'automatic') {
            return true;
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the phone username.
*
* @method getC2CAutoPhoneUser
* @param  {string} username The name of the user
* @return {string} The phone username used to acces to phone of the user.
*/
function getC2CAutoPhoneUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(username);

        return config[USER_CONFIG_KEYS.click2call].automatic.user;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the phone password.
*
* @method getC2CAutoPhonePass
* @param  {string} username The name of the user
* @return {string} The phone password used to acces to phone of the user.
*/
function getC2CAutoPhonePass(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get the user configuration from the User object to update it
        var config = compUser.getConfigurations(username);

        return config[USER_CONFIG_KEYS.click2call].automatic.password;

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
        else if (when === NOTIF_WHEN.offline) {} // not supported now
        else {
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
* Checks the user post-it notification configurations and returns true if he
* wants to receives the new post-it notification by the specified delivery method.
*
* @method verifySendPostitNotification
* @param  {string}  username       The username identifier
* @param  {string}  deliveryMethod The delivery method, e.g. email or sms
* @return {boolean} True if the user wants to receive the new post-it notification by the specified delivery method.
*/
function verifySendPostitNotification(username, deliveryMethod) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof deliveryMethod !== 'string') {
            throw new Error('wrong parameters');
        }

        var conf = compUser.getConfigurations(username);

        // check the configurations of the user
        if (   typeof conf                                                        !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications]                        !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit                 !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit[deliveryMethod] !== 'object') {

            logger.warn(IDLOG, 'checking if send new post-it notification by "' + deliveryMethod + '" for user "' + username + '": ' +
                               'wrong notification configurations');
            return false;
        }

        var when = conf[USER_CONFIG_KEYS.notifications].postit[deliveryMethod].when;

        if      (when === NOTIF_WHEN.always)  { return true;  }
        else if (when === NOTIF_WHEN.never)   { return false; }
        else if (when === NOTIF_WHEN.offline) {} // not supported now
        else {
            logger.warn(IDLOG, 'checking if send new post-it notification by "' + deliveryMethod + '" for user "' + username + '": ' +
                               'wrong "when" value "' + when + '"');
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
* Checks the user post-it notification configurations and returns true if he
* wants to receives the new post-it notification by email.
*
* @method verifySendPostitNotificationByEmail
* @param  {string}  username The username identifier
* @return {boolean} True if the user wants to receive the new post-it notification by email
*/
function verifySendPostitNotificationByEmail(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return verifySendPostitNotification(username, 'email');

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
* Checks the user post-it notification configurations and returns true if he
* wants to receives the new post-it notification by sms.
*
* @method verifySendPostitNotificationBySms
* @param  {string}  username The username identifier
* @return {boolean} True if the user wants to receive the new post-it notification by sms
*/
function verifySendPostitNotificationBySms(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return verifySendPostitNotification(username, 'sms');

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
* Returns the destination email address for the new post-it notification of the user.
*
* @method getPostitNotificationEmailTo
* @param  {string} username The username identifier
* @return {string} The destination email address.
*/
function getPostitNotificationEmailTo(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        var conf = compUser.getConfigurations(username);

        // check the configurations of the user
        if (   typeof conf                                                 !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications]                 !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit          !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit.email    !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit.email.to !== 'string') {

            logger.warn(IDLOG, 'getting email destination for new post-it notification of user "' + username + '": wrong configurations');
            return '';
        }

        return conf[USER_CONFIG_KEYS.notifications].postit.email.to;

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

/**
* Returns the destination sms number for the post-it notification of the user.
*
* @method getPostitNotificationSmsTo
* @param  {string} username The username identifier
* @return {string} The destination sms number.
*/
function getPostitNotificationSmsTo(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        var conf = compUser.getConfigurations(username);

        // check the configurations of the user
        if (   typeof conf                                               !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications]               !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit        !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit.sms    !== 'object'
            || typeof conf[USER_CONFIG_KEYS.notifications].postit.sms.to !== 'string') {

            logger.warn(IDLOG, 'getting sms destination number for post-it notification of user "' + username + '": wrong configurations');
            return '';
        }

        return conf[USER_CONFIG_KEYS.notifications].postit.sms.to;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

// public interface
exports.config                                 = config;
exports.setLogger                              = setLogger;
exports.configUser                             = configUser;
exports.configChat                             = configChat;
exports.getServerIP                            = getServerIP;
exports.getChatConf                            = getChatConf;
exports.setCompUser                            = setCompUser;
exports.configPhoneUrls                        = configPhoneUrls;
exports.getC2CAutoPhoneUser                    = getC2CAutoPhoneUser;
exports.getC2CAutoPhonePass                    = getC2CAutoPhonePass;
exports.getCallUrlFromAgent                    = getCallUrlFromAgent;
exports.getUserEndpointsJSON                   = getUserEndpointsJSON;
exports.getAnswerUrlFromAgent                  = getAnswerUrlFromAgent;
exports.getUserConfigurations                  = getUserConfigurations;
exports.setUserClick2CallConf                  = setUserClick2CallConf;
exports.getAllUserEndpointsJSON                = getAllUserEndpointsJSON;
exports.setUserNotificationConf                = setUserNotificationConf;
exports.phoneAgentSupportAutoC2C               = phoneAgentSupportAutoC2C;
exports.getPostitNotificationSmsTo             = getPostitNotificationSmsTo;
exports.setDefaultUserExtensionConf            = setDefaultUserExtensionConf;
exports.getDefaultUserExtensionConf            = getDefaultUserExtensionConf;
exports.isAutomaticClick2callEnabled           = isAutomaticClick2callEnabled;
exports.getPostitNotificationEmailTo           = getPostitNotificationEmailTo;
exports.getVoicemailNotificationSmsTo          = getVoicemailNotificationSmsTo;
exports.getVoicemailNotificationEmailTo        = getVoicemailNotificationEmailTo;
exports.verifySendPostitNotificationBySms      = verifySendPostitNotificationBySms;
exports.verifySendPostitNotificationByEmail    = verifySendPostitNotificationByEmail;
exports.verifySendVoicemailNotificationBySms   = verifySendVoicemailNotificationBySms;
exports.verifySendVoicemailNotificationByEmail = verifySendVoicemailNotificationByEmail;
