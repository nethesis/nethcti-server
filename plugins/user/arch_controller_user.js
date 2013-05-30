/**
* The architect component that exposes _user_ module.
*
* @class arch_controller_user
* @module user
*/
var controllerUser = require('./controller_user');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_controller_user]
*/
var IDLOG = '[arch_controller_user]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        user: {
            /**
            * It's the _.._ method provided by _controller\_user_ module.
            *
            * @method ...
            */
            //..: controllerUser...
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        controllerUser.setLogger(logger);
        controllerUser.config({ type: 'file', path: '/etc/nethcti/user.json' });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
