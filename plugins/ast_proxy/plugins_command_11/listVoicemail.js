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
* @default [listVoicemail]
*/
var IDLOG = '[listVoicemail]';

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
        * List of all voicemail.
        *
        * @property list
        * @type object
        * @private
        */
        var list = {};

        /**
        * Command plugin to get the list of all voicemail.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'listVoicemail' }, function (res) {
        *         // some code
        *     });
        *
        *
        * @class listVoicemail
        * @static
        */
        var listVoicemail = {

            /**
            * Execute asterisk action to get the list of all voicemail.
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
                    var act = { Action: 'VoicemailUsersList' };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('listVoicemail');

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
                    // store new voicemail information object
                    // data.objectname is the extension number, e.g., 214
                    if (   data                 && data.event === 'VoicemailUserEntry'
                        && data.fullname        && data.email
                        && data.vmcontext       && data.voicemailbox
                        && data.maxmessagecount && data.maxmessagelength) {

                        // initialize result only in the first event received
                        if (!list[data.actionid]) { list[data.actionid] = []; } 

                        var obj = {
                            name:             data.fullname,
                            email:            data.email,
                            context:          data.vmcontext,
                            voicemailbox:     data.voicemailbox,
                            maxMessageCount:  data.maxmessagecount,
                            maxMessageLength: data.maxmessagelength
                        };
                        list[data.actionid].push(obj);

                    } else if (map[data.actionid] && data && data.event === 'VoicemailUserEntryComplete') {
                        map[data.actionid](list); // callback execution
                    }

                    if (data && data.event === 'VoicemailUserEntryComplete') {
                        delete list[data.actionid]; // empties the list
                        delete map[data.actionid];  // remove association ActionID-callback
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
        exports.data      = listVoicemail.data;
        exports.execute   = listVoicemail.execute;
        exports.setLogger = listVoicemail.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
