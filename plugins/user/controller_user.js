/**
* Provides the user functions.
*
* @module user
* @main controller_user
*/

/**
* Provides the user functionalities.
*
* @class controller_user
* @static
*/
var fs            = require('fs');
var User          = require('./user').User;
var EventEmitter  = require('events').EventEmitter;
var endpointTypes = require('./endpoint_types');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [controller_user]
*/
var IDLOG = '[controller_user]';

/**
* Fired when the presence of an endpoint of the user changes.
*
* @event endpointPresenceChanged
* @param {string} username     The username of the endpoint owner
* @param {string} endpointType The type of the updated endpoint
* @param {object} endpoint     The updated endpoint object of the user
..
*/
/**
* The name of the user endpoint presence changed event.
*
* @property EVT_USER_ENDPOINT_CHANGED
* @type string
* @default "endpointPresenceChanged"
*/
var EVT_ENDPOINT_PRESENCE_CHANGED = 'endpointPresenceChanged';

/**
* Fired when the creation of the _User_ objects is completed.
*
* @event usersReady
*/
/**
* The name of the users ready event.
*
* @property EVT_USERS_READY
* @type string
* @default "usersReady"
*/
var EVT_USERS_READY = 'usersReady';

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
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

/**
* The list of the user objects. The keys is the user identification
* and the value is a _User_ object.
*
* @property users
* @type {object}
* @private
* @default {}
*/
var users = {};

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
* Set configuration to use and initialize the users. It can be possible
* only configuration by file.
*
* **The method can throw an Exception.**
*
* @method config
* @param {object} data
*   @param {string} data.file JSON file with the user/endpoint associations and
*                             the authorization data.
*/
function config(data) {
    try {
        // check parameter
        if (typeof data !== 'object'
            ||  typeof data.type !== 'string'
            || (typeof data.type === 'file' && typeof data.path !== 'string')) {

            throw new TypeError('wrong parameter');
        }

        if (data.type === 'file') { configByFile(data.path); }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initialize the users by file. The file must use the JSON syntax and
* must report user/endpoint associations and authorization data.
*
* **It emits _"users\_ready"_ event when the user creation is completed.**
*
* @method configByFile
* @param {string} path The path of the JSON file with the
*                      user/endpoints associations and the authorization data
* @private
*/
function configByFile(path) {
    try {
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

        // read JSON file with the user/endpoint associations
        var json = require(path);

        // initialize user objects
        var userid, newuser;
        for (userid in json) { // cycle users
            // add new user in memory
            newuser = new User(userid, json[userid].name, json[userid].surname);
            users[userid] = newuser;
            logger.info(IDLOG, 'new user "' + newuser.getUsername() + '" has been created');
        }
        logger.info(IDLOG, Object.keys(users).length + ' users has been created');

        // set endpoints to the users
        initializeEndpointsUsersByJSON(json);
        logger.info(IDLOG, 'configuration ended');

        // emit the event for tell to other modules that the user objects are ready
        logger.info(IDLOG, 'emit event "' + EVT_USERS_READY + '"');
        emitter.emit(EVT_USERS_READY);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds the endpoint objects to the user by json configuration.
*
* @method initializeEndpointsUsersByJSON
* @param {object} json The JSON configuration
* @private
*/
function initializeEndpointsUsersByJSON(json) {
    try {
        // check parameter
        if (typeof json !== 'object') { throw new Error('wrong parameter'); }

        var userid, endpoType;
        for (userid in json) { // cycle users

            // set the endpoints to the user
            for (endpoType in json[userid].endpoints) {

                // check the validity of the endpoint type
                if (endpointTypes.isValidEndpointType(endpoType) === false) {
                    logger.error(IDLOG, 'invalid endpoint type "' + endpoType + '" in json file of the users');

                } else {
                    // add all endpoints of the current type to the user
                    addEndpointsToUser(userid, endpoType, json[userid].endpoints[endpoType]);
                }
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds all endpoints to the user.
*
* @method addEndpointsToUser
* @param {object} user The user object
* @param {string} endpoType The type of the endpoint
* @param {object} obj Contains the list of the endpoints with their
*                     relative object
* @private
*/
function addEndpointsToUser(userid, endpoType, obj) {
    try {
        // check parameters
        if (   typeof userid    !== 'string'
            || typeof endpoType !== 'string' || typeof obj !== 'object') {

            throw new Error('wrong parameters');
        }

        // adds all endpoints of the specified type to the user
        var id;
        for (id in obj) { // cycle endpoints

            // actually the obj[id] is an empty object.
            // It can be useful in the future
            users[userid].addEndpoint(endpoType, id, obj[id]);
            logger.info(IDLOG, 'added endpoint "' + endpoType + ' ' + id +'" to user ' + users[userid].getUsername());
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the configurations to the specified user.
*
* **It can throw an Exception.**
*
* @method setConfigurations
* @param {string} userid The user identifier
* @param {object} config The user configurations
*/
function setConfigurations(userid, config) {
    try {
        if (typeof userid !== 'string' || typeof config !== 'object') {
            throw new Error('wrong parameters');
        }

        if (users[userid] !== undefined) { // the user exists

            users[userid].setConfigurations(config);
            logger.info(IDLOG, 'configurations has been set for user "' + userid + '"');

        } else {
            throw new Error('setting configurations of unknown user "' + userid + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        throw err;
    }
}

/**
* Gets the user configurations.
*
* @method getConfigurations
* @param {string} userid The user identifier
* @return {object} The configurations of the user or an empty object if some errors occurs.
*/
function getConfigurations(userid) {
    try {
        // check parameter
        if (typeof userid !== 'string') { throw new Error('wrong parameter'); }

        if (users[userid] !== undefined) { // the user exits

            logger.info(IDLOG, 'return configurations of user "' + userid + '"');
            return users[userid].getConfigurations();

        } else {
            throw new Error('getting configurations of unknown user "' + userid + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Sets an authorization to the specified user.
*
* @method setAuthorization
* @param {string} userid The user identifier
* @param {string} typeAutho The type of the authorization
* @param {string|array} value The value of the autorization. It can be "true" or "false"
*                              or an array of value as in the case of customer card or
*                              streaming authorizations.
*/
function setAuthorization(userid, typeAutho, value) {
    try {
        if (typeof userid !== 'string'
            || typeof typeAutho !== 'string'
            || value === undefined) {

            throw new Error('wrong parameters');
        }

        if (users[userid] !== undefined) { // the user exists

            users[userid].setAuthorization(typeAutho, value);
            logger.info(IDLOG, 'authorization ' + typeAutho + ' has been set for user ' + userid);

        } else {
            logger.error(IDLOG, 'setting authorization of unknown user "' + userid + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets an authorization of the specified user.
*
* @method getAuthorization
* @param {string} userid The user identifier
* @return {object} The authorization of the user or undefined value if the user doesn\'t exist.
*/
function getAuthorization(userid, type) {
    try {
        // check parameters
        if (typeof userid !== 'string' || typeof type !== 'string') {
            throw new Error('wrong parameters');
        }

        if (users[userid] !== undefined) { // the user exits

            return users[userid].getAuthorization(type);

        } else {
            logger.error(IDLOG, 'getting authorization "' + type + '" of unknown user "' + userid + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Emit an event. It's the same of nodejs _events.EventEmitter.emit_ method.
*
* @method emit
* @param {string} ev The name of the event
* @param {object} data The object to be emitted
*/
function emit(ev, data) {
    try {
        emitter.emit(ev, data);
    } catch (err) {
       logger.error(IDLOG, err.stack);
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

/**
* Check if the user has an extension endpoint.
*
* @method hasExtensionEndpoint
* @param {string} username The name of the user to check
* @param {string} exten The extension identifier
* @return {boolean} True if the user has the extension endpoint, false otherwise.
*/
function hasExtensionEndpoint(username, exten) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof exten !== 'string') {
            throw new Error('wrong parameters');
        }

        if (users[username] === undefined) { // the user is not present
            throw new Error('checking the user-extension endpoint association: no user "' + username + '" is present');
        }

        var ext;
        var obj = users[username].getAllEndpoints();
        obj     = obj[endpointTypes.TYPES.extension];
        for (ext in obj) {
            if (ext === exten) { return true; }
        }

        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Check if the user has the specified voicemail endpoint.
*
* @method hasVoicemailEndpoint
* @param {string} username  The name of the user to check
* @param {string} voicemail The voicemail endpoint identifier
* @return {boolean} True if the user has the voicemail endpoint, false otherwise.
*/
function hasVoicemailEndpoint(username, voicemail) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof voicemail !== 'string') {
            throw new Error('wrong parameters');
        }

        if (users[username] === undefined) { // the user is not present
            throw new Error('checking the user-voicemail endpoint association: no user "' + username + '" is present');
        }

        var vm;
        var obj = users[username].getAllEndpoints();
        obj     = obj[endpointTypes.TYPES.voicemail];
        for (vm in obj) {
            if (vm === voicemail) { return true; }
        }

        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Returns the voicemail list of the user.
*
* @method getVoicemailList
* @param {string} username The name of the user to check
* @return {array} The voicemail list of the user.
*/
function getVoicemailList(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // check the user presence
        if (users[username] === undefined) {
            throw new Error('no user "' + username + '" is present');
        }

        // get voicemail endpoints object
        var evms = users[username].getAllEndpoints();
        evms     = evms[endpointTypes.TYPES.voicemail];

        if (typeof evms !== 'object') {
            throw new Error('wrong voicemail endpoint result for user "' + username + '"');
        }

        return Object.keys(evms);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        throw err;
    }
}

/**
* Returns the endpoints of the user.
*
* @method getEndpointsJSON
* @param {string} userid The user identifier
* @return {object} The endpoints of the user in JSON format.
*/
function getEndpointsJSON(userid) {
    try {
        // check parameter
        if (typeof userid !== 'string') { throw new Error('wrong parameter'); }
        // check the user presence
        if (users[userid] === undefined) { throw new Error('no user "' + userid + '" is present'); }

        // get all endpoints of the user
        return users[userid].getAllEndpointsJSON();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        throw err;
    }
}

/**
* Returns the endpoints of all users.
*
* @method getAllUsersEndpointsJSON
* @return {object} The endpoints of all users in JSON format.
*/
function getAllUsersEndpointsJSON() {
    try {
        var obj = {};

        var keyusername;
        for (keyusername in users) {
            // get all endpoints of the user
            obj[keyusername] = users[keyusername].getAllEndpointsJSON();
        }
        return obj;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        throw err;
    }
}

/**
* Returns the list of all the usernames.
*
* @method getUsernames
* @return {array} The list of all the usernames.
*/
function getUsernames() {
    try {
        return Object.keys(users);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        return [];
    }
}

/**
* Returns the list of all the usernames with their names and surnames.
*
* @method getUsernamesWithData
* @return {object} The list of all the usernames with their names and surnames.
*/
function getUsernamesWithData() {
    try {
        var username;
        var obj = {};

        for (username in users) {

            obj[username] = {
                name:    users[username].getName(),
                surname: users[username].getSurname()
            };
        }

        return obj;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Sets the nethcti presence of the user.
*
* @method setNethctiPresence
* @param {string}  username   The username
* @param {string}  deviceType The device type used for nethcti
* @param {string}  status     The status of the nethcti presence
* @param {boolean} True if the NethCTI presence has been set successfully
*/
function setNethctiPresence(username, deviceType, status) {
    try {
        // check parameters
        if (   typeof username   !== 'string'
            || typeof status     !== 'string'
            || typeof deviceType !== 'string'
            || !endpointTypes.isValidEndpointNethctiStatus(status)
            || !endpointTypes.isValidEndpointNethctiDevice(deviceType)) {

            throw new Error('wrong parameters');
        }

        // check the user existence
        if (typeof users[username] !== 'object') {
            logger.warn(IDLOG, 'try to set nethcti presence of non existent user "' + username + '" for device "' + deviceType + '" to value ' + status);
            return false;
        }

        logger.info(IDLOG, 'set nethcti "' + deviceType + '" presence to status "' + status + '" of user "' + username + '"');

        // gets all endpoints, extracts the nethcti endpoint and then sets its status
        var endpoints = users[username].getAllEndpoints();
        endpoints[endpointTypes.TYPES.nethcti][deviceType].setStatus(status);

        // get the updated user endpoint in JSON format
        var allUsersEndpoints = getAllUsersEndpointsJSON();
        var obj = {};
        obj[username] = {};
        obj[username][endpointTypes.TYPES.nethcti] = allUsersEndpoints[username][endpointTypes.TYPES.nethcti];

        // emit the event to tell other modules that the nethcti endpoint presence of the user has changed
        logger.info(IDLOG, 'emit event "' + EVT_ENDPOINT_PRESENCE_CHANGED + '"');
        emitter.emit(EVT_ENDPOINT_PRESENCE_CHANGED, username, endpointTypes.TYPES.nethcti, obj);

        return true;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Returns all the nethcti endpoints of the user.
*
* @method getAllEndpointsNethcti
* @param  {string} username The username
* @return {object} Returns all the nethcti endpoints of the user.
*/
function getAllEndpointsNethcti(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // check the user existence
        if (typeof users[username] !== 'object') {
            logger.warn(IDLOG, 'gettings all the nethcti endpoints: the user "' + username + '" doesn\'t exist');
            return {};
        }

        // gets all endpoints, extracts the nethcti endpoint and then sets its status
        var endpoints = users[username].getAllEndpoints();
        return endpoints[endpointTypes.TYPES.nethcti];

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Returns all the extension endpoints of the user.
*
* @method getAllEndpointsExtension
* @param  {string} username The username
* @return {object} Returns all the extension endpoints of the user.
*/
function getAllEndpointsExtension(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // check the user existence
        if (typeof users[username] !== 'object') {
            logger.warn(IDLOG, 'gettings all the extension endpoints: the user "' + username + '" doesn\'t exist');
            return {};
        }

        // gets all endpoints, extracts the extension endpoints and then sets its status
        var endpoints = users[username].getAllEndpoints();
        return endpoints[endpointTypes.TYPES.extension];

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Returns all users associated with the specified extension endpoint.
*
* @method getUsersUsingEndpointExtension
* @param  {string} exten The extension endpoint identifier
* @return {array}  Returns all the users associated with the specified extension endpoint.
*/
function getUsersUsingEndpointExtension(exten) {
    try {
        // check parameter
        if (typeof exten !== 'string') { throw new Error('wrong parameter'); }

        var result = [];

        var extenKey, userExtens, username, endpoints;
        for (username in users) {

            // get all the extension endpoints of the user
            endpoints  = users[username].getAllEndpoints();
            userExtens = endpoints[endpointTypes.TYPES.extension];

            for (extenKey in userExtens) {

                if (extenKey === exten) {
                    // the user have the specified extension endpoint
                    result.push(username);
                }
            }
        }
        return result;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return [];
    }
}

/**
* Returns all users associated with the specified voicemail endpoint.
*
* @method getUsersUsingEndpointVoicemail
* @param  {string} voicemail The voicemail endpoint identifier
* @return {array}  Returns all the users associated with the specified voicemail endpoint.
*/
function getUsersUsingEndpointVoicemail(voicemail) {
    try {
        // check parameter
        if (typeof voicemail !== 'string') { throw new Error('wrong parameter'); }

        var result = [];

        var vmKey, userVms, username, endpoints;
        for (username in users) {

            // get all the voicemail endpoints of the user
            endpoints = users[username].getAllEndpoints();
            userVms   = endpoints[endpointTypes.TYPES.voicemail];

            for (vmKey in userVms) {

                if (vmKey === voicemail) {
                    // the user have the specified voicemail endpoint
                    result.push(username);
                }
            }
        }
        return result;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return [];
    }
}

// public interface
exports.on                             = on;
exports.config                         = config;
exports.setLogger                      = setLogger;
exports.getUsernames                   = getUsernames;
exports.EVT_USERS_READY                = EVT_USERS_READY;
exports.getEndpointsJSON               = getEndpointsJSON;
exports.getVoicemailList               = getVoicemailList;
exports.setAuthorization               = setAuthorization;
exports.getAuthorization               = getAuthorization;
exports.getConfigurations              = getConfigurations;
exports.setConfigurations              = setConfigurations;
exports.setNethctiPresence             = setNethctiPresence;
exports.hasExtensionEndpoint           = hasExtensionEndpoint;
exports.hasVoicemailEndpoint           = hasVoicemailEndpoint;
exports.getUsernamesWithData           = getUsernamesWithData;
exports.getAllEndpointsNethcti         = getAllEndpointsNethcti;
exports.getAllEndpointsExtension       = getAllEndpointsExtension;
exports.getAllUsersEndpointsJSON       = getAllUsersEndpointsJSON;
exports.EVT_ENDPOINT_PRESENCE_CHANGED  = EVT_ENDPOINT_PRESENCE_CHANGED;
exports.getUsersUsingEndpointExtension = getUsersUsingEndpointExtension;
exports.getUsersUsingEndpointVoicemail = getUsersUsingEndpointVoicemail;
