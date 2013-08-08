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
* Send HTTP 401 unauthorized response.
*
* @method sendHttp401
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp401(parentIdLog, resp) {
    try {
        resp.writeHead(401);
        logger.info(parentIdLog, 'send HTTP 401 response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Send HTTP 403 forbidden response.
*
* @method sendHttp403
* @param {string} parentIdLog The identifier of the component that uses the utility
* @param {object} resp        The client response object
* @static
*/
function sendHttp403(parentIdLog, resp) {
    try {
        resp.writeHead(403);
        logger.info(parentIdLog, 'send HTTP 403 response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
        logger.error(IDLOG, 'used by ' + parentIdLog + ': ' + err.stack);
    }
}

/**
* Network utility functions.
*
* @property net
* @type {object}
* @default {
    sendHttp401: sendHttp401,
    sendHttp403: sendHttp403
}
*/
var net = {
    sendHttp401: sendHttp401,
    sendHttp403: sendHttp403
};

// public interface
exports.net       = net;
exports.setLogger = setLogger;
