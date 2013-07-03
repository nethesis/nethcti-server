/**
* Provides the phonebook functions.
*
* @module phonebook
* @main phonebook
*/
var async = require('async');

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
* Gets the phonebook contacts searching in the centralized and
* NethCTI phonebook databases.
*
* @method getPbContactsContains
* @param {string} term The term to search. It can be a name or a number
* @param {function} cb The callback function
*/
function getPbContactsContains(term, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // object with all results
        var obj = {
            'centralized': [],
            'nethcti':     []
        };

        async.parallel([

            function (callback) {
                logger.info(IDLOG, 'search centralized phonebook contacts contains term "' + term + '" by means dbconn module');
                dbconn.getPbContactsContains(term, function (err, results) {
                    try {
                        if (err) { // some error in the query
                            logger.error(IDLOG, err);

                        } else { // add the result
                            obj['centralized'] = results;
                        }
                        callback();

                    } catch (err) {
                        logger.error(IDLOG, err.stack);
                        callback();
                    }
                });
            },
            function (callback) {
                logger.info(IDLOG, 'search cti phonebook contacts contains term "' + term + '" by means dbconn module');
                dbconn.getCtiPbContactsContains(term, function (err, results) {
                    try {
                        if (err) { // some error in the query
                            logger.error(IDLOG, err);

                        } else { // add the result
                            obj['nethcti'] = results;
                        }
                        callback();

                    } catch (err) {
                        logger.error(IDLOG, err.stack);
                        callback();
                    }
                });
            }

        ], function (err) {
            if (err) { logger.error(IDLOG, err); }

            logger.info(IDLOG, 'found ' + obj['centralized'].length + ' contacts in centralized phonebook and ' +
                               obj['nethcti'].length + ' contacts in cti phonebook searching contacts that contains ' +
                               'the term ' + term);
            cb(err, obj);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Gets the phonebook contacts whose name starts with the specified term
* searching in the centralized and NethCTI phonebook databases.
*
* @method getPbContactsStartsWith
* @param {string} term The term to search. It can be a name or a number
* @param {function} cb The callback function
*/
function getPbContactsStartsWith(term, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // object with all results
        var obj = {
            'centralized': [],
            'nethcti':     []
        };

        async.parallel([

            function (callback) {
                logger.info(IDLOG, 'search centralized phonebook contacts "starts with" term "' + term + '" by means dbconn module');
                dbconn.getPbContactsStartsWith(term, function (err, results) {
                    try {
                        if (err) { // some error in the query
                            logger.error(IDLOG, err);

                        } else { // add the result
                            obj['centralized'] = results;
                        }
                        callback();

                    } catch (err) {
                        logger.error(IDLOG, err.stack);
                        callback();
                    }
                });
            },
            function (callback) {
                logger.info(IDLOG, 'search cti phonebook contacts "starts with" term "' + term + '" by means dbconn module');
                dbconn.getCtiPbContactsStartsWith(term, function (err, results) {
                    try {
                        if (err) { // some error in the query
                            logger.error(IDLOG, err);

                        } else { // add the result
                            obj['nethcti'] = results;
                        }
                        callback();

                    } catch (err) {
                        logger.error(IDLOG, err.stack);
                        callback();
                    }
                });
            }

        ], function (err) {
            if (err) { logger.error(IDLOG, err); }

            logger.info(IDLOG, 'found ' + obj['centralized'].length + ' contacts in centralized phonebook and ' +
                               obj['nethcti'].length + ' contacts in cti phonebook searching contacts "starts with" ' +
                               'the term ' + term);
            cb(err, obj);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
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
exports.setLogger               = setLogger;
exports.setDbconn               = setDbconn;
exports.saveCtiPbContact        = saveCtiPbContact;
exports.getPbContactsContains   = getPbContactsContains;
exports.getPbContactsStartsWith = getPbContactsStartsWith;
