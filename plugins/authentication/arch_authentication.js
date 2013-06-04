/**
* The architect component that exposes _authentication_ module.
*
* @class arch_authentication
* @module authentication
*/
var authentication = require('./authenticationLDAP');

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
            * It's the _removeGrant_ method provided by _authentication_ module.
            *
            * @method removeGrant
            * @param {string} accessKeyId The access key.
            */
            removeGrant: authentication.removeGrant,

            /**
            * It's the _removeGrant_ method provided by _authentication_ module.
            *
            * @method isAutoUpdateTokenExpires
            * @return {boolean} True if the automatic update is active.
            */
            isAutoUpdateTokenExpires: authentication.isAutoUpdateTokenExpires
        }
    });

    try {
        authentication.setLogger(logger);
        authentication.config('/etc/nethcti/authentication.ini');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
