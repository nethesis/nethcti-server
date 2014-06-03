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
* @default [queueDetails]
*/
var IDLOG = '[queueDetails]';

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
        * List of queue details of all requests. The key is the ActionID of the request
        * and the value is the queue details object.
        *
        * @property list
        * @type {object}
        * @private
        */
        var list = {};

        /**
        * Command plugin to get the details of a queue. The details is the queue
        * parameters (e.g. average hold time) and its members.
        *
        * Use it with _ast\_proxy_ module as follow:
        *
        *     ast_proxy.doCmd({ command: 'queueDetails', queue: '401' }, function (res) {
        *         // some code
        *     });
        *
        *
        * @class queueDetails
        * @static
        */
        var queueDetails = {

            /**
            * Execute asterisk action to get the details of a queue.
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
                    var act = { Action: 'QueueStatus', Queue: args.queue };
                    
                    // set the action identifier
                    act.ActionID = action.getActionId('queueDetails');

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
                    // store new queue information object. This
                    // is the event about queue informations
                    if (data && data.queue            && data.actionid
                             && data.holdtime         && data.talktime
                             && data.completed        && data.abandoned
                             && data.abandoned        && data.servicelevel
                             && data.servicelevelperf && data.event === 'QueueParams') {

                        // create queue details object
                        list[data.actionid] = {
                            queue:                  data.queue,
                            members:                {},
                            holdtime:               data.holdtime,
                            talktime:               data.talktime,
                            waitingCallers:         {},
                            completedCallsCount:    data.completed,
                            abandonedCallsCount:    data.abandoned,
                            serviceLevelTimePeriod: data.servicelevel,
                            serviceLevelPercentage: data.servicelevelperf
                        };

                    // store member information object. This
                    // is the event about a member of the queue
                    } else if (data.membership
                               && data.name     && data.callstaken
                               && data.lastcall && data.event === 'QueueMember') {

                        // data.location is in the form: "Local/211@from-queue/n"
                        var member = data.location.split('@')[0].split('/')[1];

                        // add the member information object
                        list[data.actionid].members[member] = {
                            name:              data.name,
                            type:              data.membership,                    // it can be 'static', 'dynamic' or 'realtime'
                            member:            member,
                            paused:            data.paused === '1' ? true : false, // if the extension is paused on queue
                            callsTakenCount:   parseInt(data.callstaken),          // the number of the taken calls
                            lastCallTimestamp: parseInt(data.lastcall)             // timestamp of the last call received by the member
                        };

                    } else if (data.wait            && data.queue
                               && data.position     && data.calleridnum
                               && data.calleridname && data.event === 'QueueEntry') { // the event for each waiting call

                        // add the informations about a waiting caller
                        list[data.actionid].waitingCallers[data.channel] = {
                            wait:       parseInt(data.wait),
                            queue:      data.queue,
                            channel:    data.channel,
                            position:   data.position,
                            callerNum:  data.calleridnum,
                            callerName: data.calleridname
                        };

                    // all events has been received
                    } else if (map[data.actionid] && data.event === 'QueueStatusComplete') {
                        map[data.actionid](null, list[data.actionid]); // callback execution
                    }

                    if (data.event === 'QueueStatusComplete') {
                        delete list[data.actionid]; // empty the list for the requested ActionID
                        delete map[data.actionid];  // remove association ActionID-callback
                    }
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
        exports.data      = queueDetails.data;
        exports.execute   = queueDetails.execute;
        exports.setLogger = queueDetails.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
