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
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The customer card architect component used for customer card functions.
*
* @property compCustomerCard
* @type object
* @private
*/
var compCustomerCard;

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
        * REST plugin that provides customer card functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`custcard/getbynum/:number`](#getbynumget)
        *
        * ---
        *
        * ### <a id="getbynumget">**`custcard/getbynum/:number`**</a>
        *
        * The client receive all customer cards by number for which he has the permission. The _render_ key
        * contains the customer card in HTML format.
        *
        * Example JSON response:
        *
        *     {
         "20": {
              "name": "calls",
              "render": "\n\t<div id='cdr' class='...",
              "number": "0721405516"
         },
         "00": {
              "name": "identity",
              "render": "\n\n\t<div class=\"contactsVCard\">\n\t<div class='contactsVCardHeader'>...",
              "number": "0721405516"
         }
     }
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
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
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

                            if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                            else {
                                var ccreturned = '';
                                var key;
                                for (key in results) { ccreturned += results[key].name + ','; }
                                ccreturned = ccreturned.substring(0, ccreturned.length - 1);

                                logger.info(IDLOG, 'send ' + Object.keys(results).length + ' customer cards "' + ccreturned + '" for user "' + username + '" searching the number ' + num + ' to ' + res.connection.remoteAddress);
                                res.send(200, results);
                            }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = custcard.api;
        exports.getbynum             = custcard.getbynum;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompCustomerCard  = setCompCustomerCard;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
