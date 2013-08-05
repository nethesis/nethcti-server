/**
* Provides postit functions through REST API.
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
* @default [plugins_rest/postit]
*/
var IDLOG = '[plugins_rest/postit]';

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

/**
* Send HTTP 400 bad request response.
*
* @method sendHttp400
* @param {object} resp The client response object.
* @private
*/
function sendHttp400(resp) {
    try {
        resp.writeHead(400);
        logger.warn(IDLOG, 'send HTTP 400 bad request response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * REST plugin that provides postit functions through the following REST API:
        *
        * # POST requests
        *
        * 1. [`postit/create`](#createpost)
        *
        * ---
        *
        * ### <a id="createpost">**`postit/create`**</a>
        *
        * The client crete a new post-it for the recipient.
        *
        * * `text: the text of the post-it`
        * * `recipient: the destination user of the message`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "text": "message text", "recipient": "john"  }' https://192.168.5.224:8282/postit/create
        *
        * @class plugin_rest_postit
        * @static
        */
        var postit = {

            // the REST api
            api: {
                'root': 'postit',
                'get': [],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} create To create a new post-it for a user
                */
                'post' : [ 'create' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Create a new post-it by the following REST API:
            *
            *     create
            *
            * @method create
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            create: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params           !== 'object'
                        || typeof req.params.text      !== 'string'
                        || typeof req.params.recipient !== 'string') {

                        sendHttp400(res);
                        return;
                    }

                    // check the postit authorization
                    if (compAuthorization.authorizePostitUser(username) === false) {
                        logger.warn(IDLOG, 'postit authorization failed for user "' + username + '" !');
                        sendHttp401(res);
                        return;
                    }
                    logger.info(IDLOG, 'postit authorization successfully for user "' + username + '"');

                    var data = {
                        text:      req.params.text,
                        creator:   username,
                        recipient: req.params.recipient
                    };

                    compPostit.newPostit(data, function (err) {

                        if (err) {
                            logger.error(IDLOG, 'creating new post-it from user "' + username + '" for recipient "' + req.params.recipient + '"');
                            sendHttp500(res, err.toString());

                        } else {
                            logger.info(IDLOG, 'new postit by "' + username + '" to "' + data.recipient + '" has been successfully crated');
                            res.send(200);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api           = postit.api;
        exports.create        = postit.create;
        exports.setLogger     = setLogger;
        exports.setCompPostit = setCompPostit;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
