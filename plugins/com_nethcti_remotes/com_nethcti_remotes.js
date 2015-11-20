/**
* Communicates in real time mode with the clients using websocket. It listen
* It listens on http and https protocols.
* .........................................
* .........................................
* .........................................
* .........................................
* .........................................
*
* @module com_nethcti_remotes
* @main com_nethcti_remotes
*/

/**
* Core module that communicates with the clients using websocket.
*
* @class com_nethcti_remotes
* @static
*/
var fs           = require('fs');
var https        = require('https');
var crypto       = require('crypto');
var request      = require('request');
var ioClient     = require('socket.io-client');
var httpProxy    = require('http-proxy');
var EventEmitter = require('events').EventEmitter;

/**
* Fired when a websocket client connection has been closed.
*
* @event wsClientDisonnection
* @param {string} username The name of the user that has closed the connection
*/
/**
* The name of the client websocket disconnection event.
*
* @property EVT_ALL_WS_CLIENT_DISCONNECTION
* @type string
* @default "allWsClientDisonnection"
*/
var EVT_ALL_WS_CLIENT_DISCONNECTION = 'allWsClientDisonnection';

/**
* Fired when a client has been logged in by a websocket connection.
*
* @event wsClientLoggedIn
* @param {string} username The name of the user that has been logged in.
*/
/**
* The name of the client logged in event.
*
* @property EVT_WS_CLIENT_LOGGEDIN
* @type string
* @default "wsClientLoggedIn"
*/
var EVT_WS_CLIENT_LOGGEDIN = 'wsClientLoggedIn';

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type {string}
* @private
* @final
* @readOnly
* @default [com_nethcti_remotes]
*/
var IDLOG = '[com_nethcti_remotes]';

/**
* The log level of the websocket library. Log only the errors by default.
*
* @property WS_LOG_LEVEL
* @type {number}
* @private
* @final
* @readOnly
* @default 0
*/
var WS_LOG_LEVEL = 0;

/**
* The user agent used to recognize cti client application. The user agent is set
* to the socket properties when client login (loginHdlr) and checked when disconnect
* (disconnHdlr) to set the offline presence of the client user.
*
* @property USER_AGENT
* @type {string}
* @private
* @final
* @readOnly
* @default "nethcti"
*/
var USER_AGENT = 'nethcti';

/**
* Maximum delay waited between two reconnection attempts to a remote site.
*
* @property MAX_RECONNECTION_DELAY
* @type {number}
* @private
* @final
* @readOnly
* @default 10000
*/
var MAX_RECONNECTION_DELAY = 10000;

/**
* Remote connection timeout.
*
* @property CONNECTION_TIMEOUT
* @type {number}
* @private
* @final
* @readOnly
* @default 10000
*/
var CONNECTION_TIMEOUT = 10000;

/**
* The protocol to be used for rest api calls.
*
* @property REST_PROTO
* @type string
* @private
* @default "https"
*/
var REST_PROTO = 'https';

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
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

/**
* Contains remote sites to be connected. It is populated by
* JSON configuration file.
*
* @property remoteSites
* @type {object}
* @private
*/
var remoteSites;

/**
* Contains all operator extensions of all remote sites.
*
* @property allSitesOpExtensions
* @type {object}
* @default {}
* @private
*/
var allSitesOpExtensions = {};

/**
* Contains all operator panel groups of all remote sites.
*
* @property allSitesOpGroups
* @type {object}
* @default {}
* @private
*/
var allSitesOpGroups = {};

/**
* Contains all client websockets logged in the remote sites.
* The keys are the usernames and the values are the respective
* websocket objects.
*
* @property wssClients
* @type {object}
* @default {}
* @private
*/
var wssClients = {};

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
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The user component.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The websocket communication module.
*
* @property compComNethctiWs
* @type object
* @private
*/
var compComNethctiWs;

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
* The post-it architect component.
*
* @property compPostit
* @type object
* @private
*/
var compPostit;

/**
* Contains all websocket identifiers of authenticated clients (http and https).
* The key is the websocket identifier and the value is an object
* containing the username and the token of the user. It's used for
* fast authentication for each request.
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
* Sets the websocket communication module to be used.
*
* @method setCompComNethctiWs
* @param {object} comp The module.
*/
function setCompComNethctiWs(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong object'); }
        compComNethctiWs = comp;
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
* Sets post-it architect component.
*
* @method setCompPostit
* @param {object} comp The post-it architect component.
*/
function setCompPostit(comp) {
    try {
        compPostit = comp;
        logger.info(IDLOG, 'set post-it architect component');
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

        compVoicemail.on(compVoicemail.EVT_UPDATE_NEW_VOICE_MESSAGES, updateNewVoiceMessagesListener);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the post-it component.
*
* @method setPostitListeners
* @private
*/
function setPostitListeners() {
    try {
        // check post-it component object
        if (!compPostit || typeof compPostit.on !== 'function') {
            throw new Error('wrong post-it object');
        }

        compPostit.on(compPostit.EVT_UPDATE_NEW_POSTIT, updateNewPostitListener);

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
* @method updateNewVoiceMessagesListener
* @param {string} voicemail The voicemail identifier
* @param {array}  list      The list of all new voicemail messages
* @private
*/
function updateNewVoiceMessagesListener(voicemail, list) {
    try {
        // check the event data
        if (typeof voicemail !== 'string' || list === undefined || list instanceof Array === false) {
            throw new Error('wrong voicemails array list');
        }

        logger.info(IDLOG, 'received "new voicemail" event for voicemail ' + voicemail);

        // get all users associated with the voicemail. Only the user with the associated voicemail
        // receives the list of all new voice messages
        var users = compUser.getUsersUsingEndpointVoicemail(voicemail);

        // emit the "newVoiceMessage" event for each logged in user associated with the voicemail.
        // The event contains the voicemail details
        var socketId, username;

        for (socketId in wsid) {

            username = wsid[socketId].username;

            // the user is associated with the voicemail is logged in
            if (users.indexOf(username) !== -1) {

                // emits the event with the list of all new voice messages of the voicemail
                logger.info(IDLOG, 'emit event "updateNewVoiceMessages" for voicemail ' + voicemail + ' to user "' + username + '"');
                // object to return with the event
                var obj = {};
                obj[voicemail] = list;

                if (wsServer.sockets.sockets[socketId]) { wsServer.sockets.sockets[socketId].emit('updateNewVoiceMessages', obj); }
                if (wssServer.sockets.sockets[socketId]) { wssServer.sockets.sockets[socketId].emit('updateNewVoiceMessages', obj); }
            }
        }

        // emit the "newVoiceMessageCounter" to all the users. The event contains only the number
        // of new voice messages of the voicemail without they details. So it is sent to all the users
        // without any authorization checking
        for (socketId in wsid) {

            username = wsid[socketId].username;

            // emits the event "newVoiceMessageCounter" with the number of new voice messages of the user
            logger.info(IDLOG, 'emit event "newVoiceMessageCounter" ' + list.length + ' to user "' + username + '"');

            if (wsServer.sockets.sockets[socketId]) { wsServer.sockets.sockets[socketId].emit('newVoiceMessageCounter', { voicemail: voicemail, counter: list.length }); }
            if (wssServer.sockets.sockets[socketId]) { wssServer.sockets.sockets[socketId].emit('newVoiceMessageCounter', { voicemail: voicemail, counter: list.length }); }
        }

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Manages the event emitted by the post-it component to update the new post-it messages.
* It send all new post-it to the recipient user.
*
* @method updateNewPostitListener
* @param {string} recipient The recipient user of the new post-it
* @param {array}  list      All the new post-it messages of the user
* @private
*/
function updateNewPostitListener(recipient, list) {
    try {
        // check the event data
        if (typeof recipient !== 'string' || list === undefined || list instanceof Array === false) {
            throw new Error('wrong arguments');
        }

        logger.info(IDLOG, 'received "updateNewPostit" event for recipient user ' + recipient);

        // emit the "updateNewPostit" event for the recipient user. The events contains all the new post-it with their details
        var socketId, username;

        for (socketId in wsid) {

            username = wsid[socketId].username;

            // the user is the recipient of the new post-it message
            if (username === recipient) {

                // emits the event with the list of all new post-it messages of the user
                logger.info(IDLOG, 'emit event "updateNewPostit" to the recipient user "' + recipient + '"');

                if (wsServer.sockets.sockets[socketId]) { wsServer.sockets.sockets[socketId].emit('updateNewPostit', list); }
                if (wssServer.sockets.sockets[socketId]) { wssServer.sockets.sockets[socketId].emit('updateNewPostit', list); }
            }
        }

        // emit the "newPostitCounter". The event only contains the number of new post-it of a user. So it is
        // sent to all users without any authorization checking
        for (socketId in wsid) {

            username = wsid[socketId].username;

            // emits the event with the number of new post-it of the recipient user
            logger.info(IDLOG, 'emit event "newPostitCounter" ' + list.length + ' to recipient user "' + username + '"');

            if (wsServer.sockets.sockets[socketId]) { wsServer.sockets.sockets[socketId].emit('newPostitCounter', { user: recipient, counter: list.length }); }
            if (wssServer.sockets.sockets[socketId]) { wssServer.sockets.sockets[socketId].emit('newPostitCounter', { user: recipient, counter: list.length }); }
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
        wsServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('endpointPresenceUpdate', endpoint);
        wssServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('endpointPresenceUpdate', endpoint);

        wsServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('endpointPresenceUpdate', endpoint);
        wssServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('endpointPresenceUpdate', endpoint);

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

        // cycle in each websocket to send the event about an extension update. If the websocket user
        // is associated with the extension or the user has the privacy permission disabled, then it
        // sends the update with clear number, otherwise the number is obfuscated to respect the privacy authorization
        var sockid, username;
        for (sockid in wsid) {

            username = wsid[sockid].username;

            // checks if the user has the privacy enabled. In case the user has the "privacy" and
            // "admin_queues" permission enabled, then the privacy is bypassed for all the calls
            // that pass through a queue, otherwise all the calls are obfuscated
            if (   compAuthorization.isPrivacyEnabled(username)           === true
                && compAuthorization.authorizeOpAdminQueuesUser(username) === false) {

                if (wsServer.sockets.sockets[sockid])  { wsServer.sockets.sockets[sockid].emit('extenUpdate', exten.toJSON(privacyStrReplace, privacyStrReplace));  }
                if (wssServer.sockets.sockets[sockid]) { wssServer.sockets.sockets[sockid].emit('extenUpdate', exten.toJSON(privacyStrReplace, privacyStrReplace)); }

            } else if (   compAuthorization.isPrivacyEnabled(username)           === true
                       && compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                if (wsServer.sockets.sockets[sockid])  { wsServer.sockets.sockets[sockid].emit('extenUpdate', exten.toJSON(privacyStrReplace));  }
                if (wssServer.sockets.sockets[sockid]) { wssServer.sockets.sockets[sockid].emit('extenUpdate', exten.toJSON(privacyStrReplace)); }

            } else {
                if (wsServer.sockets.sockets[sockid])  { wsServer.sockets.sockets[sockid].emit('extenUpdate', exten.toJSON()); }
                if (wssServer.sockets.sockets[sockid]) { wssServer.sockets.sockets[sockid].emit('extenUpdate', exten.toJSON()); }
            }
        }
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
        wsServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('queueMemberUpdate', member.toJSON());
        wssServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('queueMemberUpdate', member.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        wsServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('queueMemberUpdate', member.toJSON(privacyStrReplace));
        wssServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('queueMemberUpdate', member.toJSON(privacyStrReplace));

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
        wsServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('trunkUpdate', trunk.toJSON());
        wssServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_CLEAR).emit('trunkUpdate', trunk.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        wsServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('trunkUpdate', trunk.toJSON(privacyStrReplace));
        wssServer.sockets.in(WS_ROOM.EXTENSIONS_AST_EVT_PRIVACY).emit('trunkUpdate', trunk.toJSON(privacyStrReplace));

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
* @param  {object} callerIdentity The identity of the caller to be filtered
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

            username = wsid[socketId].username;

            // the user is associated with the ringing extension and is logged in
            if (users.indexOf(username) !== -1) {

                filteredCallerIdentity = getFilteredCallerIndentity(username, data.callerIdentity);

                // emits the event with the caller identity data
                logger.info(IDLOG, 'emit event extenRinging for extension ' + data.dialingExten + ' to user "' + username + '" with the caller identity');

                if (wsServer.sockets.sockets[socketId]) { wsServer.sockets.sockets[socketId].emit('extenRinging', filteredCallerIdentity); }
                if (wssServer.sockets.sockets[socketId]) { wssServer.sockets.sockets[socketId].emit('extenRinging', filteredCallerIdentity); }
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
        wsServer.sockets.in(WS_ROOM.QUEUES_AST_EVT_CLEAR).emit('queueUpdate', queue.toJSON());
        wssServer.sockets.in(WS_ROOM.QUEUES_AST_EVT_CLEAR).emit('queueUpdate', queue.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        wsServer.sockets.in(WS_ROOM.QUEUES_AST_EVT_PRIVACY).emit('queueUpdate', queue.toJSON(privacyStrReplace));
        wssServer.sockets.in(WS_ROOM.QUEUES_AST_EVT_PRIVACY).emit('queueUpdate', queue.toJSON(privacyStrReplace));

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
        wsServer.sockets.in(WS_ROOM.PARKINGS_AST_EVT_CLEAR).emit('parkingUpdate', parking.toJSON());
        wssServer.sockets.in(WS_ROOM.PARKINGS_AST_EVT_CLEAR).emit('parkingUpdate', parking.toJSON());

        // emits the event with hide numbers to all users with privacy enabled
        wsServer.sockets.in(WS_ROOM.PARKINGS_AST_EVT_PRIVACY).emit('parkingUpdate', parking.toJSON(privacyStrReplace));
        wssServer.sockets.in(WS_ROOM.PARKINGS_AST_EVT_PRIVACY).emit('parkingUpdate', parking.toJSON(privacyStrReplace));

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Customize the privacy used to hide phone numbers by a configuration file.
* The file must use the JSON syntax.
* ...............
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.error(path + ' does not exist');
            return;
        }

        logger.info(IDLOG, 'configure remote sites by file ' + path);

        // read configuration file
        var json = require(path);

        // check the file content
        if (typeof json !== 'object') {
            logger.error(IDLOG, path + ' invalid content');
            return;
        }
        remoteSites = json;

        // set the listener for the websocket communication module
        setComNethctiWsListeners();

        logger.info(IDLOG, 'remote sites configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the websocket communication component.
*
* @method setComNethctiWsListeners
* @private
*/
function setComNethctiWsListeners() {
    try {
        // check component object
        if (!compComNethctiWs || typeof compComNethctiWs.on !== 'function') {
            throw new Error('wrong websocket communication object');
        }

        compComNethctiWs.on(compComNethctiWs.EVT_WSS_CLIENT_CONNECTED, wssConnHdlr);
//        compComNethctiWs.on(compComNethctiWs.EVT_WS_CLIENT_LOGGEDIN,          checkQueueAutoLogin);
//        compComNethctiWs.on(compComNethctiWs.EVT_WS_CLIENT_LOGGEDIN,          checkAutoDndOffLogin);
//        compComNethctiWs.on(compComNethctiWs.EVT_ALL_WS_CLIENT_DISCONNECTION, checkQueueAutoLogout);
//        compComNethctiWs.on(compComNethctiWs.EVT_ALL_WS_CLIENT_DISCONNECTION, checkAutoDndOnLogout);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Does login operation through websocket to a remote site.
*
* @method wssLogin
* @param {object} clientWss                 The client socket connected to remote site
*   @param {string} clientWss.ctiTokenAuthe The authentication token
* @param {string} user                      The username
* @param {string} hostname                  The remote hostname
* @private
*/
function wssLogin(clientWss, user, hostname) {
    try {
        if (typeof clientWss !== 'object'  ||
            typeof user      !== 'string'  ||
            typeof hostname  !== 'string'  ||
            typeof clientWss.ctiTokenAuthe !== 'string') {

            throw new Error('wrong parameters');
        }
        logger.info(IDLOG, 'client wss login to "' + hostname + '" by user "' + user + '" with token');
        clientWss.emit('login', { accessKeyId: user, token: clientWss.ctiTokenAuthe });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Does a generic rest api the login through the rest api to obtain a nonce to
* construct the authentication token.
*
* @method restApi
* ......................
* @param {string}   site     The remote site name
* @param {string}   url      The url to be invoked
* @param {string}   method   The request method (GET or POST)
* @param {object}   headers  The headers of the request
* @param {object}   data     The data to be passed
* @param {function} cb       The callback function
* @private
*/
function restApi(site, url, method, headers, data, cb) {
    try {
        // check arguments
        if (typeof url !== 'string' || typeof site !== 'string' ||
            (method  !== 'get' && method !== 'GET' && method !== 'post' && method !== 'POST') ||
            (headers && typeof headers !== 'object') ||
            (data    && typeof data    !== 'object') ||
            typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'rest api call ' + url);

        // check headers
        var headers = headers ? headers : {};
        headers.nethcti_remote = true;
        // add authentication header if the client has already logged in to the remote site
        if (remoteSites[site] &&
            typeof remoteSites[site].user     === 'string' &&
            typeof remoteSites[site].hostname === 'string' &&
            wssClients[remoteSites[site].user]             &&
            typeof wssClients[remoteSites[site].user].ctiTokenAuthe){

            headers.Authorization = remoteSites[site].user + ':' + wssClients[remoteSites[site].user].ctiTokenAuthe;
        }

        var opts = {
            url:     url,
            method:  method,
            headers: headers
        };
        // check data
        if (data) { opts.form = data; }

        request(opts, function (err, res, body) {
            if (err) {
                var str = url + ' error: ' + err;
                logger.error(IDLOG, str);
            }
            else if (res.statusCode !== 200 &&
                        !(res.statusCode === 401 && res.headers['www-authenticate'])) {

                logger.warn(IDLOG, url + ' failed as user "' + remoteSites[site].user + '": res.statusCode ' + res.statusCode);
            }
            cb(err, res, body);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Does the login through the rest api to obtain a nonce to
* construct the authentication token.
*
* @method clientRestApiLogin
* @param {object} clientWss The client websocket socket secure connected to remote site
* @param {string} site      The remote site name
* @private
*/
function clientRestApiLogin(clientWss, site) {
    try {
        if (typeof clientWss !== 'object' || typeof site !== 'string') {
            throw new Error('wrong parameters');
        }
        var hostname = remoteSites[site].hostname;
        var user     = remoteSites[site].user;
        var password = remoteSites[site].password;
        var url      = REST_PROTO + '://' + hostname + '/webrest/authentication/remotelogin';
        var headers  = { 'Content-Type': 'application/x-www-form-urlencoded' };
        var data = {
            username: user,
            password: password
        };
        restApi(site, url, 'POST', headers, data, function (err, res, body) {
            if (!err &&
                res.statusCode === 401 &&
                res.headers['www-authenticate']) {

                var nonce = res.headers['www-authenticate'].split('Digest');
                logger.info(IDLOG, 'received nonce for authentication from "' + hostname + '" for user "' + user + '"');
                nonce = (nonce.length > 1 ? nonce[1].trim() : undefined);
                var token = compAuthe.calculateToken(user, password, nonce);
                logger.info(IDLOG, 'created authentication token for "' + hostname + '" by user "' + user + '"');
                clientWss.ctiTokenAuthe = token;
                wssLogin(clientWss, user, hostname);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Check if the user is an authenticated remote site that has already logged in.
*
* @method getSiteName
* @param  {string} username The username of the remote site
* @param  {string} token    The authentication token used by remote site
* @return {string} The name of the remote site.
*/
function getSiteName(username, token) {
    try {
        // check arguments
        if (typeof username !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameters');
        }
        var sid;
        for (sid in wsid) {
            if (wsid[sid] &&
                wsid[sid].username === username &&
                wsid[sid].token    === token    &&
                typeof wsid[sid].siteName === 'string') {

                return wsid[sid].siteName;
                break;
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Check if the user is an authenticated remote site that has already logged in.
*
* @method isClientRemote
* @param  {string}  username The username of the remote site
* @param  {string}  token    The authentication token used by remote site
* @return {boolean} True if the remote site username has already logged in.
*/
function isClientRemote(username, token) {
    try {
        // check arguments
        if (typeof username !== 'string' || typeof token !== 'string') {
            throw new Error('wrong parameters');
        }
        var sid;
        for (sid in wsid) {
            if (wsid[sid] &&
                wsid[sid].username === username &&
                wsid[sid].token    === token) {

                return true;
                break;
            }
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Returns the perator panel extensions of all remote sites.
*
* @method getAllRemoteSitesOperatorExtensions
* @return {object} Operator panel extensions of all remote sites.
*/
function getAllRemoteSitesOperatorExtensions() {
    try {
        return allSitesOpExtensions;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the perator panel groups of all remote sites.
*
* @method getAllRemoteSitesOperatorGroups
* @return {object} Operator panel groups of all remote sites.
*/
function getAllRemoteSitesOperatorGroups() {
    try {
        return allSitesOpGroups;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all the extensions from the specified remote site.
*
* @method restApiSiteOpExtensions
* @param {string} site The remote site name
* @private
*/
function restApiSiteOpExtensions(site) {
    try {
        // check argument
        if (typeof site !== 'string') {
            throw new Error('wrong parameter');
        }

        var url = REST_PROTO + '://' + remoteSites[site].hostname + '/webrest/astproxy/extensions';
        restApi(site, url, 'GET', undefined, undefined, function (err, res, body) {
            try {
                var results = JSON.parse(body);
                if (typeof results !== 'object') {
                    logger.warn(IDLOG, 'received bad results getting op extensions of remote site "' + site + '": body =' + body);
                    return;
                }

                if (Object.keys(results).length === 0) {
                    logger.info(IDLOG, 'received 0 op extensions of remote site "' + site + '"');
                }
                else {
                    logger.info(IDLOG, 'received ' + Object.keys(results).length +
                                       ' op extensions of remote site "' + site + '": "' + Object.keys(results) + '"');
                    allSitesOpExtensions[site] = results;
                }
            } catch (err) {
                logger.error(IDLOG, 'received bad results getting op extensions of remote site "' + site + '": body =' + body);
                logger.error(IDLOG, err.stack);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all the operator group panels from the specified remote site.
*
* @method restApiSiteOpGroups
* @param {string} site The remote site name
* @private
*/
function restApiSiteOpGroups(site) {
    try {
        // check argument
        if (typeof site !== 'string') {
            throw new Error('wrong parameter');
        }

        var url = REST_PROTO + '://' + remoteSites[site].hostname + '/webrest/astproxy/opgroups';
        restApi(site, url, 'GET', undefined, undefined, function (err, res, body) {
            try {
                var results = JSON.parse(body);
                if (typeof results !== 'object') {
                    logger.warn(IDLOG, 'received bad results getting op groups of remote site "' + site + '": body =' + body);
                    return;
                }

                if (Object.keys(results).length === 0) {
                    logger.info(IDLOG, 'received 0 op groups of remote site "' + site + '"');
                }
                else {
                    logger.info(IDLOG, 'received ' + Object.keys(results).length +
                                       ' op groups of remote site "' + site + '": "' + Object.keys(results) + '"');
                    allSitesOpGroups[site] = results;
                }
            } catch (err) {
                logger.error(IDLOG, 'received bad results getting op groups of remote site "' + site + '": body =' + body);
                logger.error(IDLOG, err.stack);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a client websocket disconnection.
*
* @method clientWssDisconnectHdlr
* @param {string} site The site name
* @private
*/
function clientWssDisconnectHdlr(site) {
    try {
        if (typeof site !== 'string') { throw new Error('wrong parameters'); }
        logger.warn(IDLOG, 'client wss disconnected from site "' + site + '" "' + remoteSites[site].hostname + '"');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a failed login operation through client websocket.
*
* @method clientWss401Hdlr
* @param {object} data The data received from the event
* @param {string} site The site name
* @private
*/
function clientWss401Hdlr(data, site) {
    try {
        if (typeof data !== 'object' || typeof site !== 'string') {
            throw new Error('wrong parameters');
        }
        logger.warn(IDLOG, 'client wss login failed to site "' + site + '" "' + remoteSites[site].hostname + '"');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a successful logged in through a client websocket.
*
* @method clientWssLoggedInHdlr
* @param {object} data     The data received from the event
* @param {object} clSocket The client socket connected to remote site
*   @param {string} clSocket.ctiTokenAuthe The 
* @param {string} site     The site name
* @private
*/
function clientWssLoggedInHdlr(data, clSocket, site) {
    try {
        if (typeof clSocket !== 'object' ||
            typeof data     !== 'object' ||
            typeof site     !== 'string') {

            throw new Error('wrong parameters');
        }
        logger.info(IDLOG, 'client wss logged in successfully to site "' + site + '" "' + remoteSites[site].hostname + '"');
        wssClients[remoteSites[site].user] = clSocket;
        logger.info(IDLOG, 'authenticated client websocket to site "' + site + '" added in memory');

        restApiSiteOpGroups(site);
        restApiSiteOpExtensions(site);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates the websocket servers (http and https) and adds the listeners for other components.
*
* @method start
*/
function start() {
    try {
        if (Object.keys(remoteSites).length === 0) {
            logger.info(IDLOG, 'no remote sites configured');
            return;
        }

        https.globalAgent.options.rejectUnauthorized = false;

        var opts = {
            agent: https.globalAgent,
            timeout: CONNECTION_TIMEOUT,
            reconnection: true,
            randomizationFactor: 0.5,
            reconnectionDelayMax: MAX_RECONNECTION_DELAY,
            query: 'type=remote'
        };
        var site, address;

        // try to connect to all remote sites
        for (site in remoteSites) {

            if (typeof remoteSites[site].hostname !== 'string' ||
                typeof remoteSites[site].port     !== 'string' ||
                typeof remoteSites[site].user     !== 'string' ||
                typeof remoteSites[site].prefix   !== 'string' ||
                typeof remoteSites[site].password !== 'string') {

                logger.warn(IDLOG, 'wrong configuration for remote site "' + site + '": skipped');
                continue;
            }

            // websocket connection
            address  = 'https://' + remoteSites[site].hostname + ':' + remoteSites[site].port;
            logger.info(IDLOG, 'wss connecting to remote site "' + site + '" ' + address);
            var clientWss = ioClient.connect(address, opts);
            clientWss.on('connect', function () {
                logger.info(IDLOG, 'wss connected to remote site "' + site + '" ' + address);
                clientRestApiLogin(clientWss, site);
            });
            clientWss.on('authe_ok',   function (data) { clientWssLoggedInHdlr(data, clientWss, site); });
            clientWss.on('401',        function (data) { clientWss401Hdlr(data, site);  });
            clientWss.on('disconnect', function ()     { clientWssDisconnectHdlr(site); });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the token expiration of all users that are connected by websocket (http and https).
*
* @method updateTokenExpirationOfAllWebsocketUsers
* @private
*/
function updateTokenExpirationOfAllWebsocketUsers() {
    try {
        logger.info(IDLOG, 'update token expiration of all websocket users (http and https)');

        var id;
        for (id in wsid) { compAuthe.updateTokenExpires(wsid[id].username, wsid[id].token); }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Websocket secure (https) connection handler.
*
* @method wssConnHdlr
* @param {object} socket The client websocket.
* @private
*/
function wssConnHdlr(socket) {
    try {
        // manage client wss connection only if it comes from a remote site
        if (socket.manager &&
            socket.manager.handshaken &&
            socket.manager.handshaken[socket.id] &&
            socket.manager.handshaken[socket.id].query &&
            socket.manager.handshaken[socket.id].query.type === 'remote') {

            logger.info(IDLOG, 'new remote websocket connection (https) from ' + getWebsocketEndpoint(socket));
            // set the listeners for the new https socket connection
            socket.on('login',      function (data) { loginHdlr(socket, data); });
            socket.on('disconnect', function (data) { disconnHdlr(socket);     });
            logger.info(IDLOG, 'listeners for new https websocket connection have been set');
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
* @param {object} data   The data passed by the client
*   @param {string} data.accessKeyId The username of the account
*   @param {string} data.token       The token received by the authentication REST request
* @private
*/
function loginHdlr(socket, obj) {
    try {
        // check parameters
        if (typeof socket          !== 'object' ||
            typeof obj             !== 'object' ||
            typeof obj.token       !== 'string' ||
            typeof obj.accessKeyId !== 'string') {

            logger.warn(IDLOG, 'bad authentication login request from ' + getWebsocketEndpoint(socket));
            unauthorized(socket);
            return;
        }

        if (compAuthe.verifyToken(obj.accessKeyId, obj.token, true) === true) { // user successfully authenticated

            logger.info(IDLOG, 'user "' + obj.accessKeyId + '" successfully authenticated from ' + getWebsocketEndpoint(socket) +
                               ' with socket id ' + socket.id);

            // add websocket id for future fast authentication for each request from the clients
            var siteName = compAuthe.getRemoteSiteName(obj.accessKeyId, obj.token);
            addWebsocketId(obj.accessKeyId, obj.token, socket.id, siteName);

            // sets the socket object that will contains the cti data
            if (!socket.nethcti) { socket.nethcti = {}; }

            // sets username property to the client socket
            socket.nethcti.username = obj.accessKeyId;

            // send authenticated successfully response
            sendAutheSuccess(socket);

            /*

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
            if (compAuthorization.authorizeOpQueuesUser(obj.accessKeyId) === true
                || compAuthorization.authorizeOpAdminQueuesUser(obj.accessKeyId) === true) {

                if (   compAuthorization.isPrivacyEnabled(obj.accessKeyId)           === true
                    && compAuthorization.authorizeOpAdminQueuesUser(obj.accessKeyId) === false) {
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

            // emits the event for a logged in client. This event is emitted when a user has been logged in by a websocket connection
            logger.info(IDLOG, 'emit event "' + EVT_WS_CLIENT_LOGGEDIN + '" for username "' + obj.accessKeyId + '"');
            emitter.emit(EVT_WS_CLIENT_LOGGEDIN, obj.accessKeyId);
            */

        } else { // authentication failed
            logger.warn(IDLOG, 'authentication failed for user "' + obj.accessKeyId + '" from ' + getWebsocketEndpoint(socket) +
                               ' with id ' + socket.id);
            unauthorized(socket);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        unauthorized(socket);
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
        var username;

        // when the user is not authenticated but connected by websocket,
        // the "socket.id" is not present in the "wsid" property
        if (wsid[socket.id]) {

            var sid;
            var count = 0; // counter of the user socket connections that involve cti application
            username  = wsid[socket.id].username;

            // count the number of cti sockets for the user from both websocket secure and not
            for (sid in wssServer.sockets.sockets) {

                if (   wssServer.sockets.sockets[sid].nethcti
                    && wssServer.sockets.sockets[sid].nethcti.username  === username
                    && wssServer.sockets.sockets[sid].nethcti.userAgent === USER_AGENT) {

                    count += 1;
                }
            }
            for (sid in wsServer.sockets.sockets) {

                if (   wsServer.sockets.sockets[sid].nethcti
                    && wsServer.sockets.sockets[sid].nethcti.username  === username
                    && wsServer.sockets.sockets[sid].nethcti.userAgent === USER_AGENT) {

                    count += 1;
                }
            }

            // set the offline cti presence only if the socket is the last and comes from the cti application
            if (socket.nethcti.userAgent === USER_AGENT // the socket connection comes from the cti application
                && count === 1) {                       // only last socket connection is present

                username = wsid[socket.id].username;
                compUser.setNethctiPresence(username, 'desktop', compUser.ENDPOINT_NETHCTI_STATUS.offline);
                logger.info(IDLOG, '"' + compUser.ENDPOINT_NETHCTI_STATUS.offline + '" cti desktop presence has been set for user "' + username + '"');

                // emits the event for the disconnected client. This event is emitted when
                // all the websocket connections of the user has been closed.
                logger.info(IDLOG, 'emit event "' + EVT_ALL_WS_CLIENT_DISCONNECTION + '" for username ' + username);
                emitter.emit(EVT_ALL_WS_CLIENT_DISCONNECTION, username);
            }
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
            var userTemp  = wsid[socketId].username;
            var tokenTemp = wsid[socketId].token;
            delete wsid[socketId];
            logger.info(IDLOG, 'removed client websocket ' + socketId + ' for the user ' + userTemp + ' with token ' + tokenTemp);
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
* @param {string} user     The user used as key
* @param {string} token    The access token
* @param {string} socketId The client websocket identifier to store in the memory
* @param {string} siteName The remote site name
* private
*/
function addWebsocketId(user, token, socketId, siteName) {
    try {
        wsid[socketId] = { username: user, token: token, siteName: siteName };
        logger.info(IDLOG, 'added client websocket identifier ' + socketId + ' for user ' + user + ' of remote site "' + siteName + '" with token ' + token);

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
        logger.warn(IDLOG, 'send 401 unauthorized to ' + getWebsocketEndpoint(socket));
        socket.emit('401', { message: 'unauthorized access' });
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
        logger.info(IDLOG, 'sent authorized successfully to "' + socket.nethcti.username + '" ' + getWebsocketEndpoint(socket) + ' with id ' + socket.id);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the number of connected clients.
*
* @method getNumConnectedClients
* @param {number} The number of connected clients.
* @private
*/
function getNumConnectedClients() {
    try {
        return Object.keys(wsid).length;
    } catch (err) {
        logger.error(IDLOG, err.stack);
        return -1;
    }
}

/**
* Subscribe a callback function to a custom event fired by this object.
* It's the same of nodejs _events.EventEmitter.on_ method.
*
* @method on
* @param {string} type The name of the event
* @param {function} cb The callback to execute in response to the event
* @return {object} A subscription handle capable of detaching that subscription.
*/
function on(type, cb) {
    try {
        return emitter.on(type, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.on                              = on;
exports.start                           = start;
exports.config                          = config;
exports.setAuthe                        = setAuthe;
exports.setLogger                       = setLogger;
exports.setAstProxy                     = setAstProxy;
exports.setCompUser                     = setCompUser;
exports.getSiteName                     = getSiteName;
exports.setCompPostit                   = setCompPostit;
exports.isClientRemote                  = isClientRemote;
exports.setCompVoicemail                = setCompVoicemail;
exports.setCompComNethctiWs             = setCompComNethctiWs;
exports.setCompAuthorization            = setCompAuthorization;
exports.getNumConnectedClients          = getNumConnectedClients;
exports.EVT_WS_CLIENT_LOGGEDIN          = EVT_WS_CLIENT_LOGGEDIN;
exports.EVT_ALL_WS_CLIENT_DISCONNECTION = EVT_ALL_WS_CLIENT_DISCONNECTION;
exports.getAllRemoteSitesOperatorGroups = getAllRemoteSitesOperatorGroups;
exports.getAllRemoteSitesOperatorExtensions = getAllRemoteSitesOperatorExtensions;
