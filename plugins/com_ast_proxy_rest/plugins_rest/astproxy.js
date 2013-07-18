/**
* Provides asterisk proxy functions through REST API.
*
* @module com_ast_proxy_rest
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
* @default [plugins_rest/astproxy]
*/
var IDLOG = '[plugins_rest/astproxy]';

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
* The asterisk proxy component used for asterisk functions.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

/**
* The configuration manager architect component used for configuration functions.
*
* @property compConfigManager
* @type object
* @private
*/
var compConfigManager;

(function(){
    try {
        /**
        * REST plugin that provides asterisk functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`astproxy/cf/:endpoint`](#cfget)
        * 1. [`astproxy/dnd/:endpoint`](#dndget)
        * 1. [`astproxy/extensions`](#extensionsget)
        *
        * ---
        *
        * ### <a id="cfget">**`astproxy/cf/:type/:endpoint`**</a>
        *
        * Gets the call forward status of the endpoint of the user.
        *
        * * `endpoint: the extension identifier`
        * * `type: ("unconditional" | "unavailable" | "busy" | "voicemail")`
        *
        * ---
        *
        * ### <a id="dndget">**`astproxy/dnd/:endpoint`**</a>
        *
        * Gets the don't disturb status of the endpoint of the user. The endpoint is
        * the extension identifier.
        *
        * ---
        *
        * ### <a id="extensionset">**`astproxy/extensions`**</a>
        *
        * Gets all the extensions with all their status informations.
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`astproxy/cf`](#cfpost)
        * 1. [`astproxy/dnd`](#dndpost)
        *
        * ---
        *
        * ### <a id="cfpost">**`astproxy/cf`**</a>
        *
        * Sets the call forward status of the endpoint of the user. The request must contains
        * the following parameters:
        *
        * * `endpoint: the extension identifier`
        * * `status: ("on" | "off")`
        * * `type: ("unconditional" | "unavailable" | "busy" | "voicemail")`
        * * `[to]: optional when the status is off`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "endpoint": "214", "status": "on", "type": "unconditional", "to": "340123456" }' https://192.168.5.224:8282/astproxy/cf
        *     curl --insecure -i -X POST -d '{ "endpoint": "214", "status": "off", "type": "unconditional" }' https://192.168.5.224:8282/astproxy/cf
        *
        * **Note:** _unconditional_ and _voicemail_ types are mutually exclusive because both
        * of them use the same property in the asterisk server database. So, e.g. setting the
        * status to _off_ for _unconditional_ type, automatically set to _off_ also the _voicemail_
        * type and vice versa. Or setting to _on_ the _unconditional_ type, automatically set to
        * _off_ the _voicemail_ type.
        *
        * ---
        *
        * ### <a id="dndpost">**`astproxy/dnd`**</a>
        *
        * Sets the don't disturb status of the endpoint of the user. The request must contains
        * the following parameters:
        *
        * * `status: (on|off)`
        * * `endpoint`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "endpoint": "214", "status": "on" }' https://192.168.5.224:8282/astproxy/dnd
        *
        * @class plugin_rest_astproxy
        * @static
        */
        var astproxy = {

            // the REST api
            api: {
                'root': 'astproxy',

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} extensions         Gets all the extensions with all their status informations
                *   @param {string} dnd/:endpoint      Gets the don't disturb status of the endpoint of the user
                *   @param {string} cf/:type/:endpoint Gets the call forward status of the endpoint of the user
                */
                'get' : [
                    'extensions',
                    'dnd/:endpoint',
                    'cf/:type/:endpoint'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} cf   Sets the call forward status of the endpoint of the user
                *   @param {string} dnd  Sets the don't disturb status of the endpoint of the user
                */
                'post': [
                    'cf',
                    'dnd'
                ],
                'head': [],
                'del' : []
            },

            /**
            * Gets all the extensions with all their status informations with the following REST API:
            *
            *     GET  extensions
            *
            * @method extensions
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            extensions: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOperatorPanelUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting extensions: authorization operator panel failed for user "' + username + '"');
                        sendHttp401(res);
                        return;
                    }

                    var extensions = compAstProxy.getJSONExtensions();
                    logger.info(IDLOG, 'sent all extensions in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, extensions);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests for call forward status of the endpoint of
            * the user with the following REST API:
            *
            *     GET  cf/:type/:endpoint
            *     POST cf
            *
            * @method cf
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            cf: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { cfget(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { cfset(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests for don't disturb status of the endpoint of
            * the user with the following REST API:
            *
            *     GET  dnd
            *     POST dnd/:endpoint
            *
            * @method dnd
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            dnd: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { dndget(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { dndset(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.cf                   = astproxy.cf;
        exports.api                  = astproxy.api;
        exports.dnd                  = astproxy.dnd;
        exports.setLogger            = setLogger;
        exports.extensions           = astproxy.extensions;
        exports.setCompAstProxy      = setCompAstProxy;
        exports.setCompAuthorization = setCompAuthorization;
        exports.setCompConfigManager = setCompConfigManager;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

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
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} ca The architect authorization component
* @static
*/
function setCompAuthorization(ca) {
    try {
        // check parameter
        if (typeof ca !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = ca;
        logger.log(IDLOG, 'authorization component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the asterisk proxy component used for asterisk functions.
*
* @method setCompAstProxy
* @param {object} ap The asterisk proxy component.
*/
function setCompAstProxy(ap) {
    try {
        compAstProxy = ap;
        logger.info(IDLOG, 'set asterisk proxy architect component');
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

/**
* Sets the don't disturb status of the endpoint of the user.
*
* @method dndset
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function dndset(req, res, next) {
    try {
        // extract the parameters needed
        var status   = req.params.status;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (   typeof status   !== 'string'
            || typeof endpoint !== 'string'
            || (status !== 'on' && status !== 'off') ) {

            sendHttp400(res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the don't disturb status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization dnd set failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            sendHttp401(res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        compAstProxy.doCmd({ command: 'dndSet', exten: endpoint, activate: activate }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting dnd for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            logger.info(IDLOG, 'dnd ' + status + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            sendHttp200(res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Gets the don't disturb status of the endpoint of the user.
*
* @method dndget
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function dndget(req, res, next) {
    try {
        // extract the parameters needed
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof endpoint !== 'string') {
            sendHttp400(res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the don't disturb status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization dnd get failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            sendHttp401(res);
            return;
        }

        compAstProxy.doCmd({ command: 'dndGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting dnd for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            logger.info(IDLOG, 'dnd for extension endpoint ' + endpoint + ' of user "' + username + '" has been get successfully: the status is ' + resp.dnd);
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Gets the call forward status of the endpoint of the user.
*
* @method cfget
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cfget(req, res, next) {
    try {
        // extract the parameters needed
        var type     = req.params.type;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof endpoint !== 'string' || typeof type !== 'string') {
            sendHttp400(res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization to get "cf ' + type + '" failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            sendHttp401(res);
            return;
        }

        if (type === compAstProxy.CF_TYPES.unconditional) {
            cfgetUnconditional(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.voicemail) {
            cfgetVoicemail(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.busy) {
            cfgetBusy(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.unavailable) {
            cfgetUnavailable(endpoint, username, res);

        } else {
            logger.warn(IDLOG, 'unknown call forward type to get: ' + type);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Gets the unconditional call forward status of the endpoint of the user.
*
* @method cfgetUnconditional
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfgetUnconditional(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting unconditional cf for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            logger.info(IDLOG, 'unconditional cf for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Gets the call forward to voicemail status of the endpoint of the user.
*
* @method cfgetVoicemail
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfgetVoicemail(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfVmGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cf to voicemail for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cf to voicemail for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Gets the call forward on busy status of the endpoint of the user.
*
* @method cfgetBusy
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfgetBusy(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfbGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cf busy for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cf busy for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Gets the call forward on unavailable status of the endpoint of the user.
*
* @method cfgetUnavailable
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfgetUnavailable(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfbGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cf unavailable for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cf unavailable for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Sets the call forward status of the endpoint of the user.
*
* @method cfset
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cfset(req, res, next) {
    try {
        // extract the parameters needed
        var to       = req.params.to;
        var type     = req.params.type;
        var status   = req.params.status;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (   typeof status   !== 'string'
            || typeof type     !== 'string'
            || typeof endpoint !== 'string'
            || (status !== 'on' && status    !== 'off')
            || (status === 'on' && typeof to !== 'string') ) {

            sendHttp400(res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization cf set failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            sendHttp401(res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        if (type === compAstProxy.CF_TYPES.unconditional) {
            cfsetUnconditional(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.voicemail) {
            cfsetVoicemail(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.busy) {
            cfsetBusy(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.unavailable) {
            cfsetUnavailable(endpoint, username, activate, to, res);

        } else {
            logger.warn(IDLOG, 'unknown call forward type to set: ' + type);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Sets the unconditional call forward status of the endpoint of the user.
*
* @method cfsetUnconditional
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the unconditional call forward must be activated
* @param {string}  [to]     The destination of the unconditional call forward
* @param {object}  res      The response object
*/
function cfsetUnconditional(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting unconditional cf for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'unconditional cf "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'unconditional cf "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            sendHttp200(res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Sets the call forward to voicemail status of the endpoint of the user.
*
* @method cfsetVoicemail
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward to voicemail must be activated
* @param {string}  [to]     The destination voicemail of the call forward
* @param {object}  res      The response object
*/
function cfsetVoicemail(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfVmSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cf to voicemail for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cf to voicemail "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cf to voicemail "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            sendHttp200(res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Sets the call forward on busy status of the endpoint of the user.
*
* @method cfsetBusy
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward on busy must be activated
* @param {string}  [to]     The destination of the call forward on busy
* @param {object}  res      The response object
*/
function cfsetBusy(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfbSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cf busy for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cf busy "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cf busy "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            sendHttp200(res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}

/**
* Sets the call forward unavailable status of the endpoint of the user.
*
* @method cfsetUnavailable
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward unavailable must be activated
* @param {string}  [to]     The destination of the call forward on unavailable
* @param {object}  res      The response object
*/
function cfsetUnavailable(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfbSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cf unavailable for extension ' + endpoint + ' of user "' + username + '"');
                sendHttp500(res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cf unavailable "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cf unavailable "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            sendHttp200(res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        sendHttp500(res, err.toString());
    }
}
