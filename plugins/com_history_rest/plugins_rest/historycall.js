/**
* Provides phonebook functions through REST API.
*
* @module com_history_rest
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
* @default [plugins_rest/historycall]
*/
var IDLOG = '[plugins_rest/historycall]';

/**
* The history architect component used for history functions.
*
* @property compHistory
* @type object
* @private
*/
var compHistory;

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
* Set history architect component used by history functions.
*
* @method setCompHistory
* @param {object} ch The phonebook architect component.
*/
function setCompHistory(ch) {
    try {
        compHistory = ch;
        logger.info(IDLOG, 'set history architect component');
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

/**
* Send HTTP 500 internal server error response.
*
* @method sendHttp500
* @param {object} resp The client response object
* @param {string} [err] The error message
* @private
*/
function sendHttp500(resp, err) {
    try {
        var text;
        if (err === undefined || typeof err !== 'string') {
            text = '';

        } else {
            text = err;
        }

        resp.writeHead(500, { error: err });
        logger.info(IDLOG, 'send HTTP 500 response to ' + resp.connection.remoteAddress);
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
        * REST plugin that provides history functions through the following REST API:
        *
        *     interval/:from/:to/:exten
        *
        * Return the history call between _"from"_ date to _"to"_ date for the extension _"exten"_.
        * Dates must be expressed in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
        *
        *     interval/:from/:to/:exteni/:filter
        *
        * Return the history call between _"from"_ date to _"to"_ date for the extension _"exten"_
        * filtering by _"filter"_. Dates must be expressed in YYYYMMDD format. If an error occurs an
        * HTTP 500 response is returned.
        *
        * @class historycall
        * @static
        */
        var historycall = {

            // the REST api
            api: {
                'root': 'historycall',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} interval/:exten/:from/:to To get the history call between _"from"_ date to _"to"_ date. The date
                *                                             must be expressed in YYYYMMDD format
                *   @param {string} interval/:exten/:from/:to/:filter To get the history call between _"from"_ date to _"to"_ date 
                *                                                     filtering by filter. The date must be expressed in YYYYMMDD format
                */
                'get' : [
                    'interval/:exten/:from/:to',
                    'interval/:exten/:from/:to/:filter'
                ],
                'post': [],
                'head': [],
                'del' : []
            },

            /**
            * Search the address book contacts in the cetnralized phonebook for the following REST API:
            *
            *     search/:term
            *
            * @method search
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            interval: function (req, res, next) {
                try {
                    // use the history component
                    var obj = {
                        to:    req.params.to,
                        from:  req.params.from,
                        exten: req.params.exten,
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    var data = compHistory.getHistoryCallInterval(obj, function (err, results) {

                        if (err) { sendHttp500(res, err.toString()); }
                        else {
                            logger.info(IDLOG, 'send ' + results.length   + ' results searching history call ' +
                                               'interval between ' + obj.from + ' to ' + obj.to + ' for ' +
                                               'exten ' + obj.exten + ' and filter ' + (obj.filter ? obj.filter : '""'));
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        }
        exports.api            = historycall.api;
        exports.interval       = historycall.interval;
        exports.setLogger      = setLogger;
        exports.setCompHistory = setCompHistory;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
