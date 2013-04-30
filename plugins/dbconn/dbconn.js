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
* The configurations to be used by database connections.
*
* @property config
* @type object
* @private
* @default {}
*/
var dbConfig = {};

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

        test();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

function test() {
    try {

        var k;
        for (k in dbConfig) {
            console.log("k: " + k);
            console.log(dbConfig[k]);

            if (dbConfig[k].dbtype === 'mysql') {

                var sequelize = new Sequelize('asteriskcdrdb', 'asteriskuser', 'LMvtzQNrX', {
                    dialect: 'mysql',
                    port: '/var/lib/mysql/mysql.sock',
                    host     : 'localhost'
                });

                sequelize.query("SELECT count(*) FROM asteriskcdrdb.cdr").success(function(myTableRows) {
                    console.log(myTableRows);
                });

            }

            return;
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.config    = config;
exports.setLogger = setLogger;
