/**
* The architect component that exposes _dbconn_ module.
*
* @class arch_dbconn
* @module dbconn
*/
var dbconn = require('./dbconn');

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

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        dbconn: {
        }
    });

    try {
        dbconn.setLogger(logger);
        dbconn.config({
            file: ['/etc/nethcti/dbstatic.ini', '/etc/nethcti/dbdynamic.ini']
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
