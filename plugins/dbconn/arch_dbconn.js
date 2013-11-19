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
* @default [arch_dbconn]
*/
var IDLOG = '[arch_dbconn]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        dbconn: dbconn 
        }
    );

    try {
        dbconn.setLogger(logger);
        dbconn.config({
            file: ['/etc/nethcti/dbstatic.json', '/etc/nethcti/dbdynamic.json']
        });
        dbconn.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
