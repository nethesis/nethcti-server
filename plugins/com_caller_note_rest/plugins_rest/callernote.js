/**
* Provides caller note functions through REST API.
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
* @default [plugins_rest/callernote]
*/
var IDLOG = '[plugins_rest/callernote]';

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
* Set caller note architect component used by caller note functions.
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

(function() {
    try {
        /**
        * REST plugin that provides caller note functions through the following REST API:
        *
        * # POST requests
        *
        * 1. [`callernote/create`](#createpost)
        *
        * ---
        *
        * ### <a id="createpost">**`callernote/create`**</a>
        *
        * The client cretes a new caller note. The request must contains the configurations object in the
        * POST request. E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "text": "some text", "number": "123456", "callid": "1234.56", "visibility": "public | private", "expiration": "20131001", "booking": "true | false" }' https://192.168.5.224:8282/callernote/create
        *
        * @class plugin_rest_callernote
        * @static
        */
        var callernote = {

            // the REST api
            api: {
                'root': 'callernote',
                'get': [],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} create To create a new caller note
                */
                'post' : [ 'create' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Create a new caller note by the following REST API:
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
                    var username = req.headers.authorization_user;
                    var data = JSON.parse(Object.keys(req.params)[0]);
                    data.creator = username;

                    compCallerNote.newCallerNote(data, function (err) {

                        if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }

                        else {
                            logger.info(IDLOG, 'new caller note by "' + username + '" for number "' + data.number + '" has been successfully crated');
                            compUtil.net.sendHttp200(IDLOG, res);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api               = callernote.api;
        exports.create            = callernote.create;
        exports.setLogger         = setLogger;
        exports.setCompUtil       = setCompUtil;
        exports.setCompCallerNote = setCompCallerNote;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
