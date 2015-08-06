/**
* Provides the mobile functions.
*
* @module mobile
* @main arch_mobile
*/
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
* The keys of mobile devices apps logged into the cti. The keys are usernames
* and the values are objects. Each value object has application types as keys
* (for example "ionic") and another object as values. This last object contain
* device keys as object keys (its value are unused).
*
* @property deviceKeys
* @type object
* @private
* @default {}
*/
var deviceKeys = {};

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
* Sets the mobile device key of the application.
*
* @method setDeviceKey
* @param  {string}  key      The device key
* @param  {string}  appType  The type of the application (e.g. "ionic")
* @param  {string}  username The name of the user
* @return {boolean} True if the execution was successful
*/
function setDeviceKey(key, appType, username) {
    try {
        // check parameters
        if (typeof key      !== 'string' ||
            typeof appType  !== 'string' || appType !== 'ionic' ||
            typeof username !== 'string') {

            throw new Error('wrong parameters');
        }

        // check if the user exists
        if (compUser.isUserPresent(username) === true) {

            // add the key
            if (!deviceKeys[username]) { deviceKeys[username] = {}; }
            if (!deviceKeys[username][appType]) { deviceKeys[username][appType] = {}; }
            deviceKeys[username][appType][key] = '';
            logger.info(IDLOG, 'mobile device key "' + key + '" for appType "' + appType + '" has been set for user "' + username + '"');

            return true;

        } else {
            logger.warn(IDLOG, 'setting device key "' + key + '" for appType "' + appType + '" by username "' + username + '": user not present');
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sends a notification to all mobile apps of the user. The choise to not
* receive notifications has to be managed by the device itself.
*
* @method sendNotification
* @param  {string} msg      The notification message to send
* @param  {string} username The name of the user to notify
*/
function sendNotification(username, msg) {
    try {
        // check parameters
        if (typeof msg      !== 'string' ||
            typeof username !== 'string') {

            throw new Error('wrong parameters');
        }

        var appType, allUserDevicesKeys;
        var toSend = { notification: { alert: msg } };

        for (appType in deviceKeys[username]) {

            // send notification to all ionic mobile apps of the user
            if (appType === 'ionic') {

                // get all devices keys used to send notification
                allUserDevicesKeys = Object.keys(deviceKeys[username].ionic);
                toSend.tokens = allUserDevicesKeys;

                var req = httpsReq.request(ionicPushOptions, ionicPushReqCb);
                req.on('error', ionicPushReqErrorCb);
                req.write(JSON.stringify(toSend));
                req.end();
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
exports.setLogger        = setLogger;
exports.setCompUser      = setCompUser;
exports.setDeviceKey     = setDeviceKey;
exports.sendNotification = sendNotification;
