/**
* nethcti architect component that starts nethcti module.
*
* @class arch_nethcti
* @module nethcti
*/
var nethcti = require('./nethcti');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_nethcti]
*/
var IDLOG = '[arch_nethcti]';

module.exports = function (options, imports, register) {
    
    register();

    try {
        var logger   = console;
        var astProxy = imports.astProxy;

        if (imports.logger) { logger = imports.logger; }

        nethcti.setLogger(logger);
        nethcti.setAstProxy(astProxy);
        nethcti.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
