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
* @default [meetmeJoin]
*/
var IDLOG = '[meetmeJoin]';

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
        * The plugin that handles the meetmeJoin event.
        *
        * @class meetmeJoin
        * @static
        */
        var meetmeJoin = {
            /**
            * It's called from _ast\_proxy_ component for each
            * meetmeJoin event received from the asterisk.
            *
            * @method data
            * @param {object} data The asterisk event data
            * @static
            */
            data: function (data) {
                try {
                    if (data.meetme &&
                        data.usernum &&
                        data.calleridnum &&
                        data.calleridname &&
                        data.event === 'MeetmeJoin') {

                        logger.info(IDLOG, 'received event ' + data.event);

                        var MEETME_CONF_CODE = astProxy.proxyLogic.getMeetmeConfCode();
                        var extOwnerId = data.meetme.substring(MEETME_CONF_CODE.length, data.meetme.length);
                        astProxy.proxyLogic.evtAddMeetmeUserConf({
                            name: data.calleridname,
                            confId: extOwnerId,
                            userId: data.usernum,
                            extenId: data.calleridnum
                        });

                    } else {
                        logger.warn(IDLOG, 'MeetmeJoin event not recognized');
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
        exports.data      = meetmeJoin.data;
        exports.visit     = meetmeJoin.visit;
        exports.setLogger = meetmeJoin.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
