/**
* Provides the history call functions.
*
* @module history_call
* @main history_call
*/

/**
* Provides the history call functionalities.
*
* @class history_call
* @static
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [history_call]
*/
var IDLOG = '[history_call]';

/**
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The dbconn module.
*
* @property dbconn
* @type object
* @private
*/
var dbconn;

/**
* Set the logger to be used.
*
* @method setLogger
* @param {object} log The logger object. It must have at least
* three methods: _info, warn and error_ as console object.
* @static
*/
function setLogger(log) {
    try {
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

---------------------
/**
* Gets the centralized phonebook contacts.
*
* @method getPhonebookContacts
* @param {string} term The term to search. It can be a name or a number
* @param {function} cb The callback function
*/
function getPhonebookContacts(term, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = '%' + term + '%';

        logger.info(IDLOG, 'search centralized phonebook contacts by means dbconn module');
        dbconn.getPhonebookContacts(term, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the module to be used for database functionalities.
*
* @method setDbconn
* @param {object} dbConnMod The dbconn module.
*/
function setDbconn(dbconnMod) {
    try {
        // check parameter
        if (typeof dbconnMod !== 'object') { throw new Error('wrong dbconn object'); }
        dbconn = dbconnMod;
        logger.info(IDLOG, 'set dbconn module');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.setLogger            = setLogger;
exports.setDbconn            = setDbconn;
