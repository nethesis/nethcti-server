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

        return authorizeUser(authorizationTypes.TYPES.phonebook, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the voicemail authorization.
*
* @method authorizeVoicemailUser
* @param {string} username The username
* @return {boolean} True if the user has the voicemail authorization.
*/
function authorizeVoicemailUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.voicemail, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the post-it authorization.
*
* @method authorizePostitUser
* @param {string} username The username
* @return {boolean} True if the user has the post-it authorization.
*/
function authorizePostitUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.postit, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the history authorization.
*
* @method authorizeHistoryUser
* @param {string} username The username
* @return {boolean} True if the user has the history authorization.
*/
function authorizeHistoryUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.history, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the operator panel authorization.
*
* @method authorizeOperatorPanelUser
* @param {string} username The username
* @return {boolean} True if the user has the operator panel authorization.
*/
function authorizeOperatorPanelUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.operator_panel, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the switchboard history authorization.
*
* @method authorizeHistorySwitchUser
* @param {string} username The username
* @return {boolean} True if the user has the switchboard history authorization.
*/
function authorizeHistorySwitchUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.switchboard_history, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the caller note authorization.
*
* @method authorizeCallerNoteUser
* @param {string} username The username
* @return {boolean} True if the user has the caller note authorization.
*/
function authorizeCallerNoteUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.caller_note, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the chat authorization.
*
* @method authorizeChatUser
* @param {string} username The username
* @return {boolean} True if the user has the chat authorization.
*/
function authorizeChatUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        return authorizeUser(authorizationTypes.TYPES.chat, username);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* General function to check an authorization of a user. It's used
* by all authorization with boolean value. E.g. customer card authorization
* doesn't use this function.
*
* @method authorizeUser
* @param {string} type The name of the authorization as reported by _authorization\_types.js_
* @param {string} username The username to check the authorization
* @private
*/
function authorizeUser(type, username) {
    try {
        // check parameter
        if (typeof type !== 'string' || typeof username !== 'string') {
            throw new Error('wrong parameter');
        }

        // get authorization type from the user
        var autho = userMod.getAuthorization(username, type);
        if (autho === undefined) {
            logger.warn(IDLOG, 'try to authorize non existent user "' + username + '" for authorization "' + type + '"');
            return false;
        }

        // check the type of the authorization. It must be a boolean value
        if (typeof autho[type] === 'boolean') {

            // return the authorization
            return autho[type];

        } else { // in all other case returns false for security reasons
            return false;
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has at least one customer card authorization.
*
* @method authorizeCustomerCardUser
* @param {string} username The username
* @return {boolean} True if the user has at least one customer card authorization.
*/
function authorizeCustomerCardUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get cusomter card authorization from the user
        var autho = userMod.getAuthorization(username, authorizationTypes.TYPES.customer_card);

        // analize the result
        var objResult = autho[authorizationTypes.TYPES.customer_card];
        var cc;
        for (cc in objResult) {

            // check the type of the authorization. It must be a boolean value
            if (objResult[cc] === true) { return true; }

        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has at least one streaming authorization.
*
* @method authorizeStreamingUser
* @param {string} username The username
* @return {boolean} True if the user has at least one streaming authorization.
*/
function authorizeStreamingUser(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get streaming authorization from the user
        var autho = userMod.getAuthorization(username, authorizationTypes.TYPES.streaming);

        // analize the result
        var objResult = autho[authorizationTypes.TYPES.streaming];
        var stream;
        for (stream in objResult) {

            // check the type of the authorization. It must be a boolean value
            if (objResult[stream] === true) { return true; }
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Return true if the specified user has the authorization for the
* specified streaming source.
*
* @method authorizeStreamingSourceUser
* @param  {string} username    The username
* @param  {string} streamingId The streaming source identifier
* @return {boolean} True if the user has the authorization for the specified streaming source.
*/
function authorizeStreamingSourceUser(username, streamingId) {
    try {
        // check parameter
        if (typeof username !== 'string' || typeof streamingId !== 'string') {
            throw new Error('wrong parameter');
        }

        // get streaming authorization from the user
        var autho = userMod.getAuthorization(username, authorizationTypes.TYPES.streaming);

        // analize the result
        var objResult = autho[authorizationTypes.TYPES.streaming];
        var stream;
        for (stream in objResult) {

            // check the type of the authorization. It must be a boolean value
            if (stream === streamingId && objResult[stream] === true) { return true; }
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false for security reasons
        return false;
    }
}

/**
* Returns all the authorized streaming sources of the user.
*
* @method getAuthorizedStreamingSources
* @param  {string} username The username
* @return {object} All the authorized streaming sources.
*/
function getAuthorizedStreamingSources(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // get streaming authorization from the user
        var autho = userMod.getAuthorization(username, authorizationTypes.TYPES.streaming);

        // analize the result
        var objResult = autho[authorizationTypes.TYPES.streaming];
        var stream;
        var result = {}; // object to return
        for (stream in objResult) {

            // check the type of the authorization. It must be a boolean value
            if (objResult[stream] === true) { result[stream] = true; }
        }
        return result;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns and empty object
        return {};
    }
}

/**
* Gets the name of the authorized customer cards of the user.
*
* @method authorizedCustomerCards
* @param {string} username The username
* @return {array} The list of the authorized customer cards of the user.
*/
function authorizedCustomerCards(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }
        var arr = [];

        // get cusomter card authorization from the user
        var autho = userMod.getAuthorization(username, authorizationTypes.TYPES.customer_card);

        // analize the result
        var objResult = autho[authorizationTypes.TYPES.customer_card];
        var cc;
        for (cc in objResult) {

            // check the authorization
            if (objResult[cc] === true) { arr.push(cc); }
        }
        return arr;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns an empty array for security reasons
        return [];
    }
}

/**
* Check if the user has the authorization to view the history call of the endpoint.
* It checks the presence of the endpoint into the extension endpoints of the user.
*
* @method verifyUserEndpointExten
* @param {string} username The username
* @param {string} endpoint The identifier of the endpoint
* @return {boolean} True if the user is authorized to view the history call of the endpoint.
*/
function verifyUserEndpointExten(username, endpoint) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof endpoint !== 'string') {
            throw new Error('wrong parameters');
        }

        return userMod.hasExtensionEndpoint(username, endpoint);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns false value for security reasons
        return false;
    }
}

/**
* Returns all authorizations of the user.
*
* @method getUserAuthorizations
* @param {string} username The username
* @return {object} All authorizations of the user.
*/
function getUserAuthorizations(username) {
    try {
        // check parameter
        if (typeof username !== 'string') { throw new Error('wrong parameter'); }

        // object to return
        var result = {};

        // cycle in all authorization types
        var type, obj;
        for (type in authorizationTypes.TYPES) {

            // get one specific authorization of the user
            obj = userMod.getAuthorization(username, type);

            // analize the returned authorization
            if (typeof obj === 'object') {

                // authorization values can be a boolean or an object with the list
                // of how is permitted as keys, e.g. the customer card authorizations
                if (   (typeof obj[type] === 'boolean' && obj[type] === true)
                    || (typeof obj[type] === 'object'  && Object.keys(obj[type]).length > 0)) {

                    result[type] = true;

                } else if (   (typeof obj[type] === 'boolean' && obj[type] === false)
                           || (typeof obj[type] === 'object'  && Object.keys(obj[type]).length === 0)) {

                    result[type] = false;

                } else {
                    logger.warn(IDLOG, 'wrong value for authorization "' + type + '" of the user "' + username + '"');
                }

            } else {
                logger.warn(IDLOG, 'wrong "' + type + '" authorization result for user "' + username + '"');
            }
        }
        return result;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        // in the case of exception it returns an empty object for security reasons
        return {};
    }
}

// public interface
exports.config                        = config;
exports.setLogger                     = setLogger;
exports.setUserModule                 = setUserModule;
exports.authorizeChatUser             = authorizeChatUser;
exports.authorizePostitUser           = authorizePostitUser;
exports.authorizeHistoryUser          = authorizeHistoryUser;
exports.getUserAuthorizations         = getUserAuthorizations;
exports.authorizeVoicemailUser        = authorizeVoicemailUser;
exports.authorizePhonebookUser        = authorizePhonebookUser;
exports.authorizeStreamingUser        = authorizeStreamingUser;
exports.authorizeCallerNoteUser       = authorizeCallerNoteUser;
exports.authorizedCustomerCards       = authorizedCustomerCards;
exports.verifyUserEndpointExten       = verifyUserEndpointExten;
exports.authorizeCustomerCardUser     = authorizeCustomerCardUser;
exports.authorizeOperatorPanelUser    = authorizeOperatorPanelUser;
exports.authorizeHistorySwitchUser    = authorizeHistorySwitchUser;
exports.authorizeStreamingSourceUser  = authorizeStreamingSourceUser;
exports.getAuthorizedStreamingSources = getAuthorizedStreamingSources;
