/**
* The architect component that exposes _voicemail_ module.
*
* @class arch_voicemail
* @module voicemail
*/
var voicemail = require('./voicemail');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_voicemail]
*/
var IDLOG = '[arch_voicemail]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        voicemail: {
            /**
            * It's the _getAllVoiceMessages_ method provided by _voicemail_ module.
            *
            * @method getAllVoiceMessages
            */
            getAllVoiceMessages: voicemail.getAllVoiceMessages
        }
    });

    try {
        // wait for the creation of the users
        imports.user.on('users_ready', function () {
            voicemail.setLogger(logger);
            voicemail.setDbconn(imports.dbconn);
            voicemail.setCompUser(imports.user);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
