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
var fs = require('fs');
var pg = require('pg');
var path = require('path');
var async = require('async');
var mssql = require('mssql');
var moment = require('moment');
var Sequelize = require("sequelize");
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
 * It is customized by the _config_ method.
 *
 * @property logSequelize
 * @type {boolean}
 * @private
 * @default false
 */
var logSequelize = false;

/**
* The key names of the JSON files that contains database
* connection information.
*
* @property JSON_KEYS
* @type {object}
* @private
* @default {
    CEL:           "cel",
    POSTIT:        "postit",
    AMPUSERS:      "ampusers",
    VOICEMAIL:     "voicemail",
    PHONEBOOK:     "phonebook",
    QUEUE_LOG:     "queue_log",
    SMS_HISTORY:   "sms_history",
    CALLER_NOTE:   "caller_note",
    QUEUE_RECALL:  "queue_recall",
    HISTORY_CALL:  "history_call",
    CTI_PHONEBOOK: "cti_phonebook",
    USER_SETTINGS: "user_settings"
}
*/
var JSON_KEYS = {
  CEL: 'cel',
  POSTIT: 'postit',
  AMPUSERS: 'ampusers',
  VOICEMAIL: 'voicemail',
  PHONEBOOK: 'phonebook',
  QUEUE_LOG: 'queue_log',
  SMS_HISTORY: 'sms_history',
  USER_DBCONN: 'user_dbconn',
  QUEUE_RECALL: 'queue_recall',
  CALLER_NOTE: 'caller_note',
  HISTORY_CALL: 'history_call',
  CTI_PHONEBOOK: 'cti_phonebook',
  USER_SETTINGS: 'user_settings',
  CUSTOMER_CARD: 'customer_card'
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
 * The configurations to be used by database connections for customer cards.
 *
 * @property dbConfigCustCardData
 * @type object
 * @private
 * @default {}
 */
var dbConfigCustCardData = {};

/**
 * The customer card templates data.
 *
 * @property custCardTemplatesData
 * @type object
 * @private
 * @default {}
 */
var custCardTemplatesData = {};

/**
 * The database connections for customer cards.
 *
 * @property dbConnCustCard
 * @type object
 * @private
 * @default {}
 */
var dbConnCustCard = {};

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
    if (typeof log === 'object' && typeof log.log.info === 'function' && typeof log.log.warn === 'function' && typeof log.log.error === 'function') {

      logger = log;
      logger.log.info(IDLOG, 'new logger has been set');

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    if (typeof path !== 'string') {
      throw new Error('wrong parameter');
    }

    // check the file existence
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }

    var json = JSON.parse(fs.readFileSync(path, 'utf8'));
    logger.log.info(IDLOG, 'file ' + path + ' has been read');

    if ((typeof json === 'object' && json.loglevel.toLowerCase() === 'info') ||
      process.env.NODE_ENV === 'development') {

      logSequelize = true;
    }
    logger.log.info(IDLOG, 'configuration done by ' + path);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the static configurations to be use by database connections.f
 *
 * @method configDbStatic
 * @param {string} dirPath The directory path of the static JSON configuration files.
 */
function configDbStatic(dirPath) {
  try {
    // check parameter
    if (typeof dirPath !== 'string') {
      throw new Error('wrong parameter: ' + dirPath);
    }

    // check the file existence
    if (!fs.existsSync(dirPath)) {
      throw new Error(dirPath + ' does not exist');
    }

    var files = fs.readdirSync(dirPath);
    var i, k, json;
    for (i = 0; i < files.length; i++) {

      json = JSON.parse(fs.readFileSync(path.join(dirPath, files[i]), 'utf8'));
      logger.log.info(IDLOG, 'file ' + files[i] + ' has been read');

      // transfer the file content into the memory
      for (k in json) {
        dbConfig[k] = json[k];
      }
    }
    logger.log.info(IDLOG, 'configuration done by ' + dirPath);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.info(IDLOG, 'database connections initialized');

    importModels();
    logger.log.info(IDLOG, 'sequelize models imported');

    initCustCardData(function(err) {
      if (err) {
        logger.log.error(IDLOG, 'initializing customer card configurations: ' + err);
      } else {
        logger.log.info(IDLOG, 'initialized database configuration for customer cards');

        initCustCardConnections();
        logger.log.info(IDLOG, 'initialized database connections for customer card');
      }
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Test a connection with a database.
 *
 * @method testConnection
 * @param {string} host The host to connect to.
 * @param {string} port The port of the database service.
 * @param {string} type The DBMS type (sql, postgres, mssql, ...).
 * @param {string} user The username for the db connection.
 * @param {string} pass The password for the db connection.
 * @param {string} name The name of the database.
 * @param {function} cb The callback function.
 */
function testConnection(host, port, type, user, pass, name, cb) {
  try {
    if (type === 'mysql') {
      var sequelize = new Sequelize(name, user, pass, {
        host: host,
        port: port,
        dialect: 'mysql'
      });

      sequelize.authenticate().then(function(err) {
          cb(err);
        })
        .catch(function(err) {
          cb(err);
        });

    } else if (isMssqlType(type)) {
      var connection = new mssql.Connection({
        user: user,
        password: pass,
        server: host,
        port: port,
        database: name,
        options: {
          encrypt: false,
          tdsVersion: getMssqlTdsVersion(type)
        }
      }, function(err) {
        var request = new mssql.Request(connection);
        request.query('select 1 as number', function(err, recordset) {
          connection.close();
          cb(err);
        });
      });

    } else if (type === 'postgres') {
      var client = new pg.Client({
        user: user,
        password: pass,
        database: name,
        host: host,
        port: port
      });

      client.connect(function(err) {
        if (!err) {
          client.query('SELECT $1::int AS number', ['1'], function(err) {
            cb(err);
          });
        } else {
          cb(err);
        }
      });
    } else {
      cb('dbms not supported');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
        logger.log.info(IDLOG, 'loaded sequelize model ' + path);
      }
    }
    logger.log.info(IDLOG, 'all sequelize models have been imported');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Initialize all database connections for customer cards.
 *
 * @method initCustCardConnections
 * @private
 */
function initCustCardConnections() {
  try {
    logger.log.info(IDLOG, 'initializing db connections for customer cards');

    var ccName;
    for (ccName in dbConfigCustCardData) {

      if (dbConfigCustCardData[ccName].type === 'mysql') {

        var config = {
          port: dbConfigCustCardData[ccName].port,
          host: dbConfigCustCardData[ccName].host,
          define: {
            charset: 'utf8',
            timestamps: false,
            freezeTableName: true
          },
          dialect: dbConfigCustCardData[ccName].type
        };

        // default sequelize log is console.log
        if (!logSequelize) {
          config.logging = false;
        }

        sequelize = new Sequelize(dbConfigCustCardData[ccName].name, dbConfigCustCardData[ccName].user, dbConfigCustCardData[ccName].pass, config);

        dbConnCustCard[dbConfigCustCardData[ccName].id] = sequelize;
        logger.log.info(IDLOG, 'initialized db connection for customer card (id: ' + dbConfigCustCardData[ccName].id + ', ' +
          dbConfigCustCardData[ccName].type + ', ' + dbConfigCustCardData[ccName].name + ', ' + dbConfigCustCardData[ccName].host + ':' + dbConfigCustCardData[ccName].port + ')');

      } else if (dbConfigCustCardData[ccName].type === 'postgres') {
        initPostgresConnCustCard(dbConfigCustCardData[ccName]);

      } else if (isMssqlType(dbConfigCustCardData[ccName].type)) {
        initMssqlConnCustCard(dbConfigCustCardData[ccName], getMssqlTdsVersion(dbConfigCustCardData[ccName].type));
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Read database connection data for customer cards.
 *
 * @method initCustCardData
 * @param {function} cb The callback function
 * @private
 */
function initCustCardData(cb) {
  try {
    if (typeof cb !== 'function') {
      throw new Error('wrong parameter');
    }

    async.parallel({

      dbConnection: function(callback) {

        // read "user_dbconn" table with all information about the
        // database source connections used for customer card
        models[JSON_KEYS.USER_DBCONN].findAll().then(function(results) {
          try {
            incNumExecQueries();

            // extract results
            var i;
            for (i = 0; i < results.length; i++) {
              results[i] = results[i].dataValues;
            }
            logger.log.info(IDLOG, '#' + results.length + ' db connections for customer cards have been found');
            callback(null, results);

          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error, {});
          }

        }, function(err) { // manage the error
          logger.log.error(IDLOG, 'searching db connections for customer cards: ' + err.toString());
          callback(err, {});
        });
      },

      customerCard: function(callback) {
        readCustomerCard(callback);
      }

    }, function(err, results) {

      if (err) {
        logger.log.warn(IDLOG, 'initializing db configuration for customer cards: ' + err);
        cb(err);
        return;
      }

      var i;
      if (results.dbConnection) {
        for (i = 0; i < results.dbConnection.length; i++) {
          dbConfigCustCardData[results.dbConnection[i].id] = results.dbConnection[i];
        }
      }

      if (results.customerCard) {
        for (i = 0; i < results.customerCard.length; i++) {
          custCardTemplatesData[results.customerCard[i].permission_id] = results.customerCard[i];
        }
      }
      cb();
    });

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Read "customer_card" table with all information about the customer cards:
 * the name, the source db connection identifier, the query...
 *
 * @method readCustomerCard
 * @param {function} cb The callback function
 * @private
 */
function readCustomerCard(cb) {
  try {
    if (typeof cb !== 'function') {
      throw new Error('wrong parameter');
    }

    models[JSON_KEYS.CUSTOMER_CARD].findAll().then(function(results) {
      try {
        incNumExecQueries();

        // extract results
        var i;
        for (i = 0; i < results.length; i++) {
          results[i] = results[i].dataValues;
        }
        logger.log.info(IDLOG, '#' + results.length + ' db customer card templates have been found');
        cb(null, results);

      } catch (error) {
        logger.log.error(IDLOG, error.stack);
        cb(error, {});
      }

    }, function(err) { // manage the error
      logger.log.error(IDLOG, 'searching db customer card templates: ' + err.toString());
      cb(err, {});
    });

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
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
          port: dbConfig[k].dbport,
          host: dbConfig[k].dbhost,
          define: {
            charset: 'utf8',
            timestamps: false,
            freezeTableName: true
          },
          dialect: dbConfig[k].dbtype
        };

        // default sequelize log is console.log
        if (!logSequelize) {
          config.logging = false;
        }

        sequelize = new Sequelize(dbConfig[k].dbname, dbConfig[k].dbuser, dbConfig[k].dbpassword, config);

        dbConn[k] = sequelize;
        logger.log.info(IDLOG, 'initialized db connection with ' + dbConfig[k].dbtype + ' ' + dbConfig[k].dbname + ' ' + dbConfig[k].dbhost + ':' + dbConfig[k].dbport);

      } else if (dbConfig[k].dbtype === 'postgres') {
        initPostgresConn(k);

      } else if (isMssqlType(dbConfig[k].dbtype)) {
        initMssqlConn(k, getMssqlTdsVersion(dbConfig[k].dbtype));
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Initialize a Postgres connection for customer card.
 *
 * @method initPostgresConnCustCard
 * @param {object} data The db connection data
 *  @param {number} data.id The db connection identifier
 *  @param {string} data.host The db host
 *  @param {number} data.port The db port
 *  @param {string} data.type The db type
 *  @param {string} data.user The db username
 *  @param {string} data.pass The db password
 *  @param {string} data.name The db name
 * @private
 */
function initPostgresConnCustCard(data) {
  try {
    var config = {
      user: data.user,
      password: data.pass,
      database: data.name,
      host: data.host,
      port: data.port
    };
    var client = new pg.Client(config);
    client.connect(function(err) {
      if (err) {
        logger.log.error(IDLOG, 'initializing ' + data.type + ' db connection ' + data.name + ' ' + data.host + ':' + data.port + ' - ' + err.stacname);
      } else {
        dbConnCustCard[data.id] = client;
        logger.log.info(IDLOG, 'initialized db connection with ' + data.type + ' ' + data.name + ' ' + data.host + ':' + data.port + ' (id: ' + data.id + ')');
      }
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Initialize a Postgres connection.
 *
 * @method initPostgresConn
 * @param {string} name The customer card name
 * @private
 */
function initPostgresConn(name) {
  try {
    var config = {
      user: dbConfig[name].dbuser,
      password: dbConfig[name].dbpassword,
      database: dbConfig[name].dbname,
      host: dbConfig[name].dbhost,
      port: dbConfig[name].dbport
    };
    var client = new pg.Client(config);
    client.connect(function(err) {
      if (err) {
        logger.log.error(IDLOG, 'initializing ' + dbConfig[name].dbtype + ' db connection ' + dbConfig[name].dbname + ' ' + dbConfig[name].dbhost + ':' + dbConfig[name].dbport + ' - ' + err.stacname);
      } else {
        dbConn[name] = client;
        logger.log.info(IDLOG, 'initialized db connection with ' + dbConfig[name].dbtype + ' ' + dbConfig[name].dbname + ' ' + dbConfig[name].dbhost + ':' + dbConfig[name].dbport);
      }
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.error(IDLOG, err.stack);
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
    if (type.indexOf('mssql') !== -1) {
      return true;
    }
    return false;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Initialize an MSSQL connection.
 *
 * @method initMssqlConnCustCard
 * @param {object} data The db connection data
 *  @param {number} data.id The db connection identifier
 *  @param {string} data.host The db host
 *  @param {number} data.port The db port
 *  @param {string} data.type The db type
 *  @param {string} data.user The db username
 *  @param {string} data.pass The db password
 *  @param {string} data.name The db name
 * @param {string} tdsVersion The TDS version to be used in connection
 * @private
 */
function initMssqlConnCustCard(data, tdsVersion) {
  try {
    var config = {
      server: data.host,
      port: data.port,
      user: data.user,
      password: data.pass,
      database: data.name,
      options: {
        encrypt: false,
        tdsVersion: tdsVersion
      }
    };

    var connection = new mssql.Connection(config, function(err1) {
      try {
        if (err1) {
          logger.log.error(IDLOG, 'initializing db connection with ' + data.type + ' ' + data.name + ' ' + data.host + ':' + data.port + ' - ' + err1.stack);

        } else {
          dbConnCustCard[data.id] = connection;
          logger.log.info(IDLOG, 'initialized db connection with ' + data.type + ' ' + data.name + ' ' + data.host + ':' + data.port + ' (id: ' + data.id + ')');
        }
      } catch (err2) {
        logger.log.error(IDLOG, err2.stack);
      }
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
      server: dbConfig[name].dbhost,
      port: dbConfig[name].dbport,
      user: dbConfig[name].dbuser,
      password: dbConfig[name].dbpassword,
      database: dbConfig[name].dbname,
      options: {
        encrypt: false,
        tdsVersion: tdsVersion
      }
    };

    var connection = new mssql.Connection(config, function(err1) {
      try {
        if (err1) {
          logger.log.error(IDLOG, 'initializing db connection with ' + dbConfig[name].dbtype + ' ' + dbConfig[name].dbname + ' ' + dbConfig[name].dbhost + ':' + dbConfig[name].dbport + ' - ' + err1.stack);

        } else {
          dbConn[name] = connection;
          logger.log.info(IDLOG, 'initialized db connection with ' + dbConfig[name].dbtype + ' ' + dbConfig[name].dbname + ' ' + dbConfig[name].dbhost + ':' + dbConfig[name].dbport);
        }
      } catch (err2) {
        logger.log.error(IDLOG, err2.stack);
      }
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.error(IDLOG, err.stack);
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
    logger.log.error(IDLOG, err.stack);
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
    return {
      numExecQueries: numExecQueries
    };
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reset the component.
 *
 * @method reset
 */
function reset() {
  try {
    dbConfig = {};
    models = {};
    dbConfigCustCardData = {};
    custCardTemplatesData = {};
    dbConnCustCard = {};
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

// public interface
exports.on = on;
exports.emit = emit;
exports.reset = reset;
exports.start = start;
exports.models = models;
exports.config = config;
exports.dbConn = dbConn;
exports.dbConfig = dbConfig;
exports.getStats = getStats;
exports.EVT_READY = EVT_READY;
exports.Sequelize = Sequelize;
exports.JSON_KEYS = JSON_KEYS;
exports.setLogger = setLogger;
exports.isMssqlType = isMssqlType;
exports.dbConnCustCard = dbConnCustCard;
exports.testConnection = testConnection;
exports.configDbStatic = configDbStatic;
exports.readCustomerCard = readCustomerCard;
exports.incNumExecQueries = incNumExecQueries;
exports.dbConfigCustCardData = dbConfigCustCardData
exports.custCardTemplatesData = custCardTemplatesData;
