    /**
* The architect component that exposes _phonebook_ module.
*
* @class arch_phonebook
* @module phonebook
*/
var phonebook = require('./phonebook');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_phonebook]
*/
var IDLOG = '[arch_phonebook]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        phonebook: {
            /**
            * It's the _getPbContactsContains_ method provided by _phonebook_ module.
            *
            * @method getPbContactsContains
            */
            getPbContactsContains: phonebook.getPbContactsContains,

            /**
            * It's the _getPbContactsStartsWith_ method provided by _phonebook_ module.
            *
            * @method getPbContactsStartsWith
            */
            getPbContactsStartsWith: phonebook.getPbContactsStartsWith,

            /**
            * It's the _getPbContactsStartsWithDigit_ method provided by _phonebook_ module.
            *
            * @method getPbContactsStartsWithDigit
            */
            getPbContactsStartsWithDigit: phonebook.getPbContactsStartsWithDigit,

            /**
            * It's the _saveCtiPbContact_ method provided by _phonebook_ module.
            *
            * @method saveCtiPbContact
            */
            saveCtiPbContact: phonebook.saveCtiPbContact,

            /**
            * It's the _getCtiPbContact_ method provided by _phonebook_ module.
            *
            * @method getCtiPbContact
            */
            getCtiPbContact: phonebook.getCtiPbContact,

            /**
            * It's the _deleteCtiPbContact_ method provided by _phonebook_ module.
            *
            * @method deleteCtiPbContact
            */
            deleteCtiPbContact: phonebook.deleteCtiPbContact,

            /**
            * It's the _getPbSpeeddialContacts_ method provided by _phonebook_ module.
            *
            * @method getPbSpeeddialContacts
            */
            getPbSpeeddialContacts: phonebook.getPbSpeeddialContacts,

            /**
            * It's the _getPbContactsByNum_ method provided by _phonebook_ module.
            *
            * @method getPbContactsByNum
            */
            getPbContactsByNum: phonebook.getPbContactsByNum
        }
    });

    try {
        var dbconn = imports.dbconn;

        phonebook.setLogger(logger);
        phonebook.setDbconn(dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
