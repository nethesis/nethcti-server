/**
* ................................
* 
* @module ast_proxy
* @submodule plugins_event_11
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [extensionStatus]
*/
var IDLOG = '[extensionStatus]';

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
        * Command plugin to get the asterisk version.............
        *
        * @class peerstatus
        * @static
        */
        var extensionStatus = {
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
                    if (data.status
                        && data.exten
                        && data.event === 'ExtensionStatus') {

                        logger.info(IDLOG, 'received event ' + data.event);
                        astProxy.proxyLogic.extenStatusChanged(data.exten, data.status);

                    } else {
                        logger.warn(IDLOG, 'ExtensionStatus event not recognized');
                    }

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
        exports.data      = extensionStatus.data;
        exports.visit     = extensionStatus.visit;
        exports.setLogger = extensionStatus.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
