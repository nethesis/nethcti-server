/**
* Communicates in real time mode with clients using a TCP connection.
*
* @module com_nethcti_tcp
* @main com_nethcti_tcp
*/

/**
* Core module that communicates with clients using a TCP connection.
*
* @class com_nethcti_tcp
* @static
*/
var fs      = require('fs');
var net     = require('net');
var pathReq = require('path');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type {string}
* @private
* @final
* @readOnly
* @default [com_nethcti_tcp]
*/
var IDLOG = '[com_nethcti_tcp]';

/**
* The enconding used to write the TCP client sockets.
*
* @property ENCODING
* @type string
* @private
* @final
* @readOnly
* @default "utf8"
*/
var ENCODING = 'utf8';

/**
* The name of the template file for a call notification popup.
*
* @property CALL_NOTIF_TEMPLATE_NAME
* @type string
* @private
* @final
* @readOnly
* @default "call.html"
*/
var CALL_NOTIF_TEMPLATE_NAME = 'call.html';

/**
* The name of the template file for a streaming notification popup.
*
* @property STREAMING_NOTIF_TEMPLATE_NAME
* @type string
* @private
* @final
* @readOnly
* @default "streaming.html"
*/
var STREAMING_NOTIF_TEMPLATE_NAME = 'streaming.html';

/**
* The path of the template file for a call notification popup. It is
* constructed by the _config_ method.
*
* @property callNotifTemplatePath
* @type string
* @private
*/
var callNotifTemplatePath;

/**
* The path of the template file for a streaming notification popup. It is
* constructed by the _config_ method.
*
* @property streamingNotifTemplatePath
* @type string
* @private
*/
var streamingNotifTemplatePath;

/**
* The TCP server port. It is customized by the configuration file.
*
* @property port
* @type string
* @private
* @final
* @readOnly
*/
var port;

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
* The TCP server.
*
* @property server
* @type {object}
* @private
*/
var server;

/**
* The asterisk proxy component.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

/**
* The streaming component.
*
* @property compStreaming
* @type object
* @private
*/
var compStreaming;

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
* Contains all client socket of authenticated clients. The key is the client
* socket identifier and the value is the socket object.
*
* @property sockets
* @type object
* @private
*/
var sockets = {};

/**
* Interval time to automatic update token expiration of all users that
* are connected by socket.
*
* @property updateTokenExpirationInterval
* @type {number}
* @private
*/
var updateTokenExpirationInterval;

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
* @method setCompAuthe
* @param {object} autheMod The authentication module.
*/
function setCompAuthe(autheMod) {
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
* Set the streaming module to be used.
*
* @method setCompStreaming
* @param {object} comp The streaming module.
*/
function setCompStreaming(comp) {
    try {
        if (typeof comp !== 'object') {
            throw new Error('wrong streaming object');
        }
        compStreaming = comp;
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
        compAstProxy = ap;
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
        // check compAstProxy object
        if (!compAstProxy || typeof compAstProxy.on !== 'function') {
            throw new Error('wrong compAstProxy object');
        }

        compAstProxy.on(compAstProxy.EVT_EXTEN_DIALING, extenDialing); // an extension ringing

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns identity data of the caller filtered by user authorizations. Returned caller
* notes are those all of the user and the publics of the others if he has only the "postit"
* authorization and all the caller notes if he has the "admin postit" authorization. Phonebook
* contacts returned is the one created by the user in the cti phonebook, or one from the
* centralized phonebook or a public contact created by other users in the cti address book.
*
* @method getFilteredCallerData
* @param  {string} username       The username
* @param  {object} callerIdentity The identity of the caller to be filtered
* @return {object} The filtered caller identity data
* @private
*/
function getFilteredCallerData(username, callerIdentity) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof callerIdentity !== 'object') {
            throw new Error('wrong parameters');
        }

        /*
        // if some caller notes are present, filter them
        var i;
        var filteredCallerNotes = [];

        if (callerIdentity.callerNotes) {

            // the user can view all the caller notes of all users, both private and public
            if (compAuthorization.authorizeAdminPostitUser(username) === true) {

                for (i = 0; i < callerIdentity.callerNotes.length; i++) {

                    filteredCallerNotes.push(callerIdentity.callerNotes[i]);
                }
            }

            // the user can view only his caller notes and the public of other users
            else if (compAuthorization.authorizePostitUser(username) === true) {

                for (i = 0; i < callerIdentity.callerNotes.length; i++) {

                    if (   callerIdentity.callerNotes[i].creator === username
                        || callerIdentity.callerNotes[i].public  === 1) {

                        filteredCallerNotes.push(callerIdentity.callerNotes[i]);
                    }
                }
            }
        }
        */

        // filter the phonebook contact if it's present
        // chose the phonebook contacts: is first returned the contact of the user from the cti phonebook,
        // than that from the central phonebook and the last is the public contact from the cti phonebook.
        // If more than one contact is present, the first is returned
        var pbContact = undefined;

        if (callerIdentity.pbContacts) {

            // check if the user has the phonebook permission
            if (compAuthorization.authorizePhonebookUser(username) === true) {

                for (i = 0; i < callerIdentity.pbContacts.nethcti.length; i++) {

                    // the user has a contact in the cti phonebook
                    if (callerIdentity.pbContacts.nethcti[i].owner_id === username) {

                        pbContact = callerIdentity.pbContacts.nethcti[i];
                        break;
                    }
                }

                // check if the contact wasn't found as private contact of the user in the cti phonebook
                if (pbContact === undefined && callerIdentity.pbContacts.centralized.length > 0) {

                    // the contact was found in the centralized phonebook
                    pbContact = callerIdentity.pbContacts.centralized[0];
                }

                // check if the contact wasn't found as private contact of the user in the cti phonebook and
                // wasn't found in the centralized phonebook
                if (pbContact === undefined) {

                    for (i = 0; i < callerIdentity.pbContacts.nethcti.length; i++) {

                        // there is a public contact in the cti phonebook
                        if (callerIdentity.pbContacts.nethcti[i].type === 'public') {

                            pbContact = callerIdentity.pbContacts.nethcti[i];
                            break;
                        }
                    }
                }
            }
        }

        // object to return
        var filteredCallerData = {};

        if (pbContact)                      { filteredCallerData.pbContact   = pbContact;           }
        // if (filteredCallerNotes.length > 0) { filteredCallerData.callerNotes = filteredCallerNotes; }

        return filteredCallerData;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Returns data about the streaming source filtered by user authorizations. If the user
* doesn't have the authorization, an empty object is returned.
*
* @method getFilteredStreamData
* @param  {string} username   The username
* @param  {string} callerNum  The number of the caller
* @return {object} The filtered streaming data
* @private
*/
function getFilteredStreamData(username, callerNum) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof callerNum !== 'string') {
            throw new Error('wrong parameters');
        }

        // get the streaming data
        var streamJSON = compStreaming.getSourceJSONByExten(callerNum);

        // check if the user has the streaming permission, otherwise return an empty object
        if (compAuthorization.authorizeStreamingSourceUser(username, streamJSON.id) === true) {

            return {
                id:          streamJSON.id,
                url:         streamJSON.url,
                open:        ( (streamJSON.cmdOpen && streamJSON.cmdOpen !== '') ? true : false ),
                description: streamJSON.description
            };
        }

        // the user has not the streaming permission, so return an empty object
        return {};

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Handler for the _extenDialing_ event emitted by _ast\_proxy_ component.
* The extension ringing, so notify all users associated with it, with the
* identity data of the caller.
*
* @method extenDialing
* @param {object} data
*   @param {string} data.dialingExten   The identifier of the ringing extension
*   @param {object} data.callerIdentity The identity data of the caller
* @private
*/
function extenDialing(data) {
    try {
        // check parameters
        if (   typeof data              !== 'object'
            || typeof data.dialingExten !== 'string' || typeof data.callerIdentity !== 'object') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'received event extenDialing for extension ' + data.dialingExten + ' with the caller identity');

        // get all users associated with the ringing extension
        var users = compUser.getUsersUsingEndpointExtension(data.dialingExten);

        // emit the notification event for each logged in user associated
        // with the ringing extension to open a desktop notification popup
        var sockId, username;

        for (sockId in sockets) {

            // "sockets[sockId]" is a socket object that contains the "username"
            // and "id" properties added by "connHdlr" and "loginHdlr" methods
            username = sockets[sockId].username;

            // the user is associated with the ringing extension and is logged in, so send to notification event
            if (users.indexOf(username) !== -1) {

                // check if the caller is a streaming source
                var isStreaming = compStreaming.isExtenStreamingSource(data.callerIdentity.callerNum);

                if (isStreaming) { sendStreamingNotificationEvent(username, data, sockets[sockId]); }
                else             { sendCallNotificationEvent(username, data, sockets[sockId]);      }
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sends the event to open a desktop notification popup about a streaming source.
*
* @method sendStreamingNotificationEvent
* @param {string} username The username of the client
* @param {object} data     The data about the caller
* @param {object} socket   The TCP socket client
* @private
*/
function sendStreamingNotificationEvent(username, data, socket) {
    try {
        // gets the data about the streaming source based on the user authorizations
        var streamingData = getFilteredStreamData(username, data.callerIdentity.callerNum);

        // check if the user has the relative streaming authorization. If he hasn't the authorization,
        // the "streamingData" is an empty object. So sends the default notification for a generic call
        if (Object.keys(streamingData).length === 0) {
            sendCallNotificationEvent(username, data, socket);
            return;
        }

        // always add this informations without filter them
        var params = 'description=' + streamingData.description +
                     '&open=' + streamingData.open +
                     '&url='  + streamingData.url +
                     '&id='   + streamingData.id;

        // add parameters to the HTTP GET url
        var url = streamingNotifTemplatePath + '?' + params;

        // temporary to remove
        // temporary to remove
        // temporary to remove
        // temporary to remove
        // temporary to remove
        url += '&random=' + new Date().getTime();

        // create the id to identify the notification popup
        var notifid = data.callerIdentity.numCalled + '<-' + data.callerIdentity.callerNum;

        var notif = {
            notification: {
                id:           notifid,
                url:          url,
                width:        500,
                height:       300,
                action:       'open',
                closetimeout: 0
            }
        };

        socket.write(JSON.stringify(notif), ENCODING, function () {
            try {
                logger.info(IDLOG, 'sent "open streaming notification" to ' + socket.username + ' with id ' + socket.id);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sends the event to open a desktop notification popup about an incoming call.
*
* @method sendCallNotificationEvent
* @param {string} username The username of the client
* @param {object} data     The data about the caller
* @param {object} socket   The TCP socket client
* @private
*/
function sendCallNotificationEvent(username, data, socket) {
    try {
        // always add this informations without filter them
        var params = 'callerNum='   + data.callerIdentity.callerNum +
                     '&callerName=' + data.callerIdentity.callerName;

        // add parameters to the HTTP GET url
        var url = callNotifTemplatePath + '?' + params;

        // temporary to remove
        // temporary to remove
        // temporary to remove
        // temporary to remove
        // temporary to remove
        // temporary to remove
        // temporary to remove
        url += '&random=' + new Date().getTime();

        // create the id to identify the notification popup
        var notifid = data.callerIdentity.numCalled + '<-' + data.callerIdentity.callerNum;

        var notif = {
            notification: {
                id:           notifid,
                url:          url,
                width:        500,
                height:       200,
                action:       'open',
                closetimeout: 0
            }
        };

        socket.write(JSON.stringify(notif), ENCODING, function () {
            try {
                logger.info(IDLOG, 'sent "open call notification" to ' + socket.username + ' with id ' + socket.id);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Configurates the TCP server properties by a configuration file.
* The file must use the JSON syntax.
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

        // read configuration file
        var json = require(path);

        // initialize the port of the tcp server
        if (json && json.tcp && json.tcp.port) {
            port = json.tcp.port;

        } else {
            logger.warn(IDLOG, 'no TCP port has been specified in JSON file ' + path);
        }

        // initialize the paths of the notification templates
        if (json && json.tcp && json.tcp.base_templates) {
            callNotifTemplatePath      = json.tcp.base_templates + pathReq.sep + CALL_NOTIF_TEMPLATE_NAME;
            streamingNotifTemplatePath = json.tcp.base_templates + pathReq.sep + STREAMING_NOTIF_TEMPLATE_NAME;

        } else {
            logger.warn(IDLOG, 'base template notifications url has not been specified in JSON file ' + path);
        }

        /*
        // initialize the key of the HTTPS proxy
        if (json.tcp.https_key) {
            HTTPS_KEY = json.tcp.https_key;

        } else {
            logger.warn(IDLOG, 'no HTTPS key specified in JSON file ' + path);
        }

        // initialize the certificate of the HTTPS proxy
        if (json.tcp.https_cert) {
            HTTPS_CERT = json.tcp.https_cert;

        } else {
            logger.warn(IDLOG, 'no HTTPS certificate specified in JSON file ' + path);
        }
        */

        // initialize the interval at which update the token expiration of all users
        // that are connected by tcp
        var expires = compAuthe.getTokenExpirationTimeout();
        updateTokenExpirationInterval = expires / 2;

        logger.info(IDLOG, 'configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates the TCP server and adds the listeners for other components.
*
* @method start
*/
function start() {
    try {
        // check the configuration. The server starts only if the configuration has been done
        // correctly, that is if the /etc/nethcti/services.json file exists and contains
        // the tcp json object
        if (port === undefined) {
            logger.warn(IDLOG, 'tcp server does not start, because the configuration is not present');
            return;
        }
        // also check if the of notification templates file path exist
        if (!callNotifTemplatePath || !streamingNotifTemplatePath) {
            logger.warn(IDLOG, 'tcp server does not start, because the templates file path are undefined');
            return;
        }

        // set the listener for the aterisk proxy module
        setAstProxyListeners();

        // tcp server
        server = net.createServer();

        // add listeners
        server.on('connection', connHdlr);
        server.listen(port);
        logger.warn(IDLOG, 'TCP server listening on ' + server.address().address + ':' + server.address().port);

        // start the automatic update of token expiration of all the users that are connected by tcp.
        // The interval is the half value of expiration provided by authentication component
        setInterval(function () {

            updateTokenExpirationOfAllTcpUsers();

        }, updateTokenExpirationInterval);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the token expiration of all users that are connected by TCP.
*
* @method updateTokenExpirationOfAllTcpUsers
* @private
*/
function updateTokenExpirationOfAllTcpUsers() {
    try {
        logger.info(IDLOG, 'update token expiration of all TCP users');

        var id;
        for (id in sockets) {
            compAuthe.updateTokenExpires(sockets[id].username);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* TCP server connection handler. A new client connection has been made.
*
* @method connHdlr
* @param {object} socket The client socket
* @private
*/
function connHdlr(socket) {
    try {
        logger.info(IDLOG, 'new connection from ' + getClientSocketEndpoint(socket));

        // set the socket identifier
        socket.id = getClientSocketEndpoint(socket);

        // set the socket encoding
        socket.setEncoding('utf8');

        // add listeners to the new socket connection
        // Emitted when data is received.
        socket.on('data', function (data) {
            try {
                var parameters = JSON.parse(data);

                // dispatch the message
                if (parameters.action === 'login') { loginHdlr(socket, parameters); }

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

        // Emitted when the other end of the socket sends a FIN packet
        socket.on('end', function () {
            try {
                disconnHdlr(socket);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

        // Emitted once the socket is fully closed. The argument had_error is a
        // boolean which says if the socket was closed due to a transmission error.
        socket.on('close', function (had_error) {
            try {
                disconnHdlr(socket);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

        // Emitted when an error occurs. The 'close' event will be called directly following this event.
        socket.on('error', function (error) {
            try {
                logger.error(IDLOG, error.stack);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

        // Emitted when the write buffer becomes empty. Can be used to throttle uploads.
        socket.on('drain', function () {} );

        logger.info(IDLOG, 'listeners for the new socket connection have been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the endpoint of the client socket. The endpoint is constructed by _ip\_address:port._
*
* @method getSocketEndpoint
* @param  {object} socket The TCP client socket
* @return {string} The socket endpoint as _ip\_address:port._
* @private
*/
function getClientSocketEndpoint(socket) {
    try {
        return socket.remoteAddress + ':' + socket.remotePort;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Manage unauthorized access. It send 401 unauthorized response
* to the client and disconnect the socket.
*
* @method unauthorized
* @param {object} socket The client socket
* @private
*/
function unauthorized(socket) {
    try {
        send401(socket); // send 401 unauthorized response to the client
        socket.destroy();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* TCP socket login handler.
*
* @method loginHdlr
* @param {object} socket The client socket
* @param {object} obj
*   @param {string} obj.accessKeyId The username of the account
*   @param {string} obj.token       The token constructed with the authentication REST request
* @private
*/
function loginHdlr(socket, obj) {
    try {
        // check parameters
        if (   typeof socket    !== 'object' || typeof obj          !== 'object'
            || typeof obj.token !== 'string' || typeof obj.username !== 'string') {

            logger.warn(IDLOG, 'bad authentication login request from ' + getClientSocketEndpoint(socket));
            unauthorized(socket);
            return;
        }

        if (compAuthe.verifyToken(obj.username, obj.token) === true) { // user successfully authenticated

            logger.info(IDLOG, 'user "' + obj.username + '" successfully authenticated from ' + getClientSocketEndpoint(socket));

            // sets username property to the client socket
            socket.username = obj.username;

            // add client socket to future fast authentication for each request from the clients
            addSocket(socket);

            // send authenticated successfully response
            sendAutheSuccess(socket);

            // send supported commands by windows notifications
            sendNotificationSupportedCommands(socket);

        } else { // authentication failed
            logger.warn(IDLOG, 'authentication failed for user "' + obj.username + '" from ' + getClientSocketEndpoint(socket));
            unauthorized(socket);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        unauthorized(socket);
    }
}

/**
* Send supported commands by the windows notifications of incoming calls.
*
* @method sendNotificationSupportedCommands
* @param {object} socket The client socket
* @private
*/
function sendNotificationSupportedCommands(socket) {
    try {
        var cmds = {
            commands: {
                url: {
                    command: 'url',
                    runwith: ''
                },
                notepad: {
                    command: 'notepad',
                    runwith: ''
                }
            }
        };

        socket.write(JSON.stringify(cmds), ENCODING, function () {
            try {
                logger.info(IDLOG, 'sent notification supported commands to ' + socket.username + ' ' + getClientSocketEndpoint(socket));

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Client socket disconnection handler.
*
* @method disconnHdlr
* @param {object} socket The client socket
* @private
*/
function disconnHdlr(socket) {
    try {
        logger.info(IDLOG, 'client socket disconnected ' + getClientSocketEndpoint(socket));

        // remove trusted identifier of the socket
        removeClientSocket(socket.id);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Removes the client socket from the private object _sockets_.
*
* @method removeClientSocket
* @param {string} socketId The client socket identifier
* private
*/
function removeClientSocket(socketId) {
    try {
        if (sockets[socketId]) {
            var temp = sockets[socketId];
            delete sockets[socketId];
            logger.info(IDLOG, 'removed client socket ' + socketId + ' for the user ' + temp.username);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds the client socket into the private object _sockets_.
* If it already exists it will be overwritten.
*
* @method addSocket
* @param {string} socket The client socket
* private
*/
function addSocket(socket) {
    try {
        sockets[socket.id] = socket;
        logger.info(IDLOG, 'added client socket ' + socket.id + ' for user ' + socket.username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send 401 unauthorization response through the client socket.
*
* @method send401
* @param {object} socket The client socket
* @private
*/
function send401(socket) {
    try {
        socket.write('401', ENCODING, function () {
            try {
                logger.info(IDLOG, 'sent 401 unauthorized to ' + getClientSocketEndpoint(socket));

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send authorized successfully response to the client by socket.
*
* @method sendAutheSuccess
* @param {object} socket The client socket
* @private
*/
function sendAutheSuccess(socket) {
    try {
        var data = { message: 'authe_ok' };
        
        socket.write(JSON.stringify(data), ENCODING, function () {
            try {
                logger.info(IDLOG, 'sent authorized successfully to ' + socket.username + ' with id ' + socket.id);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start                = start;
exports.config               = config;
exports.setLogger            = setLogger;
exports.setAstProxy          = setAstProxy;
exports.setCompUser          = setCompUser;
exports.setCompAuthe         = setCompAuthe;
exports.setCompStreaming     = setCompStreaming;
exports.setCompAuthorization = setCompAuthorization;
