/**
* Provides the database functions. It initialize database connections.
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
var mssql        = require('mssql');
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
* The number of executed queries.
*
* @property numExecQueries
* @type number
* @private
* @default 0
*/
var numExecQueries = 0;

/**
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();
emitter.setMaxListeners(20);

/**
* Fired when the component is ready.
*
* @event ready
*/
/**
* The name of the ready event.
*
* @property EVT_READY
* @type string
* @default "ready"
*/
var EVT_READY = 'ready';

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
    CTI_PHONEBOOK: "cti_phonebook",
    USER_SETTINGS: "user_settings"
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
    CTI_PHONEBOOK: 'cti_phonebook',
    USER_SETTINGS: 'user_settings'
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

            } else if (isMssqlType(dbConfig[k].dbtype)) {

                initMssqlConn(k, getMssqlTdsVersion(dbConfig[k].dbtype));
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the TDS version for MSSQL from the database type configuration.
* The type has the format "mssql:TDS_VERSION", for example "mssql:7_4".
*
* @method getMssqlTdsVersion
* @param  {string} type The database type expressed in the configuration file
* @return {string} The TDS version to be used for connection.
* @private
*/
function getMssqlTdsVersion(type) {
    try {
        return type.split(':')[1];

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Checks if the configuration database type is MSSQL. When it is true,
* the type has the format "mssql:TDS_VERSION", for example "mssql:7_4".
*
* @method isMssqlType
* @param  {string}  type The database type expressed in the configuration file
* @return {boolean} True if the type is MSSQL.
* @private
*/
function isMssqlType(type) {
    try {
        if (type.indexOf('mssql') !== -1) { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Initialize an MSSQL connection.
*
* @method initMssqlConn
* @param {string} name       The customer card name
* @param {string} tdsVersion The TDS version to be used in connection
* @private
*/
function initMssqlConn(name, tdsVersion) {
    try {
        var config = {
            server:   dbConfig[name].dbhost,
            user:     dbConfig[name].dbuser,
            password: dbConfig[name].dbpassword,
            database: dbConfig[name].dbname,
            options: {
                encrypt:    false,
                tdsVersion: tdsVersion
            }
        };

        var connection = new mssql.Connection(config, function(err1) {
            try {
                if (err1) {
                    logger.error(IDLOG, 'initializing db connection with ' + dbConfig[name].dbtype + ' ' + dbConfig[name].dbname + ' ' + dbConfig[name].dbhost + ':' + dbConfig[name].dbport + ' - ' + err1.stack);

                } else {
                    dbConn[name] = connection;
                    logger.info(IDLOG, 'initialized db connection with ' + dbConfig[name].dbtype + ' ' + dbConfig[name].dbname + ' ' + dbConfig[name].dbhost + ':' + dbConfig[name].dbport);
                }
            } catch (err2) {
                logger.error(IDLOG, err2.stack);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
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

/**
* Emit an event. It's the same of nodejs _events.EventEmitter.emit_ method.
*
* @method emit
* @param {string} ev The name of the event
* @param {object} data The object to be emitted
*/
function emit(ev, data) {
    try {
        emitter.emit(ev, data);
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the statistics.
*
* @method getStats
* @return {object} The statistics.
*/
function getStats() {
    try {
        return { numExecQueries: numExecQueries };
    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Increment the number of executed queries by one unit.
*
* @method incNumExecQueries
*/
function incNumExecQueries() {
    try {
        numExecQueries += 1;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.on                = on;
exports.emit              = emit;
exports.start             = start;
exports.models            = models;
exports.config            = config;
exports.dbConn            = dbConn;
exports.dbConfig          = dbConfig;
exports.getStats          = getStats;
exports.EVT_READY         = EVT_READY;
exports.JSON_KEYS         = JSON_KEYS;
exports.setLogger         = setLogger;
exports.configDbStatic    = configDbStatic;
exports.configDbDynamic   = configDbDynamic;
exports.incNumExecQueries = incNumExecQueries;
