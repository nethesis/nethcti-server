/**
* Provides the fuctions for the configuration manager.
*
* @module config_manager
* @main arch_config_manager
*/
var fs = require('fs');

/**
* Provides the configuration manager functionalities.
*
* @class config_manager
* @static
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [config_manager]
*/
var IDLOG = '[config_manager]';

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
* The path of the file that contains the user configurations.
*
* @property configUserPath
* @type string
* @private
*/
var configUserPath;

/**
* The user module.
*
* @property compUser
* @type object
* @private
*/
var compUser;

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
* Set the user module to be used.
*
* @method setCompUser
* @param {object} cu The user module.
*/
function setCompUser(cu) {
    try {
        // check parameter
        if (typeof cu !== 'object') { throw new Error('wrong user object'); }
        compUser = cu;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It reads the users file and set the user configurations using
* user module.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    configUserPath = path;
    logger.info(IDLOG, 'configure user configurations with ' + configUserPath);

    // read configuration file
    var json = require(configUserPath);

    // check JSON file
    if (typeof json !== 'object') { throw new Error('wrong JSON file ' + configUserPath); }

    // cycle user configurations and set User objects using user module
    var userTemp;
    for (userTemp in json) {

        // check the configuration object of the user
        if (typeof json[userTemp] === 'object') {
            compUser.setConfigurations(userTemp, json[userTemp]);

        } else {
            logger.error(IDLOG, 'wrong configuration for user "' + userTemp + '" in file ' + configUserPath);
        }
    }
}

/**
* Return the user configurations.
*
* @method getConfigurations
* @param {string} user The user identifier
* @return {object} The user configurations.
*/
function getConfigurations(user) {
    try {
        // check parameter
        if (typeof user !== 'string') { throw new Error('wrong parameter'); }

        return compUser.getConfigurations(user);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the user configurations in _User_ object and in the
* configurations file. This file uses the JSON syntax and
* its path has been set when _config_ method has been called.
* If the update of _User_ object fail, then the file writing
* is skipped.
*
* @method setConfigurations
* @param {string} user The user identifier
* @param {object} config The user configurations
* @param {function} cb The callback function
*/
function setConfigurations(user, config, cb) {
    try {
        // check parameters
        if (typeof    user   !== 'string'
            || typeof config !== 'object'
            || typeof cb     !== 'function') {
            
            throw new Error('wrong parameters');
        }

        // in this case config method hasn't been called
        if (!configUserPath) {
            throw new Error('the path of the configuration file hasn\'t been set');
        }

        // set the configuration of the User object. This call can throw an exception.
        // If an exception happens, the file writing is skipped
        compUser.setConfigurations(user, config);

        // update the JSON file of the configurations. If an exception has occured
        // in the previous step, the following code is never executed
        // read the JSON file content
        var json = require(configUserPath);

        // update the user configuration
        json[user] = config;

        // write the file content in the JSON file
        fs.writeFile(configUserPath, JSON.stringify(json, null, 4), function (err) {
            if (err) {
                logger.error(IDLOG, 'writing configurations of user "' + user + '" in the JSON file ' + configUserPath);
                cb(err.toString());

            } else {
                logger.info(IDLOG, 'configurations of user "' + user + '" has been successfully write to file ' + configUserPath);
                cb(null);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

// public interface
exports.config            = config;
exports.setLogger         = setLogger;
exports.setCompUser       = setCompUser;
exports.getConfigurations = getConfigurations;
exports.setConfigurations = setConfigurations;
