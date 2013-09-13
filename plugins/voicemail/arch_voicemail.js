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
            * @param  {string}   type The name of the event
            * @param  {function} cb   The callback to execute in response to the event
            * @return {object}   A subscription handle capable of detaching that subscription
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
            * It's the _getVmIdFromDbId_ method provided by _voicemail_ module.
            *
            * @method getVmIdFromDbId
            */
            getVmIdFromDbId: voicemail.getVmIdFromDbId,

            /**
            * It's the _EVT\_NEW\_VOICEMAIL_ property provided by _voicemail_ module.
            *
            * @method EVT_NEW_VOICEMAIL
            */
            EVT_NEW_VOICEMAIL: voicemail.EVT_NEW_VOICEMAIL
        }
    });

    try {
        // wait for the creation of the users
        imports.user.on('users_ready', function () {
            voicemail.setLogger(logger);
            voicemail.setDbconn(imports.dbconn);
            voicemail.setCompUser(imports.user);
            voicemail.setAstProxy(imports.astProxy);
            voicemail.start();
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
