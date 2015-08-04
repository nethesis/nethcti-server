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
        * 1. [`mobile/device_key`](#device_keypost)
        *
        * ---
        *
        * ### <a id="#device_keypost">**`mobile/device_key`**</a>
        *
        * Sets the mobile device key used to push notifications. The request must contain the following parameters:
        *
        * * `key: the mobile device key`
        * * `type: ("ionic") the type of the mobile application`
        *
        * Example JSON request parameters:
        *
        *     { "key": "xyz", "type": "ionic" }
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
                *   @param {string} device_key To set the mobile device key
                */
                'post' : [ 'device_key' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Sets the mobile device key with the following REST API:
            *
            *     device_key
            *
            * @method device_key
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain.
            */
            device_key: function (req, res, next) {
                try {
                    var key      = req.params.key;
                    var appType  = req.params.type;
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof key     !== 'string' ||
                        typeof appType !== 'string' ||
                        appType        !== 'ionic') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (appType === 'ionic') {

                        if (compMobile.setDeviceKey(key, appType, username) === true) {
                            logger.info(IDLOG, 'mobile device key "' + key + '" for app type "' + appType + '" has been set by user "' + username + '"');
                            compUtil.net.sendHttp200(IDLOG, res);

                        }  else {
                            logger.warn(IDLOG, 'setting mobile device key "' + key + '" for app type "' + appType + '" by user "' + username + '"');
                            compUtil.net.sendHttp500(IDLOG, res, 'some errors have occured');
                        }
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        };

        exports.api           = mobile.api;
        exports.setLogger     = setLogger;
        exports.device_key    = mobile.device_key;
        exports.setCompUtil   = setCompUtil;
        exports.setCompMobile = setCompMobile;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
