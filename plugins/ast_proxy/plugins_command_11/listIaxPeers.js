/**
* @submodule plugins_command_11
*/
var action    = require('../action');
var Extension = require('../extension').Extension;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [listIaxPeers]
*/
var IDLOG = '[listIaxPeers]';

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
        * List of all IAX extensions. The key is the extension number and the value
        * is an Extension object.
        *
        * @property list
        * @type {object}
        * @private
        */
        var list = {};

        /**
        * Command plugin to get the list of all IAX peers.
        *
        * @class listIaxPeers
        * @static
        */
        var listIaxPeers = {

            /**
            * Execute asterisk action to get the list of all IAX peers.
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
                    var act = { Action: 'IAXpeerlist' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('listIaxPeers');

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
            * @param {object} data The asterisk data for the current command.
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
        exports.data      = listIaxPeers.data;
        exports.execute   = listIaxPeers.execute;
        exports.setLogger = listIaxPeers.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
