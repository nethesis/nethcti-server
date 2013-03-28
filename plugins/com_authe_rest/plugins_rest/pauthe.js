/**
* Provides authentication functions through REST API.
*
* @module com_authe_rest
* @submodule plugins_rest
*/
var crypto = require('crypto');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins_rest/authe]
*/
var IDLOG = '[plugins_rest/authe]';

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
* Set authentication architect component used by authentication.
*
* @method setCompAuthe
* @param {object} ca The authentication architect component _arch\_authentication_.
*/
function setCompAuthe(ca) {
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
        * The logger. It must have at least three methods: _info, warn and error._
        *
        * @property logger
        * @type object
        * @private
        * @default console
        */
        var logger = console;

        /**
        * REST plugin that provides authentication functions through the following REST API:
        *
        *     authe/:accessKeyId
        *
        * The client receive an HTTP 401 response with an HMAC-SHA1 _nonce_ in the WWW-Authenticate header.
        * The _nonce_ is used to construct the token for the authentication.
        *
        *     authe/:accessKeyId/:token
        *
        * The client requested an authentication with the created _token._
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
                *   @param {string} authe/:accessKeyId To get an HTTP 401 response
                *   with _nonce_ in WWW-Authenticate header. The nonce is used to
                *   construct the token for the authentication.
                *
                *   @param {string} authe/:accessKeyId/:token Authenticate with
                *   created _token._
                */
                'post': [
                    'authe/:accessKeyId',
                    'authe/:accessKeyId/:token'
                ],
                'head': [],
                'del' : []
            },

            /**
            * Provides the authentication functions for the following REST API:
            *
            *     authe/:accessKeyId
            *     authe/:accessKeyId/:token
            *
            * @method authe
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            authe: function (req, res, next) {
                try {
                    // get parameters
                    var accessKeyId = req.params.accessKeyId;
                    var token = req.params.token ? req.params.token : undefined;

                    if (!token) { // send 401 response with nonce into the http header
                        var nonce = compAuthe.getNonce(accessKeyId);
                        sendHttp401Nonce(res, nonce);

                    } else if (compAuthe.authenticate(accessKeyId, token)) { // authentication ok
                        logger.info(IDLOG, 'response with successfully authentication');
                        res.send({ result: true });

                    } else { // authentication failed
                        sendHttp401(res);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        }
        exports.api          = pauthe.api;
        exports.authe        = pauthe.authe;
        exports.setLogger    = setLogger;
        exports.setCompAuthe = setCompAuthe;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
