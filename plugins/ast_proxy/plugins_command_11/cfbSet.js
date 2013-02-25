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
* @default [cfbSet]
*/
var IDLOG = '[cfbSet]';

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
        * of the command
        *
        * @property map
        * @type {object}
        * @private
        */
        var map = {};

        /**
        * Command plugin to set the CF status on busy of an extension.
        *
        * @class cfbSet
        * @static
        */
        var cfbSet = {

            /**
            * Execute asterisk action to set the CFB status.
            * 
            * @method execute
            * @param {object} am Asterisk manager to send the action
            * @param {object} args The object contains optional parameters
            * passed to _get_ method of the ast_proxy component 
            * @static
            */
            execute: function (am, args, cb) {
                try {
                    // action for asterisk
                    if (args.activate) {
                        var act = { Action: 'DBPut', Family: 'CFB', Key: args.exten, Val: args.val };
                    } else {
                        var act = { Action: 'DBDel', Family: 'CFB', Key: args.exten };
                    }
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('cfbSet');

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
                console.log(data);
                try {
                    // check callback and info presence and execute it
                    if (map[data.actionid]
                        && (
                            data.message     === 'Updated database successfully'
                            || data.message  === 'Key deleted successfully'
                        )
                        && data.response === 'Success') {

                        map[data.actionid]({ result: true });
                        delete map[data.actionid]; // remove association ActionID-callback

                    } else if (map[data.actionid] && data.response === 'Error') {
                        map[data.actionid]({ result: false });
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
        exports.data      = cfbSet.data;
        exports.execute   = cfbSet.execute;
        exports.setLogger = cfbSet.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
