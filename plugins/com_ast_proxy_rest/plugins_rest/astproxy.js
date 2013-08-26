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
* The string used to hide phone numbers in privacy mode.
*
* @property privacyStrReplace
* @type {string}
* @private
* @default "xxx"
*/
var privacyStrReplace = 'xxx';

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
* The architect component to be used for user.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The architect component to be used for operator.
*
* @property compOperator
* @type object
* @private
*/
var compOperator;

/**
* The asterisk proxy component used for asterisk functions.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

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
        * 1. [`astproxy/cf/:type/:endpoint`](#cfget)
        * 1. [`astproxy/dnd/:endpoint`](#dndget)
        * 1. [`astproxy/queues`](#queuesget)
        * 1. [`astproxy/trunks`](#trunksget)
        * 1. [`astproxy/opgroups`](#opgroupsget)
        * 1. [`astproxy/parkings`](#parkingsget)
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
        * ### <a id="queuesget">**`astproxy/queues`**</a>
        *
        * Gets the queues of the operator panel of the user.
        *
        * ---
        *
        * ### <a id="trunksget">**`astproxy/trunks`**</a>
        *
        * Gets the trunks of the operator panel of the user.
        *
        * ---
        *
        * ### <a id="opgroupsget">**`astproxy/opgroups`**</a>
        *
        * Gets the groups of the operator panel of the user.
        *
        * ---
        *
        * ### <a id="parkingsget">**`astproxy/parkings`**</a>
        *
        * Gets all the parkings with all their status informations.
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
        * 1. [`astproxy/park`](#parkpost)
        * 1. [`astproxy/call`](#callpost)
        * 1. [`astproxy/atxfer](#atxferpost)
        * 1. [`astproxy/hangup`](#hanguppost)
        * 1. [`astproxy/intrude`](#intrudepost)
        * 1. [`astproxy/start_spy`](#start_spypost)
        * 1. [`astproxy/pickup_conv`](#pickup_convpost)
        * 1. [`astproxy/stop_record`](#stop_recordpost)
        * 1. [`astproxy/start_record`](#start_recordpost)
        * 1. [`astproxy/blindtransfer`](#blindtransferpost)
        * 1. [`astproxy/pickup_parking`](#pickup_parkingpost)
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
        * ---
        *
        * ### <a id="parkpost">**`astproxy/park`**</a>
        *
        * Park a conversation. The user can park only his own conversations. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to park`
        * * `applicantId: the endpoint identifier who requested the parking. It is assumed that the applicant type is the same of the endpointType`
        * * `endpointType: the type of the endpoint that has the conversation to park`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "221", "applicantId": "216" }' https://192.168.5.224:8282/astproxy/park
        *
        * ---
        *
        * ### <a id="callpost">**`astproxy/call`**</a>
        *
        * Calls a number from the specified endpoint. The request must contains the following parameters:
        *
        * * `number: the number to be called`
        * * `endpointId: the endpoint identifier that make the new call`
        * * `endpointType: the type of the endpoint that make the new call`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "number": "0123456789", "endpointType": "extension", "endpointId": "214" }' https://192.168.5.224:8282/astproxy/call
        *
        * ---
        *
        * ### <a id="hanguppost">**`astproxy/hangup`**</a>
        *
        * Hangup the specified conversation. The user can hangup whatever conversation only if he has the appropriate
        * permission, otherwise he can hangup only his conversations. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to hangup. If the user hasn't the permission of the advanced
        *                operator the endpointId must to be its endpoint identifier.`
        * * `endpointType: the type of the endpoint that has the conversation to hangup`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }' https://192.168.5.224:8282/astproxy/hangup
        *
        * ---
        *
        * ### <a id="blindtransferpost">**`astproxy/blindtransfer`**</a>
        *
        * Transfer the conversation to the specified destination with blind type. The request must contains the
        * following parameters:
        *
        * * `to: the destination number to blind transfer the conversation`
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier of the user who has the conversation to blind transfer`
        * * `endpointType: the type of the endpoint of the user who has the conversation to blind transfer`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214", "to": "0123456789" }' https://192.168.5.224:8282/astproxy/blindtransfer
        *
        * ---
        *
        * ### <a id="atxferpost">**`astproxy/atxfer`**</a>
        *
        * Attended transfer the conversation to the specified destination. The request must contains the
        * following parameters:
        *
        * * `to: the destination number to blind transfer the conversation`
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier of the user who has the conversation to attended transfer`
        * * `endpointType: the type of the endpoint of the user who has the conversation to attended transfer`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214", "to": "221" }' https://192.168.5.224:8282/astproxy/atxfer
        *
        * ---
        *
        * ### <a id="start_spypost">**`astproxy/start_spy`**</a>
        *
        * Spy with only listening the specified conversation. The request
        * must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier of the user who has the conversation to spy`
        * * `endpointType: the type of the endpoint of the user who has the conversation to spy`
        * * `destId: the endpoint identifier that spy the conversation`
        * * `destType: the type of the endpoint that spy the conversation`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "221", "destType": "extension", "destId": "205" }' https://192.168.5.224:8282/astproxy/start_spy
        *
        * ---
        *
        * ### <a id="pickup_convpost">**`astproxy/pickup_conv`**</a>
        *
        * Pickup the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `destId: the endpoint identifier that pickup the conversation`
        * * `destType: the endpoint type that pickup the conversation`
        * * `endpointId: the endpoint identifier that has the conversation to pickup`
        * * `endpointType: the type of the endpoint that has the conversation to pickup`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": ">SIP/221-000000", "endpointType": "extension", "endpointId": "221", "destType": "extension", "destId": "220"}' https://192.168.5.224:8282/astproxy/pickup_conv
        *
        * ---
        *
        * ### <a id="stop_recordpost">**`astproxy/stop_record`**</a>
        *
        * Stop the recording of the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to stop recording`
        * * `endpointType: the type of the endpoint that has the conversation to stop recording`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }' https://192.168.5.224:8282/astproxy/stop_record
        *
        * ---
        *
        * ### <a id="start_recordpost">**`astproxy/start_record`**</a>
        *
        * Starts the recording of the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to record`
        * * `endpointType: the type of the endpoint that has the conversation to record`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }' https://192.168.5.224:8282/astproxy/start_record
        *
        * ---
        *
        * ### <a id="pickup_parkingpost">**`astproxy/pickup_parking`**</a>
        *
        * Pickup the specified parking. The request must contains the following parameters:
        *
        * * `destId: the endpoint identifier that pickup the conversation`
        * * `parking: the parking identifier`
        * * `destType: the endpoint type that pickup the conversation`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "parking": "70", "destType": "extension", "destId": "214" }' https://192.168.5.224:8282/astproxy/pickup_parking
        *
        * ---
        *
        * ### <a id="intrudepost">**`astproxy/intrude`**</a>
        *
        * Intrudes into the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to spy and speak`
        * * `endpointType: the type of the endpoint that has the conversation to spy and speak`
        * * `destId: the endpoint identifier that spy the conversation`
        * * `destType: the endpoint type that spy the conversation`
        *
        * E.g. using curl:
        *
        *     curl --insecure -i -X POST -d '{ "convid": "SIP/209-00000060>SIP/211-00000061", "endpointType": "extension", "endpointId": "209", "destType": "extension", "destId": "214" }' https://192.168.5.224:8282/astproxy/intrude
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
                *   @param {string} queues             Gets all the queues of the operator panel of the user
                *   @param {string} trunks             Gets all the trunks of the operator panel of the user
                *   @param {string} opgroups           Gets all the groups of the operator panel of the user
                *   @param {string} parkings           Gets all the parkings with all their status informations
                *   @param {string} extensions         Gets all the extensions with all their status informations
                *   @param {string} dnd/:endpoint      Gets the don't disturb status of the endpoint of the user
                *   @param {string} cf/:type/:endpoint Gets the call forward status of the endpoint of the user
                */
                'get' : [
                    'queues',
                    'trunks',
                    'opgroups',
                    'parkings',
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
                *   @param {string} cf             Sets the call forward status of the endpoint of the user
                *   @param {string} dnd            Sets the don't disturb status of the endpoint of the user
                *   @param {string} park           Park a conversation of the user
                *   @param {string} call           Make a new call
                *   @param {string} atxfer         Transfer a conversation with attended type
                *   @param {string} hangup         Hangup a conversation
                *   @param {string} intrude        Spy and speak in a conversation
                *   @param {string} start_spy      Spy a conversation with only listening
                *   @param {string} pickup_conv    Pickup a conversation
                *   @param {string} stop_record    Stop the recording of a conversation
                *   @param {string} start_record   Start the recording of a conversation
                *   @param {string} blindtransfer  Transfer a conversation with blind type
                *   @param {string} pickup_parking Pickup a parked call
                */
                'post': [
                    'cf',
                    'dnd',
                    'park',
                    'call',
                    'atxfer',
                    'hangup',
                    'intrude',
                    'start_spy',
                    'pickup_conv',
                    'stop_record',
                    'start_record',
                    'blindtransfer',
                    'pickup_parking'
                ],
                'head': [],
                'del' : []
            },

            /**
            * Gets the operator panel groups of the user with the following REST API:
            *
            *     GET  opgroups
            *
            * @method opgroups
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            opgroups: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOperatorGroupsUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting operator groups: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // get all authorized operator groups of the user
                    var userOpGroups = compAuthorization.getAuthorizedOperatorGroups(username);

                    // get all operator groups
                    var allOpGroups = compOperator.getJSONGroups();

                    // extract only the authorized operator groups of the user
                    var list = {}; // object to return
                    var group;
                    for (group in allOpGroups) {

                        if (userOpGroups[group] === true) {
                            list[group] = allOpGroups[group];
                        }
                    }

                    logger.info(IDLOG, 'sent authorized operator groups ' + Object.keys(list) + ' to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, list);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the parkings with all their status informations with the following REST API:
            *
            *     GET  parkings
            *
            * @method extensions
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            parkings: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOpParkingsUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting parkings: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var parkings;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username) === true) {
                        parkings = compAstProxy.getJSONParkings(privacyStrReplace);
                    } else {
                        parkings = compAstProxy.getJSONParkings();
                    }

                    logger.info(IDLOG, 'sent all parkings in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, parkings);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the queues with all their status informations with the following REST API:
            *
            *     GET  queues
            *
            * @method queues
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            queues: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting queues: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var queues;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username) === true) {
                        queues = compAstProxy.getJSONQueues(privacyStrReplace);
                    } else {
                        queues = compAstProxy.getJSONQueues();
                    }

                    logger.info(IDLOG, 'sent all queues in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, queues);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the trunks with all their status informations with the following REST API:
            *
            *     GET trunks
            *
            * @method trunks
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            trunks: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOpTrunksUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting trunks: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var trunks;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username) === true) {
                        trunks = compAstProxy.getJSONTrunks(privacyStrReplace);
                    } else {
                        trunks = compAstProxy.getJSONTrunks();
                    }

                    logger.info(IDLOG, 'sent all trunks in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, trunks);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
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

                    // check if the user has the authorization to view the extensions
                    if (compAuthorization.authorizeOpExtensionsUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting extensions: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var extensions;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username) === true) {
                        extensions = compAstProxy.getJSONExtensions(privacyStrReplace);
                    } else {
                        extensions = compAstProxy.getJSONExtensions();
                    }

                    logger.info(IDLOG, 'sent all extensions in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, extensions);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Park a conversation with the following REST API:
            *
            *     POST park
            *
            * @method park
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            park: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.applicantId  !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the applicant of the request is owned by the user: the user can only park a conversation
                        // that belong to him. The belonging is verfied later by the asterisk proxy component
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.applicantId) === false) {

                            logger.warn(IDLOG, 'park of the conversation "' + req.params.convid + '" from user "' + username + '" has been failed: the applicant ' +
                                                   '"' + req.params.applicantId + '" isn\'t owned by him');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        }
                        logger.info(IDLOG, 'the applicant endpoint ' + req.params.applicantId + ' is owned by "' + username + '"');

                        compAstProxy.parkConversation(req.params.endpointType, req.params.endpointId, req.params.convid, req.params.applicantId, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'parking convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.applicantId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'convid ' + req.params.convid + ' has been parked successfully by user "' + username + '" with ' + req.params.applicantId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'parking the conversation ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Make a new call with the following REST API:
            *
            *     POST call
            *
            * @method call
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            call: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.number       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'make new call to ' + req.params.number + ' failed: ' + req.params.endpointId + ' is not owned by user "' + username + '"'); +
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        compAstProxy.call(req.params.endpointType, req.params.endpointId, req.params.number, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'failed call from user "' + username + '" to ' + req.params.number + ' using ' + req.params.endpointType + ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'new call from user "' + username + '" to ' + req.params.number + ' with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been successful');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'making new call from user "' + username + '" to ' + req.params.number + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Hangup a conversation with the following REST API:
            *
            *     POST hangup
            *
            * @method hangup
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            hangup: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to hangup every calls
                        if (compAuthorization.authorizeAdminHangupUser(username) === true) {

                            logger.log(IDLOG, 'hangup convid "' + req.params.convid + '": authorization admin hangup successful for user "' + username + '"');
                        }
                        // check if the endpoint of the request is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'hangup convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'hangup convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.hangupConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'hangup convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'convid ' + req.params.convid + ' has been hangup successfully by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'parking the conversation ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer a conversation with attended type with the following REST API:
            *
            *     POST atxfer
            *
            * @method atxfer
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            atxfer: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object'
                        || typeof req.params.convid     !== 'string' || typeof req.params.to           !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the attended transfer authorization
                        if (compAuthorization.authorizeAttendedTransferUser(username) !== true) {

                            logger.warn(IDLOG, 'attended transfer convid "' + req.params.convid + '": authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // check if the endpoint of the request is owned by the user. The user can
                        // attended transfer only his own conversations
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'attended transfer convid "' + req.params.convid + '" by user "' + username +
                                               '" has been failed: ' + ' the ' + req.params.endpointType + ' ' + req.params.endpointId +
                                               ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'attended transfer convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.attendedTransferConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.to,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'attended transfer convid "' + req.params.convid + '" by user "' + username +
                                                           '" with ' + req.params.endpointType + ' ' + req.params.endpointId +
                                                           ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'attended transfer convid ' + req.params.convid + ' has been attended transfered ' +
                                                       'successfully by user "' + username + '" with ' + req.params.endpointType +
                                                       ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'attended transfering convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer a conversation with blind type with the following REST API:
            *
            *     POST blindtransfer
            *
            * @method blindtransfer
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            blindtransfer: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object'
                        || typeof req.params.convid     !== 'string' || typeof req.params.to           !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to blind transfer the call of all extensions
                        if (compAuthorization.authorizeAdminTransferUser(username) !== true) {

                            logger.info(IDLOG, 'blind transfer convid ' + req.params.convid + ': admin transfer authorization successful for user "' + username + '"');
                        }
                        // check if the endpoint of the request is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'blind transfer convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'blind transfer convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.redirectConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.to,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'blind transfer convid "' + req.params.convid + '" by user "' + username + '" with ' +
                                                           req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'convid ' + req.params.convid + ' has been blind transfered successfully by user "' +
                                                       username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'blind transfering the convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Spy a conversation with only listening it with the following REST API:
            *
            *     POST start_spy
            *
            * @method start_spy
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            start_spy: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object' || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string'
                        || typeof req.params.destType   !== 'string' || typeof req.params.destId       !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to spy
                    if (compAuthorization.authorizeSpyUser(username) !== true) {

                        logger.warn(IDLOG, 'spy convid ' + req.params.convid + ': authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension' && req.params.destType === 'extension') {

                        // check whether the conversation endpoints belong to a user with
                        // no spy permission enabled. In this case it's not possible to spy
                        var extens = compAstProxy.getExtensionsFromConversation(req.params.convid, req.params.endpointId);

                        var i, k, users;
                        for (i = 0; i < extens.length; i++) {

                            // get the users who have the current extension endpoint associated
                            users = compUser.getUsersUsingEndpointExtension(extens[i]);

                            for (k = 0; k < users.length; k++) {

                                if (compAuthorization.hasNoSpyEnabled(users[k]) === true) {

                                    logger.warn(IDLOG, 'spy convid ' + req.params.convid + ' failed: the user "' + users[k] + '"' +
                                                       ' with extension endpoint ' + extens[i] + ' can\'t be spied');
                                    compUtil.net.sendHttp403(IDLOG, res);
                                    return;
                                }
                            }
                        }

                        // check if the destination endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'spy listen convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'spy listen: the destination endpoint ' + req.params.destType + ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.startSpyListenConversation(req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.destType,
                            req.params.destId,
                            function (err) {

                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'spy listen convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'spy listen convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'starting spy listen convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType + ' or destType ' + destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Pickup a conversation with the following REST API:
            *
            *     POST pickup_conv
            *
            * @method pickup_conv
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            pickup_conv: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object' || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string'
                        || typeof req.params.destType   !== 'string' || typeof req.params.destId       !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension' && req.params.destType === 'extension') {

                        // check if the user has the authorization to pickup the specified conversation
                        if (compAuthorization.authorizeAdminPickupUser(username) === true) {

                            logger.log(IDLOG, 'pickup convid "' + req.params.convid + '": admin pickup authorization successful for user "' + username + '"');

                        }
                        // check if the user has the authorization to pickup conversation of specified extension
                        else if (compAuthorization.authorizePickupUser(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'pickup convid "' + req.params.convid + '" failed: user "' + username + '" ' +
                                               ' isn\'t authorized to pickup conversation of endpoint ' + req.params.endpointType + ' ' + req.params.endpointId);
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'pickup convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'pickup convid "' + req.params.convid + ': the destination endpoint ' + req.params.destType +
                                               ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.pickupConversation(req.params.endpointType, req.params.endpointId, req.params.convid, req.params.destType, req.params.destId, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'pickup convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'pickup convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'picking up convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType + ' or destType ' + destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Stop the record of the specified conversation with the following REST API:
            *
            *     POST stop_record
            *
            * @method stop_record
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            stop_record: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the destination endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'stopping record convid ' + req.params.convid + ' by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        // check if the user has the permission to stop recording the specified conversation
                        // TODO

                        compAstProxy.stopRecordConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'stopping record convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'stopped record convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'stopping record of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Starts the record of the specified conversation with the following REST API:
            *
            *     POST start_record
            *
            * @method start_record
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            start_record: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to record all the conversations
                        if (compAuthorization.authorizeAdminRecordingUser(username) === true) {

                            logger.info(IDLOG, 'start recording convid ' + req.params.convid + ': admin recording authorization successful for user "' + username + '"');
                        }
                        // check if the user has the authorization to record his own conversations
                        else if (compAuthorization.authorizeRecordingUser(username) !== true) {

                            logger.warn(IDLOG, 'start recording convid ' + req.params.convid + ': recording authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'starting record convid ' + req.params.convid + ' by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'starting record convid ' + req.params.convid + ': the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.startRecordConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'starting record convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'started record convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'starting record of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Pickup a parked call with the following REST API:
            *
            *     POST pickup_parking
            *
            * @method pickup_parking
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            pickup_parking: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params          !== 'object' || typeof req.params.parking !== 'string'
                        || typeof req.params.destType !== 'string' || typeof req.params.destId  !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to pickup a parked call
                    if (compAuthorization.authorizeOpParkingsUser(username) !== true) {

                        logger.warn(IDLOG, 'pickup parking "' + req.params.parking + '": authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (req.params.destType === 'extension') {

                        // check if the destination endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'pickup parking "' + req.params.parking + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'pickup parking "' + req.params.parking + '": the destination endpoint ' + req.params.destType +
                                               ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.pickupParking(req.params.parking, req.params.destType, req.params.destId, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'pickup parking ' + req.params.parking + ' by user "' + username + '" with ' +
                                                       req.params.destType + ' ' + req.params.destId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'pickup parking ' + req.params.parking + ' has been successful by user "' + username + '" ' +
                                                   'with ' + req.params.destType + ' ' + req.params.destId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'picking up parking ' + req.params.parking + ': unknown destType ' + req.params.destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Spy and speak in a conversation with the following REST API:
            *
            *     POST intrude
            *
            * @method intrude
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            intrude: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string'
                        || typeof req.params.destType     !== 'string' || typeof req.params.destId     !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to spy
                    if (compAuthorization.authorizeIntrudeUser(username) !== true) {

                        logger.warn(IDLOG, 'start spy & speak convid ' + req.params.convid + ': authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension' && req.params.destType === 'extension') {

                        // check whether the conversation endpoints belong to a user with
                        // no spy permission enabled. In this case it's not possible to spy
                        var extens = compAstProxy.getExtensionsFromConversation(req.params.convid, req.params.endpointId);

                        var i, k, users;
                        for (i = 0; i < extens.length; i++) {

                            // get the users who have the current extension endpoint associated
                            users = compUser.getUsersUsingEndpointExtension(extens[i]);

                            for (k = 0; k < users.length; k++) {

                                if (compAuthorization.hasNoSpyEnabled(users[k]) === true) {

                                    logger.warn(IDLOG, 'spy & speak convid ' + req.params.convid + ' failed: the user "' + users[k] + '"' +
                                                       ' with extension endpoint ' + extens[i] + ' can\'t be spied');
                                    compUtil.net.sendHttp403(IDLOG, res);
                                    return;
                                }
                            }
                        }

                        // check if the destination endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'start spy & speak convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'start spy & speak the destination endpoint ' + req.params.destType + ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.startSpySpeakConversation(req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.destType,
                            req.params.destId,
                            function (err) {

                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'start spy & speak convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'start spy & speak convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'starting spy and speak convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType + ' or destType ' + req.params.destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.cf                   = astproxy.cf;
        exports.api                  = astproxy.api;
        exports.dnd                  = astproxy.dnd;
        exports.park                 = astproxy.park;
        exports.call                 = astproxy.call;
        exports.queues               = astproxy.queues;
        exports.trunks               = astproxy.trunks;
        exports.hangup               = astproxy.hangup;
        exports.atxfer               = astproxy.atxfer;
        exports.intrude              = astproxy.intrude;
        exports.opgroups             = astproxy.opgroups;
        exports.parkings             = astproxy.parkings;
        exports.start_spy            = astproxy.start_spy;
        exports.setLogger            = setLogger;
        exports.extensions           = astproxy.extensions;
        exports.setPrivacy           = setPrivacy;
        exports.setCompUtil          = setCompUtil;
        exports.pickup_conv          = astproxy.pickup_conv;
        exports.stop_record          = astproxy.stop_record;
        exports.setCompUser          = setCompUser;
        exports.start_record         = astproxy.start_record;
        exports.blindtransfer        = astproxy.blindtransfer;
        exports.pickup_parking       = astproxy.pickup_parking;
        exports.setCompOperator      = setCompOperator;
        exports.setCompAstProxy      = setCompAstProxy;
        exports.setCompAuthorization = setCompAuthorization;
        exports.setCompConfigManager = setCompConfigManager;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Sets the string used to hide last digits of phone numbers in privacy mode.
*
* @method setPrivacy
* @param {object} str The string used to hide last digits of phone numbers.
*/
function setPrivacy(str) {
    try {
        privacyStrReplace = str;
        logger.info(IDLOG, 'set privacy with string ' + privacyStrReplace);
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
* Sets the operator architect component.
*
* @method setCompOperator
* @param {object} comp The operator architect component.
*/
function setCompOperator(comp) {
    try {
        compOperator = comp;
        logger.info(IDLOG, 'set operator architect component');
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
* Set the user architect component.
*
* @method setCompUser
* @param {object} comp The architect user component
* @static
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compUser = comp;
        logger.log(IDLOG, 'user component has been set');

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

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the dnd authorization
        if (compAuthorization.authorizeDndUser(username) !== true) {

            logger.warn(IDLOG, 'setting dnd: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the don't disturb status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization dnd set failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        compAstProxy.doCmd({ command: 'dndSet', exten: endpoint, activate: activate }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting dnd for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'dnd ' + status + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the dnd authorization
        if (compAuthorization.authorizeDndUser(username) !== true) {

            logger.warn(IDLOG, 'requesting dnd: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the don't disturb status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization dnd get failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        compAstProxy.doCmd({ command: 'dndGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting dnd for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'dnd for extension endpoint ' + endpoint + ' of user "' + username + '" has been get successfully: the status is ' + resp.dnd);
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the operator panel authorization
        if (compAuthorization.authorizePhoneRedirectUser(username) !== true) {

            logger.warn(IDLOG, 'getting phone call forward status: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization to get "cf ' + type + '" failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
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
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'unconditional cf for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cf to voicemail for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cf busy for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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

        compAstProxy.doCmd({ command: 'cfuGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cf unavailable for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cf unavailable for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the operator panel authorization
        if (compAuthorization.authorizePhoneRedirectUser(username) !== true) {

            logger.warn(IDLOG, 'setting phone call forward: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization cf set failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
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
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'unconditional cf "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'unconditional cf "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cf to voicemail "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cf to voicemail "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cf busy "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cf busy "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
        compAstProxy.doCmd({ command: 'cfuSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cf unavailable for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cf unavailable "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cf unavailable "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}
