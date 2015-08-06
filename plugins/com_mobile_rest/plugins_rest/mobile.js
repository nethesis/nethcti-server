/**
* Provides mobile app functions through REST API.
*
* @module com_mobile_rest
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
* @default [plugins_rest/mobile]
*/
var IDLOG = '[plugins_rest/mobile]';

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
* The mobile architect component used for mobile functions.
*
* @property compMobile
* @type object
* @private
*/
var compMobile;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

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
* Sets the mobile architect component.
*
* @method setCompMobile
* @param {object} comp The mobile architect component.
*/
function setCompMobile(comp) {
    try {
        compMobile = comp;
        logger.info(IDLOG, 'set mobile architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * REST plugin that provides mobile app functions through the following REST API:
        *
        * # POST requests
        *
        * 1. [`mobile/push_notifications`](#push_notificationspost)
        *
        * ---
        *
        * ### <a id="#push_notificationspost">**`mobile/push_notifications`**</a>
        *
        * Enable/disable push notifications for a mobile device. The request
        * must contain the following parameters:
        *
        * * `token: the mobile device token identifier`
        * * `type: ("ionic") the type of the mobile application`
        * * `enable: ("true" | "false") if to enable/disable notifications`
        * * `[lang]: ("en" | "it") the language of mobile application`
        *
        * Example JSON request parameters:
        *
        *     { "token": "xyz", "type": "ionic", "enable": "true" }
        *     { "token": "xyz", "type": "ionic", "enable": "true", "lang": "en" }
        *
        * @class plugin_rest_mobile
        * @static
        */
        var mobile = {

            // the REST api
            api: {
                'root': 'mobile',
                'get': [],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} push_notifications To enable/disable push notifications for a mobile device
                */
                'post' : [ 'push_notifications' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Enable/disable push notifications for a mobile device with the following REST API:
            *
            *     push_notifications
            *
            * @method push_notifications
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain.
            */
            push_notifications: function (req, res, next) {
                try {
                    var lang     = req.params.lang;
                    var token    = req.params.token;
                    var enable   = req.params.enable;
                    var appType  = req.params.type;
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof token   !== 'string' || typeof enable !== 'string' ||
                        typeof appType !== 'string' || appType       !== 'ionic'  ||
                        (enable !== 'true' && enable !== 'false')) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (lang !== 'en' && lang !== 'it') { lang = 'en'; }
                    enable = ( enable === 'true' ? true : false);

                    if (compMobile.setPushNotifications(token, appType, lang, enable, username) === true) {
                        logger.info(IDLOG, (enable ? 'enabled' : 'disabled') + ' push notifications for mobile device token "' + token +
                                           '" for app "' + appType + '" of user "' + username + '" with lang "' + lang + '"');
                        compUtil.net.sendHttp200(IDLOG, res);

                    }  else {
                        logger.warn(IDLOG, (enable ? 'enabling' : 'disabling') + ' push notifications for mobile device token "' + token +
                                            '" for app type "' + appType + '" by user "' + username + '" with lang "' + lang + '"');
                        compUtil.net.sendHttp500(IDLOG, res, 'some errors have occured');
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        };

        exports.api                = mobile.api;
        exports.setLogger          = setLogger;
        exports.setCompUtil        = setCompUtil;
        exports.setCompMobile      = setCompMobile;
        exports.push_notifications = mobile.push_notifications;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
