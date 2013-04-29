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
        var authe    = imports.authentication;
        var astProxy = imports.astProxy;
        var operator = imports.operator;

        if (imports.logger) { logger = imports.logger; }

        comNethctiWs.setLogger(logger);
        comNethctiWs.setAuthe(authe);
        comNethctiWs.setAstProxy(astProxy);
        comNethctiWs.setOperator(operator);
        comNethctiWs.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
