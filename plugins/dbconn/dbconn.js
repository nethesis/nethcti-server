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
* The section names of the ini files that contains database
* connection informations.
*
* @property INI_SECTION
* @type object
* @private
* @default { POSTIT: "postit" }
*/
var INI_SECTION = {
    POSTIT:       'postit',
    PHONEBOOK:    'phonebook',
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
        // structure of the ini files. The "file" key has an array value
        // contains the list of one or more files path
        if (obj.file) {

            var i, k, ini, path;
            var fileList = obj.file; // the list of file path
            for (i = 0; i < fileList.length; i++) {
                
                path = fileList[i];

                if (fs.existsSync(path)) { // check the file existence

                    ini = iniparser.parseSync(path); // read the file
                    logger.info(IDLOG, 'configuration file ' + path + ' has been read');

                    // transfer the file content in the memory
                    for (k in ini) { dbConfig[k] = ini[k]; }

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
        // get the sequelize model already loaded
        var postit = models[INI_SECTION.POSTIT].build({
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
            logger.error(IDLOG, 'saving postig: ' + err.toString());
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
        var k;
        for (k in dbConn) {
            models[k] = dbConn[k].import(__dirname + '/sequelize_models/' + k);
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

        models[INI_SECTION.PHONEBOOK].findAll({
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
* Get the history call of the specified extension into the interval time.
* If the extension information is omitted, the results contains the
* history call of all extensions. Moreover, it can be possible to filter
* the results specifying the filter. It search the results into the
* _asteriskcdrdb.cdr_ database.
*
* @method getHistoryCallInterval
* @param {object} data
*   @param {string} [data.exten] The extension involved in the research. It is used to filter
*                                out the _channel_ and _dstchannel_. It is wrapped with '%'
*                                characters. If it is omitted the function treats it as '%' string.
*                                The '%' matches any number of characters, even zero character
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
            ||  typeof cb          !== 'function'
            ||  typeof data.to     !== 'string'
            ||  typeof data.from   !== 'string'
            || (typeof data.exten  !== 'string' && data.exten  !== undefined)
            || (typeof data.filter !== 'string' && data.filter !== undefined)) {

            throw new Error('wrong parameters');
        }

        // check optional parameters
        if (data.filter === undefined) { data.filter = '%'; }
        if (data.exten  === undefined) {
            data.exten  = '%';
        } else {
            data.exten = '%' + data.exten + '%';
        }

        models[INI_SECTION.HISTORY_CALL].findAll({
            where: [
                '(channel LIKE ? OR dstchannel LIKE ?) AND' +
                '(DATE(calldate)>=? AND DATE(calldate)<=?) AND' +
                '(src LIKE ? OR clid LIKE ? OR dst LIKE ?)',
                data.exten, data.exten,
                data.from, data.to,
                data.filter, data.filter, data.filter
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
                               data.from + ' to ' + data.to + ' for exten ' + data.exten + ' and filter ' + data.filter);
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching history call interval between ' + data.from + ' to ' + data.to +
                                ' for exten ' + data.exten + ' and filter ' + data.filter + ': ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start                  = start;
exports.config                 = config;
exports.setLogger              = setLogger;
exports.savePostit             = savePostit;
exports.getPhonebookContacts   = getPhonebookContacts;
exports.getHistoryCallInterval = getHistoryCallInterval;
