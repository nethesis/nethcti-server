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
            * It's the _authenticate_ method provided by _authenticaion_ module.
            *
            * @method authenticate
            * @param {string} accessKeyId The access key used to retrieve secret key and token.
            * @param {string} token The token to be checked.
            * @return {boolean} It's true if the user has been successfully authenticated.
            */
            authenticate: authentication.authenticate,

            /**
            * It's the _getNonce_ method provided by _authentication_ module.
            *
            * @method getNonce
            * @param {string} accessKeyId The access key used to create the token.
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
            isAutoUpdateTokenExpires: authentication.isAutoUpdateTokenExpires,

            /**
            * It's the _accountExists_ method provided by _authentication_ module.
            *
            * @method accountExists
            * @return {boolean} True if the account exists.
            */
            accountExists: authentication.accountExists
        }
    });

    try {
        authentication.setLogger(logger);
        authentication.config('/etc/asterisk/sip_additional.conf');
        authentication.config('/etc/asterisk/iax_additional.conf');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
