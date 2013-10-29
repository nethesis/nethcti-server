/**
* @submodule plugins_command_11
*/
var action   = require('../action');
var CF_TYPES = require('../proxy_logic_11/util_call_forward_11').CF_TYPES;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [cwGet]
*/
var IDLOG = '[cwGet]';

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
        * Command plugin to get the call waiting status of an extension.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'cwGet', exten: '214' }, function (res) {
        *         // some code
        *     });
        *
        * @class cwGet
        * @static
        */
        var cwGet = {

            /**
            * Execute asterisk action to get the call waiting status.
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
                    var act = { Action: 'DBGet', Family: 'CW', Key: args.exten };

                    // set the action identifier
                    act.ActionID = action.getActionId('cwGet_' + args.exten);

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
                    // get the extension number from the action id
                    var exten = data.actionid.split('_')[1];

                    // check callback and info presence and execute it
                    if (map[data.actionid] && data.event === 'DBGetResponse'
                        && data.family === 'CW'
                        && data.val) {

                        map[data.actionid](null, { exten: exten, cw: 'on' });
                        delete map[data.actionid]; // remove association ActionID-callback

                    } else if (map[data.actionid] && data.response === 'Error') {
                        map[data.actionid](null, { exten: exten, cw: 'off' });
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
        exports.data      = cwGet.data;
        exports.execute   = cwGet.execute;
        exports.setLogger = cwGet.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
