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
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts in the cti phonebook
* @param {function} cb       The callback function
*/
function getPbContactsContains(term, username, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {

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
                dbconn.getCtiPbContactsContains(term, username, function (err, results) {
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
* Gets the phonebook contacts searching the phone number in the centralized and
* NethCTI phonebook databases.
*
* @method getPbContactsByNum
* @param {string}   number The phone number to search
* @param {function} cb     The callback function
*/
function getPbContactsByNum(number, cb) {
    try {
        // check parameters
        if (typeof number !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // object with all results
        var obj = {
            'centralized': [],
            'nethcti':     []
        };

        async.parallel([

            function (callback) {
                logger.info(IDLOG, 'search centralized phonebook contacts by number ' + number + ' using dbconn module');
                dbconn.getPbContactsByNum(number, function (err, results) {
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
                logger.info(IDLOG, 'search cti phonebook contacts by number ' + number + ' using dbconn module');
                dbconn.getCtiPbContactsByNum(number, function (err, results) {
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
                               obj['nethcti'].length + ' contacts in cti phonebook searching contacts by number ' + number);
            cb(err, obj);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Returns the cti phonebook contact.
*
* @method getCtiPbContact
* @param {string}   id The contact identifier in the cti phonebook database
* @param {function} cb The callback function
*/
function getCtiPbContact(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search cti phonebook contact using db contact id "' + id + '" by means dbconn module');
        dbconn.getCtiPbContact(id, function (err, result) {
            try {
                if (err) { // some error in the query
                    logger.error(IDLOG, err);
                    cb(err);
                    return;
                }
                cb(null, result);

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Returns all the speeddial contacts of the specified user.
*
* @method getPbSpeeddialContacts
* @param {string}   username The name of the user
* @param {function} cb       The callback function
*/
function getPbSpeeddialContacts(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search all speeddial contacts of the user "' + username + '" in the cti phonebook by means dbconn module');
        dbconn.getCtiPbSpeeddialContacts(username, function (err, result) {
            try {
                if (err) { // some error in the query
                    logger.error(IDLOG, err);
                    cb(err);
                    return;
                }
                cb(null, result);

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Deletes the cti phonebook contact.
*
* @method deleteCtiPbContact
* @param {string}   id The contact identifier in the cti phonebook database
* @param {function} cb The callback function
*/
function deleteCtiPbContact(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'delete cti phonebook contact using db contact id "' + id + '" by means dbconn module');
        dbconn.deleteCtiPbContact(id, function (err, result) {
            try {
                if (err) { // some error in the query
                    logger.error(IDLOG, err);
                    cb(err);
                    return;
                }
                cb(null, result);

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Gets the phonebook contacts whose name starts with the specified term,
* searching in the centralized and NethCTI phonebook databases.
*
* @method getPbContactsStartsWith
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts in the cti phonebook
* @param {function} cb       The callback function
*/
function getPbContactsStartsWith(term, username, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {

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
                dbconn.getCtiPbContactsStartsWith(term, username, function (err, results) {
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
* Gets the phonebook contacts whose name starts with a digit, searching in
* the centralized and NethCTI phonebook databases.
*
* @method getPbContactsStartsWithDigit
* @param {string}   username The name of the user used to search contacts in the cti phonebook
* @param {function} cb       The callback function
*/
function getPbContactsStartsWithDigit(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // object with all results
        var obj = {
            'centralized': [],
            'nethcti':     []
        };

        async.parallel([

            function (callback) {
                logger.info(IDLOG, 'search centralized phonebook contacts "starts with digit" by means dbconn module');
                dbconn.getPbContactsStartsWithDigit(function (err, results) {
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
                logger.info(IDLOG, 'search cti phonebook contacts "starts with digit" by means dbconn module');
                dbconn.getCtiPbContactsStartsWithDigit(username, function (err, results) {
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
                               obj['nethcti'].length + ' contacts in cti phonebook searching contacts "starts with digit"');
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
*   @param {string} data.type    The type of the contact
*   @param {string} data.name    The name of the contact
*   @param {string} [data.homeemail]
*   @param {string} [data.workemail]
*   @param {string} [data.homephone]
*   @param {string} [data.workphone]
*   @param {string} [data.cellphone]
*   @param {string} [data.fax]
*   @param {string} [data.title]
*   @param {string} [data.company]
*   @param {string} [data.notes]
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
        if (   typeof data         !== 'object'
            || typeof data.type    !== 'string' || typeof cb    !== 'function'
            || typeof data.creator !== 'string' || data.creator === ''
            || typeof data.name    !== 'string'
            || (data.type !== 'private' && data.type !== 'public' && data.type !== 'speeddial')) {

            throw new Error('wrong parameter');
        }

        // adapt data to the database
        data.owner_id = data.creator;
        delete data.creator;

        logger.info(IDLOG, 'save cti phonebook contact by means dbconn module');
        dbconn.saveCtiPbContact(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

// public interface
exports.setLogger                    = setLogger;
exports.setDbconn                    = setDbconn;
exports.getCtiPbContact              = getCtiPbContact;
exports.saveCtiPbContact             = saveCtiPbContact;
exports.deleteCtiPbContact           = deleteCtiPbContact;
exports.getPbContactsByNum           = getPbContactsByNum;
exports.getPbContactsContains        = getPbContactsContains;
exports.getPbSpeeddialContacts       = getPbSpeeddialContacts;
exports.getPbContactsStartsWith      = getPbContactsStartsWith;
exports.getPbContactsStartsWithDigit = getPbContactsStartsWithDigit;
