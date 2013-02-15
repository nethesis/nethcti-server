// Manage command to get the DND status of an extension
 
var action = require('../action_11.js');

(function() {

    try {

        // map associations between ActionID and callback to execute at the end
        var map = {};

        var dndGet = {

            // execute the command
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

            // executed for each data received from asterisk for this command
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

        // exports methods
        exports.execute = dndGet.execute;
        exports.data = dndGet.data;

    } catch (err) {
        console.log(err.stack);
    }

})();
