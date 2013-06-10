/**
* Provides customer card functions through REST API.
*
* @module com_customer_card_rest
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
* @default [plugins_rest/custcard]
*/
var IDLOG = '[plugins_rest/custcard]';

/**
* The customer card architect component used for customer card functions.
*
* @property compCustomerCard
* @type object
* @private
*/
var compCustomerCard;

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
* Set customer card architect component used by customer card functions.
*
* @method setCompCustomerCard
* @param {object} cc The customer card architect component.
*/
function setCompCustomerCard(cc) {
    try {
        compCustomerCard = cc;
        logger.info(IDLOG, 'set customer card architect component');
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
        * The logger. It must have at least three methods: _info, warn and error._
        *
        * @property logger
        * @type object
        * @private
        * @default console
        */
        var logger = console;

        /**
        * REST plugin that provides customer card functions through the following REST API:
        *
        *     custcard/getbynum/:number
        *
        * The client receive all customer cards by number for which he's enabled or an HTTP 500 response.
        *
        * @class plugin_rest_custcard
        * @static
        */
        var custcard = {

            // the REST api
            api: {
                'root': 'custcard',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} getbynum/:number To get the customer card by specified number
                */
                'get' : [ 'getbynum/:number' ],
                'post': [],
                'head': [],
                'del' : []
            },

            /**
            * Search the customer card by number with the following REST API:
            *
            *     getbynum/:number
            *
            * @method getbynum
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            getbynum: function (req, res, next) {
                try {
                    // authorization_user header field was added in the authentication step
                    var username = req.headers.authorization_user;
                    var num      = req.params.number;

                    logger.info(IDLOG, 'get all customer cards of the user "' + username + '" for number ' + num);
                    compCustomerCard.getAllCustomerCards(username, num, function (err, results) {
                        try {

                            if (err) { sendHttp500(res, err.toString()); }
                            else {
                                logger.info(IDLOG, 'send ' + Object.keys(results).length + ' customer cards "' + Object.keys(results).toString() + '" for user "' + username + '" searching the number ' + num + ' to ' + res.connection.remoteAddress);
                                res.send(200, results);
                            }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            sendHttp500(res, err.toString());
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api                  = custcard.api;
        exports.getbynum             = custcard.getbynum;
        exports.setLogger            = setLogger;
        exports.setCompCustomerCard  = setCompCustomerCard;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
