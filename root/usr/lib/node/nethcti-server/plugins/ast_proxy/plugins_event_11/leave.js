/**
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
* @default [leave]
*/
var IDLOG = '[leave]';

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
        * The plugin that handles the Leave event raised when a channel leaves a queue.
        *
        * @class leave
        * @static
        */
        var leave = {
            /**
            * It's called from _ast\_proxy_ component for each
            * Leave event received from the asterisk.
            *
            * @method data
            * @param {object} data The asterisk event data
            * @static
            */
            data: function (data) {
                try {
                    if (data.channel  &&
                        data.position && data.event === 'Leave') {

                        logger.info(IDLOG, 'received event ' + data.event);
                        astProxy.proxyLogic.evtRemoveQueueWaitingCaller({
                            queue:      data.queue,
                            channel:    data.channel,
                            position:   data.position,
                            callerNum:  data.calleridnum,
                            callerName: data.calleridname
                        });
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
                    if (typeof log       === 'object'   &&
                        typeof log.info  === 'function' &&
                        typeof log.warn  === 'function' &&
                        typeof log.error === 'function') {

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
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        };

        // public interface
        exports.data      = leave.data;
        exports.visit     = leave.visit;
        exports.setLogger = leave.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();