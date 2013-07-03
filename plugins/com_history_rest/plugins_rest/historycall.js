/**
* Provides history call functions through REST API.
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
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

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
* @param {object} ch The history architect component.
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
* Set authorization architect component used by history functions.
*
* @method setCompAuthorization
* @param {object} ca The authorization architect component.
*/
function setCompAuthorization(ca) {
    try {
        compAuthorization = ca;
        logger.info(IDLOG, 'set authorization architect component');
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
        logger.error(IDLOG, 'send HTTP 500 response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * REST plugin that provides history functions through the following REST API:
        *
        *     historycall/interval/:endpoint/:from/:to
        *
        * Return the history call between _"from"_ date to _"to"_ date for the endpoint _"endpoint"_.
        * E.g. the endpoint can be the extension number. Dates must be expressed in YYYYMMDD format.
        * If an error occurs an HTTP 500 response is returned.
        *
        *     historycall/interval/:endpoint/:from/:to/:filter
        *
        * Return the history call between _"from"_ date to _"to"_ date for the endpoint _"endpoint"_
        * filtering by _"filter"_. E.g. the endpoint can be the extension number. Date must be expressed
        * in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
        *
        *     historycall/day/:endpoint/:day
        *
        * Return the history call of the day _"day"_ and endpoint _"endpoint"_. E.g. the endpoint can be
        * the extension number. Date must be expressed in YYYYMMDD format. If an error occurs an HTTP 500
        * response is returned.
        *
        *     historycall/day/:endpoint/:day/:filter
        *
        * Return the history call of the day _"day"_ and endpoint _"endpoint"_ filtering by _"filter"_.
        * E.g. the endpoint can be the extension number. Date must be expressed in YYYYMMDD format. If an
        * error occurs an HTTP 500 response is returned.
        *
        * @class plugin_rest_historycall
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
                *   @param {string} interval/:endpoint/:from/:to To get the history call between _"from"_ date to _"to"_ date.
                *       The date must be expressed in YYYYMMDD format
                *
                *   @param {string} interval/:endpoint/:from/:to/:filter To get the history call between _"from"_ date to _"to"_
                *       date filtering by filter. The date must be expressed in YYYYMMDD format
                *
                *   @param {string} day/:endpoint/:day To get the history call of the day and endpoint. The date must be expressed
                *       in YYYYMMDD format
                *
                *   @param {string} day/:endpoint/:day/:filter To get the history call of the day and endpoint filtering by filter.
                *       The date must be expressed in YYYYMMDD format
                */
                'get' : [
                    'interval/:endpoint/:from/:to',
                    'interval/:endpoint/:from/:to/:filter',
                    'day/:endpoint/:day',
                    'day/:endpoint/:day/:filter'
                ],
                'post': [],
                'head': [],
                'del' : []
            },

            /**
            * Search the history call for the specified interval, endpoint and optional filter by the following REST api:
            *
            *     interval/:endpoint/:from/:to
            *     interval/:endpoint/:from/:to/:filter
            *
            * @method interval
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            interval: function (req, res, next) {
                try {
                    // get the username from the authorization header added by authentication step
                    var username = req.headers.authorization_user;

                    // check the history authorization
                    if (compAuthorization.authorizeHistoryUser(username) === false) {
                        logger.warn(IDLOG, 'history authorization failed for user "' + username + '"!');
                        sendHttp401(res);
                        return;
                    }

                    // check if the endpoint in the request is an endpoint of the applicant user. The user
                    // can only see the history of his endpoints
                    if (compAuthorization.authorizeHistoryUserEndpoint(username, req.params.endpoint) === false) {

                        logger.warn(IDLOG, 'authorization history call failed for user "' + username + '": requested endpoint ' +
                                           req.params.endpoint + ' not owned by him');
                        sendHttp401(res);
                        return;
                    }

                    logger.info(IDLOG, 'history authorization successfully for user "' + username + '" and endpoint ' + req.params.endpoint);

                    var obj = {
                        to:       req.params.to,
                        from:     req.params.from,
                        endpoint: req.params.endpoint
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    // use the history component
                    var data = compHistory.getHistoryCallInterval(obj, function (err, results) {

                        if (err) { sendHttp500(res, err.toString()); }
                        else {
                            logger.info(IDLOG, 'send ' + results.length   + ' results searching history call ' +
                                               'interval between ' + obj.from + ' to ' + obj.to + ' for ' +
                                               'endpoint ' + obj.endpoint + ' and filter ' + (obj.filter ? obj.filter : '""') +
                                               ' to user "' + username + '"');
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Search the history call for the specified day, endpoint and optional filter by the following REST api:
            *
            *     day/:endpoint/:day
            *     day/:endpoint/:day/:filter
            *
            * @method day
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            *
            * It uses _interval_ function.
            */
            day: function (req, res, next) {
                try {
                    req.params.to = req.params.day;
                    req.params.from = req.params.day;
                    this.interval(req, res, next);
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api                  = historycall.api;
        exports.day                  = historycall.day;
        exports.interval             = historycall.interval;
        exports.setLogger            = setLogger;
        exports.setCompHistory       = setCompHistory;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
