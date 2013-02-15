// Manage command to get the asterisk version
var action = require('../action_11.js');

(function() {

    try {

        // map associations between ActionID and callback to execute at the end
        var map = {};

        var astVersion = {

            // execute the command
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

            // executed for each data received from asterisk for this command
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

        // exports methods
        exports.execute = astVersion.execute;
        exports.data = astVersion.data;

    } catch (err) {
        console.log(err.stack);
    }

})();
