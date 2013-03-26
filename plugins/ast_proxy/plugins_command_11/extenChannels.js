/**
* @submodule plugins_command_11
*/
var action = require('../action');
var AST_CHANNEL_STATE_2_STRING_ADAPTER = require('../channel_status_adapter_11').AST_CHANNEL_STATE_2_STRING_ADAPTER;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [extenChannels]
*/
var IDLOG = '[extenChannels]';

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
        * List of all the channels of the extension. The key is the channel identifie
        * and the value is the _Channel_ object.
        *
        * @property list
        * @type {object}
        * @private
        */
        var list = {};

        /**
        * Command plugin to get the list of all the channels of the extension.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'extenChannels', exten: '214' }, function (res) {
        *         // some code
        *     });
        *
        *
        * @class extenChannels
        * @static
        */
        var extenChannels = {

            /**
            * Execute asterisk action to get the list of all the channels of the extension.
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
                    act.ActionID = action.getActionId('extenChannels_' + args.exten);

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
                    // when this plugin is used without exten parameter,
                    // exten is the string undefined
                    var exten = data.actionid.split('_')[1];

                    // store new channel object
                    if (exten !== 'undefined'
                        && data.calleridnum === exten
                        && data.event === 'CoreShowChannel') {

                        if (!list[exten]) { list[exten] = {}; }

                        var type = calculateChType(data);

                        var obj = {
                            type:             type,
                            status:           AST_CHANNEL_STATE_2_STRING_ADAPTER[data.channelstate],
                            channel:          data.channel,
                            duration:         data.duration,
                            callerNum:        data.calleridnum,
                            callerName:       data.calleridname,
                            bridgedNum:       data.connectedlinenum,
                            bridgedName:      data.connectedlinename,
                            bridgedChannel:   data.bridgedchannel
                        };
                        list[exten][data.channel] = obj;

                    } else if (map[data.actionid]
                               && exten      !== 'undefined'
                               && data.event === 'CoreShowChannelsComplete') {

                        map[data.actionid]({ exten: exten, resp: list[exten] }); // callback execution
                    }

                    if (data.event === 'CoreShowChannelsComplete') {
                        delete list[exten];        // empty list of the extension
                        delete map[data.actionid]; // remove association ActionID-callback
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
            }
        };

        // public interface
        exports.data      = extenChannels.data;
        exports.execute   = extenChannels.execute;
        exports.setLogger = extenChannels.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Extract the channel type from the aterisk event.
*
* @method calculateChType
* @param {object} data The asterisk event
* @private
* @return {string} The channel type: "source" | "destination"
*/
function calculateChType(data) {
    try {
        // calculate channel type: source or destination
        var ch        = data.channel;
        var chBridged = data.bridgedchannel;
        var type;

        // the channel is connected to another one, so channel type
        // calculation is based on the asterisk channel number
        if (chBridged !== '') {

            var numCh        = ch.split('-')[1]; // asterisk channel number
            var numChBridged = chBridged.split('-')[1];

            if (numCh > numChBridged) { // this channel has been created later
                type = 'destination';
            } else { // this channel has been created earlier
                type = 'source';
            }

        } else if (data.channelstatedesc.toLowerCase() === 'ringing') {
            type = 'destination';

        } else if (data.channelstatedesc.toLowerCase() === 'ring') {
            type = 'source';
        }
        return type;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
