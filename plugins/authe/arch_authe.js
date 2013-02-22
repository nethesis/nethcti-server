/**
* The architect component that exposes _authe_ module.
*
* @class arch_authe
* @module authe
*/
var authe = require('./authe');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [authe]
*/
var IDLOG = '[arch_authe]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        authe: {
            /**
            * It's the _authe_ method provided by _authe_ module.
            *
            * @method authe
            * @param {string} accessKeyId The access key used to retrieve secret key and token.
            * @param {string} token The token to be checked.
            * @return {boolean} It's true if the user has been successfully authenticated.
            */
            authe: authe.authe,

            /**
            * It's the _getNonce_ method provided by _authe_ module.
            *
            * @method getNonce
            * @param {string} accessKeyId The access key used to create the token.
            * @return {string} The SHA1 nonce.
            */
            getNonce: authe.getNonce,

            /**
            * It's the _removeGrant_ method provided by _authe_ module.
            *
            * @method removeGrant
            * @param {string} accessKeyId The access key.
            */
            removeGrant: authe.removeGrant,

            /**
            * It's the _removeGrant_ method provided by _authe_ module.
            *
            * @method isAutoUpdateTokenExpires
            * @return {boolean} True if the automatic update is active.
            */
            isAutoUpdateTokenExpires: authe.isAutoUpdateTokenExpires
        }
    });

    try {
        authe.setLogger(logger);
        authe.config('/etc/asterisk/sip_additional.conf');
        authe.config('/etc/asterisk/iax_additional.conf');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
