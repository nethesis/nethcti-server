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
            * It's the _getPhonebookContacts_ method provided by _dbconn_ module.
            *
            * @method getPhonebookContacts
            */
            getPhonebookContacts: dbconn.getPhonebookContacts,

            /**
            * It's the _getCtiPbContacts_ method provided by _dbconn_ module.
            *
            * @method getCtiPbContacts
            */
            getCtiPbContacts: dbconn.getCtiPbContacts,

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
            getVoicemailOldMsg: dbconn.getVoicemailOldMsg
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
