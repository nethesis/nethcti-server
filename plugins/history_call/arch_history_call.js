/**
* The architect component that exposes _history\_call_ module.
*
* @class arch_history_call
* @module history_call
*/
var historyCall = require('./history_call');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_history_call]
*/
var IDLOG = '[arch_history_call]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        historyCall: {
            /**
            * It's the _...._ method provided by _history\_call_ module.
            *
            * @method ....
            */
            ...: phonebook....
        }
    });

    try {
        var dbconn = imports.dbconn;

        historyCall.setLogger(logger);
        historyCall.setDbconn(dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
