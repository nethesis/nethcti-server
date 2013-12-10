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
* @default [queueMemberRemoved]
*/
var IDLOG = '[queueMemberRemoved]';

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
        * The plugin that handles the QueueMemberRemoved event.
        *
        * @class queueMemberRemoved
        * @static
        */
        var queueMemberRemoved = {
            /**
            * It's called from _ast\_proxy_ component for each
            * QueueMemberRemoved event received from the asterisk.
            *
            * @method data
            * @param {object} data The asterisk event data
            * @static
            */
            data: function (data) {
                try {
                    if (   data.queue
                        && data.location && data.event === 'QueueMemberRemoved') {

                        logger.info(IDLOG, 'received event ' + data.event);

                        // extract the queue member identifier. e.g. data.location is: "Local/214@from-queue/n"
                        var member = data.location.split('@')[0].split('/')[1];

                        astProxy.proxyLogic.evtQueueMemberRemoved({
                            member:  member,
                            queueId: data.queue
                        });

                    } else {
                        logger.warn(IDLOG, 'QueueMemberRemoved event not recognized');
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
        exports.data      = queueMemberRemoved.data;
        exports.visit     = queueMemberRemoved.visit;
        exports.setLogger = queueMemberRemoved.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
