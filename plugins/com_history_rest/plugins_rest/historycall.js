/**
* Provides asterisk history call functions through REST API.
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

(function(){
    try {
        /**
        * REST plugin that provides history functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`historycall/day/:endpoint/:day`](#dayget)
        * 1. [`historycall/day/:endpoint/:day/:filter`](#day_filterget)
        * 1. [`historycall/interval/:endpoint/:from/:to`](#intervalget)
        * 1. [`historycall/interval/:endpoint/:from/:to/:filter`](#interval_filterget)
        *
        * ---
        *
        * ### <a id="dayget">**`historycall/day/:endpoint/:day`**</a>
        *
        * Returns the history call of the day _"day"_ and endpoint _"endpoint"_. E.g. the endpoint can be
        * the extension number. Date must be expressed in YYYYMMDD format. If an error occurs an HTTP 500
        * response is returned.
        *
        * ---
        *
        * ### <a id="day_filterget">**`historycall/day/:endpoint/:day/:filter`**</a>
        *
        * Returns the history call of the day _"day"_ and endpoint _"endpoint"_ filtering by _"filter"_.
        * E.g. the endpoint can be the extension number. Date must be expressed in YYYYMMDD format. If an
        * error occurs an HTTP 500 response is returned.
        *
        * ---
        *
        * ### <a id="intervalget">**`historycall/interval/:endpoint/:from/:to`**</a>
        *
        * Returns the history call between _"from"_ date to _"to"_ date for the endpoint _"endpoint"_.
        * E.g. the endpoint can be the extension number. Dates must be expressed in YYYYMMDD format.
        * If an error occurs an HTTP 500 response is returned.
        *
        * ---
        *
        * ### <a id="interval_filterget">**`historycall/interval/:endpoint/:from/:to/:filter`**</a>
        *
        * Returns the history call between _"from"_ date to _"to"_ date for the endpoint _"endpoint"_
        * filtering by _"filter"_. E.g. the endpoint can be the extension number. Date must be expressed
        * in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
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
                *   @param {string} day/:endpoint/:day To get the history call of the day and endpoint. The date must be expressed
                *       in YYYYMMDD format
                *
                *   @param {string} day/:endpoint/:day/:filter To get the history call of the day and endpoint filtering by filter.
                *       The date must be expressed in YYYYMMDD format
                *
                *   @param {string} interval/:endpoint/:from/:to To get the history call between _"from"_ date to _"to"_ date.
                *       The date must be expressed in YYYYMMDD format
                *
                *   @param {string} interval/:endpoint/:from/:to/:filter To get the history call between _"from"_ date to _"to"_
                *       date filtering by filter. The date must be expressed in YYYYMMDD format
                */
                'get' : [
                    'day/:endpoint/:day',
                    'day/:endpoint/:day/:filter',
                    'interval/:endpoint/:from/:to',
                    'interval/:endpoint/:from/:to/:filter'
                ],
                'post': [],
                'head': [],
                'del' : []
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
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Search the history call for the specified interval, endpoint and optional filter by the following REST api:
            *
            *     interval/:endpoint/:from/:to
            *     interval/:endpoint/:from/:to/:filter
            *
            * @method interval
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            interval: function (req, res, next) {
                try {
                    // get the username from the authorization header added by authentication step
                    var username = req.headers.authorization_user;

                    // check the cdr authorization
                    if (compAuthorization.authorizeCdrUser(username) === false) {
                        logger.warn(IDLOG, 'cdr authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // check if the endpoint in the request is an endpoint of the applicant user. The user
                    // can only see the cdr of his endpoints
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

                        logger.warn(IDLOG, 'authorization cdr call failed for user "' + username + '": requested endpoint ' +
                                           req.params.endpoint + ' not owned by him');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    logger.info(IDLOG, 'cdr authorization successfully for user "' + username + '" and endpoint ' + req.params.endpoint);

                    var obj = {
                        to:       req.params.to,
                        from:     req.params.from,
                        endpoint: req.params.endpoint
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    // use the history component
                    var data = compHistory.getHistoryCallInterval(obj, function (err, results) {
                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
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
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = historycall.api;
        exports.day                  = historycall.day;
        exports.interval             = historycall.interval;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompHistory       = setCompHistory;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
