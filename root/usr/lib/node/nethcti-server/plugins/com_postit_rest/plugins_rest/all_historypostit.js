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
* @default [plugins_rest/all_historypostit]
*/
var IDLOG = '[plugins_rest/all_historypostit]';

/**
* The string used to hide phone numbers in privacy mode.
*
* @property privacyStrReplace
* @type {string}
* @private
* @default "xxx"
*/
var privacyStrReplace = 'xxx';

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
        * REST plugin that provides administration history postit functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`all_historypostit/day/:day`](#dayget)
        * 1. [`all_historypostit/day/:day/:filter`](#day_filterget)
        * 1. [`all_historypostit/interval/:from/:to`](#intervalget)
        * 1. [`all_historypostit/interval/:from/:to/:filter`](#interavl_filterget)
        *
        * ---
        *
        * ### <a id="intervalget">**`all_historypostit/interval/:from/:to`**</a>
        *
        * Returns the history of the postit created in the interval time by all the users.
        *
        * Example JSON response:
        *
        *     [
         {
            creationdate: "11/06/2014"
            creationtime: "15:37:52"
            readdate: null
            timeread: null
            id: 31
            recipient: "giovanni"
            creator: "alessandro"
            text: "test post-it"
         }
     ]
        *
        * ---
        *
        * ### <a id="interval_filterget">**`all_historypostit/interval/:from/:to/:filter`**</a>
        *
        * Returns the history of the postit created in the interval time by all the users
        * filtering the results.
        *
        * Example JSON response:
        *
        *     [
         {
            creationdate: "11/06/2014"
            creationtime: "15:37:52"
            readdate: null
            timeread: null
            id: 31
            recipient: "giovanni"
            creator: "alessandro"
            text: "test post-it"
         }
     ]
        *
        * ---
        *
        * ### <a id="dayget">**`all_historypostit/day/:day`**</a>
        *
        * Returns the history of the postit created in the specified day by all the users.
        *
        * Example JSON response:
        *
        *     [
         {
            creationdate: "11/06/2014"
            creationtime: "15:37:52"
            readdate: null
            timeread: null
            id: 31
            recipient: "giovanni"
            creator: "alessandro"
            text: "test post-it"
         }
     ]
        *
        * ---
        *
        * ### <a id="day_filterget">**`all_historypostit/day/:day/:filter`**</a>
        *
        * Returns the history of the postit created in the specified day by all the users
        * filtering the results.
        *
        * Example JSON response:
        *
        *     [
         {
            creationdate: "11/06/2014"
            creationtime: "15:37:52"
            readdate: null
            timeread: null
            id: 31
            recipient: "giovanni"
            creator: "alessandro"
            text: "test post-it"
         }
     ]
        *
        * @class plugin_rest_all_historypostit
        * @static
        */
        var all_historypostit = {

            // the REST api
            api: {
                'root': 'all_historypostit',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} interval/:from/:to To get the history of the postit
                *       created in the interval time by all the users
                *
                *   @param {string} interval/:from/:to/:filter To get the history of the
                *       postit created in the interval time by all the users filtering the
                *       results by "recipient" field of db table
                *
                *   @param {string} day/:day To get the history of the postit created in the
                *       specified day by all the users. The date must be expressed in
                *       YYYYMMDD format
                *
                *   @param {string} day/:day/:filter To get the history of the postit created
                *       in the specified day by all the users filtering the results by "recipient"
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
            * Search the history of the postit created by all the users for the
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
                    if (compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, 'getting all history postit interval: "admin_postit" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    logger.info(IDLOG, 'getting all history postit interval: "admin_postit" authorization successfully for user "' + username + '"');

                    var obj = {
                        to:   req.params.to,
                        from: req.params.from
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    // if the user has the privacy enabled, it adds the privacy string to be used to hide the phone numbers
                    if (compAuthorization.isPrivacyEnabled(username)) { obj.privacyStr = privacyStrReplace; }

                    // use the history component
                    compPostit.getAllUserHistoryInterval(obj, function (err, results) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                        else {
                            logger.info(IDLOG, 'send ' + results.length   + ' results searching all history post-it of all users ' +
                                               'in the interval between ' + obj.from + ' to ' + obj.to + ' and filter ' + (obj.filter ? obj.filter : '""'));
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Search the history postit created by all the users in the specified day and optional
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
        exports.api                  = all_historypostit.api;
        exports.day                  = all_historypostit.day;
        exports.interval             = all_historypostit.interval;
        exports.setLogger            = setLogger;
        exports.setPrivacy           = setPrivacy;
        exports.setCompUtil          = setCompUtil;
        exports.setCompPostit        = setCompPostit;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Sets the string to be used to hide last digits of phone numbers in privacy mode.
*
* @method setPrivacy
* @param {object} str The string used to hide last digits of phone numbers.
*/
function setPrivacy(str) {
    try {
        privacyStrReplace = str;
        logger.info(IDLOG, 'set privacy with string ' + privacyStrReplace);
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}
