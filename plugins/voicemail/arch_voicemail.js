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
            * It's the _on_ method provided by _voicemail_ module.
            *
            * @method on
            */
            on: voicemail.on,

            /**
            * It's the _getAllVoiceMessagesByUser_ method provided by _voicemail_ module.
            *
            * @method getAllVoiceMessagesByUser
            */
            getAllVoiceMessagesByUser: voicemail.getAllVoiceMessagesByUser,

            /**
            * It's the _getNewVoiceMessagesByUser_ method provided by _voicemail_ module.
            *
            * @method getNewVoiceMessagesByUser
            */
            getNewVoiceMessagesByUser: voicemail.getNewVoiceMessagesByUser,

            /**
            * It's the _deleteVoiceMessage_ method provided by _voicemail_ module.
            *
            * @method deleteVoiceMessage
            */
            deleteVoiceMessage: voicemail.deleteVoiceMessage,

            /**
            * It's the _listenVoiceMessage_ method provided by _voicemail_ module.
            *
            * @method listenVoiceMessage
            */
            listenVoiceMessage: voicemail.listenVoiceMessage,

            /**
            * It's the _getAllNewVoiceMessageCount_ method provided by _voicemail_ module.
            *
            * @method getAllNewVoiceMessageCount
            */
            getAllNewVoiceMessageCount: voicemail.getAllNewVoiceMessageCount,

            /**
            * It's the _getVmIdFromDbId_ method provided by _voicemail_ module.
            *
            * @method getVmIdFromDbId
            */
            getVmIdFromDbId: voicemail.getVmIdFromDbId,

            /**
            * It's the _EVT\_NEW\_VOICE\_MESSAGE_ property provided by _voicemail_ module.
            *
            * @method EVT_NEW_VOICE_MESSAGE
            */
            EVT_NEW_VOICE_MESSAGE: voicemail.EVT_NEW_VOICE_MESSAGE,

            /**
            * It's the _EVT\_UPDATE\_NEW\_VOICE\_MESSAGES_ property provided by _voicemail_ module.
            *
            * @method EVT_UPDATE_NEW_VOICE_MESSAGES
            */
            EVT_UPDATE_NEW_VOICE_MESSAGES: voicemail.EVT_UPDATE_NEW_VOICE_MESSAGES
        }
    });

    try {
        voicemail.setLogger(logger);

        // wait for the creation of the users
        imports.user.on(imports.user.EVT_USERS_READY, function () {
            voicemail.setCompUser(imports.user);
            voicemail.setAstProxy(imports.astProxy);
            voicemail.start();
        });

        imports.dbconn.on(imports.dbconn.EVT_READY, function () {
            voicemail.setDbconn(imports.dbconn);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
