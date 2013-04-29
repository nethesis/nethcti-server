/**
* The architect component that exposes _operator_ module.
*
* @class arch_operator
* @module operator
*/
var operator = require('./operator');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_operator]
*/
var IDLOG = '[arch_operator]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        operator: {
            /**
            * It's the _getGroups_ method provided by _operator_ module.
            *
            * @method getGroups
            * @return {object} The list of groups of extensions.
            */
            getGroups: operator.getGroups
        }
    });

    try {
        operator.setLogger(logger);
        operator.configGroups('/etc/nethcti/opgroups.ini');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
