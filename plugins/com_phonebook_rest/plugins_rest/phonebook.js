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
* @default [plugins_rest/phonebook]
*/
var IDLOG = '[plugins_rest/phonebook]';

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
* The phonebook architect component used for phonebook functions.
*
* @property compPhonebook
* @type object
* @private
*/
var compPhonebook;

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
        * REST plugin that provides phonebook functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`phonebook/search/:term`](#searchget)
        * 1. [`phonebook/searchstartswith/:term`](#searchstartswithget)
        *
        * ---
        *
        * ### <a id="searchget">**`phonebook/search/:term`**</a>
        *
        * The client receives all phonebook contacts found or an HTTP 500 response.
        *
        * ---
        *
        * ### <a id="searchstartswithget">**`phonebook/searchstartswith/:term`**</a>
        *
        * The client receives all phonebook contacts whose names starts with specified term,
        * or an HTTP 500 response.
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`phonebook/create`](#createpost)
        *
        * ---
        *
        * ### <a id="createpost">**`phonebook/create`**</a>
        *
        * Creates a contact in the NethCTI phonebook. The contact information must be
        * specified in the POST request in JSON format and must contain at least the
        * following parameters:
        *
        * * `type: ("speeddial | "private" | "public"): the visibility of the contact`
        * * `creator: the user`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "creator": "alessandro", "type": "type", ... }' https://192.168.5.224:8282/phonebook/create
        *
        * @class plugin_rest_phonebook
        * @static
        */
        var phonebook = {

            // the REST api
            api: {
                'root': 'phonebook',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} search/:term To get the centralized phonebook contacts
                *   @param {string} searchstartswith/:term To get the centralized phonebook contacts whose
                *       name starts with the specified term
                */
                'get' : [
                    'search/:term',
                    'searchstartswith/:term'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} create Creates a contact in the NethCTI phonebook
                */
                'post': [ 'create' ],
                'head': [],
                'del' : []
            },

            /**
            * Search the address book contacts in the centralized and NethCTI phonebooks for the following REST API:
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
                    compPhonebook.getPbContactsContains(req.params.term, function (err, results) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }

                        else {
                            // construct the output log
                            var strlog = 'send ';
                            var pbtype;
                            for (pbtype in results) {

                                strlog += results[pbtype].length + ' ' + pbtype + ' phonebook contacts and ';
                            }
                            strlog = strlog.substring(0, strlog.length - 5);
                            strlog += ' searching the term "' + req.params.term + '"';

                            logger.info(IDLOG, strlog);
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            },

            /**
            * Search the address book contacts whose name starts with the specified term in the centralized and
            * NethCTI phonebooks for the following REST API:
            *
            *     searchstartswith:/:term
            *
            * @method searchstartswith
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            searchstartswith: function (req, res, next) {
                try {
                    // use phonebook component
                    compPhonebook.getPbContactsStartsWith(req.params.term, function (err, results) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }

                        else {
                            // construct the output log
                            var strlog = 'send ';
                            var pbtype;
                            for (pbtype in results) {

                                strlog += results[pbtype].length + ' ' + pbtype + ' phonebook contacts and ';
                            }
                            strlog = strlog.substring(0, strlog.length - 5);
                            strlog += ' searching contacts "starts with" the term "' + req.params.term + '"';

                            logger.info(IDLOG, strlog);
                            res.send(200, results);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            },

            /**
            * Create a contact in the NethCTI phonebook with the following REST API:
            *
            *     create
            *
            * @method create
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            create: function (req, res, next) {
                try {
                    // extract the parameter
                    // data is the JSON object passed by the client with an HTTP POST request
                    var data     = JSON.parse(Object.keys(req.params)[0]);
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // use phonebook component
                    compPhonebook.saveCtiPbContact(data, function (err, results) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }

                        else {
                            logger.info(IDLOG, 'cti phonebook contact has been created successful from the user "' + username + '"');
                            compUtil.net.sendHttp201(IDLOG, res);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api              = phonebook.api;
        exports.search           = phonebook.search;
        exports.create           = phonebook.create;
        exports.setLogger        = setLogger;
        exports.setCompUtil      = setCompUtil;
        exports.searchstartswith = phonebook.searchstartswith;
        exports.setCompPhonebook = setCompPhonebook;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
