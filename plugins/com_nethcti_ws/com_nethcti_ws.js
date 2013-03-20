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
* Contains all websocket of the authenticated clients. The key is
* the user and the value is the websocket.
*
* @property ws
* @type object
* @private
*/
var ws = {};

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

function setAstProxyListeners() {
    try {
        // check astProxy object
        if (!astProxy
            || typeof astProxy.on !== 'function') {

            throw new Error('wrong astProxy object');
        }

        // an extension has changed
        astProxy.on('extenChanged', function (data) {
        });

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
        var server = io.listen(PORT, options);

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
        socket.on('login',      function (data) { loginHdlr(socket, data); });
        socket.on('disconnect', function (data) { disconnHdlr(socket);     });
        logger.info(IDLOG, 'listeners for new socket connection have been set');

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
* Websocket login handler.
*
* @method loginHdlr
* @param {object} socket The client websocket
* @param {object} data The data passed by the client
* @private
*/
function loginHdlr(socket, obj) {
    try {
        if (obj && obj.user && !obj.token) { // send 401 with nonce

            logger.info(IDLOG, 'login request from ' + obj.user + ' ' + getWebsocketEndpoint(socket));
            send401Nonce(socket, authe.getNonce(obj.user));

        } else if (obj && obj.user && obj.token) { // check authentication

            if (authe.authe(obj.user, obj.token)) { // user successfully authenticated
                logger.info(IDLOG, 'user ' + obj.user + ' successfully authenticated from ' + getWebsocketEndpoint(socket));
                addWebsocket(obj.user, socket);
                sendAutheSuccess(socket);

            } else { // authentication failed
                logger.warn(IDLOG, 'authentication failed for user ' + obj.user + ' from ' + getWebsocketEndpoint(socket));
                send401(socket); // send 401 unauthorized response to the client
                socket.disconnect();
            }

        } else { // bad authentication request
            logger.warn(IDLOG, 'bad authentication request from ' + getWebsocketEndpoint(socket));
            send401(socket); // send 401 unauthorized response to the client
            socket.disconnect();
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
        removeWebsocket(socket);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Removes the client websocket from private object _ws_.
*
* @method removeWebsocket
* @param {object} socket The client websocket
* private
*/
function removeWebsocket(socket) {
    try {
        var key;
        for (key in ws) {
            if (socket.id === ws[key].id) { // match is made by socket.id
                delete ws[key];
                logger.info(IDLOG, 'removed client websocket for user ' + key);
                return;
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds the client websocket to private object _ws_.
*
* @method addWebsocket
* @param {string} user The user used as key
* @param {object} socket The client websocket to add in memory
* private
*/
function addWebsocket(user, socket) {
    try {
        ws[user] = socket;
        logger.info(IDLOG, 'added client websocket for user ' + user + ' ' + getWebsocketEndpoint(socket));
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
        logger.warn(IDLOG, 'send authorized successfully to ' + getWebsocketEndpoint(socket));
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}


// public interface
exports.start       = start;
exports.setAuthe    = setAuthe;
exports.setLogger   = setLogger;
exports.setAstProxy = setAstProxy;
