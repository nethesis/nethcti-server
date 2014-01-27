/**
* Provides the real time informations about extension ringings.
*
* @class arch_com_nethcti_tcp
* @module com_nethcti_tcp
*/
var comNethctiWs = require('./com_nethcti_tcp');

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
    
    register();

    try {
        var logger = console;

        if (imports.logger) { logger = imports.logger; }

        // wait for the authentication component ready event
        imports.authentication.on(imports.authentication.EVT_COMP_READY, function () {
            comNethctiWs.setLogger(logger);
            comNethctiWs.setCompAuthe(imports.authentication);
            comNethctiWs.config('/etc/nethcti/services.json');
            comNethctiWs.setCompUser(imports.user);
            comNethctiWs.setAstProxy(imports.astProxy);
            comNethctiWs.setCompAuthorization(imports.authorization);
            comNethctiWs.setCompStreaming(imports.streaming);
            comNethctiWs.start();
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
