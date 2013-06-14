/**
* Provides the phonebook functions.
*
* @module phonebook
* @main phonebook
*/

/**
* Provides the phonebook functionalities.
*
* @class phonebook
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
* @default [phonebook]
*/
var IDLOG = '[phonebook]';

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

/**
* Save the contact in the NethCTI phonebook database using dbconn module.
*
* @method saveCtiPbContact
* @param {object} data
*   @param {string} data.creator The creator identifier of the contact
*   @param {string} data.type The type of the contact
*   @param {string} [data.homeemail]
*   @param {string} [data.workemail]
*   @param {string} [data.homephone]
*   @param {string} [data.workphone]
*   @param {string} [data.cellphone]
*   @param {string} [data.fax]
*   @param {string} [data.title]
*   @param {string} [data.company]
*   @param {string} [data.notes]
*   @param {string} [data.name]
*   @param {string} [data.homestreet]
*   @param {string} [data.homepob]
*   @param {string} [data.homecity]
*   @param {string} [data.homeprovince]
*   @param {string} [data.homepostalcode]
*   @param {string} [data.homecountry]
*   @param {string} [data.workstreet]
*   @param {string} [data.workpob]
*   @param {string} [data.workcity]
*   @param {string} [data.workprovince]
*   @param {string} [data.workpostalcode]
*   @param {string} [data.workcountry]
*   @param {string} [data.url]
*   @param {string} [data.extension]
*   @param {string} [data.speeddial_num]
* @param {function} cb The callback function
*/
function saveCtiPbContact(data, cb) {
    try {
        // check parameter
        if (typeof    data         !== 'object' || typeof cb    !== 'function'
            || typeof data.type    !== 'string' || data.type    === ''
            || typeof data.creator !== 'string' || data.creator === '') {

            throw new Error('wrong parameter');
        }

        // adapt data to the database
        data.owner_id = data.creator;

        logger.info(IDLOG, 'save cti phonebook contact by means dbconn module');
        dbconn.saveCtiPbContact(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

// public interface
exports.setLogger            = setLogger;
exports.setDbconn            = setDbconn;
exports.saveCtiPbContact     = saveCtiPbContact;
exports.getPhonebookContacts = getPhonebookContacts;
