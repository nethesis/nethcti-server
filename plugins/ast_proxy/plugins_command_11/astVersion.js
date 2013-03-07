/**
* Provides commands to execute in asterisk.
* 
* @module ast_proxy
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
* @default [astVersion]
*/
var IDLOG = '[astVersion]';

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
        * Command plugin to get the asterisk version.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'astVersion' }, function (res) {
        *         // some code
        *     });
        *
        * @class astVersion
        * @static
        */
        var astVersion = {

            /**
            * Execute asterisk action to get the asterisk version.
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
                    var act = { Action: 'CoreSettings' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('astVersion');

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
            * from asterisk and relative to this command
            *
            * @method data
            * @param {object} data The asterisk data for the current command
            * @static
            */
            data: function (data) {
                try {
                    // check callback and info presence and execute it
                    if (map[data.actionid] && data.asteriskversion) {
                        map[data.actionid]({ asteriskVersion: data.asteriskversion });

                    } else if (map[data.actionid]) {
                        map[data.actionid]({ asteriskVersion: 'unknown' });
                    }

                    // remove association ActionID-callback
                    delete map[data.actionid];

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
        exports.data      = astVersion.data;
        exports.execute   = astVersion.execute;
        exports.setLogger = astVersion.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
