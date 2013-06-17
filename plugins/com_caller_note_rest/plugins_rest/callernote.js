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
        * REST plugin that provides caller note functions through the following REST API:
        *
        *     callernote/create/:text/:number/:callid/:visibility/:expiration/:booking
        *
        * The client crete a new caller note. The visibility can be "public" or "private".
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
                *   @param {string} create/:text/:number/:callid/:visibility/:expiration/:booking To create a new caller note
                */
                'post' : [ 'create/:text/:number/:callid/:visibility/:expiration/:booking' ],
                'head': [],
                'del' : []
            },

            /**
            * Create a new caller note by the following REST API:
            *
            *     create/:text/:number/:callid/:visibility/:expiration/:booking
            *
            * The visibility can be "public" or "private".
            *
            * @method create
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            create: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    var data = {
                        text:       req.params.text,
                        callid:     req.params.callid,
                        number:     req.params.number,
                        creator:    username,
                        booking:    req.params.booking,
                        visibility: req.params.visibility,
                        expiration: req.params.expiration
                    };
                    compCallerNote.newCallerNote(data, function (err) {

                        if (err) { sendHttp500(res, err.toString()); }

                        else {
                            logger.info(IDLOG, 'new caller note by "' + username + '" for number "' + data.number + '" has been successfully crated');
                            res.send(200);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api               = callernote.api;
        exports.create            = callernote.create;
        exports.setLogger         = setLogger;
        exports.setCompCallerNote = setCompCallerNote;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
