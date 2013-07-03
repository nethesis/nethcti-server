/**
* Provides configuration manager functions through REST API.
*
* @module com_config_manager_rest
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
* @default [plugins_rest/configmanager]
*/
var IDLOG = '[plugins_rest/configmanager]';

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
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

/**
* The configuration manager architect component used for configuration functions.
*
* @property compConfigManager
* @type object
* @private
*/
var compConfigManager;

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
* Set configuration manager architect component used by configuration functions.
*
* @method setCompConfigManager
* @param {object} cm The configuration manager architect component.
*/
function setCompConfigManager(cm) {
    try {
        compConfigManager = cm;
        logger.info(IDLOG, 'set configuration manager architect component');
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
* Send HTTP 200 OK response.
*
* @method sendHttp200
* @param {object} resp The client response object.
* @private
*/
function sendHttp200(resp) {
    try {
        resp.writeHead(200);
        logger.info(IDLOG, 'send HTTP 200 response to ' + resp.connection.remoteAddress);
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
        * REST plugin that provides configuration manager functions through the following REST API:
        *
        * **GET request**
        *
        *     configmanager/userconf
        *
        * Returns the configurations of the user.
        *
        *     configmanager/chatserver
        *
        * Returns the server chat parameters.
        *
        *     configmanager/streamings
        *
        * Returns the parameters of the streaming services.
        *
        *     configmanager/userendpoints
        *
        * Returns all the user endpoints.
        *
        * **POST request**
        *
        *     configmanager/saveuser

        * Save the user configuration. The request must contain the configurations object in the
        * POST request. E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "use_gravatar": true, ... }' https://192.168.5.224:8282/configmanager/saveuser
        *
        * @class plugin_rest_configmanager
        * @static
        */
        var configmanager = {

            // the REST api
            api: {
                'root': 'configmanager',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} user To get all user configurations
                *   @param {string} streamings To get the parameters of the streaming services
                *   @param {string} chatserver To get the server chat parameters
                */
                'get': [
                    'user',
                    'streamings',
                    'chatserver',
                    'userendpoints'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} saveuser To save the user configuration. The configuration
                *       is passed as JSON object in the POST request
                */
                'post' : [ 'saveuser' ],
                'head':  [],
                'del' :  []
            },

            /**
            * Get all user configurations by the following REST API:
            *
            *     userconf
            *
            * @method userconf
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            userconf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = compConfigManager.getUserConfigurations(username);

                    if (typeof results !== 'object') {
                        var strerr = 'wrong configurations result for user "' + username + '"';
                        logger.error(IDLOG, strerr);
                        sendHttp500(res, strerr);

                    } else {

                        logger.info(IDLOG, 'send configuration of user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Get all the user endpoints by the following REST API:
            *
            *     userendpoints
            *
            * @method userendpoints
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            userendpoints: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = compConfigManager.getUserEndpointsJSON(username);

                    if (typeof results !== 'object') {
                        var strerr = 'wrong endpoints result for user "' + username + '"';
                        logger.error(IDLOG, strerr);
                        sendHttp500(res, strerr);

                    } else {

                        logger.info(IDLOG, 'send all endpoints of user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Get all the server chat parameters by the following REST API:
            *
            *     chatserver
            *
            * @method chatserver
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            chatserver: function (req, res, next) {
                try {
                    // get the username added by the previous authentication step
                    var username = req.headers.authorization_user;

                    // check the authorization for the user
                    if (compAuthorization.authorizeChatUser(username) === true) {

                        logger.info(IDLOG, 'chat authorization successfully for user "' + username + '"');

                        // get the server chat configuration
                        var results = compConfigManager.getChatConf();

                        if (typeof results !== 'object') {
                            var strerr = 'wrong server chat configuration';
                            logger.error(IDLOG, strerr);
                            sendHttp500(res, strerr);

                        } else {
                            logger.info(IDLOG, 'send server chat configuration to user "' + username + '"');
                            res.send(200, results);
                        }

                    } else {
                        logger.warn(IDLOG, 'chat authorization failed for user "' + username + '"!');
                        sendHttp401(res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Get all the parameters of the streaming services by the following REST API:
            *
            *     streamings
            *
            * @method streamings
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            streamings: function (req, res, next) {
                try {
                    // get the username added by the previous authentication step
                    var username = req.headers.authorization_user;

                    // check the authorization for the user
                    if (compAuthorization.authorizeStreamingUser(username) === true) {

                        logger.info(IDLOG, 'streaming authorization successfully for user "' + username + '"');

                        // get the server chat configuration
                        var results = compConfigManager.getStreamingConf();

                        if (typeof results !== 'object') {
                            var strerr = 'wrong streaming configurations';
                            logger.error(IDLOG, strerr);
                            sendHttp500(res, strerr);

                        } else {
                            logger.info(IDLOG, 'send streaming configurations to user "' + username + '"');
                            res.send(200, results);
                        }

                    } else {
                        logger.warn(IDLOG, 'streaming authorization failed for user "' + username + '"!');
                        sendHttp401(res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Save the user configurations with the following REST API:
            *
            *     saveuser
            *
            * @method saveuser
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            saveuser: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var config   = req.params;

                    compConfigManager.setUserConfigurations(username, config, function (err) {

                        if (err) { sendHttp500(res, err.toString()); }
                        else     { sendHttp200(res); }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api                  = configmanager.api;
        exports.userconf             = configmanager.userconf;
        exports.saveuser             = configmanager.saveuser;
        exports.setLogger            = setLogger;
        exports.streamings           = configmanager.streamings;
        exports.chatserver           = configmanager.chatserver;
        exports.userendpoints        = configmanager.userendpoints;
        exports.setCompConfigManager = setCompConfigManager;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
