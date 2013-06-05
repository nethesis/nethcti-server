/**
* The architect component that exposes _authorization_ module.
*
* @class arch_authorization
* @module authorization
*/
var authorization      = require('./authorization');
var authorizationTypes = require('./authorization_types');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_authorization]
*/
var IDLOG = '[arch_authorization]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        authorization: {
            /**
            * It's the _authorizePhonebookUser_ method provided by _authorization_ module.
            *
            * @method authorizePhonebookUser
            * @param {string} username The username
            * @return {boolean} True if the user has the phonebook authorization.
            */
            authorizePhonebookUser: authorization.authorizePhonebookUser
        }
    });

    try {
        imports.user.on('users_ready', function () {
            authorization.setLogger(logger);
            authorization.setUserModule(imports.user);
            authorization.config({ type: 'file', path: '/etc/nethcti/users.json' });
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
