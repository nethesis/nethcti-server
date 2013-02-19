/**
* @submodule plugins_command_11
*/
var action = require('../action');
var Extension = require('../extension').Extension;

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
        * List of all sip extensions. The key is the extension number and the value
        * is an Extension object.
        *
        * @property list
        * @type {object}
        * @private
        */
        var list = {};

        /**
        * Command plugin to get the list of all SIP peers.
        *
        * @class listSipPeers
        * @static
        */
        var listSipPeers = {

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

                    // store new Extension object
                    // data.objectname is extension number, e.g., 214
                    if (data.event === 'PeerEntry' && data.objectname && data.channeltype) {
                        list[data.objectname] = new Extension(data.objectname, data.channeltype);

                    } else if (map[data.actionid] && data.event === 'PeerlistComplete') {
                        map[data.actionid](list); // callback execution
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

        // public interface
        exports.execute = listSipPeers.execute;
        exports.data = listSipPeers.data;

    } catch (err) {
        console.log(err.stack);
    }
})();
