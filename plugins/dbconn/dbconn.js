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
var fs           = require('fs');
var odbc         = require('odbc');
var async        = require('async');
var moment       = require('moment');
var iniparser    = require('iniparser');
var Sequelize    = require("sequelize");
var EventEmitter = require('events').EventEmitter;

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
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

/**
* Fired when a voice message content has been read from the database by the _listenVoiceMessage_ method.
*
* @event listenedVoiceMessage
* @param {object} voicemail The voicemail identifier
*/
/**
* The name of the listened voice message event.
*
* @property EVT_LISTENED_VOICE_MESSAGE
* @type string
* @default "listenedVoiceMessage"
*/
var EVT_LISTENED_VOICE_MESSAGE = 'listenedVoiceMessage';

/**
* Fired when a voice message has been deleted from the database by the _deleteVoiceMessage_ method.
*
* @event deleteVoiceMessage
* @param {object} voicemail The voicemail identifier
*/
/**
* The name of the listened voice message event.
*
* @property EVT_DELETED_VOICE_MESSAGE
* @type string
* @default "deleteVoiceMessage"
*/
var EVT_DELETED_VOICE_MESSAGE = 'deleteVoiceMessage';

/**
* Fired when a post-it has been deleted from the database by the _deletePostit_ method.
*
* @event deletedPostit
* @param {object} user The recipient of the deleted post-it
*/
/**
* The name of the deleted post-it message event.
*
* @property EVT_DELETED_POSTIT
* @type string
* @default "deletedPostit"
*/
var EVT_DELETED_POSTIT = 'deletedPostit';

/**
* Fired when the read status of a post-it has been set in the database by the _updatePostitReadIt_ method.
*
* @event postitReadIt
* @param {object} user The recipient of the read post-it
*/
/**
* The name of the "udpate post-it read it" message event.
*
* @property EVT_POSTIT_READIT
* @type string
* @default "postitReadIt"
*/
var EVT_READ_POSTIT = 'readPostit';

/**
* True if the sequelize library will be logged.
* It's customized by the _config_ method.
*
* @property logSequelize
* @type {boolean}
* @private
* @default false
*/
var logSequelize = false;

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
    CEL:           "cel",
    POSTIT:        "postit",
    VOICEMAIL:     "voicemail",
    PHONEBOOK:     "phonebook",
    QUEUE_LOG:     "queue_log",
    SMS_HISTORY:   "sms_history",
    CALLER_NOTE:   "caller_note",
    HISTORY_CALL:  "history_call",
    CTI_PHONEBOOK: "cti_phonebook"
}
*/
var JSON_KEYS = {
    CEL:           'cel',
    POSTIT:        'postit',
    VOICEMAIL:     'voicemail',
    PHONEBOOK:     'phonebook',
    QUEUE_LOG:     'queue_log',
    SMS_HISTORY:   'sms_history',
    CALLER_NOTE:   'caller_note',
    HISTORY_CALL:  'history_call',
    CTI_PHONEBOOK: 'cti_phonebook'
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
* Sets the log level used to debug the sequelize library.
*
* @method config
* @param {string} path The file path of the static JSON configuration file.
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check the file existence
        if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

        var json = require(path); // read the file
        logger.info(IDLOG, 'file ' + path + ' has been read');

        if (typeof json === 'object' && json.loglevel.toLowerCase() === 'info') {
            logSequelize = true;
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the static configurations to be use by database connections.
*
* @method configDbStatic
* @param {string} path The file path of the static JSON configuration file.
*/
function configDbStatic(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check the file existence
        if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

        var json = require(path); // read the file
        logger.info(IDLOG, 'file ' + path + ' has been read');

        // transfer the file content into the memory
        var k;
        for (k in json) { dbConfig[k] = json[k]; }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the dynamic configurations to be use by database connections.
*
* @method configDbDynamic
* @param {string} path The file path of the dynamic JSON configuration file.
*/
function configDbDynamic(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check the file existence
        if (!fs.existsSync(path)) {
            logger.info(IDLOG, path + ' doesn\'t exist');

        } else {

            var json = require(path); // read the file
            logger.info(IDLOG, 'file ' + path + ' has been read');

            // transfer the file content into the memory. If the "k" key has
            // already been added by the _configDbStatic_ method, it is not overwritten
            var k;
            for (k in json) {
                if (!dbConfig[k]) { dbConfig[k] = json[k]; }
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
            cb();

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
            cb();

        }).error(function (err) { // manage the error
            logger.error(IDLOG, 'saving postit: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save a successfully sms sending in the _nethcti.sms\_history_ database table.
*
* @method storeSmsSuccess
* @param {string}   username The name of the user who sent the sms
* @param {string}   to       The destination number
* @param {string}   body     The text of the message
* @param {function} cb       The callback function
*/
function storeSmsSuccess(username, to, body, cb) {
    try {
        // check parameters
        if (   typeof username !== 'string' || typeof cb   !== 'function'
            || typeof to       !== 'string' || typeof body !== 'string') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var smsHistory = models[JSON_KEYS.SMS_HISTORY].build({
            date:        moment().format('YYYY-MM-DD HH:mm:ss'),
            text:        body,
            status:      true,
            sender:      username,
            destination: to
        });

        // save the model into the database
        smsHistory.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'sms success from user "' + username + '" to ' + to + ' saved successfully in the database');
            cb();

        }).error(function (err1) { // manage the error
            logger.error(IDLOG, 'saving sms success from user "' + username + '" to ' + to + ': ' + err1.toString());
            cb(err1);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Save a failure in sms sending in the _nethcti.sms\_history_ database table.
*
* @method storeSmsFailure
* @param {string}   username The name of the user who sent the sms
* @param {string}   to       The destination number
* @param {string}   body     The text of the message
* @param {function} cb       The callback function
*/
function storeSmsFailure(username, to, body, cb) {
    try {
        // check parameters
        if (   typeof username !== 'string' || typeof cb   !== 'function'
            || typeof to       !== 'string' || typeof body !== 'string') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var smsHistory = models[JSON_KEYS.SMS_HISTORY].build({
            date:        moment().format('YYYY-MM-DD HH:mm:ss'),
            text:        body,
            status:      false,
            sender:      username,
            destination: to
        });

        // save the model into the database
        smsHistory.save()
        .success(function () { // the save was successful
            logger.info(IDLOG, 'sms failure from user "' + username + '" to ' + to + ' saved successfully in the database');
            cb();

        }).error(function (err1) { // manage the error
            logger.error(IDLOG, 'saving sms failure from user "' + username + '" to ' + to + ': ' + err1.toString());
            cb(err1);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Returns the post-it from the _nethcti.postit_ database table using its unique database identifier.
* Then it sets the status read for the required postit updating the _readdate_ column of the
* _nethcti.postit_ database table.
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
        cb(err);
    }
}

/**
* Returns all the unread post-it of the recipient user from the _nethcti.postit_ database table.
*
* @method getAllUnreadPostitOfRecipient
* @param {string}   username The username of the recipient
* @param {function} cb       The callback function
*/
function getAllUnreadPostitOfRecipient(username, cb) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.POSTIT].findAll({
            where: [ 'recipient=? ' +
            'AND readdate IS NULL',
            username ],
            order: 'creation DESC',
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

            logger.info(IDLOG, results.length + ' results by searching all unread postit of the recipient user "' + username + '"');
            cb(null, username, results);

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'search all unread postit of the recipient user "' + username + '" failed: ' + err1.toString());
            cb(err1.toString());
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Updates the _readdate_ column of the specified postit with the current date.
*
* @method updatePostitReadIt
* @param {string}  id The post-it unique identifier. It's the _id_ column of the _nethcti.postit_ database table
* @param {funcion} cb The callback function
*/
function updatePostitReadIt(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.POSTIT].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.updateAttributes({
                    readdate: moment().format('YYYY-MM-DD HH:mm:ss')

                }).success(function () {

                    logger.info(IDLOG, 'read date of the postit with db id "' + id + '" has been updated successfully');
                    cb();

                    // emits the event for a read post-it
                    logger.info(IDLOG, 'emit event "' + EVT_READ_POSTIT + '" of post-it with db id ' + id + ' of recipient user ' + task.selectedValues.recipient);
                    emitter.emit(EVT_READ_POSTIT, task.selectedValues.recipient);
                });

            } else {
                var str = 'updating read date of the postit with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error
            logger.error(IDLOG, 'searching posit with db id "' + data.id + '" to update read date: ' + err1.toString());
            cb(err1);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
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
            cb();

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

                var config = {
                    port:    dbConfig[k].dbport,
                    host:    dbConfig[k].dbhost,
                    define:  {
                        charset:         'utf8',
                        timestamps:      false,
                        freezeTableName: true
                    },
                    dialect: dbConfig[k].dbtype
                };

                // default sequelize log is console.log
                if (!logSequelize) { config.logging = false; }

                sequelize = new Sequelize(dbConfig[k].dbname, dbConfig[k].dbuser, dbConfig[k].dbpassword, config);

                dbConn[k] = sequelize;
                logger.info(IDLOG, 'initialized db connection with ' + dbConfig[k].dbtype + ' ' + dbConfig[k].dbname + ' ' + dbConfig[k].dbhost + ':' + dbConfig[k].dbport);

            } else if (dbConfig[k].dbtype === 'mssql') {

                var db      = new odbc.Database();
                var options = 'DRIVER={FreeTDS}'                    +
                              ';SERVER='   + dbConfig[k].dbhost     +
                              ';PORT='     + dbConfig[k].dbport     +
                              ';UID='      + dbConfig[k].dbuser     +
                              ';PWD='      + dbConfig[k].dbpassword +
                              ';DATABASE=' + dbConfig[k].dbname;

                db.open(options, function (err1) {
                    if (err1) {
                        logger.error(IDLOG, 'initializing db connection with ' + dbConfig[k].dbtype + ' ' + dbConfig[k].dbname + ' ' + dbConfig[k].dbhost + ':' + dbConfig[k].dbport + ' - ' + err1.stack);

                    } else {
                        dbConn[k] = db;
                        logger.info(IDLOG, 'initialized db connection with ' + dbConfig[k].dbtype + ' ' + dbConfig[k].dbname + ' ' + dbConfig[k].dbhost + ':' + dbConfig[k].dbport);
                    }
                });
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
* Deletes the specified postit from the _nethcti.cti\postit_ database table.
*
* @method deletePostit
* @param {string}   id The post-it identifier
* @param {function} cb The callback function
*/
function deletePostit(id, cb) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.POSTIT].find({
            where: [ 'id=?', id  ]

        }).success(function (task) {

            if (task) {

                task.destroy().success(function () {

                    logger.info(IDLOG, 'post-it with db id "' + id + '" has been deleted successfully');
                    cb();

                    // emits the event for a deleted post-it
                    logger.info(IDLOG, 'emit event "' + EVT_DELETED_POSTIT + '" of post-it with db id ' + id + ' of recipient user ' + task.selectedValues.recipient);
                    emitter.emit(EVT_DELETED_POSTIT, task.selectedValues.recipient);
                });

            } else {
                var str = 'deleting post-it with db id "' + id + '": entry not found';
                logger.warn(IDLOG, str);
                cb(str);
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'searching post-it with db id "' + id + '" to delete: ' + err1.toString());
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
* the results specifying the filter and hide the phone numbers specifying
* the privacy sequence to be used. It search the results into the
* _asteriskcdrdb.cdr_ database.
*
* @method getHistoryCallInterval
* @param {object} data
*   @param {string}  [data.endpoint]   The endpoint involved in the research, e.g. the extesion
*                                      identifier. It is used to filter out the _channel_ and _dstchannel_.
*                                      It is wrapped with '%' characters. If it is omitted the function treats
*                                      it as '%' string. The '%' matches any number of characters, even zero character
*   @param {string}  data.from         The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string}  data.to           The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {boolean} data.recording    True if the data about recording audio file must be returned
*   @param {string}  [data.filter]     The filter to be used in the _src, clid_ and _dst_ fields. If it is
*                                      omitted the function treats it as '%' string
*   @param {string}  [data.privacyStr] The sequence to be used to hide the numbers to respect the privacy
* @param {function} cb The callback function
*/
function getHistoryCallInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb              !== 'function' || typeof data.recording !== 'boolean'
            ||  typeof data.to         !== 'string'   || typeof data.from      !== 'string'
            || (typeof data.endpoint   !== 'string'   && data.endpoint         !== undefined)
            || (typeof data.filter     !== 'string'   && data.filter           !== undefined)
            || (typeof data.privacyStr !== 'string'   && data.privacyStr       !== undefined)) {

            throw new Error('wrong parameters');
        }

        // check optional parameters
        if (data.filter   === undefined) { data.filter   = '%'; }
        if (data.endpoint === undefined) { data.endpoint = '%'; }
        else { data.endpoint = '%' + data.endpoint + '%'; }

        // define the mysql field to be returned. The "recordingfile" field
        // is returned only if the "data.recording" argument is true
        var attributes = [
            [ 'DATE_FORMAT(calldate, "%d/%m/%Y")', 'date'],
            [ 'DATE_FORMAT(calldate, "%H:%i:%S")', 'time'],
            'channel', 'dstchannel', 'uniqueid',
            'duration', 'billsec', 'disposition', 'dcontext'
        ];
        if (data.recording === true) { attributes.push('recordingfile'); }

        // if the privacy string is present, than hide the numbers
        if (data.privacyStr) {
            // the numbers are hidden
            attributes.push([ 'CONCAT( SUBSTRING(src, 1, LENGTH(src) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'src' ]);
            attributes.push([ 'CONCAT( SUBSTRING(dst, 1, LENGTH(dst) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'dst' ]);
            attributes.push([ 'CONCAT( "", "\\"' + data.privacyStr + '\\"")', 'clid' ]);

        } else {
            // the numbers are clear
            attributes.push('src');
            attributes.push('dst');
            attributes.push('clid');
        }

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

        // define the mysql fields to be returned
        var attributes = [
            [ 'DATE_FORMAT(creation, "%d/%m/%Y")', 'creationdate'],
            [ 'DATE_FORMAT(creation, "%H:%i:%S")', 'creationtime'],
            [ 'DATE_FORMAT(readdate, "%d/%m/%Y")', 'readdate'],
            [ 'DATE_FORMAT(readdate, "%H:%i:%S")', 'timeread'],
            'id'
        ];

        // if the privacy string is present, than hide the numbers and names
        if (data.privacyStr) {
            // the numbers and names are hidden
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'recipient' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'creator' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'text' ]);

        } else {
            // the numbers and names are clear
            attributes.push('recipient');
            attributes.push('creator');
            attributes.push('text');
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
            attributes: attributes

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

        // define the mysql fields to be returned
        var attributes = [
            [ 'DATE_FORMAT(date, "%d/%m/%Y")', 'datesent'],
            [ 'DATE_FORMAT(date, "%H:%i:%S")', 'timesent'],
            'id', 'status'
        ];

        // if the privacy string is present, than hide the numbers and names
        if (data.privacyStr) {
            // the numbers and names are hidden
            attributes.push([ 'CONCAT( SUBSTRING(destination, 1, LENGTH(destination) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'destination' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'sender' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'text' ]);

        } else {
            // the numbers and names are clear
            attributes.push('destination');
            attributes.push('sender');
            attributes.push('text');
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
            attributes: attributes

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
                'LOWER(RIGHT(dir, ' + type.length + '))=? ' +
                'ORDER BY origtime DESC',
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
            where: [ 'id=?', dbid  ]

        }).success(function (result) {

            if (result && result.selectedValues && result.selectedValues.recording) {

                logger.info(IDLOG, 'obtained voicemail audio file from voicemail db id "' + dbid + '"');
                cb(null, result.selectedValues.recording);

                // if the voice message has never been read, it updates its status as "read".
                // If the message has never been read the "dir" field contains the "INBOX" string.
                // So if it's present it updates the field replacing the "INBOX" string with the "Old" one
                var dir = result.selectedValues.dir;
                if (dir.split('/').pop() === 'INBOX') {

                    result.updateAttributes({
                        dir: dir.substring(0, dir.length - 5) + 'Old'

                    }, [ 'dir' ]).success(function () {

                        logger.info(IDLOG, 'read status of the voice message with db id "' + dbid + '" has been updated successfully');

                        // emits the event for a listened voice message
                        logger.info(IDLOG, 'emit event "' + EVT_LISTENED_VOICE_MESSAGE + '" for voicemail ' + result.selectedValues.mailboxuser);
                        emitter.emit(EVT_LISTENED_VOICE_MESSAGE, result.selectedValues.mailboxuser);
                    });
                }

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

                        // emits the event for a deleted voice message
                        logger.info(IDLOG, 'emit event "' + EVT_DELETED_VOICE_MESSAGE + '" for voicemail ' + task.selectedValues.mailboxuser);
                        emitter.emit(EVT_DELETED_VOICE_MESSAGE, task.selectedValues.mailboxuser);
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
*                                   out the _creator_. If it is omitted the function treats it as '%' string. The '%'
*                                   matches any number of characters, even zero character.
*
*   @param {string} data.from       The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to         The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter]   The filter to be used in the _number_ field. If it is omitted the function treats it as '%' string
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

        // define the mysql fields to be returned
        var attributes = [
            [ 'DATE_FORMAT(creation,   "%d/%m/%Y")', 'creationdate'   ],
            [ 'DATE_FORMAT(creation,   "%H:%i:%S")', 'creationtime'   ],
            [ 'DATE_FORMAT(expiration, "%d/%m/%Y")', 'expirationdate' ],
            [ 'DATE_FORMAT(expiration, "%H:%i:%S")', 'expirationtime' ],
            'id', 'public', 'reservation'
        ];

        // if the privacy string is present, than hide the numbers and names
        if (data.privacyStr) {
            // the numbers and names are hidden
            attributes.push([ 'CONCAT( SUBSTRING(number, 1, LENGTH(number) - ' + data.privacyStr.length + '), "' + data.privacyStr + '")', 'number' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'creator' ]);
            attributes.push([ 'CONCAT( "", "' + data.privacyStr + '")', 'text' ]);

        } else {
            // the numbers and names are clear
            attributes.push('number');
            attributes.push('creator');
            attributes.push('text');
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
            attributes: attributes

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
* Gets the data of the more recent started pause of the queue member in the specified
* queue. It searches the results into the _asteriskcdrdb.queue\_log_ database. If the
* queue member has never started a pause, the data values isn't present in the database.
* So, in this case, the method returns some null values.
*
* @method getQueueMemberLastPausedInData
* @param {string}   memberName The queue member name
* @param {string}   queueId    The queue identifier
* @param {string}   memberId   The queue member identifier
* @param {function} cb         The callback function
*/
function getQueueMemberLastPausedInData(memberName, queueId, memberId, cb) {
    try {
        // check parameters
        if (   typeof cb         !== 'function' || typeof memberId !== 'string'
            || typeof memberName !== 'string'   || typeof queueId  !== 'string') {

            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.QUEUE_LOG].find({
            where: [
                'agent=? ' +
                'AND queuename=? ' +
                'AND event=? ' +
                'ORDER BY time DESC',
                memberName, queueId, 'PAUSE'
            ],
            attributes: [
                [ 'time',  'timestamp' ],
                [ 'data1', 'reason'    ]
            ]

        }).success(function (result) {

            if (result && result.selectedValues) {

                logger.info(IDLOG, 'get last "paused in" data of member "' + memberName + '" of the queue "' + queueId + '" has been successful');

                // if the queue member has never started a pause, the timestamp isn't present in the database. So check its presence
                if (result.selectedValues.timestamp) {
                    result.selectedValues.timestamp = new Date(result.selectedValues.timestamp).getTime();
                }

                // add received parameters used by the callback
                result.selectedValues.queueId  = queueId;
                result.selectedValues.memberId = memberId;

                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'get last "paused in" data of member "' + memberName + '" of the queue "' + queueId + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'get last "paused in" data of member "' + memberName + '" of the queue "' + queueId + '" failed: ' + err1.toString());
            cb(err1);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets statistics about queues.
*
* @method getQueuesStats
* @param {string}   day The query date (YYYYMMDD)
* @param {function} cb  The callback function
*/
function getQueuesStats(day, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof day !== 'string'
            || (typeof day === 'string' && day.match(/\d{8}/) === null)) {

            throw new Error('wrong parameters');
        }

        async.parallel({
            general: function (callback) {
                models[JSON_KEYS.QUEUE_LOG].findAll({
                    where: [
                        'event in ("ABANDON","EXITWITHTIMEOUT","COMPLETEAGENT","COMPLETECALLER")'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                        + ' GROUP BY queuename, action, hold'
                    ],
                    attributes: [
                        'id', 'queuename',
                        [ 'IF(event = "COMPLETEAGENT", "ANSWER",'
                            + ' IF(event = "COMPLETECALLER", "ANSWER",'
                            + ' IF(event = "EXITWITHTIMEOUT", "TIMEOUT", event)))',
                            'action' ],
                        [ 'IF(event = "ABANDON", IF(cast(data1 as unsigned) <= 50, "nulled", "failed"), cast(data1 as unsigned))', 'hold' ],
                        [ 'count(id)', 'calls' ]],
                    order: ['queuename', 'action', 'hold']

                }).success(function (results) {

                    if (results) {
                        logger.info(IDLOG, 'get extended queues statistics has been successful');

                        var stats = {};

                        for (var i in results) {
                            if (!(results[i].queuename in stats)) {
                                stats[results[i].queuename] = {
                                    'ANSWER' : {},
                                    'ABANDON' : {},
                                    'TIMEOUT' : 0
                                };
                            }

                            switch (results[i].action) {
                                case 'ANSWER':
                                case 'ABANDON':
                                    stats[results[i].queuename][results[i].action]
                                        [results[i].hold] = results[i].calls;
                                    break;
                                default:
                                    stats[results[i].queuename][results[i].action]
                                        = results[i].calls;
                            }

                        }

                        callback(null, stats);
                    }
                });
            },
            answer : function (callback) {
                models[JSON_KEYS.QUEUE_LOG].findAll({
                    where: [
                        'event in ("COMPLETEAGENT","COMPLETECALLER")'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                        + ' GROUP BY queuename'
                    ],
                    attributes: [
                        'queuename',
                        [ 'count(id)', 'calls' ],
                        [ 'max(cast(data1 as unsigned))', 'max_hold' ],
                        [ 'min(cast(data1 as unsigned))', 'min_hold' ],
                        [ 'avg(cast(data1 as unsigned))', 'avg_hold' ],
                        [ 'max(cast(data2 as unsigned))', 'max_duration' ],
                        [ 'min(cast(data2 as unsigned))', 'min_duration' ],
                        [ 'avg(cast(data2 as unsigned))', 'avg_duration' ]],
                    order: ['queuename']

                }).success(function (results) {

                    if (results) {
                        logger.info(IDLOG, 'get extended queues statistics has been successful');

                        var stats = {};

                        for (var i in results) {
                            if (!(results[i].queuename in stats)) {
                                stats[results[i].queuename] = results[i];
                            }
                        }

                        callback(null, stats);

                    } else {
                        logger.info(IDLOG, 'get extended queues statistics: not found');
                        cb(null, {});
                    }
                });
            }
        }, function(err, results) {
            cb(null, results);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get answered calls statistics by hold time
*
* @method getQueuesQOS
* @param {string}   day The query date (YYYYMMDD)
* @param {function} cb  The callback function
*/
function getQueuesQOS(day, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof day !== 'string'
            || (typeof day === 'string' && day.match(/\d{8}/) === null)) {

            throw new Error('wrong parameters');
        }

        async.parallel({
            stats : function (callback) {
                models[JSON_KEYS.QUEUE_LOG].findAll({
                    where: ['event in ("COMPLETEAGENT","COMPLETECALLER")'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                    ],
                    attributes: [
                        'agent',
                        [ 'DATE_FORMAT(time,"%d-%m-%Y")', 'period' ],
                        'queuename',
                        [ 'count(id)', 'calls' ],
                        [ 'sum(cast(data2 as unsigned))', 'tot_duration' ],
                        [ 'max(cast(data2 as unsigned))', 'max_duration' ],
                        [ 'min(cast(data2 as unsigned))', 'min_duration' ],
                        [ 'avg(cast(data2 as unsigned))', 'avg_duration' ] ],
                    group: ['agent', 'queuename'],
                    order: ['agent', 'queuename']

                }).success(function (results) {
                    if (results) {
                        logger.info(IDLOG, 'get queues answered qos has been successful');
                        callback(null, results);
                    } else {
                        logger.info(IDLOG, 'get queues answered qos: not found');
                        callback(null, {});
                    }

                }).error(function (err1) { // manage the error
                    logger.error(IDLOG, 'get queues answered qos: ' + err1.toString());
                    callback(err1, {});
                });
            },
            noanswer : function(callback) {
                 models[JSON_KEYS.QUEUE_LOG].findAll({
                    where: ['event = "RINGNOANSWER"'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                    ],
                    attributes: [
                        'agent',
                        'queuename',
                        [ 'count(id)', 'calls' ]
                    ],
                    group: ['agent', 'queuename'],
                    order: ['agent', 'queuename']
                }).success(function (results) {
                    if (results) {
                        logger.info(IDLOG, 'get ring no answered queues qos has been successful');
                        var res = {};

                        for (var i in results) {
                            if (!(results[i].agent in res))
                                res[results[i].agent] = {};

                            res[results[i].agent][results[i].queuename] = results[i].calls;
                        }

                        callback(null, res);
                    } else {
                        logger.info(IDLOG, 'get ring no answered queues qos: not found');
                        callback(null, {});
                    }
                }).error(function (err1) { // manage the error
                    logger.error(IDLOG, 'get ring no answered queues qos: ' + err1.toString());
                    callback(err1, {});
                });
            }
        }, function(err, results) {
            var res = [];

            for (var i in results.stats) {
                var values = {};
                for (var z in results.stats[i].dataValues)
                    values[z] = results.stats[i].dataValues[z]

                res.push(values);
            }

            if ('noanswer' in results) {
                for (var i in res) {
                    if (res[i].agent in results.noanswer
                      && res[i].queuename in results.noanswer[res[i].agent])
                        res[i].ringnoanswers = results.noanswer[res[i].agent][res[i].queuename];
                }
            }

            cb(null, res);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get agent statistics about work times
*
* @method getAgentsStats
* @param {string}   day The query date (YYYYMMDD)
* @param {function} cb  The callback function
*/
function getAgentsStats(day, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof day !== 'string'
            || (typeof day === 'string' && day.match(/\d{8}/) === null))
            throw new Error('wrong parameters');

        var query = 'SELECT'
                    + ' a.agent AS agent'
                    + ', a.queuename AS queue'
                    + ', DATE_FORMAT(a.time, "%k:%i:%s") AS time_in'
                    + ', DATE_FORMAT(MIN(b.time), "%k:%i:%s") AS time_out'
                    + ', UNIX_TIMESTAMP(MIN(b.time))-UNIX_TIMESTAMP(a.time) AS secs'
                    + ', a.data1 AS reason'
                    + ' FROM asteriskcdrdb.queue_log a'
                    + ' LEFT JOIN asteriskcdrdb.queue_log b'
                    + ' ON b.agent = a.agent'
                        + ' AND b.queuename = a.queuename'
                        + ' AND b.time > a.time'
                        + ' AND $JOINS'
                    + ' WHERE $BINDS'
                    + ' AND DATE_FORMAT(a.time,"%Y%m%d") = \'' + day + '\''
                    + ' GROUP BY agent, queue, a.time';

        // Group results by agent
        var __group = function (rows) {
            var rows_grouped = {};

            for (var i in rows) {
                if (!(rows[i].agent in rows_grouped)) {
                    rows_grouped[rows[i].agent] = {};
                }

                if (!(rows[i].queue in rows_grouped[rows[i].agent])) {
                    rows_grouped[rows[i].agent][rows[i].queue] = [];
                }

                var agent = rows[i].agent;
                var queue = rows[i].queue;

                delete rows[i].agent;
                delete rows[i].queue;

                rows_grouped[agent][queue].push(rows[i]);
            }

            return rows_grouped;
        }

        // Launch agents queries
        async.parallel({
            pause_unpause : function (callback) {
                var binds = "a.event = 'PAUSE' AND a.callid = 'NONE'";
                var joins = "b.event = 'UNPAUSE' AND b.callid = 'NONE'";
                dbConn[JSON_KEYS.QUEUE_LOG].query(query.replace(/\$BINDS/g, binds)
                    .replace(/\$JOINS/g, joins))
                    .success(function (rows) {
                        callback(null, __group(rows));
                });
            },
            join_leave_queue : function (callback) {
                var binds = "a.event = 'ADDMEMBER' AND a.callid = 'MANAGER'";
                var joins = "b.event = 'REMOVEMEMBER' AND b.callid = 'MANAGER'";
                dbConn[JSON_KEYS.QUEUE_LOG].query(query.replace(/\$BINDS/g, binds)
                    .replace(/\$JOINS/g, joins))
                    .success(function (rows) {
                        callback(null, __group(rows));
                });
            },
            logon_logoff : function (callback) {
                var binds = "a.event = 'AGENTLOGIN'";
                var joins = "b.event = 'AGENTLOGOFF'";
                dbConn[JSON_KEYS.QUEUE_LOG].query(query.replace(/\$BINDS/g, binds)
                    .replace(/\$JOINS/g, joins))
                    .success(function (rows) {
                        callback(null, __group(rows));
                });

            }
        }, function(err, results) {
            var inqueue_outqueue = results.join_leave_queue;

            for (var i in results.logon_logoff) {
                if (!(i in inqueue_outqueue))
                   inqueue_outqueue[i] = {};

                inqueue_outqueue[i].push(results.logon_logoff[i]);
            }

            results['inqueue_outqueue'] = results.join_leave_queue;

            cb(null, results);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the data of the more recent ended pause of the queue member in the specified
* queue. It searches the results into the _asteriskcdrdb.queue\_log_ database. If the
* queue member has never ended a pause, the data values isn't present in the database.
* So, in this case, the method returns some null values.
*
* @method getQueueMemberLastPausedOutData
* @param {string}   memberName The queue member name
* @param {string}   queueId    The queue identifier
* @param {string}   memberId   The queue member identifier
* @param {function} cb         The callback function
*/
function getQueueMemberLastPausedOutData(memberName, queueId, memberId, cb) {
    try {
        // check parameters
        if (   typeof cb         !== 'function' || typeof memberId !== 'string'
            || typeof memberName !== 'string'   || typeof queueId  !== 'string') {

            throw new Error('wrong parameters');
        }

        models[JSON_KEYS.QUEUE_LOG].find({
            where: [
                'agent=? ' +
                'AND queuename=? ' +
                'AND event=? ' +
                'ORDER BY time DESC',
                memberName, queueId, 'UNPAUSE'
            ],
            attributes: [ [ 'time',  'timestamp' ] ]

        }).success(function (result) {

            if (result && result.selectedValues) {

                logger.info(IDLOG, 'get last "paused out" data of member "' + memberName + '" of the queue "' + queueId + '" has been successful');

                // if the queue member has never ended a pause, the timestamp isn't present in the database. So check its presence
                if (result.selectedValues.timestamp) {
                    result.selectedValues.timestamp = new Date(result.selectedValues.timestamp).getTime();
                }

                // add received parameters used by the callback
                result.selectedValues.queueId  = queueId;
                result.selectedValues.memberId = memberId;

                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'get last "paused out" data of member "' + memberName + '" of the queue "' + queueId + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'get last "paused out" data of member "' + memberName + '" of the queue "' + queueId + '" failed: ' + err1.toString());
            cb(err1);
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

        if (dbConfig[type].dbtype === 'mysql') {

            // escape of the number
            num = dbConn[type].getQueryInterface().escape(num); // e.g. num = '123456'
            num = num.substring(1, num.length - 1);             // remove external quote e.g. num = 123456

            // replace the key of the query with paramter
            var query = dbConfig[type].query.replace(/\$EXTEN/g, num);

            dbConn[type].query(query).success(function (results) {

                logger.info(IDLOG, results.length + ' results by searching ' + type + ' by num ' + num);
                cb(null, results);

            }).error(function (err1) { // manage the error

                logger.error(IDLOG, 'searching ' + type + ' by num ' + num + ': ' + err1.toString());
                cb(err1.toString());
            });

        } else if (dbConfig[type].dbtype === 'mssql') {

            dbConn[type].query(dbConfig[type].query, function (err2, rows, moreResultSets) {

                if (err2) {
                    logger.error(IDLOG, 'searching ' + type + ' by num ' + num + ': ' + err2.toString());
                    cb(err2.toString());

                } else {
                    logger.info(IDLOG, rows.length + ' results by searching ' + type + ' by num ' + num);
                    cb(null, rows);
                }
            });
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error.toString());
    }
}


/**
* Get call trace of speciefied linkedid. It searches the results into the
* database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
* or _/etc/nethcti/dbdynamic.json_ files.
*
* @method getCallTrace
* @param {string}   link       The call linkedid
* @param {string}   privacyStr The privacy string to be used to hide the phone numbers. It can be undefined
* @param {function} cb         The callback function
*/
function getCallTrace(linkedid, privacyStr, cb) {
    try {
        // check parameters
        if (    typeof linkedid   !== 'string' || typeof cb  !== 'function'
            || (typeof privacyStr !== 'string' && privacyStr !== undefined) ) {

            throw new Error('wrong parameters');
        }

        var attributes = ['eventtype', 'eventtime', 'context', 'channame'];

        // if the privacy string is present, than hide the numbers
        if (privacyStr) {
            // the numbers are hidden
            attributes.push([  'CONCAT( SUBSTRING(exten,       1, LENGTH(exten)       - ' + privacyStr.length + '), "' + privacyStr + '")', 'exten'       ]);
            attributes.push([  'CONCAT( SUBSTRING(accountcode, 1, LENGTH(accountcode) - ' + privacyStr.length + '), "' + privacyStr + '")', 'accountcode' ]);
            var cidNumHidden = 'CONCAT( SUBSTRING(cid_num,     1, LENGTH(cid_num)     - ' + privacyStr.length + '), "' + privacyStr + '")';
            attributes.push([ 'concat(cid_name, " ", ' + cidNumHidden + ')', 'cid' ]);

        } else {
            // the numbers are clear
            attributes.push('exten');
            attributes.push('accountcode');
            attributes.push([ 'concat(cid_name, " ", cid_num)', 'cid' ]);
        }

        // search
        models[JSON_KEYS.CEL].findAll({
            where: [
                'linkedid=?', linkedid
            ],
            attributes: attributes

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
* @param {string}   uniqueid   The call uniqueid
* @param {string}   privacyStr The privacy string to be used to hide the phone numbers. It can be undefined
* @param {function} cb         The callback function
*/
function getCallInfo(uniqueid, privacyStr, cb) {
    try {
        // check parameters
        if (    typeof uniqueid   !== 'string' || typeof cb  !== 'function'
            || (typeof privacyStr !== 'string' && privacyStr !== undefined) ) {

            throw new Error('wrong parameters');
        }

        var attributes = ['eventtype', 'eventtime', 'context', 'channame'];

        // if the privacy string is present, than hide the numbers
        if (privacyStr) {
            // the numbers are hidden
            attributes.push([  'CONCAT( SUBSTRING(exten,       1, LENGTH(exten)       - ' + privacyStr.length + '), "' + privacyStr + '")', 'exten'       ]);
            attributes.push([  'CONCAT( SUBSTRING(accountcode, 1, LENGTH(accountcode) - ' + privacyStr.length + '), "' + privacyStr + '")', 'accountcode' ]);
            var cidNumHidden = 'CONCAT( SUBSTRING(cid_num,     1, LENGTH(cid_num)     - ' + privacyStr.length + '), "' + privacyStr + '")';
            attributes.push([ 'concat(cid_name, " ", ' + cidNumHidden + ')', 'cid' ]);

        } else {
            // the numbers are clear
            attributes.push('exten');
            attributes.push('accountcode');
            attributes.push([ 'concat(cid_name, " ", cid_num)', 'cid' ]);
        }

        // search
        models[JSON_KEYS.CEL].findAll({
            where: [
                'uniqueid=?', uniqueid
            ],
            attributes: attributes

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

/**
* Subscribe a callback function to a custom event fired by this object.
* It's the same of nodejs _events.EventEmitter.on_ method.
*
* @method on
* @param  {string}   type The name of the event
* @param  {function} cb   The callback to execute in response to the event
* @return {object}   A subscription handle capable of detaching that subscription.
*/
function on(type, cb) {
    try {
        return emitter.on(type, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.on                                  = on;
exports.start                               = start;
exports.config                              = config;
exports.setLogger                           = setLogger;
exports.getPostit                           = getPostit;
exports.savePostit                          = savePostit;
exports.getCallInfo                         = getCallInfo;
exports.deletePostit                        = deletePostit;
exports.getCallTrace                        = getCallTrace
exports.getCallerNote                       = getCallerNote;
exports.saveCallerNote                      = saveCallerNote;
exports.configDbStatic                      = configDbStatic;
exports.configDbDynamic                     = configDbDynamic;
exports.storeSmsFailure                     = storeSmsFailure;
exports.getQueuesStats                      = getQueuesStats;
exports.getQueuesQOS                        = getQueuesQOS;
exports.getAgentsStats                      = getAgentsStats;
exports.storeSmsSuccess                     = storeSmsSuccess;
exports.getCtiPbContact                     = getCtiPbContact;
exports.saveCtiPbContact                    = saveCtiPbContact;
exports.deleteCallerNote                    = deleteCallerNote;
exports.modifyCallerNote                    = modifyCallerNote;
exports.getPbContactsByNum                  = getPbContactsByNum;
exports.deleteCtiPbContact                  = deleteCtiPbContact;
exports.updatePostitReadIt                  = updatePostitReadIt;
exports.EVT_DELETED_POSTIT                  = EVT_DELETED_POSTIT;
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
exports.EVT_DELETED_VOICE_MESSAGE           = EVT_DELETED_VOICE_MESSAGE;
exports.EVT_LISTENED_VOICE_MESSAGE          = EVT_LISTENED_VOICE_MESSAGE;
exports.getCtiPbContactsStartsWith          = getCtiPbContactsStartsWith;
exports.getAllValidCallerNotesByNum         = getAllValidCallerNotesByNum;
exports.getPbContactsStartsWithDigit        = getPbContactsStartsWithDigit;
exports.getHistoryCallerNoteInterval        = getHistoryCallerNoteInterval;
exports.getAllUserHistorySmsInterval        = getAllUserHistorySmsInterval;
exports.getAllUnreadPostitOfRecipient       = getAllUnreadPostitOfRecipient;
exports.getQueueMemberLastPausedInData      = getQueueMemberLastPausedInData;
exports.getQueueMemberLastPausedOutData     = getQueueMemberLastPausedOutData;
exports.getCtiPbContactsStartsWithDigit     = getCtiPbContactsStartsWithDigit;
exports.getAllUserHistoryPostitInterval     = getAllUserHistoryPostitInterval;
exports.getAllUserHistoryCallerNoteInterval = getAllUserHistoryCallerNoteInterval;
