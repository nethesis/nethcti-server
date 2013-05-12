/**
* Provides phonebook functions through REST API.
*
* @module com_phonebook_rest
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
* @default [plugins_rest/pphonebook]
*/
var IDLOG = '[plugins_rest/pphonebook]';

/**
* The phonebook architect component used for phonebook functions.
*
* @property compPhonebook
* @type object
* @private
*/
var compPhonebook;

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
* Set phonebook architect component used by phonebook functions.
*
* @method setCompPhonebook
* @param {object} cp The phonebook architect component.
*/
function setCompPhonebook(cp) {
    try {
        compPhonebook = cp;
        logger.info(IDLOG, 'set phonebook architect component');
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
        * REST plugin that provides phonebook functions through the following REST API:
        *
        *     pphonebook/search/:term
        *
        * The client receive all phonebook contacts found or a HTTP 500 response.
        *
        * @class pphonebook
        * @static
        */
        var pphonebook = {

            // the REST api
            api: {
                'root': 'pphonebook',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} search/:term To get the centralized phonebook contacts
                */
                'get' : [ 'search/:term' ],
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
            search: function (req, res, next) {
                try {
                    // use phonebook component
                    compPhonebook.getPhonebookContacts(req.params.term, function (err, results) {

                        if (err) { sendHttp500(res, err.toString()); }

                        else {
                            logger.info(IDLOG, 'send ' + results.length + ' results searching ' + req.params.term + ' in centralized phonebook');
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        }
        exports.api              = pphonebook.api;
        exports.search           = pphonebook.search;
        exports.setLogger        = setLogger;
        exports.setCompPhonebook = setCompPhonebook;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
