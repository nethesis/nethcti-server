/**
* @submodule plugins_command_11
*/
var action        = require('../action');
var utilChannel11 = require('../proxy_logic_11/util_channel_11');
var AST_CHANNEL_STATE_2_STRING_ADAPTER = utilChannel11.AST_CHANNEL_STATE_2_STRING_ADAPTER;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [listChannels]
*/
var IDLOG = '[listChannels]';

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
        * Map associations between ActionID and callback to execute at the end
        * of the command.
        *
        * @property map
        * @type {object}
        * @private
        */
        var map = {};

        /**
        * List of all channels. The key is the channel identifier
        * and the value is the _Channel_ object.
        *
        * @property list
        * @type {object}
        * @private
        */
        var list = {};

        /**
        * Command plugin to get the list of all channels.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'listChannels' }, function (res) {
        *         // some code
        *     });
        *
        *
        * @class listChannels
        * @static
        */
        var listChannels = {

            /**
            * Execute asterisk action to get the list of all channels.
            *
            * @method execute
            * @param {object} am Asterisk manager to send the action
            * @param {object} args The object contains optional parameters
            * passed to _doCmd_ method of the ast_proxy component
            * @param {function} cb The callback function called at the end
            * of the command
            * @static
            */
            execute: function (am, args, cb) {
                try {
                    // action for asterisk
                    var act = { Action: 'CoreShowChannels' };

                    // set the action identifier
                    act.ActionID = action.getActionId('listChannels');

                    // add association ActionID-callback
                    map[act.ActionID] = cb;

                    // send action to asterisk
                    am.send(act);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            },

            /**
            * It's called from _ast_proxy_ component for each data received
            * from asterisk and relative to this command.
            *
            * @method data
            * @param {object} data The asterisk data for the current command.
            * @static
            */
            data: function (data) {
                try {
                    // store new channel object
                    if (data.event === 'CoreShowChannel' &&
                        data.calleridnum) {

                        // extract the extension name from the channel
                        var channelExten = utilChannel11.extractExtensionFromChannel(data.channel);

                        var obj = {
                            status:         AST_CHANNEL_STATE_2_STRING_ADAPTER[data.channelstate],
                            channel:        data.channel,
                            uniqueid:       data.uniqueid,
                            callerNum:      data.calleridnum,
                            callerName:     data.calleridname,
                            bridgedNum:     data.connectedlinenum,
                            bridgedName:    data.connectedlinename,
                            inConference:   data.application === 'MeetMe' ? true : false,
                            channelExten:   channelExten,
                            bridgedChannel: data.bridgedchannel
                        };

                        // add queue information
                        if (data.context === 'from-queue') { obj.queue = data.extension; }

                        list[data.channel] = obj;

                    } else if (map[data.actionid] && data.event === 'CoreShowChannelsComplete') {
                        map[data.actionid](null, list); // callback execution
                    }

                    if (data.event === 'CoreShowChannelsComplete') {
                        list = {}; // empty list
                        delete map[data.actionid]; // remove association ActionID-callback
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    if (map[data.actionid]) {
                        map[data.actionid](err);
                        delete map[data.actionid]; // remove association ActionID-callback
                    }
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
            }
        };

        // public interface
        exports.data      = listChannels.data;
        exports.execute   = listChannels.execute;
        exports.setLogger = listChannels.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();