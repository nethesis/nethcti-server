// Manage command to get the list of all SIP peers
 
var action = require('../action.js');
var Extension = require('../extension.js').Extension;

(function() {

    try {

        // map associations between ActionID and callback to execute at the end
        var map = {};
        // list of all sip extension
        // key is the number and value is the Extension object
        var list = {};

        var listSipPeers = {

            // execute the command
            execute: function (am, args, cb) {
                try {
                    // action to get asterisk version
                    var act = { Action: 'SIPpeers' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('listSipPeers');

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

                    // store new Extension object
                    // data.objectname is extension number, e.g., 214
                    if (data.event === 'PeerEntry' && data.objectname && data.channeltype) {
                        list[data.objectname] = new Extension(data.objectname, data.channeltype);

                    } else if (map[data.actionid] && data.event === 'PeerlistComplete') {
                        map[data.actionid](list);
                    }

                    if (data.event === 'PeerlistComplete') {
                        list = {}; // empty list
                        delete map[data.actionid]; // remove association ActionID-callback
                    }

                } catch (err) {
                    console.log(err.stack);
                }

            }
            
        };

        // exports methods
        exports.execute = listSipPeers.execute;
        exports.data = listSipPeers.data;

    } catch (err) {
        console.log(err.stack);
    }

})();
