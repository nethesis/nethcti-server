/**
* aaaaaaaaaaaaaaaaaaaaaaaaa.
*
* @class arch_com_nethcti_ws
* @module com_nethcti_ws
*/
var comNethctiWs = require('./com_nethcti_ws');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_nethcti_ws]
*/
var IDLOG = '[arch_com_nethcti_ws]';

module.exports = function (options, imports, register) {
    
    register();

    try {
        var logger   = console;

        if (imports.logger) { logger = imports.logger; }

        comNethctiWs.setLogger(logger);
        comNethctiWs.config('/etc/nethcti/services.json');
        comNethctiWs.setAuthe(imports.authentication);
        comNethctiWs.setAstProxy(imports.astProxy);
        comNethctiWs.setOperator(imports.operator);
        comNethctiWs.setCompVoicemail(imports.voicemail);
        comNethctiWs.setCompAuthorization(imports.authorization);
        comNethctiWs.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
