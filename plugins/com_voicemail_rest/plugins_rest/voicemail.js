/**
* Provides voicemail functions through REST API.
*
* @module com_voicemail_rest
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
* @default [plugins_rest/voicemail]
*/
var IDLOG = '[plugins_rest/voicemail]';

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
* The voicemail architect component used for voicemail functions.
*
* @property compVoicemail
* @type object
* @private
*/
var compVoicemail;

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
* Set voicemail architect component used by voicemail functions.
*
* @method setCompVoicemail
* @param {object} cp The voicemail architect component.
*/
function setCompVoicemail(cp) {
    try {
        compVoicemail = cp;
        logger.info(IDLOG, 'set voicemail architect component');
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

/**
* Sets the authorization architect component.
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

(function(){
    try {
        /**
        * REST plugin that provides voicemail functions through the following REST API:
        *
        * **GET request**
        *
        *     voicemail/list
        *
        * The client receive the list of all voicemail messages of the user or an HTTP 500 response.
        *
        * @class plugin_rest_voicemail
        * @static
        */
        var voicemail = {

            // the REST api
            api: {
                'root': 'voicemail',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} list To get the list of all voicemail messages of the user
                */
                'get' : [ 'list' ],
                'post': [],
                'head': [],
                'del' : []
            },

            /**
            * Gets the list of all voicemail messages of the user with the following REST API:
            *
            *     list
            *
            * @method list
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            list: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // use voicemail component
                    compVoicemail.getAllVoiceMessagesByUser(username, function (err, results) {
                        try {

                            if (err) {
                                logger.error(IDLOG, 'getting all voice messages of user "' + username + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                return;
                            }

                            if (typeof results === 'boolean' && results === false) {
                                var str = 'user "' + username + '" has no voicemail';
                                logger.warn(IDLOG, str);
                                compUtil.net.sendHttp403(IDLOG, res);
                                return;
                            }

                            var strlog = 'send ';
                            // construct the output log
                            var vm;
                            for (vm in results) {
                                strlog += '[' + results[vm].old.length + ' old ' + results[vm].new.length + ' new - vm ' + vm + '] ';
                            }
                            strlog += 'voicemail messages to user "' + username + '"';

                            logger.info(IDLOG, strlog);
                            res.send(200, results);

                        } catch (error) {
                            logger.error(IDLOG, error.stack);
                            compUtil.net.sendHttp500(IDLOG, res, error.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = voicemail.api;
        exports.list                 = voicemail.list;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompVoicemail     = setCompVoicemail;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
