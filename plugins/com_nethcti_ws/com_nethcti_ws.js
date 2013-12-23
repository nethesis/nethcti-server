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
var httpProxy = require('http-proxy');

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
* Listening protocol, can be 'https' or 'http'. It can be
* customized in the configuration file.
*
* @property proto
* @type string
* @private
* @default "http"
*/
var proto = 'http';

/**
* The path of the certificate to be used by HTTPS server. It can be
* customized in the configuration file.
*
* @property HTTPS_CERT
* @type string
* @private
* @default "/etc/pki/tls/certs/localhost.crt"
*/
var HTTPS_CERT = '/etc/pki/tls/certs/localhost.crt';

/**
* The path of key to be used by HTTPS server. It can be
* customized in the configuration file.
*
* @property HTTPS_KEY
* @type string
* @private
* @default "/etc/pki/tls/private/localhost.key"
*/
var HTTPS_KEY = '/etc/pki/tls/private/localhost.key';

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
    QUEUES_AST_EVT_CLEAR:       'queues_ast_evt_clear',
    QUEUES_AST_EVT_PRIVACY:     'queues_ast_evt_privacy',
    TRUNKS_AST_EVT_CLEAR:       'trunks_ast_evt_clear',
    TRUNKS_AST_EVT_PRIVACY:     'trunks_ast_evt_privacy',
    PARKINGS_AST_EVT_CLEAR:     'parkings_ast_evt_clear',
    PARKINGS_AST_EVT_PRIVACY:   'parkings_ast_evt_privacy',
    EXTENSIONS_AST_EVT_CLEAR:   'extensions_ast_evt_clear',
    EXTENSIONS_AST_EVT_PRIVACY: 'extensions_ast_evt_privacy'
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
* Interval time to automatic update token expiration of all users that
* are connected by websocket.
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

        astProxy.on(astProxy.EVT_EXTEN_CHANGED,        extenChanged);       // an extension has changed
        astProxy.on(astProxy.EVT_EXTEN_DIALING,        extenDialing);       // an extension ringing
        astProxy.on(astProxy.EVT_TRUNK_CHANGED,        trunkChanged);       // a trunk has changed
        astProxy.on(astProxy.EVT_QUEUE_CHANGED,        queueChanged);       // a queue has changed
        astProxy.on(astProxy.EVT_PARKING_CHANGED,      parkingChanged);     // a parking has changed
        astProxy.on(astProxy.EVT_QUEUE_MEMBER_CHANGED, queueMemberChanged); // a queue member has changed

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
* Sets the event listeners for the user component.
*
* @method setUserListeners
* @private
*/
function setUserListeners() {
    try {
        // check user component object
        if (!compUser || typeof compUser.on !== 'function') {
            throw new Error('wrong user object');
        }

        // the presence of an endpoint of a user is changed
        compUser.on(compUser.EVT_ENDPOINT_PRESENCE_CHANGED, endpointPresenceChangedListener);

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
* Handler for the _endpointPresenceChanged_ event emitted by _user_
* component. The endpoint presence has changed, so notifies all clients.
*
* @method endpointPresenceChangedListener
* @param {string} username     The username of the endpoint owner
* @param {string} endpointType The type of the updated endpoint
* @param {object} endpoint     The updated endpoint of the user
* @private
*/
function endpointPresenceChangedListener(username, endpointType, endpoint) {
    try {
        // check parameters
        if (   typeof username     !== 'string'
            || typeof endpointType !== 'string' || typeof endpoint !== 'object') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'received event "endpointPresenceChanged" for endpoint "' + endpointType + '" of the user "' + username + '"');
        logger.info(IDLOG, 'emit event "endpointPresenceUpdate" for endpoint "' + endpointType + '" of the user "' + username + '" to websockets');

        // emits the event to all users
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('endpointPresenceUpdate', endpoint);
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('endpointPresenceUpdate', endpoint);

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
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('extenUpdate', exten.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('extenUpdate', exten.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _queueMemberChanged_ event emitted by _ast\_proxy_
* component. Something has changed in the queue member, so notifies
* all interested clients.
*
* @method queueMemberChanged
* @param {object} member The queue member object
* @private
*/
function queueMemberChanged(member) {
    try {
        logger.info(IDLOG, 'received event queueMemberChanged for member ' + member.getMember() + ' of queue ' + member.getQueue());
        logger.info(IDLOG, 'emit event queueMemberUpdate for member ' + member.getMember() + ' of queue ' + member.getQueue() + ' to websockets');

        // emits the event with clear numbers to all users with privacy disabled
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('queueMemberUpdate', member.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('queueMemberUpdate', member.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _trunkChanged_ event emitted by _ast\_proxy_
* component. Something has changed in the trunk, so notifies
* all interested clients.
*
* @method trunkChanged
* @param {object} trunk The trunk object
* @private
*/
function trunkChanged(trunk) {
    try {
        logger.info(IDLOG, 'received event trunkChanged for trunk ' + trunk.getExten());
        logger.info(IDLOG, 'emit event trunkUpdate for trunk ' + trunk.getExten() + ' to websockets');

        // emits the event with clear numbers to all users with privacy disabled
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('trunkUpdate', trunk.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('trunkUpdate', trunk.toJSON(privacyStrReplace));

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
* @method getFilteredCallerIndentity
* @param  {string} username       The username
* @param  {object} callerIdentity The identity of the caller to br filtered
* @return {object} The filtered caller identity.
* @private
*/
function getFilteredCallerIndentity(username, callerIdentity) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof callerIdentity !== 'object') {
            throw new Error('wrong parameters');
        }

        var i;

        // filter the caller notes, if there are
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
        var filteredIdentityCaller = {
            numCalled:   callerIdentity.numCalled,
            callerNum:   callerIdentity.callerNum,
            callerName:  callerIdentity.callerName
        };

        if (pbContact)                      { filteredIdentityCaller.pbContact   = pbContact;           }
        if (filteredCallerNotes.length > 0) { filteredIdentityCaller.callerNotes = filteredCallerNotes; }

        return filteredIdentityCaller;

    } catch (err) {
        logger.error(IDLOG, err.stack);
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

        // emit the "extenRinging" event for each logged in user associated with the ringing extension
        var socketId, username, filteredCallerIdentity;

        for (socketId in wsid) {

            username = wsid[socketId];

            // the user is associated with the ringing extension and is logged in
            if (users.indexOf(username) !== -1) {

                filteredCallerIdentity = getFilteredCallerIndentity(username, data.callerIdentity);

                // emits the event with the caller identity data
                logger.info(IDLOG, 'emit event extenRinging for extension ' + data.dialingExten + ' to user "' + username + '" with the caller identity');
                server.sockets.sockets[socketId].emit('extenRinging', filteredCallerIdentity);
            }
        }
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
        server.sockets.in(WS_ROOM.QUEUES_AST_EVT_CLEAR).emit('queueUpdate', queue.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.QUEUES_AST_EVT_PRIVACY).emit('queueUpdate', queue.toJSON(privacyStrReplace));

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
        server.sockets.in(WS_ROOM.PARKINGS_AST_EVT_CLEAR).emit('parkingUpdate', parking.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        server.sockets.in(WS_ROOM.PARKINGS_AST_EVT_PRIVACY).emit('parkingUpdate', parking.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Configurates the websocket server properties by a configuration file.
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

        // initialize the port of the websocket server
        if (json.websocket && json.websocket.port) {
            port = json.websocket.port;

        } else {
            logger.warn(IDLOG, 'no ws port has been specified in JSON file ' + path);
        }

        // initialize the proto of the proxy
        if (json.websocket.proto) {
            proto = json.websocket.proto;

        } else {
            logger.warn(IDLOG, 'no ws proto has been specified in JSON file ' + path);
        }

        // initialize the key of the HTTPS proxy
        if (json.websocket.https_key) {
            HTTPS_KEY = json.websocket.https_key;

        } else {
            logger.warn(IDLOG, 'no ws HTTPS key has been specified in JSON file ' + path);
        }

        // initialize the certificate of the HTTPS proxy
        if (json.websocket.https_cert) {
            HTTPS_CERT = json.websocket.https_cert;

        } else {
            logger.warn(IDLOG, 'no ws HTTPS certificate has been specified in JSON file ' + path);
        }

        // initialize the interval at which update the token expiration of all users
        // that are connected by websocket
        var expires = compAuthe.getTokenExpirationTimeout();
        updateTokenExpirationInterval = expires / 2;

        logger.info(IDLOG, 'configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Customize the privacy used to hide phone numbers by a configuration file.
* The file must use the JSON syntax.
*
* @method configPrivacy
* @param {string} path The path of the configuration file
*/
function configPrivacy(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

        // read configuration file
        var json = require(path);

        // initialize the string used to hide last digits of phone numbers
        if (json.privacy_numbers) {
            privacyStrReplace = json.privacy_numbers;

        } else {
            logger.warn(IDLOG, 'no privacy string has been specified in JSON file ' + path);
        }

        logger.info(IDLOG, 'privacy configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
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

        // set the listener for the user module
        setUserListeners();

        // websocket options
        var options = {
            'transports': ['websocket']
        };

        // create HTTPS proxy
        if (proto === 'https') {
            options.https = {
                key:  fs.readFileSync(HTTPS_KEY,  'utf8'),
                cert: fs.readFileSync(HTTPS_CERT, 'utf8')
            };
        }
        var httpServer = httpProxy.createServer(options, function( req , res ){} );

        // websocket server
        server = io.listen(httpServer);
        server.set('log level', 0); // log only the errors
        httpServer.listen(port);


        // set the websocket server listener
        server.on('connection', connHdlr);
        logger.warn(IDLOG, 'websocket server listening on proto "' + proto + '" on port ' + port);

        // start the automatic update of token expiration of all users that are connected by websocket.
        // The interval is the half value of expiration provided by authentication component
        setInterval(function () {

            updateTokenExpirationOfAllWsUsers();

        }, updateTokenExpirationInterval);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the token expiration of all users that are connected by websocket.
*
* @method updateTokenExpirationOfAllWsUsers
* @private
*/
function updateTokenExpirationOfAllWsUsers() {
    try {
        logger.info(IDLOG, 'update token expiration of all websocket users');

        var id;
        for (id in wsid) { compAuthe.updateTokenExpires(wsid[id]); }

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

            // set the nethcti endpoint presence of the user to online status
            compUser.setNethctiPresence(obj.accessKeyId, 'desktop', compUser.ENDPOINT_NETHCTI_STATUS.online);

            // sets extension property to the client socket
            socket.set('username', obj.accessKeyId, function () {
                logger.info(IDLOG, 'setted username property ' + obj.accessKeyId + ' to socket ' + socket.id);
            });

            // send authenticated successfully response
            sendAutheSuccess(socket);

            // if the user has the extensions permission, than he will receive the asterisk events that affects the extensions
            if (compAuthorization.authorizeOpExtensionsUser(obj.accessKeyId) === true) {

                if (compAuthorization.isPrivacyEnabled(obj.accessKeyId) === true) {
                    // join the user to the websocket room to receive the asterisk events that affects the extensions, using hide numbers
                    socket.join(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY);

                } else {
                    // join the user to the websocket room to receive the asterisk events that affects the extensions, using clear numbers
                    socket.join(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR);
                }
            }

            // if the user has the queues permission, than he will receive the asterisk events that affects the queues
            if (compAuthorization.authorizeOpQueuesUser(obj.accessKeyId) === true) {

                if (compAuthorization.isPrivacyEnabled(obj.accessKeyId) === true) {
                    // join the user to the websocket room to receive the asterisk events that affects the queues, using hide numbers
                    socket.join(WS_ROOM.QUEUES_AST_EVT_PRIVACY);

                } else {
                    // join the user to the websocket room to receive the asterisk events that affects the queues, using hide numbers
                    socket.join(WS_ROOM.QUEUES_AST_EVT_CLEAR);
                }
            }

            // if the user has the trunks permission, than he will receive the asterisk events that affects the trunks
            if (compAuthorization.authorizeOpTrunksUser(obj.accessKeyId) === true) {

                if (compAuthorization.isPrivacyEnabled(obj.accessKeyId) === true) {
                    // join the user to the websocket room to receive the asterisk events that affects the trunks, using hide numbers
                    socket.join(WS_ROOM.TRUNKS_AST_EVT_PRIVACY);

                } else {
                    // join the user to the websocket room to receive the asterisk events that affects the trunks, using clear numbers
                    socket.join(WS_ROOM.TRUNKS_AST_EVT_CLEAR);
                }
            }

            // if the user has the parkings permission, than he will receive the asterisk events that affects the parkings
            if (compAuthorization.authorizeOpParkingsUser(obj.accessKeyId) === true) {

                if (compAuthorization.isPrivacyEnabled(obj.accessKeyId) === true) {
                    // join the user to the websocket room to receive the asterisk events that affects the parkings, using hide numbers
                    socket.join(WS_ROOM.PARKINGS_AST_EVT_PRIVACY);

                } else {
                    // join the user to the websocket room to receive the asterisk events that affects the parkings, using clear numbers
                    socket.join(WS_ROOM.PARKINGS_AST_EVT_CLEAR);
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
* Websocket disconnection handler.
*
* @method disconnHdlr
* @param {object} socket The client websocket
* @private
*/
function disconnHdlr(socket) {
    try {
        logger.info(IDLOG, 'client websocket disconnected ' + getWebsocketEndpoint(socket));

        // when the user isn't authenticated but connected by websocket,
        // the "socket.id" isn't present in the "wsid" property
        if (wsid[socket.id]) {
            var username = wsid[socket.id];
            compUser.setNethctiPresence(username, 'desktop', compUser.ENDPOINT_NETHCTI_STATUS.offline);
        }

        // remove trusted identifier of the websocket
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
