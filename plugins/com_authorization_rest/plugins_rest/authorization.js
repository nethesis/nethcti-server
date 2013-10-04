/**
* Provides authorization functions through REST API.
*
* @module com_authorization_rest
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
* @default [plugins_rest/authorization]
*/
var IDLOG = '[plugins_rest/authorization]';

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
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* The architect component to be used for authorization functions.
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
* Set authorization architect component.
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

(function() {
    try {
        /**
        * REST plugin that provides authorization functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`authorization/user`](#userget)
        *
        * ---
        *
        * ### <a id="userget">**`authorization/user`**</a>
        *
        * Returns the user authorizations.
        *
        * @class plugin_rest_authorization
        * @static
        */
        var authorization = {

            // the REST api
            api: {
                'root': 'authorization',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} user To get all user authorizations
                */
                'get':   [ 'user' ],
                'post' : [],
                'head':  [],
                'del' :  []
            },

            /**
            * Get all user authorizations by the following REST API:
            *
            *     user
            *
            * @method user
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            user: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = compAuthorization.getUserAuthorizations(username);

                    if (typeof results !== 'object') {
                        var str = 'wrong user authorization result for user "' + username + '"';
                        logger.error(IDLOG, str);
                        compUtil.net.sendHttp500(IDLOG, res, str);

                    } else {
                        logger.info(IDLOG, 'send authorization of user "' + username + '"');
                        res.send(200, results);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = authorization.api;
        exports.user                 = authorization.user;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
