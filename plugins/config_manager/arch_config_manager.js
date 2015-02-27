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
            * It's the _getUserSettings_ method provided by _config\_manager_ module.
            *
            * @method getUserSettings
            */
            getUserSettings: configManager.getUserSettings,

            /**
            * It's the _getUserEndpoints_ method provided by _config\_manager_ module.
            *
            * @method getUserEndpoints
            */
            getUserEndpointsJSON: configManager.getUserEndpointsJSON,

            /**
            * It's the _getC2CAutoPhonePass_ method provided by _config\_manager_ module.
            *
            * @method getC2CAutoPhonePass
            */
            getC2CAutoPhonePass: configManager.getC2CAutoPhonePass,

            /**
            * It's the _getC2CAutoPhoneUser_ method provided by _config\_manager_ module.
            *
            * @method getC2CAutoPhoneUser
            */
            getC2CAutoPhoneUser: configManager.getC2CAutoPhoneUser,

            /**
            * It's the _getAllUserEndpoints_ method provided by _config\_manager_ module.
            *
            * @method getAllUserEndpoints
            */
            getAllUserEndpointsJSON: configManager.getAllUserEndpointsJSON,

            /**
            * It's the _getTotNumUsers_ method provided by _config\_manager_ module.
            *
            * @method getTotNumUsers
            */
            getTotNumUsers: configManager.getTotNumUsers,

            /**
            * It's the _isAutomaticClick2callEnabled_ method provided by _config\_manager_ module.
            *
            * @method isAutomaticClick2callEnabled
            */
            isAutomaticClick2callEnabled: configManager.isAutomaticClick2callEnabled,

            /**
            * It's the _setUserNotifySetting_ method provided by _config\_manager_ module.
            *
            * @method setUserNotifySetting
            */
            setUserNotifySetting: configManager.setUserNotifySetting,

            /**
            * It's the _getDefaultUserExtensionConf_ method provided by _config\_manager_ module.
            *
            * @method getDefaultUserExtensionConf
            */
            getDefaultUserExtensionConf: configManager.getDefaultUserExtensionConf,

            /**
            * It's the _setDefaultUserExtensionConf_ method provided by _config\_manager_ module.
            *
            * @method setDefaultUserExtensionConf
            */
            setDefaultUserExtensionConf: configManager.setDefaultUserExtensionConf,

            /**
            * It's the _setQueueAutoLogoutConf_ method provided by _config\_manager_ module.
            *
            * @method setQueueAutoLogoutConf
            */
            setQueueAutoLogoutConf: configManager.setQueueAutoLogoutConf,

            /**
            * It's the _getQueueAutoLogoutConf_ method provided by _config\_manager_ module.
            *
            * @method getQueueAutoLogoutConf
            */
            getQueueAutoLogoutConf: configManager.getQueueAutoLogoutConf,

            /**
            * It's the _setQueueAutoLoginConf_ method provided by _config\_manager_ module.
            *
            * @method setQueueAutoLoginConf
            */
            setQueueAutoLoginConf: configManager.setQueueAutoLoginConf,

            /**
            * It's the _getQueueAutoLoginConf_ method provided by _config\_manager_ module.
            *
            * @method getQueueAutoLoginConf
            */
            getQueueAutoLoginConf: configManager.getQueueAutoLoginConf,

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
            * It's the _verifySendPostitNotificationByEmail_ method provided by _config\_manager_ module.
            *
            * @method verifySendPostitNotificationByEmail
            */
            verifySendPostitNotificationByEmail: configManager.verifySendPostitNotificationByEmail,

            /**
            * It's the _verifySendVoicemailNotificationBySms_ method provided by _config\_manager_ module.
            *
            * @method verifySendVoicemailNotificationBySms
            */
            verifySendVoicemailNotificationBySms: configManager.verifySendVoicemailNotificationBySms,

            /**
            * It's the _verifySendPostitNotificationBySms_ method provided by _config\_manager_ module.
            *
            * @method verifySendPostitNotificationBySms
            */
            verifySendPostitNotificationBySms: configManager.verifySendPostitNotificationBySms,

            /**
            * It's the _getVoicemailNotificationEmailTo_ method provided by _config\_manager_ module.
            *
            * @method getVoicemailNotificationEmailTo
            */
            getVoicemailNotificationEmailTo: configManager.getVoicemailNotificationEmailTo,

            /**
            * It's the _getPostitNotificationEmailTo_ method provided by _config\_manager_ module.
            *
            * @method getPostitNotificationEmailTo
            */
            getPostitNotificationEmailTo: configManager.getPostitNotificationEmailTo,

            /**
            * It's the _getVoicemailNotificationSmsTo_ method provided by _config\_manager_ module.
            *
            * @method getVoicemailNotificationSmsTo
            */
            getVoicemailNotificationSmsTo: configManager.getVoicemailNotificationSmsTo,

            /**
            * It's the _getPostitNotificationSmsTo_ method provided by _config\_manager_ module.
            *
            * @method getPostitNotificationSmsTo
            */
            getPostitNotificationSmsTo: configManager.getPostitNotificationSmsTo,

            /**
            * It's the _getCallUrlFromAgent_ method provided by _config\_manager_ module.
            *
            * @method getCallUrlFromAgent
            */
            getCallUrlFromAgent: configManager.getCallUrlFromAgent,

            /**
            * It's the _phoneAgentSupportAutoC2C_ method provided by _config\_manager_ module.
            *
            * @method phoneAgentSupportAutoC2C
            */
            phoneAgentSupportAutoC2C: configManager.phoneAgentSupportAutoC2C,

            /**
            * It's the _getAnswerUrlFromAgent_ method provided by _config\_manager_ module.
            *
            * @method getAnswerUrlFromAgent
            */
            getAnswerUrlFromAgent: configManager.getAnswerUrlFromAgent,

            /**
            * It's the _getServerHostname_ method provided by _config\_manager_ module.
            *
            * @method getServerHostname
            */
            getServerHostname: configManager.getServerHostname
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        // wait for the creation of the users
        imports.user.on(imports.user.EVT_USERS_READY, function () {
            configManager.setLogger(logger);
            configManager.setCompUser(imports.user);
            configManager.setCompAstProxy(imports.astProxy);
            configManager.setCompComNethctiWs(imports.com_nethcti_ws);
            configManager.config('/etc/nethcti/nethcti.json');
            configManager.configUser('/etc/nethcti/users.json');
            configManager.configChat('/etc/nethcti/chat.json');
            configManager.configPhoneUrls('/etc/nethcti/phone_urls.json');
        });

        imports.dbconn.on(imports.dbconn.EVT_READY, function () {
            configManager.setCompDbconn(imports.dbconn);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
