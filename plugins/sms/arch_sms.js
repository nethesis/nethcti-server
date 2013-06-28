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
            send: sms.send
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        sms.setLogger(logger);
        sms.config('/etc/nethcti/sms.json');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
