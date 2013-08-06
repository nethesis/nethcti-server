/**
* The architect component that exposes _sms_ module.
*
* @class arch_sms
* @module sms
*/
var sms = require('./sms');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_sms]
*/
var IDLOG = '[arch_sms]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        sms: {
            /**
            * It's the _send_ method provided by _sms_ module.
            *
            * @method send
            */
            send: sms.send,

            /**
            * It's the _getHistoryInterval_ method provided by _sms_ module.
            *
            * @method getHistoryInterval
            */
            getHistoryInterval: sms.getHistoryInterval,

            /**
            * It's the _getAllUserHistoryInterval_ method provided by _sms_ module.
            *
            * @method getAllUserHistoryInterval
            */
            getAllUserHistoryInterval: sms.getAllUserHistoryInterval
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        sms.setLogger(logger);
        sms.config('/etc/nethcti/sms.json');
        sms.setCompDbconn(imports.dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
