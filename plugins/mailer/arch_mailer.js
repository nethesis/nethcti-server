/**
* The architect component that exposes _mailer_ module.
*
* @class arch_mailer
* @module mailer
*/
var mailer = require('./mailer');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_mailer]
*/
var IDLOG = '[arch_mailer]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        mailer: {
            /**
            * It's the _send_ method provided by _mailer_ module.
            *
            * @method send
            */
            send: mailer.send
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        mailer.setLogger(logger);
        mailer.config('/etc/nethcti/mailer.json');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
