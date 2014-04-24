/**
* The architect component that exposes _authentication_ module.
*
* @class arch_authentication
* @module authentication
*/
var authentication = require('./authentication');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_authentication]
*/
var IDLOG = '[arch_authentication]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        authentication: {
            /**
            * It's the _on_ method provided by _authentication_ module.
            *
            * @method on
            */
            on: authentication.on,

            /**
            * It's the _authenticate_ method provided by _authentication_ module.
            *
            * @method authenticate
            * @param {string} accessKeyId The access key used to authenticate, e.g. the username
            * @param {string} password The password of the account
            * @param {function} cb The callback function
            */
            authenticate: authentication.authenticate,

            /**
            * It's the _getNonce_ method provided by _authentication_ module.
            *
            * @method getNonce
            * @param {string} accessKeyId The access key identifier used to create the token.
            * @param {string} password The password of the account
            * @return {string} The SHA1 nonce.
            */
            getNonce: authentication.getNonce,

            /**
            * It's the _removeToken_ method provided by _authentication_ module.
            *
            * @method removeToken
            * @param {string} accessKeyId The access key.
            */
            removeToken: authentication.removeToken,

            /**
            * It's the _isAutoUpdateTokenExpires_ method provided by _authentication_ module.
            *
            * @method isAutoUpdateTokenExpires
            * @return {boolean} True if the automatic update is active.
            */
            isAutoUpdateTokenExpires: authentication.isAutoUpdateTokenExpires,

            /**
            * It's the _verifyToken_ method provided by _authentication_ module.
            *
            * @method verifyToken
            * @param {string} token The token to be checked.
            */
            verifyToken: authentication.verifyToken,

            /**
            * It's the _updateTokenExpires_ method provided by _authentication_ module.
            *
            * @method updateTokenExpires
            */
            updateTokenExpires: authentication.updateTokenExpires,

            /**
            * It's the _getTokenExpirationTimeout_ method provided by _authentication_ module.
            *
            * @method getTokenExpirationTimeout
            */
            getTokenExpirationTimeout: authentication.getTokenExpirationTimeout,

            /**
            * It's the _isUnautheCallEnabled_ method provided by _authentication_ module.
            *
            * @method isUnautheCallEnabled
            */
            isUnautheCallEnabled: authentication.isUnautheCallEnabled,

            /**
            * It's the _EVT_COMP_READY_ property provided by _authentication_ module.
            *
            * @method EVT_COMP_READY
            */
            EVT_COMP_READY: authentication.EVT_COMP_READY
        }
    });

    try {
        authentication.setLogger(logger);
        authentication.config('/etc/nethcti/authentication.json');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
