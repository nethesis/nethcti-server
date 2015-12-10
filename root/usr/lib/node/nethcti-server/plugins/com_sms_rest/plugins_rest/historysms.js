/**
* Provides history sms functions through REST API.
*
* @module com_sms_rest
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
* @default [plugins_rest/historysms]
*/
var IDLOG = '[plugins_rest/historysms]';

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
* The sms architect component used for sms functions.
*
* @property compSms
* @type object
* @private
*/
var compSms;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

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
* Set sms architect component used by sms functions.
*
* @method setCompSms
* @param {object} comp The sms architect component.
*/
function setCompSms(comp) {
    try {
        compSms = comp;
        logger.info(IDLOG, 'set sms architect component');
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

(function(){
    try {
        /**
        * REST plugin that provides history sms functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`historysms/day/:day`](#dayget)
        * 1. [`historysms/day/:day/:filter`](#day_filterget)
        * 1. [`historysms/interval/:from/:to`](#intervalget)
        * 1. [`historysms/interval/:from/:to/:filter`](#interavl_filterget)
        *
        * ---
        *
        * ### <a id="intervalget">**`historysms/interval/:from/:to`**</a>
        *
        * Returns the history of the sms created in the interval time by the user.
        *
        * Example JSON response:
        *
        *     [
         {
            datesent: "11/06/2014"
            timesent: "17:46:46"
            id: 7
            status: 1
            destination: "00393401234567"
            sender: "alessandro"
            text: "test sms"
         }
     ]
        *
        * ---
        *
        * ### <a id="interval_filterget">**`historysms/interval/:from/:to/:filter`**</a>
        *
        * Returns the history of the sms created in the interval time by the user
        * filtering the results by destination number.
        *
        * Example JSON response:
        *
        *     [
         {
            datesent: "11/06/2014"
            timesent: "17:46:46"
            id: 7
            status: 1
            destination: "00393401234567"
            sender: "alessandro"
            text: "test sms"
         }
     ]
        *
        * ---
        *
        * ### <a id="dayget">**`historysms/day/:day`**</a>
        *
        * Returns the history of the sms created in the specified day by the user.
        *
        * Example JSON response:
        *
        *     [
         {
            datesent: "11/06/2014"
            timesent: "17:46:46"
            id: 7
            status: 1
            destination: "00393401234567"
            sender: "alessandro"
            text: "test sms"
         }
     ]
        *
        * ---
        *
        * ### <a id="day_filterget">**`historysms/day/:day/:filter`**</a>
        *
        * Returns the history of the sms created in the specified day by the user
        * filtering the results by destination number.
        *
        * Example JSON response:
        *
        *     [
         {
            datesent: "11/06/2014"
            timesent: "17:46:46"
            id: 7
            status: 1
            destination: "00393401234567"
            sender: "alessandro"
            text: "test sms"
         }
     ]
        *
        * @class plugin_rest_historysms
        * @static
        */
        var historysms = {

            // the REST api
            api: {
                'root': 'historysms',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} interval/:from/:to To get the history of the sms
                *       created in the interval time by the applicant user
                *
                *   @param {string} interval/:from/:to/:filter To get the history of the
                *       sms created in the interval time by the applicant user filtering the
                *       results by "destination" field of db table
                *
                *   @param {string} day/:day To get the history of the sms created in the
                *       specified day by the applicant user. The date must be expressed in
                *       YYYYMMDD format
                *
                *   @param {string} day/:day/:filter To get the history of the sms created
                *       in the specified day by the applicant user filtering the results by "destination"
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
            * Search the history of the sms created by the applicant user for the
            * specified interval time and optional filter the results by destination
            * number, with the following REST api:
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
                    var username = req.headers.authorization_user;

                    // check the sms & administration sms authorization
                    if (   compAuthorization.authorizeSmsUser(username)      !== true
                        && compAuthorization.authorizeAdminSmsUser(username) !== true) {

                        logger.warn(IDLOG, 'getting history sms interval: "sms" & "admin_sms" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminSmsUser(username) === true) {
                        logger.info(IDLOG, 'getting history sms interval: "admin_sms" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizeSmsUser(username) === true) {
                        logger.info(IDLOG, 'getting history sms interval: "sms" authorization successfully for user "' + username + '"');
                    }

                    var obj = {
                        to:       req.params.to,
                        from:     req.params.from,
                        username: username
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    var data = compSms.getHistoryInterval(obj, function (err, results) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                        else {
                            logger.info(IDLOG, 'send ' + results.length   + ' results searching history sms ' +
                                               'interval between ' + obj.from + ' to ' + obj.to + ' sent by ' +
                                               'username "' + obj.username + '" and filter ' + (obj.filter ? obj.filter : '""'));
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Search the history sms sent by the applicant user in the specified day and optional
            * filter the results with the following REST api:
            *
            *     day/:day
            *     day/:day/:filter
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
        exports.api                  = historysms.api;
        exports.day                  = historysms.day;
        exports.interval             = historysms.interval;
        exports.setLogger            = setLogger;
        exports.setCompSms           = setCompSms;
        exports.setCompUtil          = setCompUtil;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
