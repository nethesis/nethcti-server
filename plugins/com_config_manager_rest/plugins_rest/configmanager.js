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
* @param {object} comp The user architect component.
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compUser = comp;
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
        * REST plugin that provides configuration manager functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`configmanager/userconf`](#userconfget)
        * 1. [`configmanager/usernames`](#usernamesget)
        * 1. [`configmanager/chatserver`](#chatserverget)
        * 1. [`configmanager/userendpoints`](#userendpointsget)
        * 1. [`configmanager/alluserendpoints`](#alluserendpointsget)
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
        * Returns the list of all the usernames, each of one with its name and surname.
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
        * Returns the endpoints of the current user.
        *
        * ---
        *
        * ### <a id="alluserendpointsget">**`configmanager/alluserendpoints`**</a>
        *
        * Returns the endpoints of all users.
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`configmanager/click2call`](#click2callpost)
        * 1. [`configmanager/notification`](#notificationpost)
        * 1. [`configmanager/presence`](#presencepost)
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
        * ---
        *
        * ### <a id="presencepost">**`configmanager/presence`**</a>
        *
        * Sets the specified presence of the user. The request must contain the following parameters:
        *
        * * `type: ("nethcti") the type of the presence to set`
        * * `status: ("online" | "offline" | "busy" | "away") the nethcti presence status`
        * * `device_type: ["desktop" | "mobile"] the device type used by the user for nethcti. It's needed when type is equal to "nethcti"`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "type": "nethcti", "device_type": "desktop", "status": "online" }' https://192.168.5.224:8282/configmanager/presence
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
                *   @param {string} userconf         To get all user configurations
                *   @param {string} usernames        To get the list of all the username
                *   @param {string} chatserver       To get the server chat parameters
                *   @param {string} userendpoints    To get all the endpoints of the user
                *   @param {string} alluserendpoints To get the endpoints of all users
                */
                'get': [
                    'userconf',
                    'usernames',
                    'chatserver',
                    'userendpoints',
                    'alluserendpoints'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} presence      To set a presence of the user
                *   @param {string} notification  To save a user notification setting
                *   @param {string} click2callave To save the click to call mode of the user
                */
                'post' : [
                    'presence',
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
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {

                        logger.info(IDLOG, 'send configuration of user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets the list of all the username each of one with its name and surname with the following REST API:
            *
            *     usernames
            *
            * @method userslist
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            usernames: function (req, res, next) {
                try {
                    var username         = req.headers.authorization_user;
                    var usernameWithData = compUser.getUsernamesWithData();

                    logger.info(IDLOG, 'send the list of all the usernames with data to the user "' + username + '"');
                    res.send(200, usernameWithData);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {

                        logger.info(IDLOG, 'send all endpoints of user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Returns the endpoints of all users by the following REST API:
            *
            *     alluserendpoints
            *
            * @method alluserendpoints
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            alluserendpoints: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = compConfigManager.getAllUserEndpointsJSON();

                    if (typeof results !== 'object') {
                        var strerr = 'wrong endpoints result of all users';
                        logger.error(IDLOG, strerr);
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {

                        logger.info(IDLOG, 'send endpoints of all users');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                            compUtil.net.sendHttp500(IDLOG, res, strerr);

                        } else {
                            logger.info(IDLOG, 'send server chat configuration to user "' + username + '"');
                            res.send(200, results);
                        }

                    } else {
                        logger.warn(IDLOG, 'chat authorization failed for user "' + username + '"!');
                        compUtil.net.sendHttp403(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
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

                        compUtil.net.sendHttp400(IDLOG, res);
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
                            if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                            else     { compUtil.net.sendHttp200(IDLOG, res); }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
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

                        compUtil.net.sendHttp400(IDLOG, res);
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
                            if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                            else     { compUtil.net.sendHttp200(IDLOG, res); }

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Sets the specified presence of the user with the following REST API:
            *
            *     presence
            *
            * @method presence
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            presence: function (req, res, next) {
                try {
                    var type       = req.params.type;
                    var status     = req.params.status;
                    var username   = req.headers.authorization_user;
                    var deviceType = req.params.device_type;

                    // check parameters
                    if (typeof type !== 'string'
                        ||     type !== 'nethcti'
                        || !compUser.isValidNethctiPresence(status)
                        || !compUser.isValidEndpointNethctiDevice(deviceType)) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (type === 'nethcti') { // sets the nethcti presence of the user

                        if (compUser.setNethctiPresence(username, deviceType, status) === true) {
                            compUtil.net.sendHttp200(IDLOG, res);

                        } else {
                            logger.warn(IDLOG, 'settings "' + type + '" presence of the user "' + username + '"');
                            compUtil.net.sendHttp500(IDLOG, res, 'some errors have occured');
                        }
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = configmanager.api;
        exports.userconf             = configmanager.userconf;
        exports.presence             = configmanager.presence;
        exports.setLogger            = setLogger;
        exports.usernames            = configmanager.usernames;
        exports.click2call           = configmanager.click2call;
        exports.chatserver           = configmanager.chatserver;
        exports.setCompUtil          = setCompUtil;
        exports.setCompUser          = setCompUser;
        exports.notification         = configmanager.notification;
        exports.userendpoints        = configmanager.userendpoints;
        exports.alluserendpoints     = configmanager.alluserendpoints;
        exports.setCompConfigManager = setCompConfigManager;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
