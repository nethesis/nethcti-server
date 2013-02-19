/**
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
        * Command plugin to get DND status of an extension.
        *
        * @class dndGet
        * @static
        */
        var dndGet = {

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
                    var act = { Action: 'DBGet', Family: 'DND', Key: args.exten };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('dndGet');

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
                    if (map[data.actionid] && data.event === 'DBGetResponse' && data.val === 'YES' ) {
                        map[data.actionid]({ dnd: 'yes' });
                        delete map[data.actionid]; // remove association ActionID-callback

                    } else if (map[data.actionid] && data.response === 'Error') {
                        map[data.actionid]({ dnd: 'no' });
                        delete map[data.actionid]; // remove association ActionID-callback
                    }

                } catch (err) {
                    console.log(err.stack);
                }
            }
        };

        // public interface
        exports.execute = dndGet.execute;
        exports.data = dndGet.data;

    } catch (err) {
        console.log(err.stack);
    }
})();
