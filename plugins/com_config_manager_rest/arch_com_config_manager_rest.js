/**
* The architect component that starts _server\_com\_config\_manager\_rest_ module.
*
* @class arch_com_config_manager_rest
* @module com_config_manager_rest
*/
var serverRest = require('./server_com_config_manager_rest.js');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_config_manager_rest]
*/
var IDLOG = '[arch_com_config_manager_rest]';

module.exports = function (options, imports, register) {

    register();

    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    try {
        serverRest.setLogger(logger);
        serverRest.config('/etc/nethcti/services.json');
        serverRest.setCompAuthorization(imports.authorization);
        serverRest.setCompConfigManager(imports.configManager);
        serverRest.setCompUser(imports.user);
        serverRest.start();
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}
