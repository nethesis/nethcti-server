/**
 * @module astproxy
 * @submodule plugins_event_13
 */
var AST_QUEUE_MEMBER_STATUS_2_STR_ADAPTER = require('../proxy_logic_13/queue_member_status_adapter_13.js').AST_QUEUE_MEMBER_STATUS_2_STR_ADAPTER;
var QUEUE_MEMBER_STATUS_ENUM = require('../queueMember.js').QUEUE_MEMBER_STATUS_ENUM;

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [queueMemberAdded]
 */
var IDLOG = '[queueMemberAdded]';

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
     * The plugin that handles the QueueMemberAdded event.
     *
     * @class queueMemberAdded
     * @static
     */
    var queueMemberAdded = {
      /**
       * It's called from _astproxy_ component for each
       * QueueMemberAdded event received from the asterisk.
       *
       * @method data
       * @param {object} data The asterisk event data
       * @static
       */
      data: function(data) {
        try {
          if (data.callstaken && data.membername &&
            data.queue && data.lastcall &&
            data.interface && data.membership &&
            data.paused && data.status &&
            data.event === 'QueueMemberAdded') {

            logger.log.info(IDLOG, 'received event ' + data.event);

            // extract the queue member identifier. e.g. data.interface is: "Local/214@from-queue/n"
            var member = data.interface.split('@')[0].split('/')[1];
            var isBusy = (AST_QUEUE_MEMBER_STATUS_2_STR_ADAPTER[data.status] === QUEUE_MEMBER_STATUS_ENUM.BUSY ? true : false);

            astProxy.proxyLogic.evtQueueMemberAdded({
              name: data.membername,
              type: data.membership,
              paused: (data.paused === '1' ? true : false),
              member: member,
              queueId: data.queue,
              busyAgent: isBusy, // true if the agent is busy in at least one queue
              callsTakenCount: parseInt(data.callstaken), // the number of the taken calls
              lastCallTimestamp: parseInt(data.lastcall) // timestamp of the last call received by the member
            });

          } else {
            logger.log.warn(IDLOG, 'QueueMemberAdded event not recognized');
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
    exports.data = queueMemberAdded.data;
    exports.visit = queueMemberAdded.visit;
    exports.setLogger = queueMemberAdded.setLogger;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
})();
