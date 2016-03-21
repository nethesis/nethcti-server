/**
* Provides the real time informations about extension ringings.
*
* @class arch_com_nethcti_tcp
* @module com_nethcti_tcp
*/
var comNethctiTcp = require('./com_nethcti_tcp');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_nethcti_tcp]
*/
var IDLOG = '[arch_com_nethcti_tcp]';

module.exports = function (options, imports, register) {

    register(null, {
        com_nethcti_tcp: {
            /**
            * It's the _getNumConnectedClients_ method provided by _com\_nethcti\_tcp_ module.
            *
            * @method getNumConnectedClients
            */
            getNumConnectedClients: comNethctiTcp.getNumConnectedClients
        }
    });

    try {
        var logger = console;

        if (imports.logger) { logger = imports.logger; }

        // wait for the authentication component ready event
        imports.authentication.on(imports.authentication.EVT_COMP_READY, function () {
            comNethctiTcp.setLogger(logger);
            comNethctiTcp.setCompAuthe(imports.authentication);
            comNethctiTcp.config('/etc/nethcti/services.json');
            comNethctiTcp.configWinPopup('/etc/nethcti/win_popup.json');
            comNethctiTcp.setCompUser(imports.user);
            comNethctiTcp.setAstProxy(imports.astProxy);
            comNethctiTcp.setCompAuthorization(imports.authorization);
            comNethctiTcp.setCompConfigManager(imports.configManager);
            comNethctiTcp.setCompStreaming(imports.streaming);
            comNethctiTcp.start();
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
