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
* The architect component to be used for user functions.
*
* @property compUser
* @type object
* @private
*/
var compUser;

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
* Set user architect component used for user functions.
*
* @method setCompUser
* @param {object} cu The user architect component.
*/
function setCompUser(cu) {
    try {
        compUser = cu;
        logger.info(IDLOG, 'set user architect component');
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
        * # GET requests
        *
        * 1. [`configmanager/userconf`](#userconfget)
        * 1. [`configmanager/usernames`](#usernamesget)
        * 1. [`configmanager/chatserver`](#chatserverget)
        * 1. [`configmanager/userendpoints`](#userendpointsget)
        *
        * ---
        *
        * ### <a id="userconfget">**`configmanager/userconf`**</a>
        *
        * Returns the configurations of the user.
        *
        * ---
        *
        * ### <a id="usernamesget">**`configmanager/usernames`**</a>
        *
        * Returns the list of all the username.
        *
        * ---
        *
        * ### <a id="chatserverget">**`configmanager/chatserver`**</a>
        *
        * Returns the server chat parameters.
        *
        * ---
        *
        * ### <a id="userendpointsget">**`configmanager/userendpoints`**</a>
        *
        * Returns all the user endpoints.
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`configmanager/click2call`](#click2callpost)
        * 1. [`configmanager/notification`](#notificationpost)
        *
        * ---
        *
        * ### <a id="#click2callpost">**`configmanager/click2call`**</a>
        *
        * Saves the user configuration of the click to call. The request must contain the following parameters:
        *
        * * `type: ("manual" | "automatic") the click2call type`
        * * `[device]: ("yealink" | "snom" | "url") the device brand or the "url" string. It's needed with automatic type`
        * * `[model]: the yealink model. It's needed with automatic type and yealink device`
        * * `[user]: the device username. It's needed with automatic type and yealink or snom device`
        * * `[password]: the device password. It's needed with automatic type and yealink or snom device`
        * * `[url]: the HTTP url. It's needed with automatic type and url device`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "type": "manual" }' https://192.168.5.224:8282/configmanager/notification
        *     curl --insecure -i -X POST -d '{ "type": "automatic", "device": "yealink", "model": "t26", "user": "admin", "password": "admin" }' https://192.168.5.224:8282/configmanager/notification
        *     curl --insecure -i -X POST -d '{ "type": "automatic", "device": "snom", "user": "admin", "password": "admin" }' https://192.168.5.224:8282/configmanager/notification
        *     curl --insecure -i -X POST -d '{ "type": "automatic", "device": "url", "url": "http://<IP_PHONE>/cgi-bin/cgiServer.exx?number=<CALL_TO>&outgoing_uri=<FROM_EXT>@<SERVER>" }' https://192.168.5.224:8282/configmanager/notification
        *
        * ---
        *
        * ### <a id="notificationpost">**`configmanager/notification`**</a>
        *
        * Saves a user notification configuration. The request must contain the following parameters:
        *
        * * `type: ("voicemail" | "postit") the notification type`
        * * `method: ("email" | "sms") the delivery method`
        * * `when: ("always" | "never" | "offline") the value to be set for the specified key`
        * * `to: the destination for the method: a cellphone number or an e-mail address`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "type": "voicemail", "method": "email", "when": "offline", "to": "a@a.it" }' https://192.168.5.224:8282/configmanager/notification
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
                *   @param {string} userconf     To get all user configurations
                *   @param {string} usernames    To get the list of all the username
                *   @param {string} chatserver   To get the server chat parameters
                *   @param {string} userendpoint To get all the endpoints of the user
                */
                'get': [
                    'userconf',
                    'usernames',
                    'chatserver',
                    'userendpoints'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} click2callave To save the click to call mode of the user
                *   @param {string} notification To save a user notification setting
                */
                'post' : [
                    'click2call',
                    'notification'
                ],
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
            * Gets the list of all the username with the following REST API:
            *
            *     usernames
            *
            * @method userslist
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            usernames: function (req, res, next) {
                try {
                    var username     = req.headers.authorization_user;
                    var usernameList = compUser.getUsernames();

                    logger.info(IDLOG, 'send the list of all the usernames to the user "' + username + '"');
                    res.send(200, usernameList);

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
            * Save a user notification configuration with the following REST API:
            *
            *     notification
            *
            * @method notification
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            notification: function (req, res, next) {
                try {
                    var to       = req.params.to;
                    var type     = req.params.type;
                    var when     = req.params.when;
                    var method   = req.params.method;
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof when !== 'string' || typeof method   !== 'string'
                        || typeof type !== 'string' || typeof username !== 'string'
                        || typeof to   !== 'string'
                        || (type   !== 'voicemail' && type   !== 'postit')
                        || (method !== 'email'     && method !== 'sms')
                        || (when   !== 'always'    && when   !== 'never' && when !== 'offline') ) {

                        sendHttp400(res);
                        return;
                    }

                    var data = {
                        to:       to,
                        type:     type,
                        when:     when,
                        method:   method,
                        username: username
                    };
                    compConfigManager.setUserNotificationConf(data, function (err) {
                        try {
                            if (err) { sendHttp500(res, err.toString()); }
                            else     { sendHttp200(res); }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            sendHttp500(res, err.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Save a user click to call configuration with the following REST API:
            *
            *     click2call
            *
            * @method notification
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            click2call: function (req, res, next) {
                try {
                    var url      = req.params.url;
                    var type     = req.params.type;
                    var user     = req.params.user;
                    var model    = req.params.model;
                    var device   = req.params.device;
                    var password = req.params.password;
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof type !== 'string'
                        || (type !== 'automatic' && type !== 'manual')
                        || (type === 'automatic' && typeof device !== 'string')
                        || (type === 'automatic' && device === 'yealink' && (typeof user !== 'string' || typeof password !== 'string' || typeof model !== 'string'))
                        || (type === 'automatic' && device === 'snom'    && (typeof user !== 'string' || typeof password !== 'string'))
                        || (type === 'automatic' && device === 'url'     &&  typeof url  !== 'string')) {

                        sendHttp400(res);
                        return;
                    }

                    var data = {
                        url:      url,
                        type:     type,
                        user:     user,
                        model:    model,
                        device:   device,
                        password: password,
                        username: username
                    };
                    compConfigManager.setUserClick2CallConf(data, function (err) {
                        try {
                            if (err) { sendHttp500(res, err.toString()); }
                            else     { sendHttp200(res); }

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
        exports.api                  = configmanager.api;
        exports.userconf             = configmanager.userconf;
        exports.setLogger            = setLogger;
        exports.usernames            = configmanager.usernames;
        exports.click2call           = configmanager.click2call;
        exports.chatserver           = configmanager.chatserver;
        exports.setCompUser          = setCompUser;
        exports.notification         = configmanager.notification;
        exports.userendpoints        = configmanager.userendpoints;
        exports.setCompConfigManager = setCompConfigManager;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
