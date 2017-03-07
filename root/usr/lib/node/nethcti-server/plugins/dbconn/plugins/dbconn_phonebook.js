/**
* Provides database functions.
*
* @module dbconn
* @submodule plugins
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins/dbconn_phonebook]
*/
var IDLOG = '[plugins/dbconn_phonebook]';

/**
* The type name of the cti contacts imported into the centralized phonebook.
*
* @property NETHCTI_CENTRAL_TYPE
* @type {string}
* @private
* @default "nethcti"
*/
var NETHCTI_CENTRAL_TYPE = 'nethcti';

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
* The exported apis.
*
* @property apiList
* @type object
*/
var apiList = {};

/**
* The main architect dbconn component.
*
* @property compDbconnMain
* @type object
* @private
*/
var compDbconnMain;

/**
* Set the main dbconn architect component.
*
* @method setCompDbconnMain
* @param {object} comp The architect main dbconn component
* @static
*/
function setCompDbconnMain(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compDbconnMain = comp;
        logger.log(IDLOG, 'main dbconn component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

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
* Gets the phonebook contacts from the cti address book.
* It searches the number in the fields: _workphone, homephone, cellphone_
* and _extension_. It orders the results by _name_ and _company_ ascending.
* The cti address book is the mysql _cti\_phonebook_.
*
* @method getCtiPbContactsByNum
* @param {string}   number The phone number term to search
* @param {function} cb     The callback function
*/
function getCtiPbContactsByNum(number, cb) {
    try {
        // check parameters
        if (typeof number !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].findAll({
            where: [
                'workphone=? ' +
                'OR homephone=? ' +
                'OR cellphone=? ' +
                'OR extension=?',
                number, number, number, number
            ],
            order: 'name ASC, company ASC'

        }).then(function (results) {
            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].dataValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts by number ' + number);
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching cti phonebook contacts by number ' + number + ': ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Saves the new contact in the NethCTI phonebook that is in the
* _cti\_phonebook_ database table.
*
* @method saveCtiPbContact
* @param {object} data All the contact information to save in the database
*   @param {string} data.owner_id    The owner of the contact
*   @param {string} data.type        The type
*   @param {string} data.name        The name
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
        // check parameters
        if (typeof    data          !== 'object' || typeof cb     !== 'function'
            || typeof data.type     !== 'string' || data.type     === ''
            || typeof data.owner_id !== 'string' || data.owner_id === ''
            || typeof data.name     !== 'string' || data.name     === '') {

            throw new Error('wrong parameter');
        }

        // get the sequelize model already loaded
        var contact = compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].build(data);

        // save the model into the database
        contact.save()
        .then(function () { // the save was successful
            logger.info(IDLOG, 'cti phonebook contact saved successfully');
            cb();

        }, function (err) { // manage the error
            logger.error(IDLOG, 'saving cti phonebook contact: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook contacts from the centralized address book.
* It searches the number in the fields: _workphone, homephone_ and _cellphone_.
* It orders the results by _name_ and _company_ ascending.
* The centralized address book is the mysql _phonebook.phonebook_.
*
* @method getPbContactsByNum
* @param {string}   number The phone number term to search
* @param {function} cb     The callback function
*/
function getPbContactsByNum(number, cb) {
    try {
        // check parameters
        if (typeof number !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.PHONEBOOK].findAll({
            where: [
                '(' +
                    'workphone=? ' +
                    'OR homephone=? ' +
                    'OR cellphone=?' +
                ') AND (' +
                    'type != "' + NETHCTI_CENTRAL_TYPE + '"' +
                ')',
                number, number, number
            ],
            order: 'name ASC, company ASC'

        }).then(function (results) {
            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].dataValues;
            }

            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts by number ' + number);
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching centralized phonebook contacts by number ' + number + ': ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Deletes the specified phonebook contact from the _cti\_phonebook_ database table.
*
* @method deleteCtiPbContact
* @param {string}   id The cti database contact identifier
* @param {function} cb The callback function
*/
function deleteCtiPbContact(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].find({
            where: [ 'id=?', id  ]

        }).then(function (task) {
            if (task) {
                task.destroy().then(function () {
                    logger.info(IDLOG, 'cti phonebook contact with db id "' + id + '" has been deleted successfully');
                    cb();
                });
            } else {
                var str = 'deleting cti phonebook contact with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }
        }, function (err1) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contact with db id "' + id + '" to delete: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Modify the specified phonebook contact in the _cti\_phonebook_ database table.
*
* @method modifyCtiPbContact
* @param {object} data
*   @param {string} data.id     The unique identifier of the contact
*   @param {string} [data.type] The type of the contact
*   @param {string} [data.name] The name of the contact
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
function modifyCtiPbContact(data, cb) {
    try {
        // check parameters
        if (   typeof data    !== 'object'
            || typeof data.id !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].find({
            where: [ 'id=?', data.id  ]

        }).then(function (task) {
            if (task) {
	        task.updateAttributes(data).then(function () {
                    logger.info(IDLOG, 'cti phonebook contact with db id "' + data.id + '" has been modified successfully');
                    cb();
                });
            } else {
                var str = 'modify cti phonebook contact with db id "' + data.id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }
        }, function (err1) { // manage the error
            logger.error(IDLOG, 'searching cti phonebook contact with db id "' + data.id + '" to modify: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts from the centralized address book.
* The specified term is wrapped with '%' characters, so it search any
* occurrences of the term in the fields: _name, company, workphone, homephone_
* and _cellphone_. It orders the results by _name_ and _company_ ascending.
* The centralized address book is the mysql _phonebook.phonebook_.
*
* @method getPbContactsContains
* @param {string}   term The term to search. It can be a name or a number. It will wrapped
*                        with '%' characters to search any occurrences of the term in the database fields.
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb   The callback function
*/
function getPbContactsContains(term, offset, limit, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = '%' + term + '%';

        compDbconnMain.models[compDbconnMain.JSON_KEYS.PHONEBOOK].findAndCountAll({
            where: [
                '(' +
                    'name LIKE ? ' +
                    'OR company LIKE ? ' +
                    'OR workphone LIKE ? ' +
                    'OR homephone LIKE ? ' +
                    'OR cellphone LIKE ?' +
                ') AND (' +
                    'type != "' + NETHCTI_CENTRAL_TYPE + '"' +
                ')',
                term, term, term, term, term
            ],
            order: 'company ASC, name ASC',
            offset: (offset ? parseInt(offset) : 0),
            limit: (limit ? parseInt(limit) : null)
        }).then(function (results) {
            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts that contains "' + term + '"');
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching centralized phonebook contacts that contains "' + term + '": ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI and centralized phonebook databases.
* The specified term is wrapped with '%' characters, so it searches
* any occurrences of the term in the following fields: _name, company, workphone,
* homephone, cellphone and extension_. It orders the results by _name_ and _company_
* ascending. The NethCTI phonebook is the mysql _cti\_phonebook_.
*
* @method getAllContactsContains
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb       The callback function
*/
function getAllContactsContains(term, username, offset, limit, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = '%' + term + '%';

        var ctiPbBounds = '(owner_id=? OR type="public") ' +
        'AND ' +
        '(' +
            'name LIKE ? ' +
            'OR company LIKE ? ' +
            'OR workphone LIKE ? ' +
            'OR homephone LIKE ? ' +
            'OR cellphone LIKE ? ' +
            'OR extension LIKE ?'  +
        ')';

        var pbBounds = '(' +
            'name LIKE ? ' +
            'OR company LIKE ? ' +
            'OR workphone LIKE ? ' +
            'OR homephone LIKE ? ' +
            'OR cellphone LIKE ?' +
          ') AND (' +
            'type != "' + NETHCTI_CENTRAL_TYPE + '"' +
          ')';

        __getAllContacts(
          ctiPbBounds,
          pbBounds,
          [username, term, term, term, term, term, term, term, term, term, term, term],
          offset, limit,
          function(err, res) {
            if (err) {
              logger.error(IDLOG, 'searching cti and centralized phonebooks contacts that contains "' + term + '": ' + err.toString());
              cb(err.toString());
            } else {
              logger.info(IDLOG, res.count + ' results by searching cti and centralized phonebooks contacts that contains "' + term + '"');
              cb(null, res);
            }
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts from the centralized address book.
* At the end of the specified term is added the '%' character,
* so it searches the entries whose fields _name_ and _company_
* starts with the term. It orders the results by _name_ and _company_ ascending.
* The centralized address book is the mysql _phonebook.phonebook_.
*
* @method getPbContactsStartsWith
* @param {string} term The term to search. It can be a name or a number. It
*   will ended with '%' character to search any contacts with names that starts
*   with the term.
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb The callback function
*/
function getPbContactsStartsWith(term, offset, limit, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = term + '%';

        compDbconnMain.models[compDbconnMain.JSON_KEYS.PHONEBOOK].findAndCountAll({
            where: [
                '(' +
                    'name LIKE ? ' +
                    'OR company LIKE ?' +
                ') AND (' +
                    'type != "' + NETHCTI_CENTRAL_TYPE + '"' +
                ')',
                term, term
            ],
            order: 'company ASC, name ASC',
            offset: (offset ? parseInt(offset) : 0),
            limit: (limit ? parseInt(limit) : null)
        }).then(function (results) {
            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts with names starts with "' + term + '"');
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching centralized phonebook contacts whose names starts with "' + term + '": ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook contacts from the centralized and nethcti address book.
* At the end of the specified term is added the '%' character,
* so it searches the entries whose fields _name_ and _company_
* starts with the term. It orders the results by _name_ and _company_ ascending.
* The centralized address book is the mysql _phonebook.phonebook_.
*
* @method getAllContactsStartsWith
* @param {string} term The term to search. It can be a name or a number. It
*   will ended with '%' character to search any contacts with names that starts
*   with the term.
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb The callback function
*/
function getAllContactsStartsWith(term, username, offset, limit, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = term + '%';

        var ctiPbBounds = '(owner_id=? OR type="public") ' +
        'AND ' +
        '(name LIKE ? OR company LIKE ?)';

        var pbBounds = '(name LIKE ? OR company LIKE ?)' +
            ' AND (type != "' + NETHCTI_CENTRAL_TYPE + '")';

        __getAllContacts(
          ctiPbBounds,
          pbBounds,
          [term, term, username, term, term],
          offset, limit,
          function(err, res) {
            if (err) {
              logger.error(IDLOG, 'searching cti and centralized phonebook contacts whose names starts with "' + term + '": ' + err.toString());
              cb(err.toString());
            } else {
              logger.info(IDLOG, res.count + ' results by searching cti and centralized phonebook contacts with names starts with "' + term + '"');
              cb(null, res);
            }
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI phonebook database.
* The specified term is wrapped with '%' characters, so it searches
* any occurrences of the term in the following fields: _name, company, workphone,
* homephone, cellphone and extension_. It orders the results by _name_ and _company_
* ascending. The NethCTI phonebook is the mysql _cti\_phonebook_.
*
* @method getCtiPbContactsContains
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb       The callback function
*/
function getCtiPbContactsContains(term, username, offset, limit, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = '%' + term + '%';

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].findAndCountAll({
            where: [
                '(owner_id=? OR type="public") ' +
                'AND ' +
                '(' +
                    'name LIKE ? ' +
                    'OR company LIKE ? ' +
                    'OR workphone LIKE ? ' +
                    'OR homephone LIKE ? ' +
                    'OR cellphone LIKE ? ' +
                    'OR extension LIKE ?'  +
                ')',
                username, term, term, term, term, term, term
            ],
            order: 'company ASC, name ASC',
            offset: (offset ? parseInt(offset) : 0),
            limit: (limit ? parseInt(limit) : null)
        }).then(function (results) {
            logger.info(IDLOG, results.count + ' results by searching cti phonebook contacts that contains "' + term + '"');
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching cti phonebook contacts that contains "' + term + '": ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the speeddial contacts of the specified user searching in
* the NethCTI phonebook database. It searches all entries of he user
* where _type_ field is equal to "speeddial". It orders the results by
* _name_ and _company_ ascending. The NethCTI phonebook is the mysql
* _cti\_phonebook_.
*
* @method getCtiPbSpeeddialContacts
* @param {string}   username The name of the user used to search speeddial contacts
* @param {function} cb       The callback function
*/
function getCtiPbSpeeddialContacts(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].findAll({
            where: [
                'owner_id=? AND type="speeddial"',
                username
            ],
            order: 'name ASC, company ASC'

        }).then(function (results) {
            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].dataValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook speeddial contacts of the user "' + username + '"');
            cb(null, results);

        }, function (err) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook speeddial contacts of the user "' + username + '": ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI phonebook database.
* Tt searches the entries whose fields _name_ and _company_ starts with a digit.
* It orders the results by _name_ and _company_ ascending. The NethCTI
* phonebook is the mysql _cti\_phonebook_.
*
* @method getCtiPbContactsStartsWithDigit
* @param {string}   username The name of the user used to search contacts
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb       The callback function
*/
function getCtiPbContactsStartsWithDigit(username, offset, limit, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].findAndCountAll({
            where: [
                '(owner_id=? OR type="public") ' +
                'AND ' +
                '(name REGEXP "^[0-9]" OR company REGEXP "^[0-9]")',
                username
            ],
            order: 'company ASC, name ASC',
            offset: (offset ? parseInt(offset) : 0),
            limit: (limit ? parseInt(limit) : null)
        }).then(function (results) {
            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts whose names starts with a digit');
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching cti phonebook contacts whose names starts with a digit: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook and nethcti contacts searching in the NethCTI phonebook database.
* Tt searches the entries whose fields _name_ and _company_ starts with a digit.
* It orders the results by _name_ and _company_ ascending. The NethCTI
* phonebook is the mysql _cti\_phonebook_.
*
* @method getAllContactsStartsWithDigit
* @param {string}   username The name of the user used to search contacts
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb       The callback function
*/
function getAllContactsStartsWithDigit(username, offset, limit, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        var ctiPbBounds = '(owner_id=? OR type="public") ' +
          'AND ' +
          '(name REGEXP "^[0-9]" OR company REGEXP "^[0-9]")';

        var pbBounds =   '(' +
              'name REGEXP "^[0-9]" ' +
              'OR company REGEXP "^[0-9]"' +
            ') AND (' +
              'type != "' + NETHCTI_CENTRAL_TYPE + '"' +
            ')';

        __getAllContacts(
          ctiPbBounds,
          pbBounds,
          [username],
          offset, limit,
          function(err, res) {
            if (err) {
              logger.error(IDLOG, 'searching cti phonebook contacts whose names starts with a digit: ' + err.toString());
              cb(err.toString());
            } else {
              logger.info(IDLOG, res.count + ' results by searching cti phonebook contacts whose names starts with a digit');
              cb(null, res);
            }
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook contacts from the centralized address book.
* It searches the entries whose fields _name_ and _company_
* starts with a digit. It orders the results by _name_ and _company_
* ascending. The centralized address book is the mysql _phonebook.phonebook_.
*
* @method getPbContactsStartsWithDigit
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb The callback function
*/
function getPbContactsStartsWithDigit(offset, limit, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function') {
            throw new Error('wrong parameters');
          }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.PHONEBOOK].findAndCountAll({
            where: [
                '(' +
                    'name REGEXP "^[0-9]" ' +
                    'OR company REGEXP "^[0-9]"' +
                ') AND (' +
                    'type != "' + NETHCTI_CENTRAL_TYPE + '"' +
                ')'
            ],
            order: 'company ASC, name ASC',
            offset: (offset ? parseInt(offset) : 0),
            limit: (limit ? parseInt(limit) : null)
        }).then(function (results) {
            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts with names starts with a digit');
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching centralized phonebook contacts whose names starts with a digit: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI phonebook database.
* At the end of the specified term is added the '%' character, so it searches
* the entries whose fields _name_ and _company_ starts with the term.
* It orders the results by _name_ and _company_ ascending. The NethCTI phonebook
* is the mysql _cti\_phonebook_.
*
* @method getCtiPbContactsStartsWith
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts
* @param {string}   offset  The offset results start from
* @param {string}   limit   The results limit
* @param {function} cb       The callback function
*/
function getCtiPbContactsStartsWith(term, username, offset, limit, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // add '%' to search all contacts whose names starts with the term
        term = term + '%';

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].findAndCountAll({
            where: [
                '(owner_id=? OR type="public") ' +
                'AND ' +
                '(name LIKE ? OR company LIKE ?)',
                username, term, term
            ],
            order: 'company ASC, name ASC',
            offset: (offset ? parseInt(offset) : 0),
            limit: (limit ? parseInt(limit) : null)
        }).then(function (results) {
            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts whose names starts with "' + term + '"');
            cb(null, results);
        }, function (err) { // manage the error
            logger.error(IDLOG, 'searching cti phonebook contacts whose names starts with "' + term + '": ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the cti phonebook contact. It searches the _id_ field in the
* _cti\_phonebook_ database table.
*
* @method getCtiPbContact
* @param {string}   id The cti database contact identifier
* @param {function} cb The callback function
*/
function getCtiPbContact(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].find({
            where: [ 'id=?', id  ]

        }).then(function (result) {
            if (result && result.dataValues) {
                logger.info(IDLOG, 'search cti phonebook contact with db id "' + id + '" has been successful');
                cb(null, result.dataValues);

            } else {
                logger.info(IDLOG, 'search cti phonebook contact with db id "' + id + '": not found');
                cb(null, {});
            }
        }, function (err1) { // manage the error
            logger.error(IDLOG, 'search cti phonebook contact with db id "' + id + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
 * Utility private function
 * Execute a query (with count) on both cti and centralize phonebooks
 * through a union.
 *
 * @method __getAllContacts
 * @param {string}    bounds1 First query of union bounds
 * @param {string}    bounds2 Second query of union bounds
 * @param {array}     replacements Replacements for queries
 * @param {string}    offset The offset of results
 * @param {string}    limit The limit of results
 * @param {function}  cb The callback function
 */
function __getAllContacts(ctiPbBounds, pbBounds, replacements, offset, limit, cb) {
    var fields = 'id,' +
        'owner_id,' +
        'type,' +
        'homeemail,' +
        'workemail,' +
        'homephone,' +
        'workphone,' +
        'cellphone,' +
        'fax,' +
        'title,' +
        'company,' +
        'notes,' +
        'name,' +
        'homestreet,' +
        'homepob,' +
        'homecity,' +
        'homeprovince,' +
        'homepostalcode,' +
        'homecountry,' +
        'workstreet,' +
        'workpob,' +
        'workcity,' +
        'workprovince,' +
        'workpostalcode,' +
        'workcountry,' +
        'url';

    var query = '(SELECT ' + fields + ', extension, speeddial_num, \'cti\' AS source' +
      ' FROM nethcti2.cti_phonebook' +
        ' WHERE ' + ctiPbBounds + ')' +
      ' UNION ' +
      '(SELECT ' + fields + ', \'\' AS extension, \'\' AS speeddial_num, \'centralized\' AS source' +
      ' FROM phonebook.phonebook' +
        ' WHERE ' + pbBounds + ')' +
      ' ORDER BY company ASC, name ASC' +
      (offset && limit ? ' LIMIT ' + offset + ',' + limit : '');

    var queryCount = 'SELECT COUNT(*) AS total FROM ' +
      '(SELECT id FROM nethcti2.cti_phonebook WHERE ' + ctiPbBounds +
      ' UNION ALL' +
      ' SELECT id FROM phonebook.phonebook WHERE ' + pbBounds + ') s';

    compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].query(
      query, {
        replacements: replacements
      }).then(function (results) {
        compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.CTI_PHONEBOOK].query(
          queryCount, {
            replacements: replacements
          }).then(function (resultsCount) {
            cb(null, { count: resultsCount[0][0].total, rows : results[0] });
          }, function (err) {
            cb(err, null);
          });
    }, function (err) {
      cb(err, null);
    });

    compDbconnMain.incNumExecQueries();
}

apiList.getCtiPbContact                 = getCtiPbContact;
apiList.saveCtiPbContact                = saveCtiPbContact;
apiList.getPbContactsByNum              = getPbContactsByNum;
apiList.deleteCtiPbContact              = deleteCtiPbContact;
apiList.modifyCtiPbContact              = modifyCtiPbContact;
apiList.getPbContactsContains           = getPbContactsContains;
apiList.getCtiPbContactsByNum           = getCtiPbContactsByNum;
apiList.getAllContactsContains          = getAllContactsContains;
apiList.getPbContactsStartsWith         = getPbContactsStartsWith;
apiList.getCtiPbContactsContains        = getCtiPbContactsContains;
apiList.getCtiPbSpeeddialContacts       = getCtiPbSpeeddialContacts;
apiList.getCtiPbContactsStartsWith      = getCtiPbContactsStartsWith;
apiList.getAllContactsStartsWith        = getAllContactsStartsWith;
apiList.getPbContactsStartsWithDigit    = getPbContactsStartsWithDigit;
apiList.getCtiPbContactsStartsWithDigit = getCtiPbContactsStartsWithDigit;
apiList.getAllContactsStartsWithDigit   = getAllContactsStartsWithDigit;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
