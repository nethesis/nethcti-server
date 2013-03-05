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
        var authe    = imports.authe;
        var astProxy = imports.astProxy;

        if (imports.logger) { logger = imports.logger; }

        comNethctiWs.setLogger(logger);
        comNethctiWs.setAstProxy(astProxy);
        comNethctiWs.setAuthe(authe);
        comNethctiWs.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
