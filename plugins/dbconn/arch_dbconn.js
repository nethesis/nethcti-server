/**
* The architect component that exposes _dbconn_ module.
*
* @class arch_dbconn
* @module dbconn
*/
var dbconnMain           = require('./dbconn_main');
var dbconnPluginsManager = require('./dbconn_plugins_manager');

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

    // attach some extra static apis
    dbconnPluginsManager.apiDbconn.on        = dbconnMain.on;
    dbconnPluginsManager.apiDbconn.EVT_READY = dbconnMain.EVT_READY;

    // public interface for other architect components
    register(null, { dbconn: dbconnPluginsManager.apiDbconn });

    try {
        dbconnMain.setLogger(logger);
        dbconnMain.config('/etc/nethcti/nethcti.json');
        dbconnMain.configDbStatic('/etc/nethcti/dbstatic.json');
        dbconnMain.configDbDynamic('/etc/nethcti/dbdynamic.json');
        dbconnMain.start();
        dbconnPluginsManager.setLogger(logger);
        dbconnPluginsManager.setCompDbconnMain(dbconnMain);
        dbconnPluginsManager.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
