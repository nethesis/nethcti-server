/**
* Provides sms functions through REST API.
*
* @module com_sms_rest
* @submodule plugins_rest
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins_rest/sms]
*/
var IDLOG = '[plugins_rest/sms]';

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
* The sms architect component used for sms functions.
*
* @property compSms
* @type object
* @private
*/
var compSms;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

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
* Set sms architect component used by sms functions.
*
* @method setCompSms
* @param  {object} comp The sms architect component.
*/
function setCompSms(comp) {
    try {
        compSms = comp;
        logger.info(IDLOG, 'set sms architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the utility architect component.
*
* @method setCompUtil
* @param {object} comp The utility architect component.
*/
function setCompUtil(comp) {
    try {
        compUtil = comp;
        logger.info(IDLOG, 'set util architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = comp;
        logger.log(IDLOG, 'authorization component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * REST plugin that provides sms functions through the following REST API:
        *
        * # POST requests
        *
        * 1. [`sms/send`](#sendpost)
        *
        * ---
        *
        * ### <a id="sendpost">**`sms/send`**</a>
        *
        * The client sends new sms for the recipient. The request must contains the following parameters:
        *
        * * `to: the destination number of the sms message`
        * * `body: the body of the sms message`
        *
        * Example JSON request parameters:
        *
        *     { "text": "message text", "to": "0123456789" }
        *
        * @class plugin_rest_sms
        * @static
        */
        var sms = {

            // the REST api
            api: {
                'root': 'sms',
                'get': [],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} send To send a new sms message
                */
                'post' : [ 'send' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Sends a new sms message by the following REST API:
            *
            *     send
            *
            * @method send
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            send: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params      !== 'object'
                        || typeof req.params.to   !== 'string'
                        || typeof req.params.body !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check the sms & administration sms authorization
                    if (   compAuthorization.authorizeSmsUser(username)      !== true
                        && compAuthorization.authorizeAdminSmsUser(username) !== true) {

                        logger.warn(IDLOG, '"sms" & "admin_sms" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminSmsUser(username) === true) {
                        logger.info(IDLOG, '"admin_sms" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizeSmsUser(username) === true) {
                        logger.info(IDLOG, '"sms" authorization successfully for user "' + username + '"');
                    }

                    compSms.send(username, req.params.to, req.params.body, function (err) {

                        if (err) {
                            logger.error(IDLOG, 'sending sms from user "' + username + '" to "' + req.params.to + '"');
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());

                        } else {
                            logger.info(IDLOG, 'sent sms from "' + username + '" to "' + req.params.to + '" successful');
                            compUtil.net.sendHttp200(IDLOG, res);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = sms.api;
        exports.send                 = sms.send;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompSms           = setCompSms;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
