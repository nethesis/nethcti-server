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
            * It's the _getPhonebookContacts_ method provided by _phonebook_ module.
            *
            * @method getPhonebookContacts
            */
            getPhonebookContacts: phonebook.getPhonebookContacts
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
