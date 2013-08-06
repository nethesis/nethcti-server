/**
* Provides history postit functions through REST API.
*
* @module com_postit_rest
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
* @default [plugins_rest/historypostit]
*/
var IDLOG = '[plugins_rest/historypostit]';

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
* The postit architect component used for postit functions.
*
* @property compPostit
* @type object
* @private
*/
var compPostit;

/**
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

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
* Set postit architect component used by postit functions.
*
* @method setCompPostit
* @param {object} cp The postit architect component.
*/
function setCompPostit(cp) {
    try {
        compPostit = cp;
        logger.info(IDLOG, 'set postit architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = comp;
        logger.log(IDLOG, 'authorization component has been set');

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
        * REST plugin that provides history postit functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`historypostit/day/:day`](#dayget)
        * 1. [`historypostit/day/:day/:filter`](#day_filterget)
        * 1. [`historypostit/interval/:from/:to`](#intervalget)
        * 1. [`historypostit/interval/:from/:to/:filter`](#interavl_filterget)
        *
        * ---
        *
        * ### <a id="intervalget">**`historypostit/interval/:from/:to`**</a>
        *
        * Returns the history of the postit created in the interval time by the user.
        *
        * ### <a id="interval_filterget">**`historypostit/interval/:from/:to/:filter`**</a>
        *
        * Returns the history of the postit created in the interval time by the user
        * filtering the results.
        *
        * ---
        *
        * ### <a id="dayget">**`historypostit/day/:day`**</a>
        *
        * Returns the history of the postit created in the specified day by the user.
        *
        * ### <a id="day_filterget">**`historypostit/day/:day/:filter`**</a>
        *
        * Returns the history of the postit created in the specified day by the user
        * filtering the results.
        *
        * @class plugin_rest_historypostit
        * @static
        */
        var historypostit = {

            // the REST api
            api: {
                'root': 'historypostit',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} interval/:from/:to To get the history of the postit
                *       created in the interval time by the applicant
                *
                *   @param {string} interval/:from/:to/:filter To get the history of the
                *       postit created in the interval time by the applicant filtering the
                *       results by "recipient" field of db table
                *
                *   @param {string} day/:day To get the history of the postit created in the
                *       specified day by the applicant. The date must be expressed in
                *       YYYYMMDD format
                *
                *   @param {string} day/:day/:filter To get the history of the postit created
                *       in the specified day by the applicant filtering the results by "recipient"
                *       field of db table. The date must be expressed in YYYYMMDD format
                */
                'get' : [
                    'day/:day',
                    'day/:day/:filter',
                    'interval/:from/:to',
                    'interval/:from/:to/:filter'
                ],
                'post': [],
                'head': [],
                'del' : []
            },

            /**
            * Search the history of the postit created by the applicant for the
            * specified interval time and optional filter the results by recipient,
            * with the following REST api:
            *
            *     interval/:from/:to
            *     interval/:from/:to/:filter
            *
            * @method interval
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            interval: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check the postit & administration postit authorization
                    if (   compAuthorization.authorizePostitUser(username)      !== true
                        && compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, '"postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                        sendHttp401(res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {
                        logger.info(IDLOG, '"admin_postit" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizePostitUser(username) === true) {
                        logger.info(IDLOG, '"postit" authorization successfully for user "' + username + '"');
                    }

                    var obj = {
                        to:       req.params.to,
                        from:     req.params.from,
                        username: username
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    // use the history component
                    var data = compPostit.getHistoryInterval(obj, function (err, results) {

                        if (err) { sendHttp500(res, err.toString()); }
                        else {
                            logger.info(IDLOG, 'send ' + results.length   + ' results searching history post-it ' +
                                               'interval between ' + obj.from + ' to ' + obj.to + ' for ' +
                                               'username "' + obj.username + '" and filter ' + (obj.filter ? obj.filter : '""'));
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Search the history postit created by the applicant in the specified day and optional
            * filter the results with the following REST api:
            *
            *     day/:day
            *     day/:day/:filter
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
        exports.api                  = historypostit.api;
        exports.day                  = historypostit.day;
        exports.interval             = historypostit.interval;
        exports.setLogger            = setLogger;
        exports.setCompPostit        = setCompPostit;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
