/**
* Provides streaming functions through REST API.
*
* @module com_streaming_rest
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
* @default [plugins_rest/streaming]
*/
var IDLOG = '[plugins_rest/streaming]';

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
* The streaming architect component used for streaming functions.
*
* @property compStreaming
* @type object
* @private
*/
var compStreaming;

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
* Set streaming architect component used by streaming functions.
*
* @method setCompStreaming
* @param {object} cp The streaming architect component.
*/
function setCompStreaming(cp) {
    try {
        compStreaming = cp;
        logger.info(IDLOG, 'set streaming architect component');
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
* Send HTTP 200 ok response.
*
* @method sendHttp200
* @param {object} resp The client response object.
* @private
*/
function sendHttp200(resp) {
    try {
        resp.writeHead(200);
        logger.info(IDLOG, 'send HTTP 200 ok response to ' + resp.connection.remoteAddress);
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
        * REST plugin that provides streaming functions through the following REST API:
        *
        * # GET requests
        *
        * [`streaming/sources`](#sourcesget)
        *
        * Returns all the streaming sources.
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`streaming/open`](#openpost)
        *
        * ---
        *
        * ### <a id="streaming/openpost">**`streaming/open`**</a>
        *
        * Execute the command associated with the streaming to open the associated device, e.g. a door.
        * The request must contains the following parameters:
        *
        * * `id: the streaming identifier`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "id": "door" }' https://192.168.5.224:8282/streaming/open
        *
        * @class plugin_rest_streaming
        * @static
        */
        var streaming = {

            // the REST api
            api: {
                'root': 'streaming',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} sources To gets all the streaming sources
                */
                'get': [ 'sources' ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} open To execute the command associated with the streaming source
                */
                'post' : [ 'open' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Returns all the streaming sources by the following REST API:
            *
            *     sources
            *
            * @method sources
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            sources: function (req, res, next) {
                try {
                    // get the username from the authorization header
                    var username = req.headers.authorization_user;

                    // get the authorized streaming sources of the user
                    var authSourceNames = compAuthorization.getAuthorizedStreamingSources(username);

                    // get all the streaming sources in JSON format
                    var allSourcesJSON  = compStreaming.getAllSourcesJSON(username);

                    // extract only the authorized streaming sources of the user
                    var authSourcesJson = {}; // object to return
                    var stream;
                    for (stream in authSourceNames) {

                        if (authSourceNames[stream] === true && typeof allSourcesJSON[stream] === 'object') {

                            // add the JSON streaming source to the object to return
                            authSourcesJson[stream] = allSourcesJSON[stream];
                        }
                    }

                    logger.info(IDLOG, 'send authorized streaming sources "' + Object.keys(authSourcesJson) + '" to the user "' + username + '"');
                    res.send(200, authSourcesJson);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Execute the command associated with the streaming source to open
            * the associated device, e.g. a door, with the following REST API:
            *
            *     open
            *
            * @method open
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            open: function (req, res, next) {
                try {
                    // get the username from the authorization header
                    var username = req.headers.authorization_user;

                    // get the streaming source identifier
                    var stream = req.params.id;

                    // check if the user is authorized to use the streaming source
                    if (compAuthorization.authorizeStreamingSourceUser(username, stream) === true) {

                        logger.info(IDLOG, 'authorization for user "' + username + '" to open streaming source "' + stream + '" has been successful');

                        compStreaming.open(stream, function (err) {

                            if (err) {
                                logger.error(IDLOG, 'opening streaming source "' + stream + '"');
                                sendHttp500(res);

                            } else {
                                logger.info(IDLOG, 'opened streaming source "' + stream + '" successful');
                                sendHttp200(res);
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'authorization for user "' + username + '" for open streaming source "' + stream + '" has been failed !');
                        sendHttp401(res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api                  = streaming.api;
        exports.open                 = streaming.open;
        exports.sources              = streaming.sources;
        exports.setLogger            = setLogger;
        exports.setCompStreaming     = setCompStreaming;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
