/**
* Provides the authorization functions.
*
* @module authorization
* @main authorization
*/

/**
* Provides the authorization functions.
*
* @class authorization
* @static
*/
var fs = require('fs');
var authorizationTypes = require('./authorization_types');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [authorization]
*/
var IDLOG = '[authorization]';

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
* The user module.
*
* @property userMod
* @type object
* @private
*/
var userMod;

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
* Set configuration to use and initialize the user authorization.
*
* **The method can throw an Exception.**
*
* @method config
* @param {object} data 
*   @param {string} data.file Authorization ini file path. The file must
* have the authorization name as section and 'users' key with the username
* list as value. In the case of customer card and streaming sections, the
* key is the name of customer card or video streaming.
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
* Set user module to be used.
*
* @method setUserModule
* @param {object} module The user module
* private
*/
function setUserModule(module) {
    // check parameter
    if (typeof module !== 'object') { throw new TypeError('wrong parameter'); }
    userMod = module;
}

/**
* Set the user authorization by file. The file must use the JSON syntax.
*
* @method configByFile
* @param {string} path The path of the authorization file
* private
*/
function configByFile(path) {
    try {
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

        // read the file
        var json = require(path);

        // sets the authorization to users
        initializeAuthorizationUsersByJSON(json);
        logger.info(IDLOG, 'configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the authorization to the user by json configuration.
*
* @method initializeEndpointsUsersByJSON
* @param {object} json The JSON configuration
* @private
*/  
function initializeAuthorizationUsersByJSON(json) {
    try {
        // check parameter
        if (typeof json !== 'object') { throw new Error('wrong parameter'); }

        var userid, typeAutho;
        for (userid in json) { // cycle users

            // set the authorizations to the user
            for (typeAutho in json[userid].authorizations) {
    
                // check the validity of the authorization type
                if (authorizationTypes.isValidAuthorizationType(typeAutho) === false) {
                    logger.error(IDLOG, 'invalid authorization type "' + typeAutho + '" in json file of the users');

                } else {
                    // add authorization of the current type to the user
                    userMod.setAuthorization(userid, typeAutho, json[userid].authorizations[typeAutho]);
                }
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return true if the specified user has the phonebook authorization.
*
* @method authorizePhonebookUser
* @param {string} username The username
* @return {boolean} True if the user has the phonebook authorization.
*/
function authorizePhonebookUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get phonebook authorization from the user
        var autho = userMod.getAuthorization(username, authorizationTypes.TYPES.phonebook);

        // check the type of the authorization. It must be a boolean value
        if (typeof autho[authorizationTypes.TYPES.phonebook] === 'boolean') {

            // return the phonebook authorization
            return autho[authorizationTypes.TYPES.phonebook];

        } else { // in all other case returns false for security reasons
            return false;
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

// public interface
exports.config        = config;
exports.setLogger     = setLogger;
exports.setUserModule = setUserModule;
exports.authorizePhonebookUser = authorizePhonebookUser;
