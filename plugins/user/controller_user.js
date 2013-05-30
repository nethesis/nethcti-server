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
var fs   = require('fs');
var User = require('./user').User;
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
* Initialize the users by file. The file must use the JSON syntax.
*
* @method configByFile
* @param {string} path The path of the JSON file with the
*                      user/endpoints associations
* private
*/
function configByFile(path) {
    try {
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

        // read JSON file with the user/endpoint associations
        var json = require(path);

        var userid, newuser, endpoType;
        for (userid in json) { // cycle users
            
            newuser = new User(userid);
            logger.info(IDLOG, 'new user "' + newuser.getUsername() + '" has been created');

            // set the endpoints to the new user
            for (endpoType in json[userid].endpoints) {

                // check the validity of the endpoint type
                if (endpointTypes.isValidEndpointType(endpoType) === false) {
                    logger.error(IDLOG, 'invalid endpoint type "' + endpoType + '" in ' + path);

                } else {

                    // add all endpoints of the current type to the new user
                    addEndpointsToUser(newuser, endpoType, json[userid].endpoints[endpoType]);
                }
            }

            // add new user in memory
            users[userid] = newuser;
        }
        logger.info(IDLOG, 'configuration ok');

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
function addEndpointsToUser(user, endpoType, obj) {
    try {
        // check parameters
        if (typeof user !== 'object'
            || typeof endpoType !== 'string'
            || typeof obj       !== 'object') {

            throw new Error('wrong parameters');
        }

        // adds all endpoints of the specified type to the user
        var id;
        for (id in obj) { // cycle endpoints

            // actually the obj[id] is an empty object.
            // It can be used in the future
            user.addEndpoint(endpoType, id, obj[id]);
            logger.info(IDLOG, 'added endpoint "' + endpoType + ' ' + id +'" to user ' + user.getUsername());
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set configuration to use and initialize the users.
*
* **The method can throw an Exception.**
*
* @method config
* @param {object} data
*   @param {string} data.file JSON file with the user/endpoint associations.
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

// public interface
exports.config    = config;
exports.setLogger = setLogger;
