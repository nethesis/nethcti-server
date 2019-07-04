/**
 * @module ast_proxy
 * @submodule plugins_event_13
 */
var utilChannel13 = require('../proxy_logic_13/util_channel_13');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [hold]
 */
var IDLOG = '[hold]';

/**
 * The asterisk proxy.
 *
 * @property astProxy
 * @type object
 * @private
 */
var astProxy;

(function() {

  /**
   * The logger. It must have at least three methods: _info, warn and error._
   *
   * @property logger
   * @type object
   * @private
   * @default console
   */
  var logger = console;

  try {
    /**
     * The plugin that handles the Hold event.
     *
     * @class hold
     * @static
     */
    var hold = {
      /**
       * It is called from _astproxy_ component for each
       * Hold event received from the asterisk.
       *
       * @method data
       * @param {object} data The asterisk event data
       * @static
       */
      data: function(data) {
        try {
          if (data.channel && data.calleridnum && data.connectedlinenum && data.event === 'Hold') {
            logger.log.info(IDLOG, 'received event ' + data.event);
            var channelExten = utilChannel13.extractExtensionFromChannel(data.channel);
            astProxy.proxyLogic.evtConversationHold({
              whoPutsOnHoldExten: channelExten,
              whoPutsOnHold: data.calleridnum,
              putOnHold: data.connectedlinenum
            });
          }
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
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
      setLogger: function(log) {
        try {
          if (typeof log === 'object' &&
            typeof log.log.info === 'function' &&
            typeof log.log.warn === 'function' &&
            typeof log.log.error === 'function') {

            logger = log;
          } else {
            throw new Error('wrong logger object');
          }
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
        }
      },

      /**
       * Store the asterisk proxy to visit.
       *
       * @method visit
       * @param {object} ap The asterisk proxy module.
       */
      visit: function(ap) {
        try {
          // check parameter
          if (!ap || typeof ap !== 'object') {
            throw new Error('wrong parameter');
          }
          astProxy = ap;
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
        }
      }
    };

    // public interface
    exports.data = hold.data;
    exports.visit = hold.visit;
    exports.setLogger = hold.setLogger;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
})();
