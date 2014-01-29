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
* @default [dial]
*/
var IDLOG = '[dial]';

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
        * The plugin that handles the Dial event.
        *
        * @class dial
        * @static
        */
        var dial = {
            /**
            * It's called from _ast\_proxy_ component for each
            * Dial event received from the asterisk.
            *
            * @method data
            * @param {object} data The asterisk event data
            * @static
            */
            data: function (data) {
                try {
                    if (data.subevent === 'Begin'
                        && data.channel      && data.calleridnum
                        && data.destination  && data.connectedlinenum
                        && data.calleridname && data.event === 'Dial') {

                        // extract the extension name from the channels
                        // e.g. data.destination and data.channel can be "SIP/614-00000070" or "SIP/Eutelia-07211835565-00000045"
                        // the first example concerns an extension and its name is "614"
                        // the second example concerns a trunk and its name is "Eutelia-07211835565"
                        var chDestExten   = data.destination.substring(0, data.destination.lastIndexOf('-')).split('/')[1];
                        var chSourceExten = data.channel.substring(0, data.channel.lastIndexOf('-')).split('/')[1];

                        logger.info(IDLOG, 'received event ' + data.event);
                        astProxy.proxyLogic.evtConversationDialing({
                            chDest:        data.destination,
                            chSource:      data.channel,
                            callerNum:     data.calleridnum,
                            callerName:    data.calleridname === '<unknown>' ? '' : data.calleridname,
                            dialingNum:    data.connectedlinenum,
                            chDestExten:   chDestExten,
                            chSourceExten: chSourceExten
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
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        };

        // public interface
        exports.data      = dial.data;
        exports.visit     = dial.visit;
        exports.setLogger = dial.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
