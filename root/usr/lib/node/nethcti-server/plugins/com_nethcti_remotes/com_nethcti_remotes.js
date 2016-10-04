/**
* Communicates in real time mode with remote sites using secure websocket.
*
* @module com_nethcti_remotes
* @main com_nethcti_remotes
*/

/**
* Core module that communicates with remote sites using websocket.
*
* @class com_nethcti_remotes
* @static
*/
var fs       = require('fs');
var async    = require('async');
var https    = require('https');
var request  = require('request');
var ioClient = require('socket.io-client');

/**
* Emitted to all websocket client connection on remote extension update.
*
* @event remoteExtenUpdate
* @param {object} obj The data about the remote extension
*   @param {object} obj.remoteSite The remote site name
*   @param {object} obj.data       The extension data
*/
/**
* The name of the remote extension update event.
*
* @property EVT_REMOTE_EXTEN_UPDATE
* @type string
* @default "remoteExtenUpdate"
*/
var EVT_REMOTE_EXTEN_UPDATE = 'remoteExtenUpdate';

/**
* Emitted to all websocket client connection on user endpoint presence update.
*
* @event remoteEndpointPresenceUpdate
* @param {object} data The data about the user endpoint presence
*
*/
/**
* The name of the remote endpoint presence update event.
*
* @property EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE
* @type string
* @default "remoteEndpointPresenceUpdate"
*/
var EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE = 'remoteEndpointPresenceUpdate';

/**
* Emitted to a all websocket client connection on remote site update.
*
* @event remoteSiteUpdate
* @param {object} obj The data about the remote site
*   @param {object} obj.remoteSite The remote site name
*   @param {object} obj.data       The remote site data
*/
/**
* The name of the remote site update event.
*
* @property EVT_REMOTE_SITE_UPDATE
* @type string
* @default "remoteSiteUpdate"
*/
var EVT_REMOTE_SITE_UPDATE = 'remoteSiteUpdate';

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
* Maximum delay waited between two reconnection attempts to a remote site.
* It is incremented by a random amount of time between 0 and _MAX\_RANDOM\_DELAY_.
*
* @property MAX_RECONNECTION_DELAY
* @type {number}
* @private
* @final
* @readOnly
* @default 60000
*/
var MAX_RECONNECTION_DELAY = 60000;

/**
* Maximum amount of time used to product a random number
* used for reconnection attempts.
*
* @property MAX_RANDOM_DELAY
* @type {number}
* @private
* @final
* @readOnly
* @default 5000
*/
var MAX_RANDOM_DELAY = 5000;

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
* Contains remote sites to be connected. It is populated by
* JSON configuration file.
*
* @property remoteSites
* @type {object}
* @private
*/
var remoteSites;

/**
* The asterisk proxy.
*
* @property astProxy
* @type object
* @private
*/
var astProxy;

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
* Contains all user endpoints of all remote sites.
*
* @property allSitesUserEndpoints
* @type {object}
* @default {}
* @private
*/
var allSitesUserEndpoints = {};

/**
* Contains all usernames of all remote sites.
*
* @property allSitesUsernames
* @type {object}
* @default {}
* @private
*/
var allSitesUsernames = {};

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
* Contains all client websockets logged into the remote sites.
* The keys are the remote site names and the values are the respective
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
* Contains all the secure websocket of authenticated remote sites.
* The keys are the websocket identifiers and the values are objects
* containing:
*
* * username
* * token
* * remote site name
* * socket object
*
* It is used for fast authentication for each request.
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
        if (!astProxy || typeof astProxy.on !== 'function') {
            throw new Error('wrong astProxy object');
        }
        astProxy.on(astProxy.EVT_EXTEN_CHANGED, extenChanged);

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
* component. The endpoint presence has changed, so notifies all remote sites.
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
        if (typeof username     !== 'string' ||
            typeof endpointType !== 'string' || typeof endpoint !== 'object') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'received event "' + compUser.EVT_ENDPOINT_PRESENCE_CHANGED + '" for endpoint "' + endpointType + '" of the user "' + username + '"');

        // cycle in each remote site websocket to send the event about the user endpoint presence update.
        var sockid;
        for (sockid in wsid) {

            if (wsid[sockid] && wsid[sockid].socket && wsid[sockid].socket.emit) {

                wsid[sockid].socket.emit(EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE, endpoint);
                logger.info(IDLOG, 'emit event "' + EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE + '" for endpoint "' + endpointType + '" ' +
                                   'of the user "' + username + '" to remote site "' + wsid[sockid].siteName + '"');
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _extenChanged_ event emitted by _ast\_proxy_
* component. Something has changed in the extension, so notifies
* all remote sites.
*
* @method extenChanged
* @param {object} exten The extension object
* @private
*/
function extenChanged(exten) {
    try {
        logger.info(IDLOG, 'received local event "' + astProxy.EVT_EXTEN_CHANGED + '" for extension ' + exten.getExten());

        // cycle in each remote site websocket to send the event about an extension update.
        // If the data sent has some conversations, they have phone numbers in clear text.
        var sockid;
        for (sockid in wsid) {

            if (wsid[sockid] && wsid[sockid].socket && wsid[sockid].socket.emit) {

                wsid[sockid].socket.emit(EVT_REMOTE_EXTEN_UPDATE, exten.toJSON());
                logger.info(IDLOG, 'emit event "' + EVT_REMOTE_EXTEN_UPDATE + '" of exten "' + exten.getExten() + '" to remote site "' + wsid[sockid].siteName + '"');
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the status data about the remote site.
*
* @method getRemoteSiteStatus
* @param  {string} site The remote site name
* @return {object} The status data about the remote site.
* @private
*/
function getRemoteSiteStatus(site) {
    try {
        if (typeof site !== 'string') { throw new Error('wrong parameter'); }

        // check if there is the client websocket connected to the remote site
        if (wssClients[site] &&
            wssClients[site].socket &&
            wssClients[site].socket.connected === true) {

            return { connected: true };
        }
        else {
            return { connected: false };
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Returns the list of all remote sites status data.
*
* @method getAllRemoteSites
* @return {object} The list of all remote sites status data
*/
function getAllRemoteSites() {
    try {
        var site;
        var result = {};

        for (site in remoteSites) {
            result[site] = getRemoteSiteStatus(site);
        }
        return result;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
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
        if (!fs.existsSync(path)) { throw new Error(path + ' does not exist'); }

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
* Configures the properties used by the component by a configuration file.
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

        // initialize the interval at which update the token expiration of
        // all remote sites that are connected by wss
        var expires = compAuthe.getTokenExpirationTimeout();
        updateTokenExpirationInterval = expires / 2;

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
* Does a generic rest api call.
*
* @method restApi
* @param {string}   site    The remote site name
* @param {string}   url     The url to be called
* @param {string}   method  The request method (GET or POST)
* @param {object}   headers The headers to be added to the request
* @param {object}   data    The data to be passed
* @param {function} cb      The callback function
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
            wssClients[site] &&
            typeof wssClients[site].ctiTokenAuthe){

            headers.Authorization = remoteSites[site].user + ':' + wssClients[site].ctiTokenAuthe;
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
            else if (
                      // log the warning message only if the response status code is a
                      // client or server error and it is not the authentication response
                      (res.statusCode.toString().charAt(0) === '4' || res.statusCode.toString().charAt(0) === '5') &&
                      !(res.statusCode === 401 && res.headers['www-authenticate'])
                ) {

                logger.warn(IDLOG, url + ' failed as user "' + remoteSites[site].user + '": res.statusCode ' + res.statusCode +
                                   (res.headers && res.headers.message ? (' - message: ' + res.headers.message) : ''));
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
* Returns the prefix used to call the extensions of the remote site.
*
* @method getSitePrefixCall
* @param  {string} site The name of the remote site
* @return {string} The prefix used to call the remote site.
*/
function getSitePrefixCall(site) {
    try {
        // check argument
        if (typeof site !== 'string') {
            throw new Error('wrong parameter');
        }
        if (remoteSites[site] && typeof remoteSites[site].prefix ==='string') {
            return remoteSites[site].prefix;
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the prefix of all remote sites.
*
* @method getAllSitesPrefixCall
* @return {object} The keys are the remote site names and the values the corresponding prefixes.
*/
function getAllSitesPrefixCall() {
    try {
        var site;
        var res = {};
        for (site in remoteSites) {
            res[site] = remoteSites[site].prefix;
        }
        return res;
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
* Returns the perator panel extensions of all remote sites. If "prStrReplace"
* is specified, caller numbers of conversations will be obfuscated.
*
* @method getAllRemoteSitesOperatorExtensions
* @return {string} [prStrReplace] The string used to obfuscate the call numbers
* @return {object} Operator panel extensions of all remote sites.
*/
function getAllRemoteSitesOperatorExtensions(prStrReplace) {
    try {
        if (!prStrReplace) { return allSitesOpExtensions; }
        else {
            var rsite, rexten, convid;
            var obj = JSON.parse(JSON.stringify(allSitesOpExtensions));

            // cycle all remote sites
            for (rsite in obj) {
                // cycle all extensions of a remote site
                for (rexten in obj[rsite]) {
                    // cycle all conversations of a remote extension
                    for (convid in obj[rsite][rexten].conversations) {
                        obj[rsite][rexten].conversations[convid].counterpartNum = obj[rsite][rexten].conversations[convid].counterpartNum.slice(0, -privacyStrReplace.length) + privacyStrReplace;
                        obj[rsite][rexten].conversations[convid].counterpartName = privacyStrReplace;
                    }
                }
            }
            return obj;
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the user endpoints of all remote sites.
*
* @method getAllRemoteSitesUserEndpoints
* @return {object} User endpoints of all remote sites.
*/
function getAllRemoteSitesUserEndpoints() {
    try {
        return allSitesUserEndpoints;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the usernames of all remote sites.
*
* @method getAllRemoteSitesUsernames
* @return {object} Usernames of all remote sites.
*/
function getAllRemoteSitesUsernames() {
    try {
        return allSitesUsernames;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the operator panel groups of all remote sites.
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
* Checks if a remote site exists.
*
* @method remoteSiteExists
* @return {boolean} True if the remote site exists
*/
function remoteSiteExists(site) {
    try {
        // check argument
        if (typeof site !== 'string') {
            throw new Error('wrong parameter');
        }

        if (remoteSites[site]) { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Creates a new post-it for a remote user of a remote site.
*
* @method newRemotePostit
* @param {object} data             The object with parameters
*   @param {string} data.creator   The username of the creator
*   @param {string} data.site      The remote site name
*   @param {string} data.recipient The recipient username
*   @param {string} data.text      The text of the message
* @param {string} cb               The callback function
*/
function newRemotePostit(data, cb) {
    try {
        // check arguments
        if (typeof data           !== 'object' ||
            typeof data.creator   !== 'string' || typeof data.site !== 'string' ||
            typeof data.recipient !== 'string' || typeof data.text !== 'string' ||
            typeof cb             !== 'function') {

            throw new Error('wrong parameters');
        }

        if (remoteSiteExists(data.site)) {
            var url = REST_PROTO + '://' + remoteSites[data.site].hostname + '/webrest/postit/create'
            restApi(data.site, url, 'POST', undefined, data, cb);
        }
        else {
            cb('nonexistent remote site "' + data.site + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all the user endpoints from the specified remote site.
*
* @method restApiSiteUserEndpoint
* @param {string}   site The remote site name
* @param {function} cb   The callback function
* @private
*/
function restApiSiteUserEndpoint(site, cb) {
    try {
        // check arguments
        if (typeof site !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var url = REST_PROTO + '://' + remoteSites[site].hostname + '/webrest/configmanager/alluserendpoints'
        restApi(site, url, 'GET', undefined, undefined, function (err, res, body) {
            try {
                var results = JSON.parse(body);
                if (typeof results !== 'object') {
                    logger.warn(IDLOG, 'received bad results getting user endpoints of remote site "' + site + '": body =' + body);
                    cb('wrong results');
                    return;
                }

                if (Object.keys(results).length === 0) {
                    logger.info(IDLOG, 'received 0 user endpoints of remote site "' + site + '"');
                }
                else {
                    logger.info(IDLOG, 'received ' + Object.keys(results).length +
                                       ' user endpoints of remote site "' + site + '": "' + Object.keys(results) + '"');
                    allSitesUserEndpoints[site] = results;
                }
                cb();
            } catch (err) {
                logger.error(IDLOG, 'received bad results getting user endpoints of remote site "' + site + '": body =' + body);
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the usernames from the specified remote site.
*
* @method restApiSiteUsernames
* @param {string}   site The remote site name
* @param {function} cb   The callback function
* @private
*/
function restApiSiteUsernames(site, cb) {
    try {
        // check arguments
        if (typeof site !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var url = REST_PROTO + '://' + remoteSites[site].hostname + '/webrest/configmanager/usernames'
        restApi(site, url, 'GET', undefined, undefined, function (err, res, body) {
            try {
                var results = JSON.parse(body);
                if (typeof results !== 'object') {
                    logger.warn(IDLOG, 'received bad results getting usernames of remote site "' + site + '": body =' + body);
                    cb('wrong results');
                    return;
                }

                if (Object.keys(results).length === 0) {
                    logger.info(IDLOG, 'received 0 usernames of remote site "' + site + '"');
                }
                else {
                    logger.info(IDLOG, 'received ' + Object.keys(results).length +
                                       ' usernames of remote site "' + site + '": "' + Object.keys(results) + '"');
                    allSitesUsernames[site] = results;
                }
                cb();
            } catch (err) {
                logger.error(IDLOG, 'received bad results getting usernames of remote site "' + site + '": body =' + body);
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the extensions from the specified remote site.
*
* @method restApiSiteOpExtensions
* @param {string}   site The remote site name
* @param {function} cb   The callback function
* @private
*/
function restApiSiteOpExtensions(site, cb) {
    try {
        // check arguments
        if (typeof site !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var url = REST_PROTO + '://' + remoteSites[site].hostname + '/webrest/astproxy/extensions';
        restApi(site, url, 'GET', undefined, undefined, function (err, res, body) {
            try {
                var results = JSON.parse(body);
                if (typeof results !== 'object') {
                    logger.warn(IDLOG, 'received bad results getting op extensions of remote site "' + site + '": body =' + body);
                    cb('wrong results');
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
                cb();
            } catch (err) {
                logger.error(IDLOG, 'received bad results getting op extensions of remote site "' + site + '": body =' + body);
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the operator group panels from the specified remote site.
*
* @method restApiSiteOpGroups
* @param {string}   site The remote site name
* @param {function} cb   The callback function
* @private
*/
function restApiSiteOpGroups(site, cb) {
    try {
        // check arguments
        if (typeof site !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var url = REST_PROTO + '://' + remoteSites[site].hostname + '/webrest/astproxy/opgroups';
        restApi(site, url, 'GET', undefined, undefined, function (err, res, body) {
            try {
                var results = JSON.parse(body);
                if (typeof results !== 'object') {
                    logger.warn(IDLOG, 'received bad results getting op groups of remote site "' + site + '": body =' + body);
                    cb('wrong results');
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
                cb();
            } catch (err) {
                logger.error(IDLOG, 'received bad results getting op groups of remote site "' + site + '": body =' + body);
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Handler for a client websocket connecting.
*
* @method clientWssConnecting
* @param {string} site    The remote site name
* @param {string} address The remote site address
* @private
*/
function clientWssConnecting(site, address) {
    try {
        logger.warn(IDLOG, 'client wss connecting to remote site "' + site + '" "' + address + '"');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns a random integer between min (included) and max (included)
* using Math.round() will give you a non-uniform distribution!
*
* @method getRandomIntInclusive
* @param  {number} min Start interval number
* @param  {number} max End interval number
* @return {number} A random integer number between min (included) and max (included)
* @private
*/
function getRandomIntInclusive(min, max) {
    try {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a client websocket reconnection
*
* @method clientWssReconnecting
* @param {string} site      The remote site name
* @param {string} address   The remote site address
* @param {object} clientWss The client websocket secure
* @private
*/
function clientWssReconnecting(site, address, clientWss) {
    try {
        clientWss.ctiReconnectAttempts += 1;
        var delay = MAX_RECONNECTION_DELAY + getRandomIntInclusive(0, MAX_RANDOM_DELAY);
        logger.warn(IDLOG, 'client wss reconnecting to remote site "' + site + '" "' + address + '": ' +
                           'delay "' + delay + '" msec attempt #' + clientWss.ctiReconnectAttempts);
        clientWss.socket.reconnectionDelay = delay;
        clientWss.socket.reconnectionAttempts -= 1;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a client websocket reconnection.
*
* @method clientWssReconnect
* @param {string} site      The remote site name
* @param {string} address   The remote site address
* @param {object} clientWss The client websocket secure
* @private
*/
function clientWssReconnect(site, address, clientWss) {
    try {
        logger.warn(IDLOG, 'client wss reconnection success to remote site "' + site + '" "' + address + '": attempt #' + clientWss.ctiReconnectAttempts);
        clientWss.ctiReconnectAttempts = 0;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a client websocket error.
*
* @method clientWssError
* @param {object} err       The error object
* @param {string} site      The remote site name
* @param {string} address   The remote site address
* @param {object} clientWss The client websocket secure
* @private
*/
function clientWssError(err, site, address, clientWss) {
    try {
        clientWss.ctiReconnectAttempts = 0;
        logger.error(IDLOG, 'client wss error of remote site "' + site + '" "' + address + '": ' + err);

        // the failure of a wss connection during the boot does not start the reconnection,
        // so it is needed to restart the connection with the following. Otherwise, a disconnection
        // at runtime cause the automatic reconnection
        if (clientWss.socket.connected    === false &&
            clientWss.socket.connecting   === false &&
            clientWss.socket.reconnecting === false) {

            var delay = MAX_RECONNECTION_DELAY + getRandomIntInclusive(0, MAX_RANDOM_DELAY);
            logger.warn(IDLOG, 'try to reconnect to remote site "' + site + '" "' + address + '" in ' + delay + ' msec');
            setTimeout(function () {
                clientWss.socket.connect();
            }, delay);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a client websocket disconnection.
*
* @method clientWssDisconnectHdlr
* @param {string} site      The site name
* @param {string} address   The remote site address
* @param {object} clientWss The client websocket secure
* @private
*/
function clientWssDisconnectHdlr(site, address, clientWss) {
    try {
        if (typeof clientWss !== 'object' || typeof site !== 'string' || typeof address !== 'string') {
            throw new Error('wrong parameters');
        }
        clientWss.ctiReconnectAttempts = 0;
        logger.warn(IDLOG, 'client wss disconnected from site "' + site + '" "' + address + '"');

        logger.info(IDLOG, 'remove all info about remote site "' + site + '"');
        delete allSitesOpGroups[site];
        delete allSitesUsernames[site];
        delete allSitesOpExtensions[site];
        delete allSitesUserEndpoints[site];
        delete wssClients[site];

        sendClientWssRemoteSiteUpdateStatus(site);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates all local clients about the status data of the remote site.
*
* @method sendClientWssRemoteSiteUpdateStatus
* @param {string} site The remote site name
* @private
*/
function sendClientWssRemoteSiteUpdateStatus(site) {
    try {
        if (typeof site !== 'string') { throw new Error('wrong parameter'); }

        var data = {};
        data[site] = getRemoteSiteStatus(site);

        compComNethctiWs.sendEventToAllClients(EVT_REMOTE_SITE_UPDATE, data, function (username) {
            return compAuthorization.authorizeRemoteSiteUser(username);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a failed login operation through client websocket.
*
* @method clientWss401Hdlr
* @param {object} data      The data received from the event
* @param {string} site      The site name
* @param {string} address   The remote site address
* @param {object} clientWss The client websocket secure
* @private
*/
function clientWss401Hdlr(data, site, address, clientWss) {
    try {
        if (typeof data    !== 'object' || typeof site      !== 'string' ||
            typeof address !== 'string' || typeof clientWss !== 'object') {

            throw new Error('wrong parameters');
        }
        clientWss.ctiReconnectAttempts = 0;
        logger.warn(IDLOG, 'client wss login failed to site "' + site + '" "' + address + '"');
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
*   @param {string} clSocket.ctiTokenAuthe The authentication token
* @param {string} site     The site name
* @param {string} address  The remote site address
* @private
*/
function clientWssLoggedInHdlr(data, clSocket, site, address) {
    try {
        if (typeof clSocket !== 'object' || typeof address !== 'string' ||
            typeof data     !== 'object' || typeof site    !== 'string') {

            throw new Error('wrong parameters');
        }
        logger.warn(IDLOG, 'client wss logged in successfully to site "' + site + '" "' + address + '"');

        clSocket.on(EVT_REMOTE_EXTEN_UPDATE, function (dataObj) { clientWssRemoteExtenUpdateHdlr(dataObj, site); });
        clSocket.on(EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE, function (dataObj) { clientWssRemoteEndpointPresenceUpdateHdlr(dataObj, site); });

        wssClients[site] = clSocket;
        logger.info(IDLOG, 'authenticated client websocket to site "' + site + '" added in memory');

        async.parallel([
            function (callback) {
                restApiSiteOpGroups(site, function (err) {
                    callback();
                });
            },
            function (callback) {
                restApiSiteOpExtensions(site, function (err) {
                    callback();
                });
            },
            function (callback) {
                restApiSiteUsernames(site, function (err) {
                    callback();
                });
            },
            function (callback) {
                restApiSiteUserEndpoint(site, function (err) {
                    callback();
                });
            }
        ], function () {
            sendClientWssRemoteSiteUpdateStatus(site);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler of a remote extension update received from a remote site.
*
* @method clientWssRemoteExtenUpdateHdlr
* @param {object} data The data received from the event
* @param {string} site The site name
* @private
*/
function clientWssRemoteExtenUpdateHdlr(data, site) {
    try {
        if (typeof data !== 'object' || typeof site !== 'string') {
            throw new Error('wrong parameters');
        }
        logger.info(IDLOG, 'received event "' + EVT_REMOTE_EXTEN_UPDATE + '" from remote site "' + site + '" "' + remoteSites[site].hostname + '" about exten "' + data.exten + '"');

        if (typeof data.exten === 'string' &&
            allSitesOpExtensions[site] &&
            allSitesOpExtensions[site][data.exten]) {

            allSitesOpExtensions[site][data.exten] = data;
            logger.info(IDLOG, 'updated exten "' + data.exten + '" data about remote site "' + site + '" "' + remoteSites[site].hostname + '"');

            compComNethctiWs.sendEventToAllClients(
                EVT_REMOTE_EXTEN_UPDATE,
                {
                    remoteSite: site,
                    data: data
                },
                function (username) {
                    return (compAuthorization.authorizeRemoteSiteUser(username) && compAuthorization.authorizeOpExtensionsUser(username));
                },
                function (username, clearData) {
                    if (compAuthorization.isPrivacyEnabled(username) === true &&
                        compAuthorization.verifyUserEndpointExten(username, data.exten) === false) {

                        var obfData = JSON.parse(JSON.stringify(clearData));

                        var convid;
                        for (convid in obfData.conversations) {
                            obfData.conversations[convid].counterpartNum = obfData.conversations[convid].counterpartNum.slice(0, -privacyStrReplace.length) + privacyStrReplace;
                            obfData.conversations[convid].counterpartName = privacyStrReplace;
                        }
                        return obfData;
                    }
                    else {
                        return clearData;
                    }
                }
            );
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler of a remote endpoint presence update received from a remote site.
*
* @method clientWssRemoteEndpointPresenceUpdateHdlr
* @param {object} data The data received from the event
* @param {string} site The site name
* @private
*/
function clientWssRemoteEndpointPresenceUpdateHdlr(data, site) {
    try {
        if (typeof data !== 'object' || typeof site !== 'string') {
            throw new Error('wrong parameters');
        }
        var remoteUser   = (Object.keys(data))[0];
        var endpointType = (Object.keys(data[remoteUser]))[0];

        logger.info(IDLOG, 'received event "' + EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE + '" from remote site "' + site + '" ' +
                           '"' + remoteSites[site].hostname + '" about remote user "' + remoteUser + '" of endpointType "' + endpointType + '"');

        if (allSitesUserEndpoints[site] &&
            allSitesUserEndpoints[site][remoteUser] &&
            allSitesUserEndpoints[site][remoteUser][endpointType]) {

            allSitesUserEndpoints[site][remoteUser][endpointType] = data[remoteUser][endpointType];
            logger.info(IDLOG, 'updated endpoint "' + endpointType + '" presence status of remote user "' + remoteUser + '" of remote site "' + site + '"');

            compComNethctiWs.sendEventToAllClients(EVT_REMOTE_ENDPOINT_PRESENCE_UPDATE, { remoteSite: site, data: data }, function (username) {
                return compAuthorization.authorizeRemoteSiteUser(username);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Connects to all remote sites configured.
*
* @method connectAllRemoteSites
* @private
*/
function connectAllRemoteSites() {
    try {
        if (Object.keys(remoteSites).length === 0) {
            logger.info(IDLOG, 'no remote sites configured');
            return;
        }
        https.globalAgent.options.rejectUnauthorized = false;

        var opts = {
            'transports': [ 'websocket' ],
            'connect timeout': CONNECTION_TIMEOUT,
            'try multiple transports': false,
            'reconnect': true,
            'reconnection delay': MAX_RECONNECTION_DELAY,
            'query': 'type=remote'
        };
        var site;

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
            connectRemoteSite(site, opts);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Connects to a remote sites configured.
*
* @method connectRemoteSite
* @param {string} site The remote site name
* @param {object} opts The options used by websocket connection
* @private
*/
function connectRemoteSite(site, opts) {
    try {
        var address  = 'https://' + remoteSites[site].hostname + ':' + remoteSites[site].port;
        logger.info(IDLOG, 'wss connecting to remote site "' + site + '" ' + address);
        var clientWss = ioClient.connect(address, opts);
        clientWss.ctiReconnectAttempts = 0;
        clientWss.on('connect',      function ()     { clientWssConnHdlr(clientWss, site, address); });
        clientWss.on('authe_ok',     function (data) { clientWssLoggedInHdlr(data, clientWss, site, address); });
        clientWss.on('401',          function (data) { clientWss401Hdlr(data, site, address, clientWss); });
        clientWss.on('disconnect',   function ()     { clientWssDisconnectHdlr(site, address, clientWss); });
        clientWss.on('error',        function (err)  { clientWssError(err, site, address, clientWss); });
        clientWss.on('connecting',   function ()     { clientWssConnecting(site, address); });
        clientWss.on('reconnect',    function ()     { clientWssReconnect(site, address, clientWss); });
        clientWss.on('reconnecting', function ()     { clientWssReconnecting(site, address, clientWss); });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for a client websocket connection.
*
* @method clientWssConnHdlr
* @param {object} clientWss The secure client websocket
* @param {site}   site      The remote site name
* @param {string} address   The url rest api
* @private
*/
function clientWssConnHdlr(clientWss, site, address) {
    try {
        clientWss.ctiReconnectAttempts = 0;
        logger.warn(IDLOG, 'client wss connected to remote site "' + site + '" ' + address);
        clientRestApiLogin(clientWss, site);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Starts the component connecting to all remote sites
* configured and adds the listeners for other components.
*
* @method start
*/
function start() {
    try {
        setAstProxyListeners();
        setUserListeners();
        connectAllRemoteSites();

        // start the automatic update of token expiration of all remote sites that are connected by wss.
        // The interval is the half value of expiration provided by authentication component.
        setInterval(function () {

            updateTokenExpirationOfAllWebsocketUsers();

        }, updateTokenExpirationInterval);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the token expiration of remote sites that are connected by wss.
*
* @method updateTokenExpirationOfAllWebsocketUsers
* @private
*/
function updateTokenExpirationOfAllWebsocketUsers() {
    try {
        logger.info(IDLOG, 'update token expiration of all wss remote sites');

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
            addWebsocketId(obj.accessKeyId, obj.token, socket.id, siteName, socket);

            // sets the socket object that will contains the cti data
            if (!socket.nethcti) { socket.nethcti = {}; }

            // sets username property to the client socket
            socket.nethcti.username = obj.accessKeyId;

            // send authenticated successfully response
            sendAutheSuccess(socket);

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

        if (wsid[socket.id] && wsid[socket.id].token && wsid[socket.id].username) {

            if (compAuthe.removeToken(wsid[socket.id].username, wsid[socket.id].token)) {
                logger.info(IDLOG, 'removed authentication token of remote user "' + wsid[socket.id].username + '" ' +
                                   'of remote site "' + wsid[socket.id].siteName + '"');
            }
        }
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
* @param {object} socket   The connected socket
* private
*/
function addWebsocketId(user, token, socketId, siteName, socket) {
    try {
        wsid[socketId] = { username: user, token: token, siteName: siteName, socket: socket };
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

// public interface
exports.start                           = start;
exports.config                          = config;
exports.setAuthe                        = setAuthe;
exports.setLogger                       = setLogger;
exports.setAstProxy                     = setAstProxy;
exports.setCompUser                     = setCompUser;
exports.getSiteName                     = getSiteName;
exports.configPrivacy                   = configPrivacy;
exports.setCompPostit                   = setCompPostit;
exports.isClientRemote                  = isClientRemote;
exports.newRemotePostit                 = newRemotePostit;
exports.remoteSiteExists                = remoteSiteExists;
exports.setCompVoicemail                = setCompVoicemail;
exports.getAllRemoteSites               = getAllRemoteSites;
exports.getSitePrefixCall               = getSitePrefixCall;
exports.setCompComNethctiWs             = setCompComNethctiWs;
exports.setCompAuthorization            = setCompAuthorization;
exports.getAllSitesPrefixCall           = getAllSitesPrefixCall;
exports.getNumConnectedClients          = getNumConnectedClients;
exports.getAllRemoteSitesUsernames      = getAllRemoteSitesUsernames;
exports.getAllRemoteSitesUserEndpoints  = getAllRemoteSitesUserEndpoints;
exports.getAllRemoteSitesOperatorGroups = getAllRemoteSitesOperatorGroups;
exports.getAllRemoteSitesOperatorExtensions = getAllRemoteSitesOperatorExtensions;
