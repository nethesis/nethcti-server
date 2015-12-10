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
* @default [plugins/dbconn_sms]
*/
var IDLOG = '[plugins/dbconn_sms]';

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
* Save a failure in sms sending in the _sms\_history_ database table.
*
* @method storeSmsFailure
* @param {string}   username The name of the user who sent the sms
* @param {string}   to       The destination number
* @param {string}   body     The text of the message
* @param {function} cb       The callback function
*/
function storeSmsFailure(username, to, body, cb) {
    try {
        // check parameters
        if (   typeof username !== 'string' || typeof cb   !== 'function'
            || typeof to       !== 'string' || typeof body !== 'string') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var smsHistory = compDbconnMain.models[compDbconnMain.JSON_KEYS.SMS_HISTORY].build({
            date:        moment().format('YYYY-MM-DD HH:mm:ss'),
            text:        body,
            status:      false,
            sender:      username,
            destination: to
        });

        // save the model into the database
        smsHistory.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'sms failure from user "' + username + '" to ' + to + ' saved successfully in the database');
            cb();

        }).error(function (err1) { // manage the error
            logger.error(IDLOG, 'saving sms failure from user "' + username + '" to ' + to + ': ' + err1.toString());
            cb(err1);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save a successfully sms sending in the _sms\_history_ database table.
*
* @method storeSmsSuccess
* @param {string}   username The name of the user who sent the sms
* @param {string}   to       The destination number
* @param {string}   body     The text of the message
* @param {function} cb       The callback function
*/
function storeSmsSuccess(username, to, body, cb) {
    try {
        // check parameters
        if (   typeof username !== 'string' || typeof cb   !== 'function'
            || typeof to       !== 'string' || typeof body !== 'string') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var smsHistory = compDbconnMain.models[compDbconnMain.JSON_KEYS.SMS_HISTORY].build({
            date:        moment().format('YYYY-MM-DD HH:mm:ss'),
            text:        body,
            status:      true,
            sender:      username,
            destination: to
        });

        // save the model into the database
        smsHistory.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'sms success from user "' + username + '" to ' + to + ' saved successfully in the database');
            cb();

        }).error(function (err1) { // manage the error
            logger.error(IDLOG, 'saving sms success from user "' + username + '" to ' + to + ': ' + err1.toString());
            cb(err1);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

apiList.storeSmsFailure = storeSmsFailure;
apiList.storeSmsSuccess = storeSmsSuccess;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
