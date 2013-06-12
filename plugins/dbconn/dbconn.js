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
    POSTIT:       'postit',
    PHONEBOOK:    'phonebook',
    CALLER_NOTE:  'caller_note',
    HISTORY_CALL: 'history_call'
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
* Save new post-it in the database.
*
* @method savePostit
* @param {string} creator The creator name of the post-it
* @param {string} text The message text
* @param {string} recipient The recipient of the message
* @param {function} cb The callback function
*/
function savePostit(creator, text, recipient, cb) {
    try {
        // check parameters
        if (typeof creator      !== 'string'
            || typeof text      !== 'string'
            || typeof recipient !== 'string') {

            throw new Error('wrong parameters');
        }

        // get the sequelize model already loaded
        var postit = models[JSON_KEYS.POSTIT].build({
            text:      text,
            creator:   creator,
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
* Save the the caller note in the database.
*
* @method saveCallerNote
* @param {object} data
*   @param {string} data.number The caller/called number that is associated
*       with the note
*   @param {string} data.creator The creator of the caller note
*   @param {string} data.callid The identifier of the call. It can be the "uniqueid" field
*       of the database table "asteriskcdrdb.cdr" in the asterisk scenario
*   @param {string} data.text The text of the note
*   @param {boolean} data.booking The reservation option. If the creator has booked
*       the callback from the expressed number
*   @param {boolean} data.public True if the caller note visibility is public, false otherwise
*   @param {string} data.expiration It's the expiration date of the note. It must
*       use the YYYYMMDD format, e.g. to express the date of "12 june 2013" you must
*       use 20130612
* @param {function} cb The callback function
*/
function saveCallerNote(data, cb) {
    try {
        // check parameter
        if (typeof data            !== 'object'  || typeof data.text       !== 'string'
            || typeof data.creator !== 'string'  || typeof data.number     !== 'string'
            || typeof data.booking !== 'boolean' || typeof data.expiration !== 'string'
            || typeof data.public  !== 'boolean' || typeof data.callid     !== 'string') {

            throw new Error('wrong parameter');
        }

        // get the sequelize model already loaded
        var callerNote = models[JSON_KEYS.CALLER_NOTE].build({
            text:       data.text,
            callid:     data.callid,
            number:     data.number,
            public:     data.public,
            creator:    data.creator,
            booking:    data.booking,
            expiration: data.expiration
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
* Gets the phonebook contacts. It search in the centralized address
* book and search in the fields _name, company, workphone, homephone_ and
* _cellphone_. It orders the results by _name_ and _company_ ascending.
* The specified term is wrapped with '%' character. The centralized
* address book is the mysql _phonebook.phonebook_.
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

            logger.info(IDLOG, results.length + ' results by searching centralized phonebook contacts for ' + term);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching centralized phonebook contacts for ' + term + ': ' + err.toString());
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
*   @param {string} [data.endpoint] The endpoint involved in the research, e.g. the extesion
*       identifier. It is used to filter out the _channel_ and _dstchannel_. It is wrapped with '%'
*       characters. If it is omitted the function treats it as '%' string. The '%' matches any number
*       of characters, even zero character
*   @param {string} data.from The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used in the _src, clid_ and _dst_ fields. If it is
*                                 omitted the function treats it as '%' string
* @param {function} cb The callback function
*/
function getHistoryCallInterval(data, cb) {
    try {
        // check parameters
        if (typeof data !== 'object'
            ||  typeof cb            !== 'function'
            ||  typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'
            || (typeof data.endpoint !== 'string' && data.endpoint  !== undefined)
            || (typeof data.filter   !== 'string' && data.filter !== undefined)) {

            throw new Error('wrong parameters');
        }

        // check optional parameters
        if (data.filter === undefined) { data.filter = '%'; }
        if (data.endpoint  === undefined) {
            data.endpoint  = '%';
        } else {
            data.endpoint = '%' + data.endpoint + '%';
        }

        // search
        models[JSON_KEYS.HISTORY_CALL].findAll({
            where: [
                '(channel LIKE ? OR dstchannel LIKE ?) AND' +
                '(DATE(calldate)>=? AND DATE(calldate)<=?) AND' +
                '(src LIKE ? OR clid LIKE ? OR dst LIKE ?)',
                data.endpoint, data.endpoint,
                data.from,     data.to,
                data.filter,   data.filter,   data.filter
            ],
            attributes: [
                [ 'DATE_FORMAT(calldate, "%d/%m/%Y")', 'date'],
                [ 'DATE_FORMAT(calldate, "%H:%i:%S")', 'time'],
                'clid', 'src', 'dst', 'channel', 'dstchannel', 'uniqueid',
                'duration', 'billsec', 'disposition', 'dcontext'
            ]
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
*                                out the _creator_. If it is omitted the function treats it as '%' string.
*                                The '%' matches any number of characters, even zero character.
*   @param {string} data.from The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used in the _src, clid_ and _dst_ fields. If it is
*                                 omitted the function treats it as '%' string
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

        // check optional parameters
        if (data.filter   === undefined) { data.filter = '%';   }
        if (data.username === undefined) { data.username = '%'; }

        // search
        models[JSON_KEYS.POSTIT].findAll({
            where: [
                'creator=? AND ' +
                '(DATE(datecreation)>=? AND DATE(datecreation)<=?) AND ' +
                '(recipient LIKE ?)',
                data.username,
                data.from, data.to,
                data.filter
            ],
            attributes: [
                [ 'DATE_FORMAT(datecreation, "%d/%m/%Y")', 'datecreation'],
                [ 'DATE_FORMAT(datecreation, "%H:%i:%S")', 'timecreation'],
                [ 'DATE_FORMAT(dateread, "%d/%m/%Y")', 'dateread'],
                [ 'DATE_FORMAT(dateread, "%H:%i:%S")', 'timeread'],
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
    }
}

/**
* Get the customer card of the specified type. It search the results into the
* database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
* or _/etc/nethcti/dbdynamic.json_ files.
*
* @method getCustomerCardByNum
* @param {string} type The type of the customer card to retrieve
* @param {string} num The phone number used to search in _channel_ and _dstchannel_ mysql
*                     fields. It is used to filter. It is preceded by '%' character
* @param {function} cb The callback function
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
        num = dbConn[type].constructor.Utils.escape(num); // e.g. num = '123456'
        num = num.substring(1, num.length - 1); // remove external quote e.g. num = 123456

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

// public interface
exports.start                    = start;
exports.config                   = config;
exports.setLogger                = setLogger;
exports.savePostit               = savePostit;
exports.saveCallerNote           = saveCallerNote;
exports.getPhonebookContacts     = getPhonebookContacts;
exports.getCustomerCardByNum     = getCustomerCardByNum;
exports.getHistoryCallInterval   = getHistoryCallInterval;
exports.getHistoryPostitInterval = getHistoryPostitInterval;
