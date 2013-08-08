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
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

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
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = comp;
        logger.log(IDLOG, 'authorization component has been set');

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

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check the postit & administration postit authorization
                    if (   compAuthorization.authorizePostitUser(username)      !== true
                        && compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, '"postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {
                        logger.info(IDLOG, '"admin_postit" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizePostitUser(username) === true) {
                        logger.info(IDLOG, '"postit" authorization successfully for user "' + username + '"');
                    }

                    var data = {
                        text:      req.params.text,
                        creator:   username,
                        recipient: req.params.recipient
                    };

                    compPostit.newPostit(data, function (err) {

                        if (err) {
                            logger.error(IDLOG, 'creating new post-it from user "' + username + '" for recipient "' + req.params.recipient + '"');
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());

                        } else {
                            logger.info(IDLOG, 'new postit by "' + username + '" to "' + data.recipient + '" has been successfully crated');
                            res.send(200);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = postit.api;
        exports.create               = postit.create;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompPostit        = setCompPostit;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
