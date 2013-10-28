/**
* Provides the database functions.
*
* @module dbconn
* @main dbconn
*/

/**
* Provides the database functionalities.
*
* @class dbconn
* @static
*/
var fs        = require('fs');
var moment    = require('moment');
var iniparser = require('iniparser');
var Sequelize = require("sequelize");

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [dbconn]
*/
var IDLOG = '[dbconn]';

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
* The default database file socket.
*
* @property DB_FILE_SOCK
* @type string
* @private
* @default "/var/lib/mysql/mysql.sock"
*/
var DB_FILE_SOCK = '/var/lib/mysql/mysql.sock';

/**
* The prefix for all customer card name.
*
* @property CUSTOMER_CARD
* @type {object}
* @private
* @default { PREFIX_NAME: 'customer_card_' }
*/
var CUSTOMER_CARD = {
    PREFIX_NAME: 'customer_card_'
};

/**
* The key names of the JSON files that contains database
* connection informations.
*
* @property JSON_KEYS
* @type {object}
* @private
* @default {
    POSTIT:       'postit',
    PHONEBOOK:    'phonebook',
    CALLER_NOTE:  'caller_note',
    HISTORY_CALL: 'history_call'
}
*/
var JSON_KEYS = {
    POSTIT:        'postit',
    VOICEMAIL:     'voicemail',
    PHONEBOOK:     'phonebook',
    SMS_HISTORY:   'sms_history',
    CALLER_NOTE:   'caller_note',
    HISTORY_CALL:  'history_call',
    CTI_PHONEBOOK: 'cti_phonebook',
    CEL:           'cel'
};

/**
* The configurations to be used by database connections.
*
* @property config
* @type object
* @private
* @default {}
*/
var dbConfig = {};

/**
* The database connections.
*
* @property dbConn
* @type object
* @private
* @default {}
*/
var dbConn = {};

/**
* It contains the sequelize models.
*
* @property models
* @type object
* @private
* @default {}
*/
var models = {};

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
* Set the configurations to be use by database connections.
*
* @method config
* @param {object} obj The object that contains the configurations
*   @param {array} [obj.file] The list of the files
*/
function config(obj) {
    try {
        // check parameter
        if (typeof obj !== 'object') { throw new Error('wrong parameter'); }

        // configurations by means of files. The files must have the
        // JSON syntax. The "file" key has an array of values conatining
        // the list of one or more file paths
        if (obj.file) {

            var i, k, json, path;
            var fileList = obj.file; // the list of file paths
            for (i = 0; i < fileList.length; i++) {
                
                path = fileList[i];

                if (fs.existsSync(path)) { // check the file existence

                    json = require(path); // read the file
                    logger.info(IDLOG, 'configuration file ' + path + ' has been read');

                    // transfer the file content in the memory
                    for (k in json) { dbConfig[k] = json[k]; }

                } else {
                    logger.warn(IDLOG, 'configuration file ' + path + ' doesn\'t exists');
                }
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/*
* Start the execution of the module.
*
* @method start
*/
function start() {
    try {
        initConnections();
        logger.info(IDLOG, 'database connections initialized');

        importModels();
        logger.info(IDLOG, 'sequelize models imported');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Saves the new contact in the NethCTI phonebook that is in the
* _nethcti.cti\_phonebook_ database table.
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
        var contact = models[JSON_KEYS.CTI_PHONEBOOK].build(data);

        // save the model into the database
        contact.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'cti phonebook contact saved successfully');
            cb(null);

        }).error(function (err) { // manage the error
            logger.error(IDLOG, 'saving cti phonebook contact: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Save new post-it in the database.
*
* @method savePostit
* @param {string}   creator   The creator name of the post-it
* @param {string}   text      The message text
* @param {string}   recipient The recipient of the message
* @param {function} cb        The callback function
*/
function savePostit(creator, text, recipient, cb) {
    try {
        // check parameters
        if (   typeof creator   !== 'string' || typeof text !== 'string'
            || typeof recipient !== 'string' || typeof cb   !== 'function') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var postit = models[JSON_KEYS.POSTIT].build({
            text:      text,
            creator:   creator,
            creation:  moment().format('YYYY-MM-DD HH:mm:ss'),
            recipient: recipient
        });

        // save the model into the database
        postit.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'postit saved successfully');
            cb(null);

        }).error(function (err) { // manage the error
            logger.error(IDLOG, 'saving postit: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the post-it from the _nethcti.postit_ database table using its unique database identifier.
*
* @method getPostit
* @param {string}   id The post-it unique identifier. It's the _id_ column of the _nethcti.postit_ database table
* @param {function} cb The callback function
*/
function getPostit(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.POSTIT].find({
            where: [ 'id=?', id  ]

        }).success(function (result) {

            if (result && result.selectedValues) {
                logger.info(IDLOG, 'search postit with db id "' + id + '" has been successful');
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'search postit with db id "' + id + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search postit with db id "' + id + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Save the the caller note in the database.
*
* @method saveCallerNote
* @param {object} data
*   @param {string}  data.number      The caller/called number that is associated with the note
*   @param {string}  data.creator     The creator of the caller note
*   @param {string}  data.text        The text of the note
*   @param {boolean} data.reservation The reservation option. If the creator has booked the callback from the expressed number
*   @param {boolean} data.public      True if the caller note visibility is public, false otherwise
*   @param {string}  data.expiration  The expiration date and time of the caller note. It must be expressed in YYYY-MM-DD HH:mm:ss format
* @param {function}  cb The callback function
*/
function saveCallerNote(data, cb) {
    try {
        // check parameter
        if (typeof data                   !== 'object'
            || typeof data.creator        !== 'string'  || typeof data.number     !== 'string'
            || typeof data.reservation    !== 'boolean' || typeof data.expiration !== 'string'
            || typeof data.public         !== 'boolean' || typeof data.text       !== 'string') {

            throw new Error('wrong parameter');
        }

        // get the sequelize model already loaded
        var callerNote = models[JSON_KEYS.CALLER_NOTE].build({
            text:        data.text,
            number:      data.number,
            public:      data.public,
            creator:     data.creator,
            creation:    moment().format('YYYY-MM-DD HH:mm:ss'),
            expiration:  data.expiration,
            reservation: data.reservation
        });

        // save the model into the database
        callerNote.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'caller note saved successfully');
            cb(null);

        }).error(function (err) { // manage the error
            logger.error(IDLOG, 'saving caller note: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Load all sequelize models that are present in the default
* directory as a file, one for each model. This method must
* be called after _initConnections_ method.
*
* @method importModels
* @private
*/
function importModels() {
    try {
        var k, path;
        for (k in dbConn) {
            path = __dirname + '/sequelize_models/' + k;
            if (fs.existsSync(path + '.js') === true) {
                models[k] = dbConn[k].import(path);
                logger.info(IDLOG, 'loaded sequelize model ' + path);
            }
        }
        logger.info(IDLOG, 'all sequelize models have been imported');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initialize all database connections.
*
* @method initConnections
* @private
*/
function initConnections() {
    try {
        var k, sequelize;
        for (k in dbConfig) {

            if (dbConfig[k].dbtype === 'mysql') {

                var sequelize = new Sequelize(dbConfig[k].dbname, dbConfig[k].dbuser, dbConfig[k].dbpassword, {
                    port:    DB_FILE_SOCK,
                    host:    dbConfig[k].dbhost,
                    define:  {
                        charset:         'utf8',
                        timestamps:      false,
                        freezeTableName: true
                    },
                    dialect: dbConfig[k].dbtype
                });

                dbConn[k] = sequelize;
                logger.info(IDLOG, 'initialized db connection with ' + dbConfig[k].dbtype + ' ' + dbConfig[k].dbname + ' ' + dbConfig[k].dbhost + ':' + DB_FILE_SOCK);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
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
* @param {function} cb   The callback function
*/
function getPbContactsContains(term, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = '%' + term + '%';

        models[JSON_KEYS.PHONEBOOK].findAll({
            where: [
                'name LIKE ? ' +
                'OR company LIKE ? ' +
                'OR workphone LIKE ? ' +
                'OR homephone LIKE ? ' +
                'OR cellphone LIKE ?',
                term, term, term, term, term
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts that contains "' + term + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching centralized phonebook contacts that contains "' + term + '": ' + err.toString());
            cb(err.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
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

        models[JSON_KEYS.PHONEBOOK].findAll({
            where: [
                'workphone=? ' +
                'OR homephone=? ' +
                'OR cellphone=?',
                number, number, number
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts by number ' + number);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching centralized phonebook contacts by number ' + number + ': ' + err.toString());
            cb(err.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts from the cti address book.
* It searches the number in the fields: _workphone, homephone, cellphone_
* and _extension_. It orders the results by _name_ and _company_ ascending.
* The cti address book is the mysql _nethcti.cti\_phonebook_.
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

        models[JSON_KEYS.CTI_PHONEBOOK].findAll({
            where: [
                'workphone=? ' +
                'OR homephone=? ' +
                'OR cellphone=? ' +
                'OR extension=?',
                number, number, number, number
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts by number ' + number);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contacts by number ' + number + ': ' + err.toString());
            cb(err.toString());
        });

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
* @param {function} cb The callback function
*/
function getPbContactsStartsWith(term, cb) {
    try {
        // check parameters
        if (typeof term !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = term + '%';

        models[JSON_KEYS.PHONEBOOK].findAll({
            where: [
                'name LIKE ? ' +
                'OR company LIKE ?',
                term, term
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts with names starts with "' + term + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching centralized phonebook contacts whose names starts with "' + term + '": ' + err.toString());
            cb(err.toString());
        });

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
* @param {function} cb The callback function
*/
function getPbContactsStartsWithDigit(cb) {
    try {
        // check parameters
        if (typeof cb !== 'function') { throw new Error('wrong parameters'); }

        models[JSON_KEYS.PHONEBOOK].findAll({
            where: [
                'name REGEXP "^[0-9]" ' +
                'OR company REGEXP "^[0-9]"'
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts with names starts with a digit');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching centralized phonebook contacts whose names starts with a digit: ' + err.toString());
            cb(err.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the cti phonebook contact. It searches the _id_ field in the
* _nethcti.cti\_phonebook_ database table.
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

        models[JSON_KEYS.CTI_PHONEBOOK].find({
            where: [ 'id=?', id  ]

        }).success(function (result) {

            if (result && result.selectedValues) {
                logger.info(IDLOG, 'search cti phonebook contact with db id "' + id + '" has been successful');
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'search cti phonebook contact with db id "' + id + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search cti phonebook contact with db id "' + id + '" failed: ' + err1.toString());
            cb(err1.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns the caller note. It searches the _id_ field in the
* _nethcti.caller\_note_ database table.
*
* @method getCallerNote
* @param {string}   id The caller note identifier
* @param {function} cb The callback function
*/
function getCallerNote(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.CALLER_NOTE].find({
            where: [ 'id=?', id  ]

        }).success(function (result) {

            if (result && result.selectedValues) {
                logger.info(IDLOG, 'search caller note with db id "' + id + '" has been successful');
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'search caller note with db id "' + id + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search caller note with db id "' + id + '" failed: ' + err1.toString());
            cb(err1.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Deletes the specified phonebook contact from the _nethcti.cti\_phonebook_ database table.
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

        models[JSON_KEYS.CTI_PHONEBOOK].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.destroy().success(function () {
                    logger.info(IDLOG, 'cti phonebook contact with db id "' + id + '" has been deleted successfully');
                    cb();
                });

            } else {
                var str = 'deleting cti phonebook contact with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contact with db id "' + id + '" to delete: ' + err1.toString());
            cb(err1.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Deletes the specified caller note from the _nethcti.caller\_note_ database table.
*
* @method deleteCallerNote
* @param {string}   id The database caller note identifier
* @param {function} cb The callback function
*/
function deleteCallerNote(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.CALLER_NOTE].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.destroy().success(function () {
                    logger.info(IDLOG, 'caller note with db id "' + id + '" has been deleted successfully');
                    cb();
                });

            } else {
                var str = 'deleting caller note with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching caller note with db id "' + id + '" to delete: ' + err1.toString());
            cb(err1.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Modify the specified phonebook contact in the _nethcti.cti\_phonebook_ database table.
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

        models[JSON_KEYS.CTI_PHONEBOOK].find({
            where: [ 'id=?', data.id  ]

        }).success(function (task) {

            if (task) {

                task.updateAttributes(data).success(function () {
                    logger.info(IDLOG, 'cti phonebook contact with db id "' + data.id + '" has been modified successfully');
                    cb();
                });

            } else {
                var str = 'modify cti phonebook contact with db id "' + data.id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contact with db id "' + data.id + '" to modify: ' + err1.toString());
            cb(err1.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Modify the specified caller note in the _nethcti.caller\_note_ database table.
*
* @method modifyCallerNote
* @param {object} data
*   @param {string}  data.id            The unique identifier of the caller note in the database
*   @param {string}  [data.number]      The caller/called number that is associated with the note
*   @param {string}  [data.text]        The text of the note
*   @param {boolean} [data.reservation] The reservation option. If the creator has booked the callback from the expressed number
*   @param {boolean} [data.public]      True if the caller note visibility is public, false otherwise
*   @param {string}  [data.expiration]  The expiration date and time of the caller note. It must be expressed in YYYY-MM-DD HH:mm:ss format
* @param {function}  cb The callback function
*/
function modifyCallerNote(data, cb) {
    try {
        // check parameters
        if (   typeof data    !== 'object'
            || typeof data.id !== 'string' || typeof cb !== 'function'
            || (data.number      && typeof data.number      !== 'string' )
            || (data.reservation && typeof data.reservation !== 'boolean')
            || (data.expiration  && typeof data.expiration  !== 'string' )
            || (data.public      && typeof data.public      !== 'boolean')
            || (data.text        && typeof data.text        !== 'string' ) ) {

            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.CALLER_NOTE].find({
            where: [ 'id=?', data.id  ]

        }).success(function (task) {

            if (task) {

                task.updateAttributes(data).success(function () {
                    logger.info(IDLOG, 'caller note with db id "' + data.id + '" has been modified successfully');
                    cb();
                });

            } else {
                var str = 'modify caller note with db id "' + data.id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching caller note with db id "' + data.id + '" to modify: ' + err1.toString());
            cb(err1.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI phonebook database.
* The specified term is wrapped with '%' characters, so it searches
* any occurrences of the term in the following fields: _name, company, workphone,
* homephone, cellphone and extension_. It orders the results by _name_ and _company_
* ascending. The NethCTI phonebook is the mysql _nethcti.cti\_phonebook_.
*
* @method getCtiPbContactsContains
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts
* @param {function} cb       The callback function
*/
function getCtiPbContactsContains(term, username, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // add '%' to search all terms with any number of characters, even zero characters
        term = '%' + term + '%';

        models[JSON_KEYS.CTI_PHONEBOOK].findAll({
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
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts that contains "' + term + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contacts that contains "' + term + '": ' + err.toString());
            cb(err.toString());
        });

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
* _nethcti.cti\_phonebook_.
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

        models[JSON_KEYS.CTI_PHONEBOOK].findAll({
            where: [
                'owner_id=? AND type="speeddial"',
                username
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook speeddial contacts of the user "' + username + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook speeddial contacts of the user "' + username + '": ' + err.toString());
            cb(err.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI phonebook database.
* At the end of the specified term is added the '%' character, so it searches
* the entries whose fields _name_ and _company_ starts with the term.
* It orders the results by _name_ and _company_ ascending. The NethCTI phonebook
* is the mysql _nethcti.cti\_phonebook_.
*
* @method getCtiPbContactsStartsWith
* @param {string}   term     The term to search. It can be a name or a number
* @param {string}   username The name of the user used to search contacts
* @param {function} cb       The callback function
*/
function getCtiPbContactsStartsWith(term, username, cb) {
    try {
        // check parameters
        if (   typeof term     !== 'string'
            || typeof username !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // add '%' to search all contacts whose names starts with the term
        term = term + '%';

        models[JSON_KEYS.CTI_PHONEBOOK].findAll({
            where: [
                '(owner_id=? OR type="public") ' +
                'AND ' +
                '(name LIKE ? OR company LIKE ?)',
                username, term, term
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts whose names starts with "' + term + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contacts whose names starts with "' + term + '": ' + err.toString());
            cb(err.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the phonebook contacts searching in the NethCTI phonebook database.
* Tt searches the entries whose fields _name_ and _company_ starts with a digit.
* It orders the results by _name_ and _company_ ascending. The NethCTI
* phonebook is the mysql _nethcti.cti\_phonebook_.
*
* @method getCtiPbContactsStartsWithDigit
* @param {string}   username The name of the user used to search contacts
* @param {function} cb       The callback function
*/
function getCtiPbContactsStartsWithDigit(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.CTI_PHONEBOOK].findAll({
            where: [
                '(owner_id=? OR type="public") ' +
                'AND ' +
                '(name REGEXP "^[0-9]" OR company REGEXP "^[0-9]")',
                username
            ],
            order: 'name ASC, company ASC'

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results by searching cti phonebook contacts whose names starts with a digit');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching cti phonebook contacts whose names starts with a digit: ' + err.toString());
            cb(err.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Get the history call of the specified endpoint into the interval time.
* If the endpoint information is omitted, the results contains the
* history call of all endpoints. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _asteriskcdrdb.cdr_ database.
*
* @method getHistoryCallInterval
* @param {object} data
*   @param {string}  [data.endpoint] The endpoint involved in the research, e.g. the extesion
*                                    identifier. It is used to filter out the _channel_ and _dstchannel_.
*                                    It is wrapped with '%' characters. If it is omitted the function treats
*                                    it as '%' string. The '%' matches any number of characters, even zero character
*   @param {string}  data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string}  data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {boolean} data.recording  True if the data about recording audio file must be returned
*   @param {string}  [data.filter]   The filter to be used in the _src, clid_ and _dst_ fields. If it is
*                                    omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getHistoryCallInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb            !== 'function' || typeof data.recording !== 'boolean'
            ||  typeof data.to       !== 'string'   || typeof data.from      !== 'string'
            || (typeof data.endpoint !== 'string'   && data.endpoint         !== undefined)
            || (typeof data.filter   !== 'string'   && data.filter           !== undefined)) {

            throw new Error('wrong parameters');
        }

        // check optional parameters
        if (data.filter === undefined) { data.filter = '%'; }
        if (data.endpoint  === undefined) {
            data.endpoint  = '%';
        } else {
            data.endpoint = '%' + data.endpoint + '%';
        }

        // define the mysql field to be returned. The "recordingfile" field
        // is returned only if the "data.recording" argument is true
        var attributes = [
            [ 'DATE_FORMAT(calldate, "%d/%m/%Y")', 'date'],
            [ 'DATE_FORMAT(calldate, "%H:%i:%S")', 'time'],
            'clid', 'src', 'dst', 'channel', 'dstchannel', 'uniqueid',
            'duration', 'billsec', 'disposition', 'dcontext'
        ];
        if (data.recording === true) { attributes.push('recordingfile'); }

        // search
        models[JSON_KEYS.HISTORY_CALL].findAll({
            where: [
                '(channel LIKE ? OR dstchannel LIKE ?) AND ' +
                '(DATE(calldate)>=? AND DATE(calldate)<=?) AND ' +
                '(src LIKE ? OR clid LIKE ? OR dst LIKE ?)',
                data.endpoint, data.endpoint,
                data.from,     data.to,
                data.filter,   data.filter,   data.filter
            ],
            attributes: attributes

        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching history call interval between ' +
                               data.from + ' to ' + data.to + ' for endpoint ' + data.endpoint +
                               ' and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history call interval between ' + data.from + ' to ' + data.to +
                                ' for endpoint ' + data.endpoint + ' and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Checks if at least one of the specified list of extensions is implied in the recorded call.
*
* @method isAtLeastExtenInCall
* @param {string}   uniqueid   The call identifier: is the _uniqueid_ field of the _asteriskcdrdb.cdr_ database table
* @param {array}    extensions The list of the extensions to check
* @param {function} cb         The callback function. If none of the extensions is involved in the call, the callback
*                              is called with a false boolean value. Otherwise it's called with the entry of the database
*/
function isAtLeastExtenInCall(uniqueid, extensions, cb) {
    try {
        // check parameters
        if (   typeof cb       !== 'function'
            || typeof uniqueid !== 'string'   || !(extensions instanceof Array) ) {

            throw new Error('wrong parameters');
        }

        extensions = extensions.join('|');

        // search
        models[JSON_KEYS.HISTORY_CALL].find({
            where: [
                'uniqueid=? AND ' +
                '(channel REGEXP ? OR dstchannel REGEXP ?)',
                uniqueid, extensions, extensions
            ],
            attributes: [
                [ 'DATE_FORMAT(calldate, "%Y")', 'year'  ],
                [ 'DATE_FORMAT(calldate, "%m")', 'month' ],
                [ 'DATE_FORMAT(calldate, "%d")', 'day'   ],
                [ 'recordingfile', 'filename'            ]
            ]

        }).success(function (result) {

            // extract result to return in the callback function
            if (result &&  result.selectedValues) {
                logger.info(IDLOG, 'at least one extensions ' + extensions.toString() + ' is involved in the call with uniqueid ' + uniqueid);
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'none of the extensions ' + extensions.toString() + ' is involved in the call with uniqueid ' + uniqueid);
                cb(null, false);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'checking if at least one extension of ' + extensions.toString() + ' is involved in the call with uniqueid ' + uniqueid);
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Returns the data about the call recording audio file as an object, or
* a false value if no data has been found.
*
* @method getCallRecordingFileData
* @param {string}   uniqueid The call identifier in the database
* @param {function} cb       The callback function
*/
function getCallRecordingFileData(uniqueid, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function' || typeof uniqueid !== 'string') {
            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.HISTORY_CALL].find({
            where: [
                'uniqueid=? AND recordingfile!=""', uniqueid
            ],
            attributes: [
                [ 'DATE_FORMAT(calldate, "%Y")', 'year'  ],
                [ 'DATE_FORMAT(calldate, "%m")', 'month' ],
                [ 'DATE_FORMAT(calldate, "%d")', 'day'   ],
                [ 'recordingfile', 'filename'            ]
            ]

        }).success(function (result) {

            // extract result to return in the callback function
            if (result &&  result.selectedValues) {
                logger.info(IDLOG, 'found data informations about recording call with uniqueid ' + uniqueid);
                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'no data informations about recording call with uniqueid ' + uniqueid);
                cb(null, false);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'getting data informations about recording call with uniqueid ' + uniqueid);
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Gets all the history post-it of all the users into the interval time.
* It can be possible to filter out the results specifying the filter. It search
* the results into the _nethcti.postit_ database.
*
* @method getAllUserHistoryPostitInterval
* @param {object} data
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _recipient_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getAllUserHistoryPostitInterval(data, cb) {
    try {
        getHistoryPostitInterval(data, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the history sms of all the users into the interval time.
* It can be possible to filter out the results specifying the filter. It search
* the results into the _nethcti.sms\_history_ database.
*
* @method getAllUserHistorySmsInterval
* @param {object} data
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _recipient_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getAllUserHistorySmsInterval(data, cb) {
    try {
        getHistorySmsInterval(data, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get the history post-it of the specified user into the interval time.
* If the username information is omitted, the results contains the
* history post-it of all users. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _nethcti.postit_ database.
*
* @method getHistoryPostitInterval
* @param {object} data
*   @param {string} [data.username] The user involved in the research. It is used to filter
*                                   out the _creator_. If it is omitted the function treats it as '%' string. The '%'
*                                   matches any number of characters, even zero character.
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _recipient_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getHistoryPostitInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            || (typeof data.username !== 'string' && data.username !== undefined)
            || (typeof data.filter   !== 'string' && data.filter   !== undefined)) {

            throw new Error('wrong parameters');
        }

        // the mysql operator for the creator field
        var operator = '=';

        // check optional parameters
        if (data.filter   === undefined) { data.filter = '%';   }
        if (data.username === undefined) {
            data.username = '%';
            operator = ' LIKE ';
        }

        // search
        models[JSON_KEYS.POSTIT].findAll({
            where: [
                'creator' + operator + '? AND ' +
                '(DATE(creation)>=? AND DATE(creation)<=?) AND ' +
                '(recipient LIKE ?)',
                data.username,
                data.from, data.to,
                data.filter
            ],
            attributes: [
                [ 'DATE_FORMAT(creation, "%d/%m/%Y")', 'creationdate'],
                [ 'DATE_FORMAT(creation, "%H:%i:%S")', 'creationtime'],
                [ 'DATE_FORMAT(readdate, "%d/%m/%Y")', 'readdate'],
                [ 'DATE_FORMAT(readdate, "%H:%i:%S")', 'timeread'],
                'id', 'text', 'creator', 'recipient'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching history post-it interval between ' +
                               data.from + ' to ' + data.to + ' for username "' + data.username + '" and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history post-it interval between ' + data.from + ' to ' + data.to +
                                ' for username "' + data.username + '" and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get the history sms sent by the specified user into the interval time.
* If the username information is omitted, the results contains the
* history sms of all users. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _nethcti.sms_history_ database.
*
* @method getHistorySmsInterval
* @param {object} data
*   @param {string} [data.username] The user involved in the research. It is used to filter
*                                   out the _sender_. If it is omitted the function treats it as '%' string. The '%'
*                                   matches any number of characters, even zero character.
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _destination_ field. If it is
*                                   omitted the function treats it as '%' string
* @param {function} cb              The callback function
*/
function getHistorySmsInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data          !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string' || typeof data.from !== 'string'
            || (typeof data.username !== 'string' && data.username    !== undefined)
            || (typeof data.filter   !== 'string' && data.filter      !== undefined)) {

            throw new Error('wrong parameters');
        }

        // the mysql operator for the sender field
        var operator = '=';

        // check optional parameters
        if (data.filter   === undefined) { data.filter = '%';   }
        if (data.username === undefined) {
            data.username = '%';
            operator = ' LIKE ';
        }

        // search
        models[JSON_KEYS.SMS_HISTORY].findAll({
            where: [
                'sender' + operator + '? AND ' +
                '(DATE(date)>=? AND DATE(date)<=?) AND ' +
                '(destination LIKE ?)',
                data.username,
                data.from, data.to,
                data.filter
            ],
            attributes: [
                [ 'DATE_FORMAT(date, "%d/%m/%Y")', 'datesent'],
                [ 'DATE_FORMAT(date, "%H:%i:%S")', 'timesent'],
                'id', 'text', 'status', 'sender', 'destination'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching history sms interval between ' +
                               data.from + ' to ' + data.to + ' sent by username "' + data.username + '" and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history sms interval between ' + data.from + ' to ' + data.to +
                                ' sent by username "' + data.username + '" and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the voice messages of a voicemail of the specified type. It search the
* results into the _asteriskcdrdb.voicemessages_ database. The type can be "new" or "old".
*
* @method getVoicemailMsg
* @param {string} vmId The voicemail identifier
* @param {string} type The type of the voicemail to retrieve. It can be "new" or "old"
* @param {function} cb The callback function
*/
function getVoicemailMsg(vmId, type, cb) {
    try {
        // check parameters
        if (typeof vmId !== 'string' || typeof cb !== 'function'
            || (   type !== 'old'    && type      !== 'new')) {

            throw new Error('wrong parameters');
        }

        // convert the type if it's a "new" value. This is because the query search
        // on "dir" field that is the filesystem path that can terminate with "Old"
        // or "INBOX" values
        if (type === 'new') { type = 'inbox'; }

        // search
        models[JSON_KEYS.VOICEMAIL].findAll({
            where: [
                'mailboxuser=? AND ' +
                'LOWER(RIGHT(dir, ' + type.length + '))=?',
                vmId, type
            ],
            attributes: [
                [ 'origtime * 1000', 'origtime' ],
                [ 'TIME_FORMAT(SEC_TO_TIME(duration), "%i:%s")', 'duration' ],
                'id', 'dir', 'callerid', 'mailboxuser'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching ' + type + ' voice messages of voicemail "' + vmId + '"');
            cb(null, vmId, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching ' + type + ' voice messages of voicemail "' + vmId + '"');
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns the voicemail mailbox from the identifier of the voicemail in the database.
*
* @method getVmMailboxFromDbId
* @param {string}   dbid The voicemail identifier in the database
* @param {function} cb   The callback function
*/
function getVmMailboxFromDbId(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.VOICEMAIL].findAll({
            where:      [ 'id=?', dbid  ],
            attributes: [ 'mailboxuser' ]

        }).success(function (result) {

            if (result instanceof Array && result[0]) {
                logger.info(IDLOG, 'obtained voicemail mailbox "' + result[0].selectedValues.mailboxuser + '" from voicemail db id "' + dbid + '"');
                cb(null, result[0].selectedValues.mailboxuser);

            } else {
                var str = 'getting voicemail mailbox from db voice message id "' + dbid + '"';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching voicemail mailbox from voicemail db id "' + dbid + '"');
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}


/**
* Returns audio file from the id mailbox.
*
* @method listenVoiceMessage
* @param {string}   dbid The voicemail identifier in the database
* @param {function} cb   The callback function
*/
function listenVoiceMessage(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.VOICEMAIL].find({
            where:      [ 'id=?', dbid  ],
            attributes: [ 'recording' ]

        }).success(function (result) {
            if (result && result.selectedValues && result.selectedValues.recording) {
                logger.info(IDLOG, 'obtained voicemail audio file from voicemail db id "' + dbid + '"');
                cb(null, result.selectedValues.recording);

            } else {
                var str = 'getting voicemail audio file from db voice message id "' + dbid + '"';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching voicemail audio file from voicemail db id "' + dbid + '"');
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Delete a voice message from the database table _asteriskcdrdb.voicemessages_.
*
* @method deleteVoiceMessage
* @param {string}   dbid The database identifier of the voice message to delete
* @param {function} cb   The callback function
*/
function deleteVoiceMessage(dbid, cb) {
    try {
        // check parameters
        if (typeof dbid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.VOICEMAIL].find({
            where: [ 'id=?', dbid  ]

        }).success(function (task) {
            try {

                if (task) {

                    task.destroy().success(function () {
                        logger.info(IDLOG, 'voice message with db id "' + dbid + '" has been deleted successfully');
                        cb();
                    });

                } else {
                    var str = 'deleting voice message with db id "' + dbid + '": entry not found';
                    logger.warn(IDLOG, str);
                    cb(str);
                }

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching voice message with db id "' + dbid + '" to delete not found: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Deletes a call recording from the database. It updates the entry of the specified call emptying
* the content of the _recordingfile_ field of the _asteriskcdrdb.cdr_ database table.
*
* @method deleteCallRecording
* @param {string}   uniqueid The database identifier of the call
* @param {function} cb       The callback function
*/
function deleteCallRecording(uniqueid, cb) {
    try {
        // check parameters
        if (typeof uniqueid !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.HISTORY_CALL].find({
            where: [ 'uniqueid=?', uniqueid  ]

        }).success(function (task) {
            try {

                if (task) {

                    // empty the content of the "recordingfile" field
                    task.updateAttributes({ recordingfile: '' }, [ 'recordingfile' ]).success(function () {

                        logger.info(IDLOG, '"recordingfile" field of the call with uniqueid "' + uniqueid + '" has been emptied successfully from asteriskcdrdb.cdr table');
                        cb();
                    });

                } else {
                    var str = 'emptying "recordingfile" of the call with uniqueid "' + uniqueid + '" from asteriskcdrdb.cdr table: entry not found';
                    logger.warn(IDLOG, str);
                    cb(str);
                }

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'emptying "recordingfile" of the call with uniqueid "' + uniqueid + '" from asteriskcdrdb.cdr table: not found: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the new voice messages of a voicemail. It search the
* results into the _asteriskcdrdb.voicemessages_ database.
*
* @method getVoicemailNewMsg
* @param {string} vmId The voicemail identifier
* @param {function} cb The callback function
*/
function getVoicemailNewMsg(vmId, cb) {
    try {
        // check parameters
        if (typeof vmId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        getVoicemailMsg(vmId, 'new', cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all the old voice messages of a voicemail. It search the
* results into the _asteriskcdrdb.voicemessages_ database.
*
* @method getVoicemailOldMsg
* @param {string} vmId The voicemail identifier
* @param {function} cb The callback function
*/
function getVoicemailOldMsg(vmId, cb) {
    try {
        // check parameters
        if (typeof vmId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        getVoicemailMsg(vmId, 'old', cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the history caller note of all the users into the interval time.
* It can be possible to filter the results specifying the filter. It search
* the results into the _nethcti.caller\_note_ database.
*
* @method getAllUserHistoryCallerNoteInterval
* @param {object} data
*   @param {string} data.from     The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to       The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used in the _number_ field. If it is omitted the
*                                 function treats it as '%' string
* @param {function} cb            The callback function
*/
function getAllUserHistoryCallerNoteInterval(data, cb) {
    try {
        getHistoryCallerNoteInterval(data, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the history caller note of the specified user into the interval time.
* If the username information is omitted, the results contains the
* history caller note of all users. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _nethcti.caller\_note_ database.
*
* @method getHistoryCallerNoteInterval
* @param {object} data
*   @param {string} [data.username] The user involved in the research. It is used to filter
*       out the _creator_. If it is omitted the function treats it as '%' string. The '%'
*       matches any number of characters, even zero character.
*   @param {string} data.from The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used in the _number_ field. If it is omitted the
*       function treats it as '%' string
* @param {function} cb The callback function
*/
function getHistoryCallerNoteInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            || (typeof data.username !== 'string' && data.username !== undefined)
            || (typeof data.filter   !== 'string' && data.filter   !== undefined)) {

            throw new Error('wrong parameters');
        }

        // the mysql operator for the creator field
        var operator = '=';

        // check optional parameters
        if (data.filter   === undefined) { data.filter = '%';   }
        if (data.username === undefined) {
            data.username = '%';
            operator = ' LIKE ';
        }

        // search
        models[JSON_KEYS.CALLER_NOTE].findAll({
            where: [
                'creator' + operator + '? AND ' +
                '(DATE(creation)>=? AND DATE(creation)<=?) AND ' +
                '(number LIKE ?) AND ' +
                'expiration>=NOW()',
                data.username,
                data.from, data.to,
                data.filter
            ],
            attributes: [
                [ 'DATE_FORMAT(creation,   "%d/%m/%Y")', 'creationdate'   ],
                [ 'DATE_FORMAT(creation,   "%H:%i:%S")', 'creationtime'   ],
                [ 'DATE_FORMAT(expiration, "%d/%m/%Y")', 'expirationdate' ],
                [ 'DATE_FORMAT(expiration, "%H:%i:%S")', 'expirationtime' ],
                'id',     'text',    'creator', 'number',
                'public', 'reservation'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching history caller note interval between ' +
                               data.from + ' to ' + data.to + ' for username "' + data.username +
                               '" and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history caller note interval between ' + data.from + ' to ' + data.to +
                                ' for username "' + data.username + '" and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets all the public and private caller notes for the specified number that hasn't expired.
*
* @method getAllValidCallerNotesByNum
* @param {string}   number The phone number used to search the associated caller note
* @param {function} cb     The callback function
*/
function getAllValidCallerNotesByNum(number, cb) {
    try {
        // check parameters
        if (typeof number !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.CALLER_NOTE].findAll({
            where: [
                'number=? AND expiration>=NOW()', number
            ],
            attributes: [
                [ 'DATE_FORMAT(creation,   "%d/%m/%Y")', 'creationdate'   ],
                [ 'DATE_FORMAT(creation,   "%H:%i:%S")', 'creationtime'   ],
                [ 'DATE_FORMAT(expiration, "%d/%m/%Y")', 'expirationdate' ],
                [ 'DATE_FORMAT(expiration, "%H:%i:%S")', 'expirationtime' ],
                'id',     'text',    'creator', 'number',
                'public', 'reservation'
            ]
        }).success(function (results) {

            // extract results to return them in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching all public and private valid caller notes for number ' + number);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching all public and private valid caller notes for number ' + number);
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get the customer card of the specified type. It search the results into the
* database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
* or _/etc/nethcti/dbdynamic.json_ files.
*
* @method getCustomerCardByNum
* @param {string}   type The type of the customer card to retrieve
* @param {string}   num  The phone number used to search in _channel_ and _dstchannel_ mysql
*                        fields. It is used to filter. It is preceded by '%' character
* @param {function} cb   The callback function
*/
function getCustomerCardByNum(type, num, cb) {
    try {
        // check parameters
        if (typeof type   !== 'string'
            || typeof num !== 'string'
            || typeof cb  !== 'function') {

            throw new Error('wrong parameters');
        }

        // construct the name of the customer card
        type = CUSTOMER_CARD.PREFIX_NAME + type;

        // check the connection presence
        if (dbConn[type] === undefined) {
            var strError = 'no db connection getting customer card ' + type + ' for num ' + num;
            logger.warn(IDLOG, strError);
            cb(strError);
            return;
        }

        // escape of the number
        num = dbConn[type].getQueryInterface().escape(num); // e.g. num = '123456'
        num = num.substring(1, num.length - 1);             // remove external quote e.g. num = 123456

        // replace the key of the query with paramter
        var query = dbConfig[type].query.replace(/\$TERM/g, num);

        dbConn[type].query(query).success(function (results) {

            logger.info(IDLOG, results.length + ' results by searching ' + type + ' by num ' + num);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching ' + type + ' by num ' + num + ': ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}


/**
* Get call trace of speciefied linkedid. It searches the results into the
* database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
* or _/etc/nethcti/dbdynamic.json_ files.
*
* @method getCallTrace
* @param {string}   link Call linkedid
* @param {function} cb   The callback function
*/
function getCallTrace(linkedid, cb) {
    try {
        // check parameters
        if (typeof linkedid   !== 'string'
            || typeof cb  !== 'function') {

            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.CEL].findAll({
            where: [
                'linkedid=?', linkedid
            ],
            attributes: [
                'eventtype', 'eventtime',
                [ 'concat(cid_name," ",cid_num)', 'cid' ],
                'exten', 'context', 'channame', 'accountcode'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching CEL on linkedid "' + linkedid + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching CEL on linkedid "' + linkedid + '"');
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get call info of speciefied uniqueid. It searches the results into the
* database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
* or _/etc/nethcti/dbdynamic.json_ files.
*
* @method getCallInfo
* @param {string}   link Call uniqueid
* @param {function} cb   The callback function
*/
function getCallInfo(uniqueid, cb) {
    try {
        // check parameters
        if (typeof uniqueid   !== 'string'
            || typeof cb  !== 'function') {

            throw new Error('wrong parameters');
        }

        // search
        models[JSON_KEYS.CEL].findAll({
            where: [
                'uniqueid=?', uniqueid
            ],
            attributes: [
                'eventtype', 'eventtime',
                [ 'concat(cid_name," ",cid_num)', 'cid' ],
                'exten', 'context', 'channame', 'accountcode'
            ]
        }).success(function (results) {

            // extract results to return in the callback function
            var i;
            for (i = 0; i < results.length; i++) {
                results[i] = results[i].selectedValues;
            }

            logger.info(IDLOG, results.length + ' results searching CEL on uniqueid "' + uniqueid + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching CEL on uniqueid "' + uniqueid + '"');
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}



// public interface
exports.start                               = start;
exports.config                              = config;
exports.setLogger                           = setLogger;
exports.getPostit                           = getPostit;
exports.savePostit                          = savePostit;
exports.getCallInfo                         = getCallInfo;
exports.getCallTrace                        = getCallTrace
exports.getCallerNote                       = getCallerNote;
exports.saveCallerNote                      = saveCallerNote;
exports.getCtiPbContact                     = getCtiPbContact;
exports.saveCtiPbContact                    = saveCtiPbContact;
exports.deleteCallerNote                    = deleteCallerNote;
exports.modifyCallerNote                    = modifyCallerNote;
exports.getPbContactsByNum                  = getPbContactsByNum;
exports.deleteCtiPbContact                  = deleteCtiPbContact;
exports.modifyCtiPbContact                  = modifyCtiPbContact;
exports.deleteVoiceMessage                  = deleteVoiceMessage;
exports.listenVoiceMessage                  = listenVoiceMessage;
exports.getVoicemailNewMsg                  = getVoicemailNewMsg;
exports.getVoicemailOldMsg                  = getVoicemailOldMsg;
exports.deleteCallRecording                 = deleteCallRecording;
exports.getVmMailboxFromDbId                = getVmMailboxFromDbId;
exports.isAtLeastExtenInCall                = isAtLeastExtenInCall;
exports.getCustomerCardByNum                = getCustomerCardByNum;
exports.getHistorySmsInterval               = getHistorySmsInterval;
exports.getPbContactsContains               = getPbContactsContains;
exports.getCtiPbContactsByNum               = getCtiPbContactsByNum;
exports.getHistoryCallInterval              = getHistoryCallInterval;
exports.getPbContactsStartsWith             = getPbContactsStartsWith;
exports.getCallRecordingFileData            = getCallRecordingFileData;
exports.getHistoryPostitInterval            = getHistoryPostitInterval;
exports.getCtiPbContactsContains            = getCtiPbContactsContains;
exports.getCtiPbSpeeddialContacts           = getCtiPbSpeeddialContacts;
exports.getCtiPbContactsStartsWith          = getCtiPbContactsStartsWith;
exports.getAllValidCallerNotesByNum         = getAllValidCallerNotesByNum;
exports.getPbContactsStartsWithDigit        = getPbContactsStartsWithDigit;
exports.getHistoryCallerNoteInterval        = getHistoryCallerNoteInterval;
exports.getAllUserHistorySmsInterval        = getAllUserHistorySmsInterval;
exports.getCtiPbContactsStartsWithDigit     = getCtiPbContactsStartsWithDigit;
exports.getAllUserHistoryPostitInterval     = getAllUserHistoryPostitInterval;
exports.getAllUserHistoryCallerNoteInterval = getAllUserHistoryCallerNoteInterval;
