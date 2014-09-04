/**
* Provides the utility functions.
*
* @module util
* @main arch_util
*/

/**
* Provides the utility functionalities.
*
* @class util
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
* @default [util]
*/
var IDLOG = '[util]';

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
* Sets the logger to be used.
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
* Sends an HTTP 201 created response.
*
* @method sendHttp201
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp201(parentIdLog, resp) {
    try {
        resp.writeHead(201);
        logger.info(parentIdLog, 'send HTTP 201 response to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Sends an HTTP 200 OK response.
*
* @method sendHttp200
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp200(parentIdLog, resp) {
    try {
        resp.writeHead(200);
        logger.info(parentIdLog, 'send HTTP 200 response to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Sends an HTTP 400 bad request response.
*
* @method sendHttp400
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp400(parentIdLog, resp) {
    try {
        resp.writeHead(400);
        logger.info(parentIdLog, 'send HTTP 400 response to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Sends an HTTP 401 unauthorized response.
*
* @method sendHttp401
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp401(parentIdLog, resp) {
    try {
        resp.writeHead(401);
        logger.warn(parentIdLog, 'send HTTP 401 response to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Sends an HTTP 401 unauthorized response with nonce into the WWW-Authenticate http header.
*
* @method sendHttp401Nonce
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @param {string} nonce       The nonce to send
* @static
*/
function sendHttp401Nonce(parentIdLog, resp, nonce) {
    try {
        resp.writeHead(401, { 'WWW-Authenticate': 'Digest ' + nonce });
        logger.info(IDLOG, 'send HTTP 401 response with nonce to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Sends an HTTP 403 forbidden response.
*
* @method sendHttp403
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp403(parentIdLog, resp) {
    try {
        resp.writeHead(403);
        logger.info(parentIdLog, 'send HTTP 403 response to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Sends an HTTP 500 internal server error response.
*
* @method sendHttp500
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @param {string} [err]       The error message
* @static
*/
function sendHttp500(parentIdLog, resp, err) {
    try {
        var text;
        typeof err !== 'string' ? text = '' : text = err;

        resp.writeHead(500, { error: err });
        logger.error(parentIdLog, 'send HTTP 500 response to ' + getRemoteClientIp(resp));
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Returns the remote IP address of the client from the http response object.
*
* @method getRemoteClientIp
* @param  {object} resp The http response object
* @return {string} The remote ip address of the client
* @static
* @private
*/
function getRemoteClientIp(resp) {
    try {
        // "x-forwarded-for" http header is present when an http proxy is used.
        // In this case the "resp.connection.remoteAddress" is the IP of the
        // http proxy, so takes the client IP from the header
        return (resp.req.headers['x-forwarded-for'] ? resp.req.headers['x-forwarded-for'].split(',')[0] : resp.connection.remoteAddress);

    } catch (err) {
        logger.error(IDLOG, 'retrieving remote client IP: ' + err.stack);
        return resp.connection.remoteAddress;
    }
}

/**
* Network utility functions.
*
* @property net
* @type {object}
* @default {
    sendHttp200:      sendHttp200,
    sendHttp201:      sendHttp201,
    sendHttp400:      sendHttp400,
    sendHttp401:      sendHttp401,
    sendHttp403:      sendHttp403,
    sendHttp500:      sendHttp500,
    sendHttp401Nonce: sendHttp401Nonce
}
*/
var net = {
    sendHttp200:      sendHttp200,
    sendHttp201:      sendHttp201,
    sendHttp400:      sendHttp400,
    sendHttp401:      sendHttp401,
    sendHttp403:      sendHttp403,
    sendHttp500:      sendHttp500,
    sendHttp401Nonce: sendHttp401Nonce
};

// public interface
exports.net       = net;
exports.setLogger = setLogger;
