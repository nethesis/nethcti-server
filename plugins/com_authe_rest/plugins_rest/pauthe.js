/**
* Provides authentication functions through HTTPS REST API.
*
* @module com_authe_rest
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
* @default [plugins_rest/pauthe]
*/
var IDLOG = '[plugins_rest/pauthe]';

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
* Send HTTP 401 unauthorized response with nonce into the
* WWW-Authenticate http header.
*
* @method sendHttp401Nonce
* @param {object} resp The client response object.
* @param {string} nonce The nonce to return to the client.
* @private
*/
function sendHttp401Nonce(resp, nonce) {
    try {
        resp.writeHead(401, { 'WWW-Authenticate': 'Digest ' + nonce });
        logger.info(IDLOG, 'send HTTP 401 response with nonce to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
	logger.error(IDLOG, err.stack);
    }
}

/**
* Send HTTP 401 unauthorized response.
*
* @method sendHttp401
* @param {object} resp The client response object.
* @private
*/
function sendHttp401(resp) {
    try {
        resp.writeHead(401);
        logger.info(IDLOG, 'send HTTP 401 response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
	logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * Listen on port 9000.
        *
        * REST plugin that provides authentication functions through the following REST API:
        *
        *     pauthe/authenticate/:username/:password
        *
        * If the user is successfully authenticated, he receives an HTTP 401 response with an
        * HMAC-SHA1 _nonce_ in the WWW-Authenticate header. The _nonce_ is then used by the client
        * to construct the token for the next authentications.
        *
        * @class pauthe
        * @static
        */
        var pauthe = {

            // the REST api
            api: {
                'root': 'pauthe',
                'get' : [''],
                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} authenticate/:username/:password Authenticate with username
                *       and password and if it goes well the client receive an HTTP 401 response
                *       with _nonce_ in WWW-Authenticate header. The nonce is used to construct
                *       the token for the next authentications.
                */
                'post': [
                    'authenticate/:username/:password'
                ],
                'head': [],
                'del' : []
            },

            /**
            * Provides the authentication functions for the following REST API:
            *
            *     authenticate/:username/:password
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
                                sendHttp401(res);
                                return;

                            } else {
                                logger.info(IDLOG, 'user "' + username + '" has been successfully authenticated');
                                var nonce = compAuthe.getNonce(username, password);
                                sendHttp401Nonce(res, nonce);
                            }
                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        }
        exports.api                   = pauthe.api;
        exports.setLogger             = setLogger;
        exports.authenticate          = pauthe.authenticate;
        exports.setCompAuthentication = setCompAuthentication;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
