/**
* The architect component that exposes _dbconn_ module.
*
* @class arch_dbconn
* @module dbconn
*/
var dbconn = require('./dbconn');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_dbconn]
*/
var IDLOG = '[arch_dbconn]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        dbconn: {
            /**
            * It's the _savePostit_ method provided by _dbconn_ module.
            *
            * @method savePostit
            */
            savePostit: dbconn.savePostit,

            /**
            * It's the _saveCallerNote_ method provided by _dbconn_ module.
            *
            * @method saveCallerNote
            */
            saveCallerNote: dbconn.saveCallerNote,

            /**
            * It's the _saveCtiPbContact_ method provided by _dbconn_ module.
            *
            * @method saveCtiPbContact
            */
            saveCtiPbContact: dbconn.saveCtiPbContact,

            /**
            * It's the _getCtiPbContact_ method provided by _dbconn_ module.
            *
            * @method getCtiPbContact
            */
            getCtiPbContact: dbconn.getCtiPbContact,

            /**
            * It's the _deleteCtiPbContact_ method provided by _dbconn_ module.
            *
            * @method deleteCtiPbContact
            */
            deleteCtiPbContact: dbconn.deleteCtiPbContact,

            /**
            * It's the _getPbContactsContains_ method provided by _dbconn_ module.
            *
            * @method getPbContactsContains
            */
            getPbContactsContains: dbconn.getPbContactsContains,

            /**
            * It's the _getCtiPbContactsContains_ method provided by _dbconn_ module.
            *
            * @method getCtiPbContactsContains
            */
            getCtiPbContactsContains: dbconn.getCtiPbContactsContains,

            /**
            * It's the _getPbContactsStartsWith_ method provided by _dbconn_ module.
            *
            * @method getPbContactsStartsWith
            */
            getPbContactsStartsWith: dbconn.getPbContactsStartsWith,

            /**
            * It's the _getPbContactsStartsWithDigit_ method provided by _dbconn_ module.
            *
            * @method getPbContactsStartsWithDigit
            */
            getPbContactsStartsWithDigit: dbconn.getPbContactsStartsWithDigit,

            /**
            * It's the _getCtiPbSpeeddialContacts_ method provided by _dbconn_ module.
            *
            * @method getCtiPbSpeeddialContacts
            */
            getCtiPbSpeeddialContacts: dbconn.getCtiPbSpeeddialContacts,

            /**
            * It's the _getCtiPbContactsStartsWith_ method provided by _dbconn_ module.
            *
            * @method getCtiPbContactsStartsWith
            */
            getCtiPbContactsStartsWith: dbconn.getCtiPbContactsStartsWith,

            /**
            * It's the _getCtiPbContactsStartsWithDigit_ method provided by _dbconn_ module.
            *
            * @method getCtiPbContactsStartsWithDigit
            */
            getCtiPbContactsStartsWithDigit: dbconn.getCtiPbContactsStartsWithDigit,

            /**
            * It's the _getHistoryCallInterval_ method provided by _dbconn_ module.
            *
            * @method getHistoryCallInterval
            */
            getHistoryCallInterval: dbconn.getHistoryCallInterval,

            /**
            * It's the _getHistoryPostitInterval_ method provided by _dbconn_ module.
            *
            * @method getHistoryPostitInterval
            */
            getHistoryPostitInterval: dbconn.getHistoryPostitInterval,

            /**
            * It's the _getHistorySmsInterval_ method provided by _dbconn_ module.
            *
            * @method getHistorySmsInterval
            */
            getHistorySmsInterval: dbconn.getHistorySmsInterval,

            /**
            * It's the _getAllUserHistoryPostitInterval_ method provided by _dbconn_ module.
            *
            * @method getAllUserHistoryPostitInterval
            */
            getAllUserHistoryPostitInterval: dbconn.getAllUserHistoryPostitInterval,

            /**
            * It's the _getAllUserHistorySmsInterval_ method provided by _dbconn_ module.
            *
            * @method getAllUserHistorySmsInterval
            */
            getAllUserHistorySmsInterval: dbconn.getAllUserHistorySmsInterval,

            /**
            * It's the _getCustomerCardByNum_ method provided by _dbconn_ module.
            *
            * @method getCustomerCardByNum
            */
            getCustomerCardByNum: dbconn.getCustomerCardByNum,

            /**
            * It's the _getHistoryCallerNoteInterval_ method provided by _dbconn_ module.
            *
            * @method getHistoryCallerNoteInterval
            */
            getHistoryCallerNoteInterval: dbconn.getHistoryCallerNoteInterval,

            /**
            * It's the _getAllUserHistoryCallerNoteInterval_ method provided by _dbconn_ module.
            *
            * @method getAllUserHistoryCallerNoteInterval
            */
            getAllUserHistoryCallerNoteInterval: dbconn.getAllUserHistoryCallerNoteInterval,


            /**
            * It's the _getVoicemailNewMsg_ method provided by _dbconn_ module.
            *
            * @method getVoicemailNewMsg
            */
            getVoicemailNewMsg: dbconn.getVoicemailNewMsg,

            /**
            * It's the _getVoicemailOldMsg_ method provided by _dbconn_ module.
            *
            * @method getVoicemailOldMsg
            */
            getVoicemailOldMsg: dbconn.getVoicemailOldMsg,

            /**
            * It's the _getVmMailboxFromDbId_ method provided by _dbconn_ module.
            *
            * @method getVmMailboxFromDbId
            */
            getVmMailboxFromDbId: dbconn.getVmMailboxFromDbId,

            /**
            * It's the _deleteVoiceMessage_ method provided by _dbconn_ module.
            *
            * @method deleteVoiceMessage
            */
            deleteVoiceMessage: dbconn.deleteVoiceMessage
        }
    });

    try {
        dbconn.setLogger(logger);
        dbconn.config({
            file: ['/etc/nethcti/dbstatic.json', '/etc/nethcti/dbdynamic.json']
        });
        dbconn.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
