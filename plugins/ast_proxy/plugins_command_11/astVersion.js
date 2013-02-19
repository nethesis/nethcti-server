/**
* Provides commands to execute in asterisk.
* 
* @module ast_proxy
* @submodule plugins_command_11
*/
var action = require('../action');

(function() {
    try {
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
        * Command plugin to get asterisk version
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
            * passed to _get_ method of the ast_proxy component 
            * @static
            */
            execute: function (am, args, cb) {
                try {
                    // action to get asterisk version
                    var act = { Action: 'CoreSettings' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('astVersion');

                    // add association ActionID-callback
                    map[act.ActionID] = cb;

                    // send action to asterisk
                    am.send(act);

                } catch (err) {
                    console.log(err.stack);
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
                    console.log(err.stack);
                }
            }
        };

        // public interface
        exports.execute = astVersion.execute;
        exports.data = astVersion.data;

    } catch (err) {
        console.log(err.stack);
    }
})();
