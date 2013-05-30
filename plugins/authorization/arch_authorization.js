/**
* The architect component that exposes _authorization_ module.
*
* @class arch_authorization
* @module authorization
*/
var authorization = require('./authorization');

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
            * It's the _.._ method provided by _authorization_ module.
            *
            * @method ..
            ............
            * @return {boolean} It's true if the user has been successfully authenticated.
            */
            //..: authorization...
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
