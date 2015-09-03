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
        * 1. [`configmanager/queue_autologin`](#queue_autologinget)
        * 1. [`configmanager/queue_autologout`](#queue_autologoutget)
        * 1. [`configmanager/alluserendpoints`](#alluserendpointsget)
        * 1. [`configmanager/auto_dndon_logout`](#auto_dndon_logoutget)
        * 1. [`configmanager/auto_dndoff_login`](#auto_dndoff_loginget)
        * 1. [`configmanager/default_extension`](#default_extensionget)
        *
        * ---
        *
        * ### <a id="userconfget">**`configmanager/userconf`**</a>
        *
        * Returns the configurations of the user.
        *
        * Example JSON response:
        *
        *     {
         "click2call": {
              "type": "manual",
              "automatic": {
                  "user": "admin",
                  "password": "admin"
              }
         },
         "notifications": {
              "postit": {
                  "sms": {
                      "when": "never",
                      "to": "0123456789"
                  },
                  "email": {
                      "when": "never",
                      "to": "ale@nethesis.it"
                  }
              },
              "voicemail": {
                  "sms": {
                      "when": "never",
                      "to": "0123456789"
                  },
                  "email": {
                      "when": "never",
                      "to": "ale@nethesis.it"
                  }
              }
         },
         "queue_auto_login": false,
         "queue_auto_logout": false,
         "default_extension": "614"
     }
        *
        * ---
        *
        * ### <a id="usernamesget">**`configmanager/usernames`**</a>
        *
        * Returns the list of all the usernames, each of one with its name and surname.
        *
        * Example JSON response:
        *
        *     {
         "giovanni": {
              "name": "User 1",
              "surname": "Surname 1"
         },
         "alessandro": {
              "name": "User 2",
              "surname": "Surname 2"
         }
     }
        *
        * ---
        *
        * ### <a id="chatserverget">**`configmanager/chatserver`**</a>
        *
        * Returns the server chat parameters.
        *
        * Example JSON response:
        *
        *     {
         "url": "https://ale-nethvoice.mycompany.local/http-bind",
         "domain": "mycompany.local"
     }
        *
        * ---
        *
        * ### <a id="userendpointsget">**`configmanager/userendpoints`**</a>
        *
        * Returns the endpoints of the current user.
        *
        * Example JSON response:
        *
        *     {
         "email": {
              "ale@nethesis.it": {
                  "id": "ale@nethesis.it"
              }
         },
         "jabber": {
              "alessandro@mycompany.local": {
                  "id": "alessandro@mycompany.local"
              }
         },
         "nethcti": {
              "mobile": {
                  "id": "mobile",
                  "status": "offline"
              },
              "desktop": {
                  "id": "desktop",
                  "status": "online"
              }
         },
         "calendar": {},
         "extension": {
              "611": {
                  "id": "611"
              },
              "614": {
                  "id": "614"
              }
         },
         "cellphone": {
              "0123456789": {
                  "id": "0123456789"
              }
         },
         "voicemail": {
              "614": {
                  "id": "614"
              }
         }
     }
        *
        * ---
        *
        * ### <a id="alluserendpointsget">**`configmanager/alluserendpoints`**</a>
        *
        * Returns the endpoints of all users.
        *
        * Example JSON response:
        *
        *     {
         "alessandro": {
              "email": {
                  "ale@nethesis.it": {
                      "id": "ale@nethesis.it"
                  }
              },
              "jabber": {
                  "alessandro@mycompany.local": {
                      "id": "alessandro@mycompany.local"
                  }
              },
              "nethcti": {
                  "mobile": {
                      "id": "mobile",
                      "status": "offline"
                  },
                  "desktop": {
                      "id": "desktop",
                      "status": "online"
                  }
              },
              "calendar": {},
              "extension": {
                  "611": {
                      "id": "611"
                  },
                  "614": {
                      "id": "614"
                  }
              },
              "cellphone": {
                  "0123456789": {
                      "id": "0123456789"
                  }
              },
              "voicemail": {
                  "614": {
                      "id": "614"
                  }
              }
         }
         "andrea": {
              "email": {
                  "andrea@mycompany.local": {
                      "id": "andrea@mycompany.local"
                  }
              },
              "jabber": {
                  "andrea@mycompany.local": {
                      "id": "andrea@mycompany.local"
                  }
              },
              "nethcti": {
                  "mobile": {
                      "id": "mobile",
                      "status": "offline"
                  },
                  "desktop": {
                      "id": "desktop",
                      "status": "offline"
                  }
              },
              "calendar": {},
              "extension": {
                  "605": {
                      "id": "605"
                  }
              },
              "cellphone": {
                  "555-5555": {
                      "id": "555-5555"
                  }
              },
              "voicemail": {
                  "605": {
                      "id": "605"
                  }
              }
         }
     }
        *
        * ---
        *
        * ### <a id="queue_autologinget">**`configmanager/queue_autologin`**</a>
        *
        * Returns the automatic queue login of the user.
        *
        * Example JSON response:
        *
        *     { "queue_autologin": true }
        *
        * ---
        *
        * ### <a id="queue_autologoutget">**`configmanager/queue_autologout`**</a>
        *
        * Returns the automatica queue logout of the user.
        *
        * Example JSON response:
        *
        *     { "queue_autologout": true }
        *
        * ---
        *
        * ### <a id="default_extensionget">**`configmanager/default_extension`**</a>
        *
        * Returns the default extension of the user.
        *
        * Example JSON response:
        *
        *     {
         "default_extension": "614"
     }
        *
        * ---
        *
        * ### <a id="auto_dndon_logoutget">**`configmanager/auto_dndon_logout`**</a>
        *
        * Returns the automatic dnd ON status on logout of the user.
        *
        * Example JSON response:
        *
        *     { "auto_dndon_logout": true }
        *
        * ---
        *
        * ### <a id="auto_dndoff_loginget">**`configmanager/auto_dndoff_login`**</a>
        *
        * Returns the automatic dnd OFF status on login of the user.
        *
        * Example JSON response:
        *
        *     { "auto_dndoff_login": true }
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`configmanager/click2call`](#click2callpost)
        * 1. [`configmanager/notification`](#notificationpost)
        * 1. [`configmanager/presence`](#presencepost)
        * 1. [`configmanager/queue_autologin`](#queue_autologinpost)
        * 1. [`configmanager/queue_autologout`](#queue_autologoutpost)
        * 1. [`configmanager/default_extension`](#default_extensionpost)
        * 1. [`configmanager/auto_dndon_logout`](#auto_dndon_logoutpost)
        * 1. [`configmanager/auto_dndoff_login`](#auto_dndoff_loginpost)
        *
        * ---
        *
        * ### <a id="#click2callpost">**`configmanager/click2call`**</a>
        *
        * Saves the user configuration of the click to call. The request must contain the following parameters:
        *
        * * `type: ("manual" | "automatic") the click2call type`
        * * `[user]: the device username. It's needed with automatic type`
        * * `[password]: the device password. It's needed with automatic type`
        *
        * Example JSON request parameters:
        *
        *     { "type": "manual" }
        *     { "type": "automatic", "user": "admin", "password": "admin" }
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
        *
        * Example JSON request parameters:
        *
        *     { "type": "voicemail", "method": "email", "when": "offline" }
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
        * Example JSON request parameters:
        *
        *     { "type": "nethcti", "device_type": "desktop", "status": "online" }
        *
        * ---
        *
        * ### <a id="default_extensionpost">**`configmanager/default_extension`**</a>
        *
        * Sets the default extension of the user. The request must contain the following parameters:
        *
        * * `extenId: the extension identifier`
        *
        * Example JSON request parameters:
        *
        *     { "extenId": "614" }
        *
        * ---
        *
        * ### <a id="queue_autologinpost">**`configmanager/queue_autologin`**</a>
        *
        * Sets the automatic login of the user in all its dynamic queues when login to cti.
        * The request must contains the following parameters:
        *
        * * `enable: ("true" | "false") true if the automatic login is to be activated`
        *
        * Example JSON request parameters:
        *
        *     { "enable": "true" }
        *
        * ---
        *
        * ### <a id="queue_autologoutpost">**`configmanager/queue_autologout`**</a>
        *
        * Sets the automatic logout of the user from all its dynamic queues when logout from cti.
        * The request must contains the following parameters:
        *
        * * `enable: ("true" | "false") true if the automatic logout is to be activated`
        *
        * Example JSON request parameters:
        *
        *     { "enable": "true" }
        *
        * ---
        *
        * ### <a id="auto_dndon_logoutpost">**`configmanager/auto_dndon_logout`**</a>
        *
        * Sets the automatic dnd ON status when user logout from cti.
        * The request must contains the following parameters:
        *
        * * `enable: ("true" | "false") true if the automatic dnd ON on logout is to be activated`
        *
        * Example JSON request parameters:
        *
        *     { "enable": "true" }
        *
        * ---
        *
        * ### <a id="auto_dndoff_loginpost">**`configmanager/auto_dndoff_login`**</a>
        *
        * Sets the automatic dnd OFF status when user login to cti.
        * The request must contains the following parameters:
        *
        * * `enable: ("true" | "false") true if the automatic dnd OFF on login is to be activated`
        *
        * Example JSON request parameters:
        *
        *     { "enable": "true" }
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
                *   @param {string} userconf          To get all user configurations
                *   @param {string} usernames         To get the list of all the username
                *   @param {string} chatserver        To get the server chat parameters
                *   @param {string} userendpoints     To get all the endpoints of the user
                *   @param {string} queue_autologin   To get the automatic queue login when user login into the cti
                *   @param {string} queue_autologout  To get the automatic queue logout when user logout from cti
                *   @param {string} alluserendpoints  To get the endpoints of all users
                *   @param {string} default_extension To get the default extension of the user
                *   @param {string} auto_dndon_logout To get the automatic dnd ON status when user logout from cti
                *   @param {string} auto_dndoff_login To get the automatic dnd OFF status when user login to cti
                */
                'get': [
                    'userconf',
                    'usernames',
                    'chatserver',
                    'userendpoints',
                    'queue_autologin',
                    'queue_autologout',
                    'alluserendpoints',
                    'default_extension',
                    'auto_dndon_logout',
                    'auto_dndoff_login'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} presence          To set a presence of the user
                *   @param {string} click2call        To save the click to call mode of the user
                *   @param {string} notification      To save a user notification setting
                *   @param {string} queue_autologin   To set the automatic queue login when user login into the cti
                *   @param {string} queue_autologout  To set the automatic queue logout when user logout from cti
                *   @param {string} auto_dndon_logout To save the automatic dnd ON status when user logout from cti
                *   @param {string} auto_dndoff_login To save the automatic dnd OFF status when user login to cti
                */
                'post' : [
                    'presence',
                    'click2call',
                    'notification',
                    'queue_autologin',
                    'queue_autologout',
                    'default_extension',
                    'auto_dndon_logout',
                    'auto_dndoff_login'
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
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            userconf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = compConfigManager.getUserSettings(username);

                    if (typeof results !== 'object') {
                        var strerr = 'wrong settings result for user "' + username + '"';
                        logger.error(IDLOG, strerr);
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {
                        logger.info(IDLOG, 'send settings of user "' + username + '"');
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
                        logger.info(IDLOG, 'send endpoints of all users to ' + username);
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests to get/set the auto_dndon_logout of
            * the user with the following REST API:
            *
            *     GET  auto_dndon_logout
            *     POST auto_dndon_logout
            *
            * @method auto_dndon_logout
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            auto_dndon_logout: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { autoDndOnLogoutGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { autoDndOnLogoutSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests to get/set the auto_dndoff_login of
            * the user with the following REST API:
            *
            *     GET  auto_dndoff_login
            *     POST auto_dndoff_login
            *
            * @method auto_dndoff_login
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            auto_dndoff_login: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { autoDndOffLoginGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { autoDndOffLoginSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests to get/set the queue_autologin of
            * the user with the following REST API:
            *
            *     GET  queue_autologin
            *     POST queue_autologin
            *
            * @method queue_autologin
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            queue_autologin: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { queueAutoLoginGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { queueAutoLoginSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests to get/set the queue_autologout of
            * the user with the following REST API:
            *
            *     GET  queue_autologout
            *     POST queue_autologout
            *
            * @method queue_autologout
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            queue_autologout: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { queueAutoLogoutGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { queueAutoLogoutSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests to get/set the default_extension of
            * the user with the following REST API:
            *
            *     GET  default_extension
            *     POST default_extension
            *
            * @method default_extension
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            default_extension: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { defaultExtensionGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { defaultExtensionSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

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
                    var type     = req.params.type;
                    var when     = req.params.when;
                    var method   = req.params.method;
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof when !== 'string' || typeof method   !== 'string'
                        || typeof type !== 'string' || typeof username !== 'string'
                        || (type   !== 'voicemail' && type   !== 'postit')
                        || (method !== 'email'     && method !== 'sms')
                        || (when   !== 'always'    && when   !== 'never' && when !== 'offline') ) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    var data = {
                        type:     type,
                        when:     when,
                        method:   method,
                        username: username
                    };
                    compConfigManager.setUserNotifySetting(data, function (err) {
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
            * Saves a user click to call configuration with the following REST API:
            *
            *     click2call
            *
            * @method notification
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            click2call: function (req, res, next) {
                try {
                    var type     = req.params.type;
                    var user     = req.params.user;
                    var password = req.params.password;
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof type !== 'string'
                        || (type !== 'automatic' && type            !== 'manual')
                        || (type === 'automatic' && typeof user     !== 'string')
                        || (type === 'automatic' && typeof password !== 'string')){

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    var data = {
                        type:     type,
                        user:     user,
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
        exports.queue_autologin      = configmanager.queue_autologin;
        exports.queue_autologout     = configmanager.queue_autologout;
        exports.alluserendpoints     = configmanager.alluserendpoints;
        exports.default_extension    = configmanager.default_extension;
        exports.auto_dndon_logout    = configmanager.auto_dndon_logout;
        exports.auto_dndoff_login    = configmanager.auto_dndoff_login;
        exports.setCompConfigManager = setCompConfigManager;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Gets the automatic dnd OFF status when user login to cti.
*
* @method autoDndOffLoginGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function autoDndOffLoginGet(req, res, next) {
    try {
        var username = req.headers.authorization_user;
        var enabled  = compConfigManager.getAutoDndOffLoginConf(username);

        if (typeof enabled !== 'boolean') {
            var strerr = 'wrong auto dnd off login value "' + enabled + '" for user ' + username;
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

        } else {
            logger.info(IDLOG, 'send auto dnd off login value "' + enabled + '" to user ' + username);
            res.send(200, { auto_dndoff_login: enabled });
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the automatic dnd OFF status when user login to cti.
*
* @method autoDndOffLoginSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function autoDndOffLoginSet(req, res, next) {
    try {
        var username = req.headers.authorization_user;

        // check parameters
        if (req.params.enable !== 'true' && req.params.enable !== 'false') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        var enable = (req.params.enable === 'true' ? true : false);

        compConfigManager.setAutoDndOffLoginConf(username, enable, function (err) {
            try {
                if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                else     { compUtil.net.sendHttp200(IDLOG, res); }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        });
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Gets the automatic dnd ON status when user logout from cti.
*
* @method autoDndOnLogoutGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function autoDndOnLogoutGet(req, res, next) {
    try {
        var username = req.headers.authorization_user;
        var enabled  = compConfigManager.getAutoDndOnLogoutConf(username);

        if (typeof enabled !== 'boolean') {
            var strerr = 'wrong auto dnd on logout value "' + enabled + '" for user ' + username;
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

        } else {
            logger.info(IDLOG, 'send auto dnd on logout value "' + enabled + '" to user ' + username);
            res.send(200, { auto_dndon_logout: enabled });
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the automatic dnd ON status when user logout from cti.
*
* @method autoDndOnLogoutSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function autoDndOnLogoutSet(req, res, next) {
    try {
        var username = req.headers.authorization_user;

        // check parameters
        if (req.params.enable !== 'true' && req.params.enable !== 'false') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        var enable = (req.params.enable === 'true' ? true : false);

        compConfigManager.setAutoDndOnLogoutConf(username, enable, function (err) {
            try {
                if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                else     { compUtil.net.sendHttp200(IDLOG, res); }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        });
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the automatic queue logout when user logout from cti.
*
* @method queueAutoLogoutSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function queueAutoLogoutSet(req, res, next) {
    try {
        var username = req.headers.authorization_user;

        // check parameters
        if (req.params.enable !== 'true' && req.params.enable !== 'false') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        var enable = (req.params.enable === 'true' ? true : false);

        compConfigManager.setQueueAutoLogoutConf(username, enable, function (err) {
            try {
                if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                else     { compUtil.net.sendHttp200(IDLOG, res); }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        });
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Gets the automatic queue logout of the user.
*
* @method queueAutoLogoutGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function queueAutoLogoutGet(req, res, next) {
    try {
        var username = req.headers.authorization_user;
        var enabled  = compConfigManager.getQueueAutoLogoutConf(username);

        if (typeof enabled !== 'boolean') {
            var strerr = 'wrong queue auto logout result "' + enabled + '" for user ' + username;
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

        } else {
            logger.info(IDLOG, 'send queue auto logout value "' + enabled + '" to user ' + username);
            res.send(200, { queue_auto_logout: enabled });
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the automatic queue login when user login to cti.
*
* @method queueAutoLoginSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function queueAutoLoginSet(req, res, next) {
    try {
        var username = req.headers.authorization_user;

        // check parameters
        if (req.params.enable !== 'true' && req.params.enable !== 'false') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        var enable = (req.params.enable === 'true' ? true : false);

        compConfigManager.setQueueAutoLoginConf(username, enable, function (err) {
            try {
                if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                else     { compUtil.net.sendHttp200(IDLOG, res); }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        });
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Gets the automatic queue login of the user.
*
* @method queueAutoLoginGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function queueAutoLoginGet(req, res, next) {
    try {
        var username = req.headers.authorization_user;
        var enabled  = compConfigManager.getQueueAutoLoginConf(username);

        if (typeof enabled !== 'boolean') {
            var strerr = 'wrong queue auto login value "' + enabled + '" for user ' + username;
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

        } else {
            logger.info(IDLOG, 'send queue auto login value "' + enabled + '" to user ' + username);
            res.send(200, { queue_auto_login: enabled });
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the default extension of the user.
*
* @method defaultExtensionSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function defaultExtensionSet(req, res, next) {
    try {
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof req.params.extenId !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        compConfigManager.setDefaultUserExtensionConf(username, req.params.extenId, function (err) {
            try {
                if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }
                else     { compUtil.net.sendHttp200(IDLOG, res); }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        });

    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Gets the default extension of the user.
*
* @method defaultExtensionGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function defaultExtensionGet(req, res, next) {
    try {
        var username = req.headers.authorization_user;
        var exten    = compConfigManager.getDefaultUserExtensionConf(username);

        if (typeof exten !== 'string') {
            var strerr = 'wrong default extension result for user ' + username;
            logger.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

        } else {
            logger.info(IDLOG, 'send default extension "' + exten + '" to user ' + username);
            res.send(200, { default_extension: exten });
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}
