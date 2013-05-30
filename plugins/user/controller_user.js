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
* Initialize the users by file. The file must use the JSON syntax and
* must report user/endpoint associations and authorization data.
*
* @method configByFile
* @param {string} path The path of the JSON file with the
*                      user/endpoints associations and the authorization data
* private
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

        if (users[userid] !== undefined) { // the user doesn't exits
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

// public interface
exports.on               = on;
exports.config           = config;
exports.setLogger        = setLogger;
exports.setAuthorization = setAuthorization;
