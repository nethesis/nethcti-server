/**
* @submodule plugins_command_11
*/
var action = require('../action');
var AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER = require('../proxy_logic_11/dahdi_trunk_ch_status_adapter_11.js').AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [listDahdiChannels]
*/
var IDLOG = '[listDahdiChannels]';

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
        * List of all the DAHDI channels. The key is the channel identifier
        * and the value is the channel object.
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
        *     ast_proxy.doCmd({ command: 'listDahdiChannels' }, function (res) {
        *         // some code
        *     });
        *
        *
        * @class listDahdiChannels
        * @static
        */
        var listDahdiChannels = {

            /**
            * Execute asterisk action to get the list of all the DAHDI channels.
            * 
            * @method execute
            * @param {object}   am   Asterisk manager to send the action
            * @param {object}   args The object contains optional parameters passed to _doCmd_ method of the ast_proxy component
            * @param {function} cb   The callback function called at the end of the command
            * @static
            */
            execute: function (am, args, cb) {
                try {
                    // action for asterisk
                    var act = { Action: 'DAHDIShowChannels' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('listDahdiChannels');

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
            * @param {object} data The asterisk data for the current command
            * @static
            */
            data: function (data) {
                try {
                    // store new channel object
                    if (data.event === 'DAHDIShowChannels' &&
                        data.dahdichannel && data.alarm) {

                        var obj = {
                            status:  AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER[data.alarm.toLowerCase()],
                            channel: data.dahdichannel
                        };
                        list[data.dahdichannel] = obj;

                    } else if (map[data.actionid] && data.event === 'DAHDIShowChannelsComplete') {
                        map[data.actionid](null, list); // callback execution
                    }

                    if (data.event === 'DAHDIShowChannelsComplete') {
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
        exports.data      = listDahdiChannels.data;
        exports.execute   = listDahdiChannels.execute;
        exports.setLogger = listDahdiChannels.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
