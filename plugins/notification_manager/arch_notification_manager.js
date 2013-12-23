/**
* The architect component that exposes _notification\_manager_ module.
*
* @class arch_notification_manager
* @module postit
*/
var notificationManager = require('./notification_manager');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_notification_manager]
*/
var IDLOG = '[arch_notification_manager]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        notificationManager: {}
    });

    try {
        var logger = console;

        if (imports.logger) { logger = imports.logger; }

        notificationManager.setLogger(logger);
        notificationManager.config('/etc/nethcti/services.json');
        notificationManager.setCompSms(imports.sms);
        notificationManager.setCompUser(imports.user);
        notificationManager.setCompMailer(imports.mailer);
        notificationManager.setCompPostit(imports.postit);
        notificationManager.setCompVoicemail(imports.voicemail);
        notificationManager.setCompAuthorization(imports.authorization);
        notificationManager.setCompConfigManager(imports.configManager);
        notificationManager.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
