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

        // an extension has changed
        astProxy.on('extenChanged', extenChanged);

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
        server.sockets.in('room').emit('exten_update', exten.toJSON());
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
            if (typeof data   !== 'object'
                || typeof data.command   !== 'string'
                || typeof data.messageId !== 'string') {

                badRequest(socket);

            } else {
                // dispatch
                if (data.command === 'hangup')            { hangup(socket, data);      }
                if (data.command === 'stop_record_call')  { stopRecordCall(socket, data);  }
                if (data.command === 'start_record_call') { startRecordCall(socket, data); }
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
* Stop the recording of the conversation of the extension using the asterisk proxy component.
*
* @method stopRecordCall
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.messageId The message identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
*/
function stopRecordCall(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.messageId    !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.stopRecordConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                if (typeof resp === 'object' && resp.result === true) {
                    sendAck(socket, data.messageId);
                    logger.info(IDLOG, 'sent stop record call ack for message ' + data.messageId + ' to ' + getWebsocketEndpoint(socket));

                } else {
                    sendError(socket, data.messageId);
                    logger.warn(IDLOG, 'sent stop record call error for message ' + data.messageId + ' to ' + getWebsocketEndpoint(socket));
                }
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the recording of the conversation of the extension using the asterisk proxy component.
*
* @method startRecordCall
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.messageId The message identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
*/
function startRecordCall(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.messageId    !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.recordConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                if (typeof resp === 'object' && resp.result === true) {
                    sendAck(socket, data.messageId);
                    logger.info(IDLOG, 'sent record call ack for message ' + data.messageId + ' to ' + getWebsocketEndpoint(socket));

                } else {
                    sendError(socket, data.messageId);
                    logger.warn(IDLOG, 'sent record call error for message ' + data.messageId + ' to ' + getWebsocketEndpoint(socket));
                }
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Hangup the conversation of the extension using the asterisk proxy component.
*
* @method hangup
* @param {object} socket The client websocket
* @param {object} data The data with the conversation identifier
*   @param {string} data.messageId The message identifier
*   @param {string} data.endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
*   @param {string} data.endpointId The endpoint identifier (e.g. the extension number)
*   @param {string} data.convid The conversation identifier
* @private
*/
function hangup(socket, data) {
    try {
        // check parameter
        if (typeof socket !== 'object') { throw new Error('wrong parameter'); }
        if (typeof data   !== 'object'
            || typeof data.convid       !== 'string'
            || typeof data.messageId    !== 'string'
            || typeof data.endpointId   !== 'string'
            || typeof data.endpointType !== 'string') {

            badRequest(socket);

        } else {

            astProxy.hangupConversation(data.endpointType, data.endpointId, data.convid, function (resp) {
                if (typeof resp === 'object' && resp.result === true) {
                    sendAck(socket, data.messageId);
                    logger.info(IDLOG, 'sent hangup ack for message ' + data.messageId + ' to ' + getWebsocketEndpoint(socket));

                } else {
                    sendError(socket, data.messageId);
                    logger.warn(IDLOG, 'sent hangup error for message ' + data.messageId + ' to ' + getWebsocketEndpoint(socket));
                }
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send the error result to the client for the specified message.
*
* @method sendError
* @param {object} socket The client websocket
* @param {string} messageId The message identifier
*/
function sendError(socket, messageId) {
    try {
        socket.emit('error', { messageId: messageId });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send the ack result to the client for the specified message.
*
* @method sendAck
* @param {object} socket The client websocket
* @param {string} messageId The message identifier
*/
function sendAck(socket, messageId) {
    try {
        socket.emit('ack', { messageId: messageId });
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
            logger.warn(IDLOG, 'send authorized successfully to ' + name + ' ' + getWebsocketEndpoint(socket) + ' with id ' + socket.id);
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
