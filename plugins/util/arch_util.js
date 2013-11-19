/**
* The architect component that exposes _util_ module.
*
* @class arch_util
* @module util
*/
var util = require('./util');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_util]
*/
var IDLOG = '[arch_util]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        /**
        * It's all the utility functions provided by the _util_ module.
        *
        * @property util
        * @type object
        */
        util: util
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }
        util.setLogger(logger);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
