/**
* Communicates in real time mode with the clients using websocket.
*
* @module com_nethcti_ws
* @main com_nethcti_ws
*/

/**
* Core module that communicates with the clients using websocket.
*
* @class com_nethcti_ws
* @static
*/
var fs        = require('fs');
var io        = require('socket.io');
var iniparser = require('iniparser');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type {string}
* @private
* @final
* @readOnly
* @default [com_nethcti_ws]
*/
var IDLOG = '[com_nethcti_ws]';

/**
* The websocket rooms used to update clients with asterisk events.
*
* @property WS_ROOM
* @type {object}
* @private
* @final
* @readOnly
* @default {
    AST_EVT_CLEAR:   "ast_evt_clear",
    AST_EVT_PRIVACY: "ast_evt_privacy"
}
*/
var WS_ROOM = {
    AST_EVT_CLEAR:   'ast_evt_clear',
    AST_EVT_PRIVACY: 'ast_evt_privacy'
};

/**
* The string used to hide phone numbers in privacy mode.
*
* @property privacyStrReplace
* @type {string}
* @private
* @final
* @readOnly
* @default "xxx"
*/
var privacyStrReplace = 'xxx';

/**
* The websocket server port.
*
* @property port
* @type string
* @private
* @final
* @readOnly
* @default "8181"
*/
var port = '8181';

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
* The websocket server.
*
* @property server
* @type {object}
* @private
*/
var server;

/**
* The asterisk proxy.
*
* @property astProxy
* @type object
* @private
*/
var astProxy;

/**
* The user component.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The authentication module.
*
* @property compAuthe
* @type object
* @private
*/
var compAuthe;

/**
* The authorization module.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

/**
* The voicemail architect component used for voicemail functions.
*
* @property compVoicemail
* @type object
* @private
*/
var compVoicemail;

/**
* The operator module.
*
* @property operator
* @type object
* @private
*/
var operator;

/**
* Contains all websocket identifiers of authenticated clients.
* The key is the websocket identifier and the value is the username.
* It's used for fast authentication for each request.
*
* @property wsid
* @type object
* @private
*/
var wsid = {};

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

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authentication module to be used.
*
* @method setAuthe
* @param {object} autheMod The authentication module.
*/
function setAuthe(autheMod) {
    try {
        if (typeof autheMod !== 'object') {
            throw new Error('wrong authentication object');
        }
        compAuthe = autheMod;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the user module to be used.
*
* @method setCompUser
* @param {object} comp The user module.
*/
function setCompUser(comp) {
    try {
        if (typeof comp !== 'object') { throw new Error('wrong user object'); }
        compUser = comp;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the authorization module to be used.
*
* @method setCompAuthorization
* @param {object} comp The authorization module.
*/
function setCompAuthorization(comp) {
    try {
        if (typeof comp !== 'object') { throw new Error('wrong authorization module'); }
        compAuthorization = comp;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets voicemail architect component used by voicemail functions.
*
* @method setCompVoicemail
* @param {object} cv The voicemail architect component.
*/
function setCompVoicemail(cv) {
    try {
        compVoicemail = cv;
        logger.info(IDLOG, 'set voicemail architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the operator to be used by the module.
*
* @method setOperator
* @param {object} op The operator.
*/
function setOperator(op) {
    try {
        if (typeof op !== 'object') {
            throw new Error('wrong operator object');
        }
        operator = op;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the asterisk proxy to be used by the module.
*
* @method setAstProxy
* @param ap
* @type object The asterisk proxy.
*/
function setAstProxy(ap) {
    try {
        if (typeof ap !== 'object') {
            throw new Error('wrong asterisk proxy object');
        }
        astProxy = ap;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the asterisk proxy component.
*
* @method setAstProxyListeners
* @private
*/
function setAstProxyListeners() {
    try {
        // check astProxy object
        if (!astProxy
            || typeof astProxy.on !== 'function') {

            throw new Error('wrong astProxy object');
        }

        astProxy.on(astProxy.EVT_EXTEN_CHANGED,   extenChanged);   // an extension has changed
        astProxy.on(astProxy.EVT_QUEUE_CHANGED,   queueChanged);   // a queue has changed
        astProxy.on(astProxy.EVT_PARKING_CHANGED, parkingChanged); // a parking has changed

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the voicemail component.
*
* @method setVoicemailListeners
* @private
*/
function setVoicemailListeners() {
    try {
        // check voicemail component object
        if (!compVoicemail || typeof compVoicemail.on !== 'function') {
            throw new Error('wrong voicemail object');
        }

        compVoicemail.on(compVoicemail.EVT_NEW_VOICEMAIL, newVoicemailListener);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Manages the new voicemail event emitted by the voicemail component. It sends
* all new voice messages of the voicemail to all users who use the voicemail.
*
* @method newVoicemailListener
* @param {string} voicemail The voicemail identifier
* @param {array}  list      The list of all new voicemail messages
* @private
*/
function newVoicemailListener(voicemail, list) {
    try {
        // check the event data
        if (typeof voicemail !== 'string' || list === undefined || list instanceof Array === false) {
            throw new Error('wrong voicemails array list');
        }


    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _extenChanged_ event emitted by _ast\_proxy_
* component. Something has changed in the extension, so notifies
* all interested clients.
*
* @method extenChanged
* @param {object} exten The extension object
* @private
*/
function extenChanged(exten) {
    try {
        logger.info(IDLOG, 'received event extenChanged for extension ' + exten.getExten());
        logger.info(IDLOG, 'emit event extenUpdate for extension ' + exten.getExten() + ' to websockets');

        // emits the event with clear numbers to all users with privacy disabled
        server.sockets.in(WS_ROOM.AST_EVT_CLEAR).emit('extenUpdate', exten.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.AST_EVT_PRIVACY).emit('extenUpdate', exten.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _queueChanged_ event emitted by _ast\_proxy_
* component. Something has changed in the queue, so notifies
* all interested clients.
*
* @method queueChanged
* @param {object} queue The queue object
* @private
*/
function queueChanged(queue) {
    try {
        logger.info(IDLOG, 'received event queueChanged for queue ' + queue.getQueue());
        logger.info(IDLOG, 'emit event queueUpdate for queue ' + queue.getQueue() + ' to websockets');

        // emits the event with clear numbers to all users with privacy disabled
        server.sockets.in(WS_ROOM.AST_EVT_CLEAR).emit('queueUpdate', queue.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.AST_EVT_PRIVACY).emit('queueUpdate', queue.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _parkingChanged_ event emitted by _ast\_proxy_
* component. Something has changed in the parking, so notifies
* all interested clients.
*
* @method parkingChanged
* @param {object} parking The parking object
* @private
*/
function parkingChanged(parking) {
    try {
        logger.info(IDLOG, 'received event parkingChanged for parking ' + parking.getParking());
        logger.info(IDLOG, 'emit event parkingUpdate for parking ' + parking.getParking() + ' to websockets');

        // emits the event with clear numbers to all users with privacy disabled
        server.sockets.in(WS_ROOM.AST_EVT_CLEAR).emit('parkingUpdate', parking.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.AST_EVT_PRIVACY).emit('parkingUpdate', parking.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Configurates the websocket server properties by a configuration file.
* The file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    // read configuration file
    var json = require(path);

    // initialize the port of the websocket server
    if (json.websocket && json.websocket.port) {
        port = json.websocket.port;

    } else {
        logger.warn(IDLOG, 'no port has been specified in JSON file ' + path);
    }

    logger.info(IDLOG, 'configuration by file ' + path + ' ended');
}

/**
* Customize the privacy used to hide phone numbers by a configuration file.
* The file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method configPrivacy
* @param {string} path The path of the configuration file
*/
function configPrivacy(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    // read configuration file
    var json = require(path);

    // initialize the string used to hide last digits of phone numbers
    if (json.privacy_numbers) {
        privacyStrReplace = json.privacy_numbers;

    } else {
        logger.warn(IDLOG, 'no privacy string has been specified in JSON file ' + path);
    }

    logger.info(IDLOG, 'privacy configuration by file ' + path + ' ended');
}

/**
* Creates the server websocket and adds the listeners for other components.
*
* @method start
*/
function start() {
    try {
        // set the listener for the aterisk proxy module
        setAstProxyListeners();

        // set the listener for the voicemail module
        setVoicemailListeners();

        // websocket options
        var options = {
            'log level':  1,
            'transports': ['websocket']
        };

        // websocket server
        server = io.listen(parseInt(port), options);

        // set the websocket server listener
        server.on('connection', connHdlr);
        logger.info(IDLOG, 'websocket server listening on port ' + port);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Websocket connection handler.
*
* @method connHdlr
* @param {object} socket The client websocket.
* @private
*/
function connHdlr(socket) {
    try {
        logger.info(IDLOG, 'new connection from ' + getWebsocketEndpoint(socket));

        // set the listeners for the new socket connection
        socket.on('login',      function (data) { loginHdlr(socket, data);   });
        socket.on('logout',     function (data) { logoutHdlr(socket);        });
        socket.on('message',    function (data) { dispatchMsg(socket, data); });
        socket.on('disconnect', function (data) { disconnHdlr(socket);       });
        logger.info(IDLOG, 'listeners for new socket connection have been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Dispatch the received message from the client.
*
* @method dispatchMsg
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
* @private
*/
function dispatchMsg(socket, data) {
    try {
        // checks the client authentication. It controls the websocket
        // identifier presence in the _wsid_ object.
        if (wsid[socket.id]) { // the client is authenticated

            // check parameters
            if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
            if (typeof data   !== 'object' || typeof data.command !== 'string') {

                badRequest(socket);

            } else {
                var username = wsid[socket.id];
                logger.warn(IDLOG, 'requested command ' + data.command + ' from user "' + username + '" (' + getWebsocketEndpoint(socket) + '): the server doesn\'t manage the requests of commands');

                sendError(socket, { error: '501: commands not allowed' });
            }

        } else {
            logger.warn(IDLOG, 'received message from unauthenticated client ' + getWebsocketEndpoint(socket));
            unauthorized(socket);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the list of the groups of extensions defined by the administrator.
*
* @method getOperatorGroups
* @param {object} socket The client websocket
* @return {object} The list of the groups of extensions.
*/
function getOperatorGroups(socket) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }

        socket.emit('operatorGroups', operator.getJSONGroups());
        logger.info(IDLOG, 'sent operatorGroups response to ' + getWebsocketEndpoint(socket));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the spy of the conversation with speaking.
*
* @method startSpySpeakConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.convid The conversation identifier
*   @param {string} data.endpointId The endpoint identifier that has the conversation to spy
*   @param {string} data.endpointType The type of the endpoint that has the conversation to spy
*   @param {string} data.destType The endpoint type that spy the conversation
*   @param {string} data.destId The endpoint identifier that spy the conversation
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function startSpySpeakConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.destId       !== 'string'
            || typeof data.convid       !== 'string'
            || typeof data.destType     !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.startSpySpeakConversation(data.endpointType, data.endpointId, data.convid, data.destType, data.destId, function (resp) {
                responseToClient(socket, 'startSpySpeakConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the spy of the conversation with only listening.
*
* @method startSpyListenConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.convid The conversation identifier
*   @param {string} data.endpointId The endpoint identifier that has the conversation to spy
*   @param {string} data.endpointType The type of the endpoint that has the conversation to spy
*   @param {string} data.destType The endpoint type that spy the conversation
*   @param {string} data.destId The endpoint identifier that spy the conversation
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function startSpyListenConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.destId       !== 'string'
            || typeof data.convid       !== 'string'
            || typeof data.destType     !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.startSpyListenConversation(data.endpointType, data.endpointId, data.convid, data.destType, data.destId, function (resp) {
                responseToClient(socket, 'startSpyListenConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Pickup a parked caller.
*
* @method pickupParking
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.parking The number of the parking
* @param {string} sender The sender of the operation (e.g. the extension number)
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function pickupParking(socket, data, sender) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.destId   !== 'string'
            || typeof data.parking  !== 'string'
            || typeof data.destType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.pickupParking(data.parking, data.destType, data.destId, function (resp) {
                responseToClient(socket, 'pickupParking', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Pickup a conversation.
*
* @method pickupConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint that has the conversation to pickup (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier that has the conversation to pickup (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
*   @param {string} data.destType The endpoint type that pickup the conversation
*   @param {string} data.destId The endpoint identifier that pickup the conversation
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function pickupConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.destId       !== 'string'
            || typeof data.destType     !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.pickupConversation(data.endpointType, data.endpointId, data.convid, data.destType, data.destId, function (resp) {
                responseToClient(socket, 'pickupConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Make a new call.
*
* @method call
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.number The destination number to be called
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function call(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.number       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.call(data.endpointType, data.endpointId, data.number, function (resp) {
                responseToClient(socket, 'call', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Park the conversation of the sender using the asterisk proxy component.
*
* @method parkConv
* @param {object} socket The client websocket
* @param {object} data   The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId   The endpoint identifier (e.g. the extension number)
*   @param {string} data.applicantId  The endpoint identifier who requested the parking (e.g. the extension number). It is assumed that the applicant type is the same of the endpointType (e.g. extension)
*   @param {string} data.convid       The conversation identifier
* @param {string} sender The sender of the operation (e.g. the extension number)
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function parkConv(socket, data, sender) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.applicantId  !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);
            return;

        }

        // check if the endpoint type is valid
        if (compUser.isValidEndpointType(data.endpointType) === false) {
            logger.warn(IDLOG, 'parking the conversation ' + data.convid + ' by user ' + sender + ': invalid endpointType ' + data.endpointType);
            responseToClient(socket, 'parkConv', { result: false });
            return;
        }

        // execute the operation on the basis of the endpoint type
        if (data.endpointType === compUser.ENDPOINT_TYPES.EXTENSION) {

            // check if the applicant identifier is an extension endpoint owned by the user sender
            if (compUser.hasExtensionEndpoint(sender, data.applicantId) === true) {

                astProxy.parkConversation(data.endpointType, data.endpointId, data.convid, data.applicantId, function (resp) {
                    responseToClient(socket, 'parkConv', resp);
                });

            } else {
                logger.warn(IDLOG, 'parking the conversation ' + data.convid + ' by user ' + sender + ': applicantId ' + data.applicantId + ' isn\'t owned by the user');
                responseToClient(socket, 'parkConv', { result: false });
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Stop the recording of the conversation of the extension using the asterisk proxy component.
*
* @method stopRecordConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function stopRecordConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.stopRecordConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                responseToClient(socket, 'stopRecordConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the recording of the conversation of the extension using the asterisk proxy component.
*
* @method startRecordConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function startRecordConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.startRecordConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                responseToClient(socket, 'startRecordConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Redirect the conversation of the extension using the asterisk proxy component.
*
* @method redirectConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
*   @param {string} data.to The destination number to redirect the conversation
*   @param {string} data.senderId The identifier of the applicant of the redirect operation (e.g. the extension number)
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function redirectConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.to           !== 'string'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.redirectConversation(data.endpointType, data.endpointId, data.convid, data.to, function (resp) {
                responseToClient(socket, 'redirectConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send a response to the client. The response can be an acknowledgment or an error.
*
* @method responseToClient
* @param {object} socket  The client websocket
* @param {string} command The name of the command
* @param {object} resp    The response received from the asterisk proxy operation execution
*/
function responseToClient(socket, command, resp) {
    try {
        if (typeof resp === 'object' && resp.result === true) {
            sendAck(socket, { command: command });
            logger.info(IDLOG, 'sent ack ' + command + ' to ' + getWebsocketEndpoint(socket));

        } else {
            sendError(socket, { command: command });
            logger.warn(IDLOG, 'sent error ' + command + ' to ' + getWebsocketEndpoint(socket));
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Stop spy the conversation using the asterisk proxy component.
*
* @method stopSpyConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function stopSpyConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.hangupConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                responseToClient(socket, 'stopSpyConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Hangup the conversation of the extension using the asterisk proxy component.
*
* @method hangupConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
* @return {object} An synchronous aknowledgment or error response with the name of the command.
*/
function hangupConv(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.hangupConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                responseToClient(socket, 'hangupConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send the error result to the client.
*
* **It can throw an Exception.**
*
* @method sendError
* @param {object} socket The client websocket
* @param {string} [obj] The object to send
*/
function sendError(socket, obj) {
    try {
        // check parameter
        if (obj === undefined) { obj = {}; }
        if (typeof obj !== 'object') { throw new Error('wrong parameter'); }

        socket.emit('error', obj);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send response to the client for bad request received.
*
* @method badRequest
* @param {object} socket The client websocket.
*/
function badRequest(socket) {
    try {
        socket.emit('bad_request');
        logger.warn('received bad request from ' + getWebsocketEndpoint(socket));
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the endpoint of the websocket. The endpoint is
* constructed by _ip\_address:port._
*
* @method getWebsocketEndpoint
* @param {object} socket The websocket
* @return {string} The websocket endpoint as _ip\_address:port._
* @private
*/
function getWebsocketEndpoint(socket) {
    try {
        return socket.handshake.address.address + ':' + socket.handshake.address.port;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Manage unauthorized access. It send 401 unauthorized response
* to the client and disconnect the websocket.
*
* @method unauthorized
* @param {object} socket The client websocket
* @private
*/
function unauthorized(socket) {
    try {
        send401(socket); // send 401 unauthorized response to the client
        socket.disconnect();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Websocket login handler.
*
* @method loginHdlr
* @param {object} socket The client websocket
* @param {object} data The data passed by the client
*   @param {string} data.accessKeyId The username of the account
*   @param {string} data.token The token received by the authentication REST request
* @private
*/
function loginHdlr(socket, obj) {
    try {
        // check parameters
        if (typeof socket             !== 'object'
            || typeof obj             !== 'object'
            || typeof obj.token       !== 'string'
            || typeof obj.accessKeyId !== 'string') {

            logger.warn(IDLOG, 'bad authentication login request from ' + getWebsocketEndpoint(socket));
            unauthorized(socket);
            return;
        }

        if (compAuthe.verifyToken(obj.accessKeyId, obj.token) === true) { // user successfully authenticated

            logger.info(IDLOG, 'user "' + obj.accessKeyId + '" successfully authenticated from ' + getWebsocketEndpoint(socket) +
                               ' with socket id ' + socket.id);

            // add websocket id for future fast authentication for each request from the clients
            addWebsocketId(obj.accessKeyId, socket.id);

            // sets extension property to the client socket
            socket.set('username', obj.accessKeyId, function () {
                logger.info(IDLOG, 'setted username property ' + obj.accessKeyId + ' to socket ' + socket.id);
            });

            // send authenticated successfully response
            sendAutheSuccess(socket);

            // if the user has the operator panel permission, than he will receive the asterisk events
            if (compAuthorization.authorizeOperatorPanelUser(obj.accessKeyId) === true) {

                if (compAuthorization.isPrivacyOn(obj.accessKeyId) === true) {
                    // join the user to the websocket room to receive the asterisk events with hide numbers
                    socket.join(WS_ROOM.AST_EVT_PRIVACY);

                } else {
                    // join the user to the websocket room to receive the asterisk events with clear numbers
                    socket.join(WS_ROOM.AST_EVT_CLEAR);
                }
            }

        } else { // authentication failed
            logger.warn(IDLOG, 'authentication failed for user "' + obj.accessKeyId + '" from ' + getWebsocketEndpoint(socket) +
                               ' with id ' + socket.id);
            unauthorized(socket);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Websocket logout handler.
*
* @method logoutHdlr
* @param {object} socket The client websocket
* @private
*/
function logoutHdlr(socket) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }

        socket.get('username', function (err, username) {

            logger.info(IDLOG, 'received logout request from user "' + username + '" ' + getWebsocketEndpoint(socket) + ' with id ' + socket.id);

            compAuthe.removeGrant(username);

            logger.info(IDLOG, 'send logout successfully to ' + username + ' ' + getWebsocketEndpoint(socket) + ' with id ' + socket.id);
            socket.emit('ack_logout');
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Websocket disconnection handler.
*
* @method disconnHdlr
* @param {object} socket The client websocket
* @private
*/
function disconnHdlr(socket) {
    try {
        logger.info(IDLOG, 'client websocket disconnected ' + getWebsocketEndpoint(socket));
        removeWebsocketId(socket.id);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Removes the client websocket identifier from the private object _wsid_.
*
* @method removeWebsocketId
* @param {string} socketId The client websocket identifier
* private
*/
function removeWebsocketId(socketId) {
    try {
        if (wsid[socketId]) {
            var temp = wsid[socketId];
            delete wsid[socketId];
            logger.info(IDLOG, 'removed client websocket ' + socketId + ' for the user ' + temp);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds the client websocket identifier into the private
* object _wsid_. If it already exists it will be overwritten.
*
* @method addWebsocketId
* @param {string} user The user used as key
* @param {string} socketId The client websocket identifier to store in the memory
* private
*/
function addWebsocketId(user, socketId) {
    try {
        wsid[socketId] = user;
        logger.info(IDLOG, 'added client websocket identifier ' + socketId + ' for user ' + user);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send 401 unauthorization response through websocket.
*
* @method send401
* @param {object} socket The client websocket
* @private
*/
function send401(socket) {
    try {
        socket.emit('401', { message: 'unauthorized access' });
        logger.warn(IDLOG, 'send 401 unauthorized to ' + getWebsocketEndpoint(socket));
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send authorized successfully response through websocket.
*
* @method sendAutheSuccess
* @param {object} socket The client websocket
* @private
*/
function sendAutheSuccess(socket) {
    try {
        socket.emit('authe_ok', { message: 'authorized successfully' });
        socket.get('username', function (err, name) {
            logger.info(IDLOG, 'send authorized successfully to ' + name + ' ' + getWebsocketEndpoint(socket) + ' with id ' + socket.id);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start                = start;
exports.config               = config;
exports.setAuthe             = setAuthe;
exports.setLogger            = setLogger;
exports.setAstProxy          = setAstProxy;
exports.setOperator          = setOperator;
exports.setCompUser          = setCompUser;
exports.configPrivacy        = configPrivacy;
exports.setCompVoicemail     = setCompVoicemail;
exports.setCompAuthorization = setCompAuthorization;
