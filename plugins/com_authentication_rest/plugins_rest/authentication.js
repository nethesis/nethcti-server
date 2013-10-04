/**
* Provides authentication functions through REST API.
*
* @module com_authentication_rest
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
* @default [plugins_rest/authentication]
*/
var IDLOG = '[plugins_rest/authentication]';

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
* The authentication architect component used for authentication.
*
* @property compAuthe
* @type object
* @private
*/
var compAuthe;

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
*                     three methods: _info, warn and error_ as console object.
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
* Set the authentication architect component used by authentication.
*
* @method setCompAuthentication
* @param {object} ca The authentication architect component _arch\_authentication_.
*/
function setCompAuthentication(ca) {
    try {
        compAuthe = ca;
        logger.info(IDLOG, 'set authentication architect component');
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

(function(){
    try {
        /**
        * REST plugin that provides authentication functions through the following REST API:
        *
        * # POST requests
        *
        * 1. [`authentication/authenticate`](#authenticatepost)
        *
        * ---
        *
        * ### <a id="authenticatepost">**`authentication/authenticate`**</a>
        *
        * If the user is successfully authenticated, he receives an HTTP 401 response with an
        * HMAC-SHA1 _nonce_ in the WWW-Authenticate header. The _nonce_ is then used by the
        * client to construct the token for the next authentications. The request must contain
        * the configurations object in the POST request. E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "username": "alessandro", "password": "somepwd" }' https://192.168.5.224:8282/authentication/authenticate
        *
        * @class plugin_rest_authentication
        * @static
        */
        var authentication = {

            // the REST api
            api: {
                'root': 'authentication',
                'get':  [],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} authenticate Authenticate with username and password
                *       and if it goes well the client receive an HTTP 401 response with
                *       _nonce_ in WWW-Authenticate header. The nonce is used to construct
                *       the token used in the next authentications.
                */
                'post' : [ 'authenticate' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Provides the authentication functions for the following REST API:
            *
            *     authenticate
            *
            * @method authenticate
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            authenticate: function (req, res, next) {
                try {
                    var username = req.params.username;
                    var password = req.params.password;

                    compAuthe.authenticate(username, password, function (err) {
                        try {
                            if (err) {
                                logger.warn(IDLOG, 'authentication failed for user "' + username + '"');
                                compUtil.net.sendHttp401(IDLOG, res);
                                return;

                            } else {
                                logger.info(IDLOG, 'user "' + username + '" has been successfully authenticated');
                                var nonce = compAuthe.getNonce(username, password);
                                compUtil.net.sendHttp401(IDLOG, res, nonce);
                            }
                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp401(IDLOG, res);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp401(IDLOG, res);
                }
            }
        }
        exports.api                   = authentication.api;
        exports.setLogger             = setLogger;
        exports.authenticate          = authentication.authenticate;
        exports.setCompUtil           = setCompUtil;
        exports.setCompAuthentication = setCompAuthentication;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
