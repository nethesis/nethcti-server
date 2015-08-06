/**
* Provides the mobile functions.
*
* @module mobile
* @main arch_mobile
*/
var i18n     = require('./i18n').i18n;
var httpsReq = require('https');

/**
* Provides the mobile functionalities.
*
* @class mobile
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
* @default [mobile]
*/
var IDLOG = '[mobile]';

/**
* The tokens of mobile devices apps logged into the cti. The keys are usernames
* and the values are objects. Each value object has application types as keys
* (for example "ionic") and another object as values. This last object contains
* device tokens as object keys and the language as its value.
*
* @property deviceTokens
* @type object
* @private
* @default {}
*/
var deviceTokens = {};

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
* The user module.
*
* @property compUser
* @type object
* @private
*/
var compUser;

// Used to make http post requests to ionic push notifications service.
var ionicPushOptions = {
    hostname: 'push.ionic.io',
    port: 443,
    path: '/api/v1/push',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer('f78781df3bc7c3dc500620165daaf2774d2958acc8f42e29:').toString('base64'),
        'X-Ionic-Application-Id': 'ec37d953'
    }
};

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
* Set the module to be used for user functionalities.
*
* @method setCompUser
* @param {object} comp The user module.
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong user object'); }
        compUser = comp;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Enable/disable push notifications for a mobile device
*
* @method setPushNotifications
* @param  {string}  token    The device token identifier
* @param  {string}  appType  The type of the application (e.g. "ionic")
* @param  {string}  lang     The mobile application language
* @param  {string}  enable   True/false to enable/disable notifications
* @param  {string}  username The name of the user
* @return {boolean} True if the execution was successful
*/
function setPushNotifications(token, appType, lang, enable, username) {
    try {
        // check parameters
        if (typeof token    !== 'string' || typeof lang   !== 'string' ||
            typeof appType  !== 'string' || appType       !== 'ionic'  ||
            typeof username !== 'string' || typeof enable !== 'boolean') {

            throw new Error('wrong parameters');
        }

        // check if the user exists
        if (compUser.isUserPresent(username) === true) {

            // delete all presence of the token. This is necessary also in case
            // of "enable" true, because a device token can be associated at
            // only one user at time
            var u, k;
            for (u in deviceTokens) {
                for (k in deviceTokens[u][appType]) {
                    if (k === token) { delete deviceTokens[u][appType][k]; }
                }
            }

            if (enable) {
                // add the token to enable push notifications
                if (!deviceTokens[username]) { deviceTokens[username] = {}; }
                if (!deviceTokens[username][appType]) { deviceTokens[username][appType] = {}; }
                deviceTokens[username][appType][token] = lang;
                logger.info(IDLOG, 'enabled push notifications for mobile device token "' + token +
                                   '" for appType "' + appType + '" of user "' + username + '" with lang "' + lang + '"');
            } else {
                logger.info(IDLOG, 'disabled push notifications for mobile device token "' + token +
                                   '" for appType "' + appType + '" of user "' + username + '" with lang "' + lang + '"');
            }
            return true;

        } else {
            logger.warn(IDLOG, 'setting push notifications of device token "' + token + '" for appType "' + appType +
                               '" by username "' + username + '": user not present');
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sends a new post-it notification to all mobile apps of the user.
*
* @method sendNewPostitNotification
* @param  {string} username The name of the user to notify
*/
function sendNewPostitNotification(username) {
    try {
        // check parameter
        if (typeof username !== 'string') {
            throw new Error('wrong parameter');
        }
        // second argument will be translated by the function
        sendNotification(username, 'new_postit');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sends a notification to all mobile apps of the user. The choise to not
* receive notifications has to be managed by the device itself.
*
* @method sendNotification
* @param  {string} username  The name of the user to notify
* @param  {string} msgToI18n The notification message to be translated before sending
* @private
*/
function sendNotification(username, msgToI18n) {
    try {
        // check parameters
        if (typeof username  !== 'string' ||
            typeof msgToI18n !== 'string') {

            throw new Error('wrong parameters');
        }

        var appType, deviceK, toSend, msg, lang;

        for (appType in deviceTokens[username]) {

            // send notification to all ionic mobile apps of the user
            if (appType === 'ionic') {

                for (deviceK in deviceTokens[username].ionic) {

                    lang = deviceTokens[username].ionic[deviceK];
                    msg  = i18n[lang][msgToI18n];

                    toSend = {
                        tokens: [ deviceK ],
                        notification: { alert: msg }
                    };

                    var req = httpsReq.request(ionicPushOptions, ionicPushReqCb);
                    req.on('error', ionicPushReqErrorCb);
                    req.write(JSON.stringify(toSend));
                    req.end();
                }
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* The callback of the https post request to ionic push notification service.
*
* @method ionicPushReqCb
* @param {object} res The https reponse
*/
function ionicPushReqCb(res) {
    try {
        res.setEncoding('utf8');
        res.on('data', function (data) {
            try {
                if (res.statusCode &&
                    res.statusCode >= 400 && res.statusCode < 600) { // client and server errors

                    logger.warn(IDLOG, 'sending ionic push notification request - status code "' + res.statusCode + '" -', data);
                } else {
                    logger.info(IDLOG, 'ionic push notification has been sent successfully - status code "' + res.statusCode + '" -', data);
                }
            } catch (err) {
                logger.error(IDLOG, err.stack);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* The callback of the https post request to ionic push notification service
* called in error case.
*
* @method ionicPushReqErrorCb
* @param {object} error The error
*/
function ionicPushReqErrorCb(error) {
    try {
        logger.error(IDLOG, 'sending ionic push notification request - ', error.stack);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.setLogger                 = setLogger;
exports.setCompUser               = setCompUser;
exports.setPushNotifications      = setPushNotifications;
exports.sendNewPostitNotification = sendNewPostitNotification;
