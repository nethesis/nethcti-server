/**
* @module ast_proxy
* @submodule plugins_event_11
*/
var utilChannel11 = require('../proxy_logic_11/util_channel_11');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [bridge]
*/
var IDLOG = '[bridge]';

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
        * The plugin that handles the Bridge event.
        *
        * @class bridge
        * @static
        */
        var bridge = {
            /**
            * It's called from _ast\_proxy_ component for each
            * Bridge event received from the asterisk.
            *
            * @method data
            * @param {object} data The asterisk event data
            * @static
            */
            data: function (data) {
                try {
                    if (data.channel1 &&
                        data.channel2 &&
                        data.bridgestate === 'Link' &&
                        data.event       === 'Bridge') {

                        var channelExten1 = utilChannel11.extractExtensionFromChannel(data.channel1);
                        var channelExten2 = utilChannel11.extractExtensionFromChannel(data.channel2);

                        logger.info(IDLOG, 'received event ' + data.event);
                        astProxy.proxyLogic.evtConversationConnected(channelExten1, channelExten2);
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
        exports.data      = bridge.data;
        exports.visit     = bridge.visit;
        exports.setLogger = bridge.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();