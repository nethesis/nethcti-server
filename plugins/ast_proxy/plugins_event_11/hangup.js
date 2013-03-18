/**
* ................................
* 
* @module ast_proxy
* @submodule plugins_command_11
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [hangup]
*/
var IDLOG = '[hangup]';

/**
* The asterisk proxy.
*
* @property astProxy
* @type object
* @private
*/
var astProxy;

(function() {
    try {
        /**
        * The logger. It must have at least three methods: _info, warn and error._
        *
        * @property logger
        * @type object
        * @private
        * @default console
        */
        var logger = console;

        /**
        * Command plugin to get the asterisk vers.....................
        *
        * @class hangup
        * @static
        */
        var hangup = {
            /**
            * It's called from _ast_proxy_ component for each data received
            * from asterisk and relative to this command.
            *
            * @method data
            * @param {object} data The asterisk data for the current command
            * @static
            */
            data: function (data) {
                try {

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            },

            /**
            * Set the logger to be used.
            *
            * @method setLogger
            * @param {object} log The logger object. It must have at least
            * three methods: _info, warn and error_
            * @static
            */
            setLogger: function (log) {
                try {
                    if (typeof log === 'object'
                        && typeof log.info  === 'function'
                        && typeof log.warn  === 'function'
                        && typeof log.error === 'function') {

                        logger = log;
                    } else {
                        throw new Error('wrong logger object');
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            },

            /**
            * Store the asterisk proxy to visit.
            *
            * @method visit
            * @param {object} ap The asterisk proxy module.
            */
            visit: function (ap) {
                try {
                    // check parameter
                    if (!ap || typeof ap !== 'object') {
                        throw new Error('wrong parameter');
                    }
                    astProxy = ap;
                    logger.info(IDLOG, 'set the asterisk proxy to visit');
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        };

        // public interface
        exports.data      = hangup.data;
        exports.visit     = hangup.visit;
        exports.setLogger = hangup.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
