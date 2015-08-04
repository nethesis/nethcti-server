/**
* The architect component that exposes _mobile_ module.
*
* @class arch_mobile
* @module mobile
*/
var mobile = require('./mobile');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_mobile]
*/
var IDLOG = '[arch_mobile]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, { mobile: mobile });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        mobile.setLogger(logger);
        mobile.setCompUser(imports.user);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
};
