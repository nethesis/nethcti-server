/**
* @submodule plugins_command_11
*/
var action = require('../action');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [listParkedChannels]
*/
var IDLOG = '[listParkedChannels]';

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
        * Command plugin to get the list of all channels.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'listParkedChannels' }, function (res) {
        *         // some code
        *     });
        *
        *
        * @class listParkedChannels
        * @static
        */
        var listParkedChannels = {

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
                    var act = { Action: 'Command', Command: 'parkedcalls show' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('listParkedChannels');

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
                    // the list of parked channels
                    var list = {};

                    // store new channel object
                    if (data.response  === 'Follows' &&
                        data.privilege === 'Command') {
                        // the answer received in the event is a string. So analize it


                        // search the value that contains parked channels informations
                        var k, value;
                        for (k in data) {

                            if (k.indexOf('parking lot') !== -1) {
                                value = data[k];
                                break;
                            }
                        }

                        // analize the string of parked channels
                        var arr = value.split('\n');

                        // get the number of parked channels
                        // e.g. arr[arr.length - 2] is '1 parked call in total.'
                        var numParkedCh = parseInt(arr[arr.length - 2].split(' ')[0]);

                        // there are some parked channels
                        if (isNaN(numParkedCh) === false && numParkedCh > 0) {

                            var startIndex = arr.length - (4 + numParkedCh); // start array index of the parked channels
                            arr = arr.slice(startIndex, numParkedCh + 1);    // get only the array elements relative to parked channels

                            // parse elements of all parked channels
                            var i, d, ch, rowArr, timeout, park;
                            for (i = 0; i < arr.length; i++) {

                                rowArr = arr[i].split(/\s/);
                                rowArr = rowArr.filter(isNotEmpty); // remove empty string from the array
                                ch   = rowArr[1]; // the parked channel
                                park = rowArr[0]; // the parking number

                                // calculate timeout as timestamp from now. It is the countdown timestamp
                                timeout = rowArr[rowArr.length - 1]; // e.g. timeout = 41s
                                timeout = timeout.substring(0, timeout.length - 1); // remove 's' of seconds
                                timeout = parseInt(timeout);

                                list[park] = {};
                                list[park].channel = ch;
                                list[park].parking = park;
                                list[park].timeout = timeout;
                            }
                        }
                        
                        map[data.actionid](null, list); // callback execution

                    } else if (map[data.actionid]) {
                        map[data.actionid](new Error('error')); // callback execution
                    }

                    list = {}; // empty list
                    delete map[data.actionid]; // remove association ActionID-callback

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    if (map[data.actionid]) {
                        map[data.actionid](err);
                        delete map[data.actionid];
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
        exports.data      = listParkedChannels.data;
        exports.execute   = listParkedChannels.execute;
        exports.setLogger = listParkedChannels.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

function isNotEmpty(element, index, array) {
    return (element !== '');
}
