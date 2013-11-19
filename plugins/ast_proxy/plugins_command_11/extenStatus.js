/**
* @submodule plugins_command_11
*/
var action = require('../action');
var AST_EXTEN_STATUS_2_STR_ADAPTER = require('../proxy_logic_11/exten_status_adapter_11.js').AST_EXTEN_STATUS_2_STR_ADAPTER;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [extenStatus]
*/
var IDLOG = '[extenStatus]';

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
        * Command plugin to get the extension status.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'extenStatus', exten: '214' }, function (res) {
        *         // some code
        *     });
        *
        * @class extenStatus
        * @static
        */
        var extenStatus = {

            /**
            * Execute asterisk action to get the extension status.
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
                    var act = { Action: 'ExtensionState', Exten: args.exten };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('extenStatus');

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
                    // check callback and info presence and execute it
                    if (map[data.actionid]
                        && data.exten
                        && data.status   !== '-1' // extension not found
                        && data.response === 'Success') {

                        // execute callback
                        map[data.actionid](null, {
                            exten:  data.exten,
                            status: AST_EXTEN_STATUS_2_STR_ADAPTER[data.status]
                        });

                    } else if (map[data.actionid]
                               && data.message
                               && data.response === 'Error') { // extension not specified

                        map[data.actionid](new Error(data.message));

                    } else if (map[data.actionid]
                               && data.exten
                               && data.status === '-1') { // extension not found

                        map[data.actionid](new Error('Extension ' + data.exten + ' not found'));

                    } else if (map[data.actionid]) {

                        map[data.actionid](new Error('error'));
                    }

                    // remove association ActionID-callback
                    delete map[data.actionid];

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
        exports.data      = extenStatus.data;
        exports.execute   = extenStatus.execute;
        exports.setLogger = extenStatus.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
