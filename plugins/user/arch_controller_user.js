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
            * It's the _on_ method provided by _controller\_user_ module.
            *
            * @method on
            * @param {string} type The name of the event
            * @param {function} cb The callback to execute in response to the event
            * @return {object} A subscription handle capable of detaching that subscription
            */
            on: controllerUser.on,

            /**
            * It's the _setAuthorizationToUser_ method provided by _controller\_user_ module.
            *
            * @method setAuthorizationToUser
            */
            setAuthorization: controllerUser.setAuthorization,

            /**
            * It's the _getAuthorization_ method provided by _controller\_user_ module.
            *
            * @method getAuthorization
            */
            getAuthorization: controllerUser.getAuthorization,
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        controllerUser.setLogger(logger);
        controllerUser.config({ type: 'file', path: '/etc/nethcti/users.json' });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
