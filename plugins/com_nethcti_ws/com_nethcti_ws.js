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
* The websocket server port.
*
* @property PORT
* @type {number}
* @private
* @final
* @readOnly
* @default 8181
*/
var PORT = 8181;

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
* The authentication module.
*
* @property authe
* @type object
* @private
*/
var authe;

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
* @param autheMod
* @type object The authentication module.
*/
function setAuthe(autheMod) {
    try {
        if (typeof autheMod !== 'object') {
            throw new Error('wrong authentication object');
        }
        authe = autheMod;
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

        astProxy.on('extenChanged',   extenChanged);   // an extension has changed
        astProxy.on('queueChanged',   queueChanged);   // a queue has changed
        astProxy.on('parkingChanged', parkingChanged); // a parking has changed

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
        server.sockets.in('room').emit('extenUpdate', exten.toJSON());
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
        server.sockets.in('room').emit('queueUpdate', queue.toJSON());
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
        server.sockets.in('room').emit('parkingUpdate', parking.toJSON());
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates the server websocket.
*
* @method start
*/
function start() {
    try {
        // set the listener for the aterisk proxy module
        setAstProxyListeners();

        // websocket options
        var options = {
            'log level':  1,
            'transports': ['websocket']
        };

        // websocket server
        server = io.listen(PORT, options);

        // set the websocket server listener
        server.on('connection', connHdlr);
        logger.info(IDLOG, 'websocket server listening on port ' + PORT);

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
        socket.on('login',      function (data) { loginHdlr(socket, data);     });
        socket.on('message',    function (data) { dispatchMsg(socket, data);   });
        socket.on('challenge',  function (data) { challengeHdlr(socket, data); });
        socket.on('disconnect', function (data) { disconnHdlr(socket);         });
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

                // get the sender identifier
                var sender = wsid[socket.id];

                // dispatch
                if (data.command === 'call')            { call(socket, data);                 }
                if (data.command === 'parkConv')        { parkConv(socket, data, sender);     }
                if (data.command === 'pickupConv')      { pickupConv(socket, data, sender);   }
                if (data.command === 'hangupConv')      { hangupConv(socket, data);           }
                if (data.command === 'redirectConv')    { redirectConv(socket, data, sender); }
                if (data.command === 'stopRecordConv')  { stopRecordConv(socket, data);       }
                if (data.command === 'startRecordConv') { startRecordConv(socket, data);      }
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
* Pickup a conversation.
*
* @method pickupConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @param {string} sender The sender of the operation (e.g. the extension number)
* @private
*/
function pickupConv(socket, data, sender) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof sender            !== 'string'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.pickupConversation(data.endpointType, data.endpointId, data.convid, sender, function (resp) {
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
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @param {string} sender The sender of the operation (e.g. the extension number)
* @private
*/
function parkConv(socket, data, sender) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.parkConversation(data.endpointType, data.endpointId, data.convid, sender, function (resp) {
                responseToClient(socket, 'parkConv', resp);
            });
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

            astProxy.recordConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
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
* @private
*/
function redirectConv(socket, data, sender) {
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

            astProxy.redirectConversation(data.endpointType, data.endpointId, data.convid, data.to, sender, function (resp) {
                responseToClient(socket, 'redirectConv', resp);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send a response to the client.
*
* @method responseToClient
* @param {object} socket The client websocket
* @param {string} command The name of the command
* @param {object} resp The response received from the asterisk proxy operation execution
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
* Hangup the conversation of the extension using the asterisk proxy component.
*
* @method hangupConv
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
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
* Send the ack result to the client for the specified message.
*
* **It can throw an Exception.**
*
* @method sendAck
* @param {object} socket The client websocket
* @param {string} [obj] The object to send
*/
function sendAck(socket, obj) {
    try {
        // check parameter
        if (obj === undefined) { obj = {}; }
        if (typeof obj !== 'object') { throw new Error('wrong parameter'); }

        socket.emit('ack', obj);
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
* Websocket challenge handler for login operation.
*
* @method challengeHdlr
* @param {object} socket The client websocket
* @param {object} obj The data passed by the client. It must contain
* the user information
* @private
*/
function challengeHdlr(socket, obj) {
    try {
        if (socket && obj && obj.user) { // send 401 with nonce
            logger.info(IDLOG, 'login challenge request from ' + obj.user + ' ' + getWebsocketEndpoint(socket));
            send401Nonce(socket, authe.getNonce(obj.user));

        } else {
            logger.warn(IDLOG, 'bad authentication challenge request from ' + getWebsocketEndpoint(socket));
            unauthorized(socket);
        }
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
* @private
*/
function loginHdlr(socket, obj) {
    try {
        if (socket && obj && obj.user && obj.token) { // check parameters

            if (authe.authenticate(obj.user, obj.token)) { // user successfully authenticated

                logger.info(IDLOG, 'user ' + obj.user + ' successfully authenticated from ' + getWebsocketEndpoint(socket) +
                                   ' with id ' + socket.id);

                // add websocket id for future fast authentication for each request from the clients
                addWebsocketId(obj.user, socket.id);

                // sets extension property to the client socket
                socket.set('extension', obj.user, function () {
                    logger.info(IDLOG, 'setted extension property ' + obj.user + ' to socket ' + socket.id);
                });

                // send authenticated successfully response
                sendAutheSuccess(socket);

                socket.join('room');
                logger.info(IDLOG, 'emit event queues to websockets');
                server.sockets.in('room').emit('queues', astProxy.getJSONQueues());

                logger.info(IDLOG, 'emit event parkings to websockets');
                server.sockets.in('room').emit('parkings', astProxy.getJSONParkings());

                logger.info(IDLOG, 'emit event extensions to websockets');
                server.sockets.in('room').emit('extensions', astProxy.getJSONExtensions());

            } else { // authentication failed
                logger.warn(IDLOG, 'authentication failed for user ' + obj.user + ' from ' + getWebsocketEndpoint(socket) +
                                   ' with id ' + socket.id);
                unauthorized(socket);
            }

        } else { // bad authentication request
            logger.warn(IDLOG, 'bad authentication login request from ' + getWebsocketEndpoint(socket));
            unauthorized(socket);
        }
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
            delete wsid[socketId];
            logger.info(IDLOG, 'removed client websocket ' + socketId + ' for the user ' + wsid[socketId]);
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
* Send 401 unauthorized response through websocket,
* with the nonce used by the client for authentication token.
*
* @method send401Nonce
* @param {object} socket The client websocket
* @param {string} nonce The nonce used to create the token
* @private
*/
function send401Nonce(socket, nonce) {
    try {
        socket.emit('401', { message: 'unauthorized access', nonce: nonce });
        logger.info(IDLOG, 'send 401 unauthorized with nonce to ' + getWebsocketEndpoint(socket));
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
        socket.get('extension', function (err, name) {
            logger.info(IDLOG, 'send authorized successfully to ' + name + ' ' + getWebsocketEndpoint(socket) + ' with id ' + socket.id);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start       = start;
exports.setAuthe    = setAuthe;
exports.setLogger   = setLogger;
exports.setAstProxy = setAstProxy;
