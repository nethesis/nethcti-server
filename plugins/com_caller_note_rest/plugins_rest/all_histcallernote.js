/**
* Provides history caller note functions through REST API.
*
* @module com_caller_note_rest
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
* @default [plugins_rest/all_histcallernote]
*/
var IDLOG = '[plugins_rest/all_histcallernote]';

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
* The caller note architect component used for caller note functions.
*
* @property compCallerNote
* @type object
* @private
*/
var compCallerNote;

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
* Set caller note architect component.
*
* @method setCompCallerNote
* @param {object} cn The caller note architect component.
*/
function setCompCallerNote(cn) {
    try {
        compCallerNote = cn;
        logger.info(IDLOG, 'set caller note architect component');
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
        * REST plugin that provides history caller note functions through the following REST API:
        *
        *     all_histcallernote/interval/:from/:to
        *
        * Returns the history of the caller note created by all users between _"from"_ date to _"to"_ date.
        * Dates must be expressed in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
        *
        *     all_histcallernote/interval/:from/:to/:filter
        *
        * Returns the history caller note created by all users between _"from"_ date to _"to"_ date filtering by _"filter"_.
        * Date must be expressed in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
        *
        *     all_histcallernote/day/:day
        *
        * Returns the history caller note created by all users of the day _"day"_. Date must be expressed in YYYYMMDD format.
        * If an error occurs an HTTP 500 response is returned.
        *
        *     all_histcallernote/day/:day/:filter
        *
        * Returns the history caller note created by all users of the day _"day"_ filtering by _"filter"_. Date must be expressed
        * in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
        *
        * @class plugin_rest_histcallernote
        * @static
        */
        var all_histcallernote = {

            // the REST api
            api: {
                'root': 'all_histcallernote',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} interval/:from/:to To get the history caller note of all users between _"from"_ date to _"to"_ date.
                *       The date must be expressed in YYYYMMDD format
                *
                *   @param {string} interval/:from/:to/:filter To get the history caller note of all users between _"from"_ date to _"to"_
                *       date filtering by filter. The date must be expressed in YYYYMMDD format
                *
                *   @param {string} day/:day To get the history caller note of all users of the day. The date must be expressed in YYYYMMDD format
                *
                *   @param {string} day/:day/:filter To get the history caller note of all users of the day filtering by filter. The date must
                *       be expressed in YYYYMMDD format
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
            * Search the history of caller note of all users for the specified interval and optional filter with the following REST api:
            *
            *     interval/:from/:to
            *     interval/:from/:to/:filter
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

                    var obj = {
                        to:   req.params.to,
                        from: req.params.from
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    // use the history component
                    var data = compCallerNote.getAllUserHistoryInterval(obj, function (err, results) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                        else {
                            logger.info(IDLOG, 'send ' + results.length   + ' results searching history caller note ' +
                                               'of all users in the interval between ' + obj.from + ' to ' + obj.to +
                                               'and filter ' + (obj.filter ? obj.filter : '""') + ' to user "' + username + '"');
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Search the history of the caller note of all users for the specified day, endpoint and optional filter
            * by the following REST api:
            *
            *     day/:endpoint/:day
            *     day/:endpoint/:day/:filter
            *
            * @method day
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
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
            }
        }
        exports.api               = all_histcallernote.api;
        exports.day               = all_histcallernote.day;
        exports.interval          = all_histcallernote.interval;
        exports.setLogger         = setLogger;
        exports.setCompUtil       = setCompUtil;
        exports.setCompCallerNote = setCompCallerNote;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
