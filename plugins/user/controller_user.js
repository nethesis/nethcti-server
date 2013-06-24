/**
* Provides the user functions.
*
* @module controller_user
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
    // check parameter
    if (typeof data !== 'object'
        ||  typeof data.type !== 'string'
        || (typeof data.type === 'file' && typeof data.path !== 'string')) {

        throw new TypeError('wrong parameter');
    }

    if (data.type === 'file') { configByFile(data.path); }
}

/**
* It's emitted when the creation of the _User_ objects is completed.
*
* @event users_ready
*/

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
        if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

        // read JSON file with the user/endpoint associations
        var json = require(path);

        // initialize user objects
        var userid, newuser;
        for (userid in json) { // cycle users

            // add new user in memory
            newuser = new User(userid);
            users[userid] = newuser;
            logger.info(IDLOG, 'new user "' + newuser.getUsername() + '" has been created');
        }

        // emit the event for tell to other modules that the user objects are ready
        emitter.emit('users_ready');
        logger.info(IDLOG, '"user_ready" event emitted');
        logger.info(IDLOG, Object.keys(users).length + ' users has been created');

        // set endpoints to the users
        initializeEndpointsUsersByJSON(json);
        logger.info(IDLOG, 'configuration ended');

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
        if (typeof userid !== 'string'
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
* @return {object} The configurations of the user or an empty object if some
*   problem occurs.
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
* @return {object} The authorization of the user or undefined value if the user not exists.
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
            throw new Error('no user "' + username + '" is present');
        }

        var ext;
        var obj = users[username].getEndpointExtensions();
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
        var evms = users[username].getEndpointVoicemails();

        if (typeof evms !== 'object') {
            throw new Error('wrong voicemail endpoint result for user "' + username + '"');
        }

        return Object.keys(evms);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        throw err;
    }
}

// public interface
exports.on                   = on;
exports.config               = config;
exports.setLogger            = setLogger;
exports.getVoicemailList     = getVoicemailList;
exports.setAuthorization     = setAuthorization;
exports.getAuthorization     = getAuthorization;
exports.getConfigurations    = getConfigurations;
exports.setConfigurations    = setConfigurations;
exports.hasExtensionEndpoint = hasExtensionEndpoint;
