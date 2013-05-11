/**
* The architect component that exposes _history_ module.
*
* @class arch_history
* @module history
*/
var historyCall = require('./history');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_history]
*/
var IDLOG = '[arch_history]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        history: {
            /**
            * It's the _...._ method provided by _history_ module.
            *
            * @method ....
            */
            ...: phonebook....
        }
    });

    try {
        var dbconn = imports.dbconn;

        history.setLogger(logger);
        history.setDbconn(dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
