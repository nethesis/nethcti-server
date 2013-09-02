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
            * It's the _getUserConfigurations_ method provided by _config\_manager_ module.
            *
            * @method getUserConfigurations
            */
            getUserConfigurations: configManager.getUserConfigurations,

            /**
            * It's the _getUserEndpoints_ method provided by _config\_manager_ module.
            *
            * @method getUserEndpoints
            */
            getUserEndpointsJSON: configManager.getUserEndpointsJSON,

            /**
            * It's the _getAllUserEndpoints_ method provided by _config\_manager_ module.
            *
            * @method getAllUserEndpoints
            */
            getAllUserEndpointsJSON: configManager.getAllUserEndpointsJSON,

            /**
            * It's the _setUserNotificationConf_ method provided by _config\_manager_ module.
            *
            * @method setUserNotificationConf
            */
            setUserNotificationConf: configManager.setUserNotificationConf,

            /**
            * It's the _setUserClick2CallConf_ method provided by _config\_manager_ module.
            *
            * @method setUserClick2CallConf
            */
            setUserClick2CallConf: configManager.setUserClick2CallConf,

            /**
            * It's the _getChatConf_ method provided by _config\_manager_ module.
            *
            * @method getChatConf
            */
            getChatConf: configManager.getChatConf,

            /**
            * It's the _verifySendVoicemailNotificationByEmail_ method provided by _config\_manager_ module.
            *
            * @method verifySendVoicemailNotificationByEmail
            */
            verifySendVoicemailNotificationByEmail: configManager.verifySendVoicemailNotificationByEmail,

            /**
            * It's the _verifySendVoicemailNotificationBySms_ method provided by _config\_manager_ module.
            *
            * @method verifySendVoicemailNotificationBySms
            */
            verifySendVoicemailNotificationBySms: configManager.verifySendVoicemailNotificationBySms,

            /**
            * It's the _getVoicemailNotificationEmailTo_ method provided by _config\_manager_ module.
            *
            * @method getVoicemailNotificationEmailTo
            */
            getVoicemailNotificationEmailTo: configManager.getVoicemailNotificationEmailTo,

            /**
            * It's the _getVoicemailNotificationSmsTo_ method provided by _config\_manager_ module.
            *
            * @method getVoicemailNotificationSmsTo
            */
            getVoicemailNotificationSmsTo: configManager.getVoicemailNotificationSmsTo
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        // wait for the creation of the users
        imports.user.on('users_ready', function () {
            configManager.setLogger(logger);
            configManager.setCompUser(imports.user);
            configManager.configUser('/etc/nethcti/users.json');
            configManager.configChat('/etc/nethcti/chat.json');
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
