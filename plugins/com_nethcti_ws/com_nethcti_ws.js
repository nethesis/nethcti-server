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
* The authentication module.
*
* @property compAuthe
* @type object
* @private
*/
var compAuthe;

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
* Set voicemail architect component used by voicemail functions.
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
* Set the operator to be used by the module.
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
* Send a response to the client. The response can be
* an acknowledgment or an error.
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

            socket.join('room');

            logger.info(IDLOG, 'emit event operatorGroups to websockets');
            server.sockets.in('room').emit('operatorGroups', operator.getJSONGroups());

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
exports.start            = start;
exports.config           = config;
exports.setAuthe         = setAuthe;
exports.setLogger        = setLogger;
exports.setAstProxy      = setAstProxy;
exports.setOperator      = setOperator;
exports.setCompVoicemail = setCompVoicemail;
