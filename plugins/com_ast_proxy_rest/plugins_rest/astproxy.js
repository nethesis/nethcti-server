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
        logger.info(IDLOG, 'send HTTP 400 response to ' + resp.connection.remoteAddress);
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
        * REST plugin that provides asterisk functions through the following REST API:
        *
        * **POST requests**
        *
        *     astproxy/dnd
        *
        * Sets the don't disturb status of the endpoint of the user. If it's
        * enabled then it disable it and vice versa. The request must contains
        * the following parameters:
        *
        * * endpoint
        * * status
        *
        * The _status_ must be one of the following:
        *
        * * on
        * * off
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
                'get' : [],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} dnd Sets the don't disturb status of the endpoint of the user
                */
                'post': [ 'dnd' ],
                'head': [],
                'del' : []
            },

            /**
            * Sets the don't disturb status of the endpoint of the user with the following REST API:
            *
            *     dnd
            *
            * @method list
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            dnd: function (req, res, next) {
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
                    // can only set the dnd status of his endpoints
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

                        logger.warn(IDLOG, 'authorization dnd failed for user "' + username + '": requested dnd for extension ' +
                                           'endpoint ' + endpoint + ' not owned by him');
                        sendHttp401(res);
                        return;
                    }

                    var activate = (status === 'on') ? true : false;

                    compAstProxy.doCmd({ command: 'dndSet', exten: endpoint, activate: activate}, function (err, resp) {

                        if (err) {
                            logger.error(IDLOG, 'setting dnd for extension endpoint ' + endpoint + ' of user "' + username + '"');
                            sendHttp500(res, err.toString());
                            return;
                        }

                        logger.info(IDLOG, 'dnd ' + status + ' for extension endpoint ' + endpoint + ' has been set successfully');
                        sendHttp200(res);
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    sendHttp500(res, err.toString());
                }
            }
        }
        exports.api                  = astproxy.api;
        exports.dnd                  = astproxy.dnd;
        exports.setLogger            = setLogger;
        exports.setCompAstProxy      = setCompAstProxy;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
