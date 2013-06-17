/**
* The architect component that exposes _config\_manager_ module.
*
* @class arch_config_manager
* @module config_manager
*/
var configManager = require('./config_manager');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_config_manager]
*/
var IDLOG = '[arch_config_manager]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        configManager: {
            /**
            * It's the _getConfigurations_ method provided by _controller\_config\_manager_ module.
            *
            * @method getConfigurations
            */
            getConfigurations: configManager.getConfigurations,

            /**
            * It's the _setConfigurations_ method provided by _controller\_config\_manager_ module.
            *
            * @method setConfigurations
            */
            setConfigurations: configManager.setConfigurations
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        // wait for the creation of the users
        imports.user.on('users_ready', function () {
            configManager.setLogger(logger);
            configManager.setCompUser(imports.user);
            configManager.config('/etc/nethcti/configurations.json');
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
