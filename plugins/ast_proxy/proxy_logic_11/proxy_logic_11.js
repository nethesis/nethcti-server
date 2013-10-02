/**
* Provides the logic relative to asterisk 11.
*
* @module ast_proxy
* @submodule proxy_logic_11
*/

/**
* This is the asterisk proxy logic linked to version 11
* of the asterisk server.
*
* @class proxy_logic_11
* @static
*/
var path               = require('path');
var async              = require('async');
var Queue              = require('../queue').Queue;
var Trunk              = require('../trunk').Trunk;
var Channel            = require('../channel').Channel;
var Parking            = require('../parking').Parking;
var iniparser          = require('iniparser');
var Extension          = require('../extension').Extension;
var QueueMember        = require('../queueMember').QueueMember;
var EventEmitter       = require('events').EventEmitter;
var ParkedCaller       = require('../parkedCaller').ParkedCaller;
var Conversation       = require('../conversation').Conversation;
var QueueWaitingCaller = require('../queueWaitingCaller').QueueWaitingCaller;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [proxy_logic_11]
*/
var IDLOG = '[proxy_logic_11]';

/**
* Fired when something changed in an extension.
*
* @event extenChanged
* @param {object} msg The extension object
*/
/**
* The name of the extension changed event.
*
* @property EVT_EXTEN_CHANGED
* @type string
* @default "extenChanged"
*/
var EVT_EXTEN_CHANGED = 'extenChanged';

/**
* Fired when something changed in a parking.
*
* @event parkingChanged
* @param {object} msg The parking object
*/
/**
* The name of the parking changed event.
*
* @property EVT_PARKING_CHANGED
* @type string
* @default "parkingChanged"
*/
var EVT_PARKING_CHANGED = 'parkingChanged';

/**
* Fired when something changed in a queue.
*
* @event queueChanged
* @param {object} msg The queue object
*/
/**
* The name of the queue changed event.
*
* @property EVT_QUEUE_CHANGED
* @type string
* @default "queueChanged"
*/
var EVT_QUEUE_CHANGED = 'queueChanged';

/**
* Fired when new voicemail message has been left.
*
* @event newVoicemail
* @param {object} msg The queue object
*/
/**
* The name of the new voicemail event.
*
* @property EVT_NEW_VOICEMAIL
* @type string
* @default "newVoicemail"
*/
var EVT_NEW_VOICEMAIL = 'newVoicemail';

/**
* The default base path for the recording call audio file.
*
* @property BASE_CALL_REC_AUDIO_PATH
* @type object
* @private
* @default "/var/spool/asterisk/monitor"
*/
var BASE_CALL_REC_AUDIO_PATH = '/var/spool/asterisk/monitor';

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
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

/**
* The asterisk proxy.
*
* @property astProxy
* @type object
* @private
*/
var astProxy;

/**
* All extensions. The key is the extension number and the value
* is the _Extension_ object.
*
* @property extensions
* @type object
* @private
*/
var extensions = {};

/**
* All trunks. The key is the trunk number and the value
* is the _Trunk_ object.
*
* @property trunks
* @type object
* @private
*/
var trunks = {};

/**
* All queues. The key is the queue number and the value
* is the _Queue_ object.
*
* @property queues
* @type object
* @private
*/
var queues = {};

/**
* All parkings. The key is the parkings number and the value
* is the _Parking_ object.
*
* @property parkings
* @type object
* @private
*/
var parkings = {};

/**
* It is used to store the parked channels to be used in conjunction
* with "listChannels" command plugin to get the number and name
* of the parked channels. The key is the parking number and the value
* is an object with the parked channel informations.
*
* @property parkedChannels
* @type object
* @private
*/
var parkedChannels = {};

/**
* It's the validated content of the asterisk structure ini
* file created by the perl script.
*
* @property struct
* @type {object}
* @readOnly
* @private
*/
var struct;

/**
* Store the recording information about conversations. The key
* is the conversation identifier and the value is an empty string.
* The presence of the key means that the conversation is recording,
* otherwise not. It's necessary because asterisk hasn't the recording
* informations. So, when conversation list is refreshed, it is used to
* set recording status to a conversation.
*
* @property recordingConv
* @type {object}
* @private
*/
var recordingConv = {};

/**
* These are the key names used into the asterisk structure
* file created by the perl script.
*
* @property INI_STRUCT
* @type {object}
* @readOnly
* @private
*/
var INI_STRUCT = {
    TYPE: {
        PARK:  'parking',
        EXTEN: 'extension',
        QUEUE: 'queue',
        TRUNK: 'trunk',
        GROUP: 'group'
    },
    TECH: {
        SIP: 'sip',
        IAX: 'iax'
    }
};

/**
* Sets the logger to be used.
*
* @method setLogger
* @param {object} log The logger object. It must have at least
* three methods: _info, warn and error_ as console object.
* @static
*/
function setLogger(log) {
    try {
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Store the asterisk proxy to visit.
*
* @method visit
* @param {object} ap The asterisk proxy module.
*/
function visit(ap) {
    try {
        // check parameter
        if (!ap || typeof ap !== 'object') {
            throw new Error('wrong parameter');
        }
        astProxy = ap;
        logger.info(IDLOG, 'set the asterisk proxy to visit');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Validates all sip extensions of the structure ini file and
* initialize sip _Extension_ objects.
*
* @method sipExtenStructValidation
* @param {object} err  The error received from the command
* @param {array}  resp The response received from the command
* @private
*/
function sipExtenStructValidation(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'validating sip extension structure: ' + err.toString());
            return;
        }

        // creates temporary object used to rapid check the
        // existence of an extension into the asterisk
        var siplist = {};
        var i;
        for (i = 0; i < resp.length; i++) { siplist[resp[i].ext] = ''; }

        // cycles in all elements of the structure ini file to validate
        var k;
        for (k in struct) {

            // validates all sip extensions
            if (struct[k].tech    === INI_STRUCT.TECH.SIP
                && struct[k].type === INI_STRUCT.TYPE.EXTEN) {

                // current extension of the structure ini file isn't present
                // into the asterisk. So remove it from the structure ini file
                if (siplist[struct[k].extension] === undefined) {

                    delete struct[k];
                    logger.warn(IDLOG, 'inconsistency between ini structure file and asterisk for ' + k);
                }
            }
        }
        logger.info(IDLOG, 'all sip extensions have been validated');

        // initialize all sip extensions as 'Extension' objects into the 'extensions' object
        initializeSipExten();

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Validates all sip trunks of the structure ini file and
* initialize sip _Trunk_ objects.
*
* @method sipTrunkStructValidation
* @param {object} err  The error received from the command
* @param {array}  resp The response received from the command
* @private
*/
function sipTrunkStructValidation(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'validating sip trunk structure: ' + err.toString());
            return;
        }

        // creates temporary object used to rapid check the
        // existence of a trunk into the asterisk
        var siplist = {};
        var i;
        for (i = 0; i < resp.length; i++) { siplist[resp[i].ext] = ''; }

        // cycles in all elements of the structure ini file to validate
        var k;
        for (k in struct) {

            // validates all sip trunks
            if (struct[k].tech    === INI_STRUCT.TECH.SIP
                && struct[k].type === INI_STRUCT.TYPE.TRUNK) {

                // current trunk of the structure ini file isn't present
                // into the asterisk. So remove it from the structure ini file
                if (siplist[struct[k].extension] === undefined) {

                    delete struct[k];
                    logger.warn(IDLOG, 'inconsistency between ini structure file and asterisk for ' + k);
                }
            }
        }
        logger.info(IDLOG, 'all sip trunks have been validated');

        // initialize all sip trunks as 'Trunk' objects into the 'trunks' property
        initializeSipTrunk();

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Validates all iax extensions of the structure ini file and
* initialize iax _Extension_ objects.
*
* @method iaxExtenStructValidation
* @param {object} err  The error received from the command.
* @param {array}  resp The response received from the command.
* @private
*/
function iaxExtenStructValidation(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'validating iax extension structure: ' + err.toString());
            return;
        }

        // creates temporary object used to rapid check the
        // existence of an extension into the asterisk
        var i;
        var iaxlist = {};
        for (i = 0; i < resp.length; i++) { iaxlist[resp[i].exten] = ''; }

        // cycles in all elements of the structure ini file to validate
        var k;
        for (k in struct) {

            // validates all sip extensions
            if (struct[k].tech    === INI_STRUCT.TECH.IAX
                && struct[k].type === INI_STRUCT.TYPE.EXTEN) {

                // current extension of the structure ini file isn't present
                // into the asterisk. So remove it from the structure ini file
                if (iaxlist[struct[k].extension] === undefined) {

                    delete struct[k];
                    logger.warn(IDLOG, 'inconsistency between ini structure file and asterisk for ' + k);
                }
            }
        }
        logger.info(IDLOG, 'all iax extensions have been validated');

        // initialize all iax extensions as 'Extension' objects into the 'extensions' object
        initializeIaxExten(resp);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Validates all queues of the structure ini file.
*
* @method queueStructValidation
* @param {object} err  The error received from the command.
* @param {array}  resp The response received from the command.
* @private
*/
function queueStructValidation(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'validating queue structure: ' + err.toString());
            return;
        }

        // creates temporary object used to rapid check the
        // existence of a queue into the asterisk
        var qlist = {};
        var i;
        for (i = 0; i < resp.length; i++) { qlist[resp[i].queue] = ''; }

        // cycles in all elements of the structure ini file to validate
        var k;
        for (k in struct) {

            // validates all queues
            if (struct[k].type === INI_STRUCT.TYPE.QUEUE) {

                // current queue of the structure ini file isn't present
                // into the asterisk. So remove it from the structure ini file
                if (qlist[struct[k].queue] === undefined) {

                    delete struct[k];
                    logger.warn(IDLOG, 'inconsistency between ini structure file and asterisk for ' + k);
                }
            }
        }
        logger.info(IDLOG, 'all queues have been validated');

        // initialize all queus as 'Queue' objects into the 'queues' object
        initializeQueues();

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Validates all parkings of the structure ini file.
*
* @method parkStructValidation
* @param {object} err  The error received from the command.
* @param {array}  resp The response received from the command.
* @private
*/
function parkStructValidation(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'validating park structure: ' + err.toString());
            return;
        }

        // cycles in all elements of the structure ini file to validate
        var k;
        for (k in struct) {

            // validates all parkings
            if (struct[k].type === INI_STRUCT.TYPE.PARK) {

                // current parking of the structure ini file isn't present
                // into the asterisk. So remove it from the structure ini file
                if (resp[struct[k].extension] === undefined) {

                    delete struct[k];
                    logger.warn(IDLOG, 'inconsistency between ini structure file and asterisk for ' + k + ' or parkings is disabled');
                }
            }
        }
        logger.info(IDLOG, 'all parkings have been validated');

        // initialize all parkings as 'Parking' objects into the 'parkings' object
        initializeParkings();

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Validates the asterisk structure of ini file created by the perl script.
* Ini file items that aren't present in the asterisk, will be removed from
* _struct_ property.
*
* @method structValidation
* @private
*/
function structValidation() {
    try {
        logger.info(IDLOG, 'start asterisk structure ini file validation');
        // validates all queues
        astProxy.doCmd({ command: 'listQueues'   }, queueStructValidation);
        // validates all parkings
        astProxy.doCmd({ command: 'listParkings' }, parkStructValidation);
        // validates all sip extensions
        astProxy.doCmd({ command: 'listSipPeers' }, sipExtenStructValidation);
        // validates all iax extensions
        astProxy.doCmd({ command: 'listIaxPeers' }, iaxExtenStructValidation);
        // validates all SIP trunks
        astProxy.doCmd({ command: 'listSipPeers' }, sipTrunkStructValidation);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* It's called when the asterisk connection is fully booted.
*
* @method start
* @static
*/
function start(inipath) {
    try {
        // check paramter
        if (typeof inipath !== 'string') { throw new Error('wrong parameter'); }

        // parse the ini file
        struct = iniparser.parseSync(inipath);
        // validates the content of the ini file
        structValidation();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initialize all iax extensions as _Extension_ object into the
* _extensions_ property.
*
* @method initializeIaxExten
* @param {object} resp The response of the _listIaxPeers_ command plugin.
* @private
*/
function initializeIaxExten(resp) {
    try {
        var i, k, exten;
        for (k in struct) {

            if (struct[k].type    === INI_STRUCT.TYPE.EXTEN
                && struct[k].tech === INI_STRUCT.TECH.IAX) { // all iax extensions

                exten = new Extension(struct[k].extension, struct[k].tech);
                extensions[exten.getExten()] = exten;
                extensions[exten.getExten()].setName(struct[k].label);
            }
        }

        // set iax informations
        for (i = 0; i < resp.length; i++) {

            // this check is because some iax trunks can be present in the resp,
            // so in this function trunks are not considered
            if (extensions[resp[i].exten]) {

                extensions[resp[i].exten].setIp(resp[i].ip);
                extensions[resp[i].exten].setPort(resp[i].port);
                logger.info(IDLOG, 'set iax details for ext ' + resp[i].exten);

                // request the extension status
                astProxy.doCmd({ command: 'extenStatus', exten: resp[i].exten }, extenStatus);
            }
        }

        // request all channels
        logger.info(IDLOG, 'requests the channel list to initialize iax extensions');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllExten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the details for all iax extension object.
*
* @method listIaxPeers
* @private
*/
function listIaxPeers(resp) {
    try {
        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        var i;
        for (i = 0; i < resp.length; i++) {

            extensions[resp[i].ext].setIp(resp[i].ip);
            extensions[resp[i].ext].setPort(resp[i].port);
            logger.info(IDLOG, 'set iax details for ext ' + resp[i].ext);

            // request the extension status
            astProxy.doCmd({ command: 'extenStatus', exten: resp[i].ext }, extenStatus);
        }

        // request all channels
        logger.info(IDLOG, 'requests the channel list to initialize iax extensions');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllExten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initialize all parkings as _Parking_ object into the _parkings_ property.
*
* @method initializeParkings
* @private
*/
function initializeParkings() {
    try {
        var k, p;
        for (k in struct) {

            if (struct[k].type === INI_STRUCT.TYPE.PARK) { // cycle in all parkings
                // new parking object
                p = new Parking(struct[k].extension);
                p.setName(struct[k].label);
                // store it
                parkings[p.getParking()] = p;
            }
        }

        // request all parked channels
        astProxy.doCmd({ command: 'listParkedChannels' }, listParkedChannels);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Store parked channels in memory and launch "listChannel" command plugin
* to get the number and the name of each parked channels.
*
* @method listParkedChannels
* @param {object} err  The error object received from the "listParkedChannels" command plugin
* @param {object} resp The reponse object received from the "listParkedChannels" command plugin
* @private
*/
function listParkedChannels(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'listing parked channels: ' + err.toString());
            return;
        }

        // check the parameter
        if (typeof resp !== 'object') { throw new Error('wrong parameter'); }

        // store parked channels in global variable "parkedChannels"
        parkedChannels = resp;

        // request all channels to get the caller number information for each parked channel
        astProxy.doCmd({ command: 'listChannels' }, updateParkedCallerForAllParkings);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Updates specified parking key of the _parkedChannels_ property with the
* object received from _listParkedChannels_ command plugin.
*
* @method updateParkedChannelOfOneParking
* @param {object} err     The error object received from _listParkedChannels_ command plugin
* @param {object} resp    The response object received from _listParkedChannels_ command plugin
* @param {string} parking The parking identifier
* @private
*/
function updateParkedChannelOfOneParking(err, resp, parking) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating parked channels of one parking ' + parking + ': ' + err.toString());
            return;
        }

        // check the parameters
        if (typeof resp !== 'object' || typeof parking !== 'string') {
            throw new Error('wrong parameters');
        }

        // check if the response contains a parked channel for the specified parking
        // It it's not present, the parking is free
        if (typeof resp[parking] === 'object') {

            // update the parked channel of the parking
            parkedChannels[parking] = resp[parking];

            // request all channels to get the caller number information of
            // the parked channel of the specified parking
            logger.info(IDLOG, 'request all channels to update parked caller informations for parking ' + parking);
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
                // update the parked caller of one parking in "parkings" object list
                updateParkedCallerOfOneParking(err, resp, parking);
            });

        // there isn't a parked caller for the parking
        } else {
            // remove the parked channel from the memory
            delete parkedChannels[parking];
            logger.info(IDLOG, 'removed parked channel from parkedChannels for parking ' + parking);
            // remove the parked caller from the parking object
            parkings[parking].removeParkedCaller();
            logger.info(IDLOG, 'removed parked caller from parking ' + parking);

            // emit the event
            astProxy.emit(EVT_PARKING_CHANGED, parkings[parking]);
            logger.info(IDLOG, 'emitted event ' + EVT_PARKING_CHANGED + ' for parking ' + parking);
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Update the parked caller of the specified parking.
*
* @method updateParkedCallerOfOneParking
* @param {object} err     The error received from the _listChannels_ command plugin
* @param {object} resp    The response received from the _listChannels_ command plugin
* @param {string} parking The parking identifier
* @private
*/
function updateParkedCallerOfOneParking(err, resp, parking) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating parked caller of one parking ' + parking + ': ' + err.toString());
            return;
        }

        // check parameters
        if (typeof parking !== 'string' || typeof resp !== 'object') {
            throw new Error('wrong parameters');
        }

        // check if the parking exists, otherwise there is some error
        if (parkings[parking]) {

            // get the parked channel of the specified parking
            var ch = parkedChannels[parking].channel;

            if (resp[ch]) { // the channel exists

                // add the caller number information to the response
                // received from the "listParkedChannels" command plugin
                parkedChannels[parking].callerNum = resp[ch].callerNum;
                // add the caller name information for the same reason
                parkedChannels[parking].callerName = resp[ch].callerName;

                // create and store a new parked call object
                pCall = new ParkedCaller(parkedChannels[parking]);
                parkings[parking].addParkedCaller(pCall);
                logger.info(IDLOG, 'updated parked call ' + pCall.getNumber() + ' to parking ' + parking);

                // emit the event
                astProxy.emit(EVT_PARKING_CHANGED, parkings[parking]);
                logger.info(IDLOG, 'emitted event ' + EVT_PARKING_CHANGED + ' for parking ' + parking);
            }

        } else {
            logger.warn(IDLOG, 'try to update parked caller of the non existent parking ' + parking);
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Updates all parking lost with their relative parked calls,
* if they are present.
*
* @method updateParkedCallerForAllParkings
* @param {object} err  The error object
* @param {object} resp The object received from the "listChannels" command plugin
* @private
*/
function updateParkedCallerForAllParkings(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating parked caller for all parkings: ' + err.toString());
            return;
        }

        // cycle in all channels received from "listChannel" command plugin.
        // If a channel is present in "parkedChannels", then it is a parked
        // channel and so add it to relative parking
        var p, ch, pNum;
        for (p in parkedChannels) {

            ch = parkedChannels[p].channel;

            if (resp[ch]) { // the channel exists

                // add the caller number information to the response
                // received from the "listParkedChannels" command plugin
                parkedChannels[p].callerNum = resp[ch].callerNum;
                // add the caller name information for the same reason
                parkedChannels[p].callerName = resp[ch].callerName;

                // create and store a new parked call object
                pCall = new ParkedCaller(parkedChannels[p]);
                parkings[p].addParkedCaller(pCall);
                logger.info(IDLOG, 'added parked call ' + pCall.getNumber() + ' to parking ' + p);
            }
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Initialize all queues as _Queue_ object into the _queues_ property.
*
* @method initializeQueues
* @private
*/
function initializeQueues() {
    try {
        var k, q;
        for (k in struct) {

            if (struct[k].type === INI_STRUCT.TYPE.QUEUE) { // cycle in all queues

                q = new Queue(struct[k].queue);
                q.setName(struct[k].label);

                // store the new queue object
                queues[q.getQueue()] = q;

                // request details for the current queue
                astProxy.doCmd({ command: 'queueDetails', queue: q.getQueue() }, queueDetails);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the details for queue object. The details include the members and
* the waiting callers.
*
* @method queueDetails
* @param {object} err  The error response object
* @param {object} resp The queue informations object
* @private
*/
function queueDetails(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'setting queue details: ' + err.toString());
            return;
        }

        // check the parameter
        if (typeof resp !== 'object'
            || resp.queue               === undefined || resp.members             === undefined
            || resp.holdtime            === undefined || resp.talktime            === undefined
            || resp.completedCallsCount === undefined || resp.abandonedCallsCount === undefined) {

            throw new Error('wrong parameter');
        }

        var q = resp.queue; // the queue number

        // set the queue data
        queues[q].setAvgHoldTime(resp.holdtime);
        queues[q].setAvgTalkTime(resp.talktime);
        queues[q].setCompletedCallsCount(resp.completedCallsCount);
        queues[q].setAbandonedCallsCount(resp.abandonedCallsCount);

        // set all queue members
        var m, member;
        for (m in resp.members) {

            // create new queue member object
            member = new QueueMember(resp.members[m].member);
            member.setName(resp.members[m].name);
            member.setType(resp.members[m].type);
            member.setCallsTakenCount(resp.members[m].callsTakenCount);
            member.setLastCallTimestamp(resp.members[m].lastCallTimestamp);

            // add the member to its queue
            queues[q].addMember(member);
            logger.info(IDLOG, 'added member ' + member.getMember() + ' to queue ' + q);
        }

        // set all waiting callers
        var ch, wCaller;
        for (ch in resp.waitingCallers) {
            wCaller = new QueueWaitingCaller(resp.waitingCallers[ch]);
            queues[q].addWaitingCaller(wCaller);
            logger.info(IDLOG, 'added waiting caller ' + wCaller.getName() + ' to queue ' + wCaller.getQueue());
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Returns the JSON representation of all queues.
*
* @method getJSONQueues
* @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
* @return {object} The JSON representation of all queues.
*/
function getJSONQueues(privacyStr) {
    try {
        var qliteral = {};
        var q;
        for (q in queues) { qliteral[q] = queues[q].toJSON(privacyStr); }
        return qliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the JSON representation of all trunks.
*
* @method getJSONTrunks
* @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
* @return {object} The JSON representation of all trunks.
*/
function getJSONTrunks(privacyStr) {
    try {
        var tliteral = {};
        var t;
        for (t in trunks) { tliteral[t] = trunks[t].toJSON(privacyStr); }
        return tliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the JSON representation of all parkings.
*
* @method getJSONParkings
* @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
* @return {object} The JSON representation of all parkings.
*/
function getJSONParkings(privacyStr) {
    try {
        var p;
        var pliteral = {};
        for (p in parkings) { pliteral[p] = parkings[p].toJSON(privacyStr); }
        return pliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the JSON representation of all the extensions. If some error
* occurs it returns an empty object.
*
* @method getJSONExtensions
* @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
* @return {object} The JSON representation of the all extensions.
*/
function getJSONExtensions(privacyStr) {
    try {
        var eliteral = {};
        var ext;
        for (ext in extensions) { eliteral[ext] = extensions[ext].toJSON(privacyStr); }
        return eliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Initialize all sip extensions as _Extension_ object into the
* _extensions_ property.
*
* @method initializeSipExten
* @private
*/
function initializeSipExten() {
    try {
        var k, exten;
        for (k in struct) {

            if (struct[k].type    === INI_STRUCT.TYPE.EXTEN
                && struct[k].tech === INI_STRUCT.TECH.SIP) { // all sip extensions

                exten = new Extension(struct[k].extension, struct[k].tech);
                extensions[exten.getExten()] = exten;

                // request sip details for current extension
                astProxy.doCmd({ command: 'sipDetails', exten: exten.getExten() }, extSipDetails);
                // request the extension status
                astProxy.doCmd({ command: 'extenStatus', exten: exten.getExten() }, extenStatus);
                // get the dnd status
                astProxy.doCmd({ command: 'dndGet', exten: exten.getExten() }, setDndStatus);
                // get the call forward status
                astProxy.doCmd({ command: 'cfGet', exten: exten.getExten() }, setCfStatus);
            }
        }
        // request all channels
        logger.info(IDLOG, 'requests the channel list to initialize sip extensions');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllExten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initialize all sip trunks as _Trunk_ object into the
* _trunks_ property.
*
* @method initializeSipTrunk
* @private
*/
function initializeSipTrunk() {
    try {
        var k, trunk;
        for (k in struct) {

            if (struct[k].type    === INI_STRUCT.TYPE.TRUNK
                && struct[k].tech === INI_STRUCT.TECH.SIP) { // all sip trunks

                trunk = new Trunk(struct[k].extension, struct[k].tech);
                trunks[trunk.getExten()] = trunk;

                // request sip details for current trunk
                astProxy.doCmd({ command: 'sipDetails', exten: trunk.getExten() }, trunkSipDetails);
                // request the trunk status
                astProxy.doCmd({ command: 'extenStatus', exten: trunk.getExten() }, trunkStatus);
            }
        }
        // request all channels
        logger.info(IDLOG, 'requests the channel list to initialize sip trunks');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllTrunk);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the call forward status of the extension.
*
* @method setCfStatus
* @param {object} err  The error object of the _cfGet_ command plugin.
* @param {object} resp The response object of the _cfGet_ command plugin.
* @private
*/
function setCfStatus(err, resp) {
    try {
        // check the error
        if (err) { throw err; }

        // check parameter
        if (   typeof resp       !== 'object'
            || typeof resp.exten !== 'string' || typeof resp.status !== 'string') {

            throw new Error('wrong parameter');
        }

        if (extensions[resp.exten]) { // the extension exists

            if (resp.status === 'on') {
                extensions[resp.exten].setCf(resp.to);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' cf enable to ' + resp.to);

            } else {
                extensions[resp.exten].disableCf();
                logger.info(IDLOG, 'set extension ' + resp.exten + ' cf disable');
            }

        } else {
            logger.warn(IDLOG, 'request cf for not existing extension ' + resp.exten);
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Set the don't disturb status of the extension.
*
* @method setDndStatus
* @param {object} err  The error object of the _dndGet_ command plugin.
* @param {object} resp The response object of the _dndGet_ command plugin.
* @private
*/
function setDndStatus(err, resp) {
    try {
        // check the error
        if (err) { throw err; }

        // check parameter
        if (typeof resp !== 'object' || typeof resp.exten !== 'string') { throw new Error('wrong parameter'); }

        if (extensions[resp.exten]) { // the extension exists

            if (resp.dnd === 'on') {
                extensions[resp.exten].setDnd(true);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' dnd true');

            } else {
                extensions[resp.exten].setDnd(false);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' dnd false');
            }

        } else {
            logger.warn(IDLOG, 'request dnd for not existing extension ' + resp.exten);
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the details for the sip extension object.
*
* @method extSipDetails
* @param {object} err  The error object
* @param {object} resp The extension informations object
* @private
*/
function extSipDetails(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'setting sip extension details: ' + err.toString());
            return;
        }

        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        // extract extension object from the response
        var data = resp.exten;

        // set the extension informations
        extensions[data.exten].setIp(data.ip);
        extensions[data.exten].setPort(data.port);
        extensions[data.exten].setName(data.name);
        extensions[data.exten].setSipUserAgent(data.sipuseragent);
        logger.info(IDLOG, 'set sip details for ext ' + data.exten);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the details for the sip trunk object.
*
* @method trunkSipDetails
* @param {object} err  The error object
* @param {object} resp The trunk informations object
* @private
*/
function trunkSipDetails(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'setting sip trunk details: ' + err.toString());
            return;
        }

        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        // extract extension object from the response
        var data = resp.exten;

        // set the extension informations
        trunks[data.exten].setIp(data.ip);
        trunks[data.exten].setPort(data.port);
        trunks[data.exten].setName(data.name);
        trunks[data.exten].setSipUserAgent(data.sipuseragent);
        logger.info(IDLOG, 'set sip details for trunk ' + data.exten);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Update iax extension information and emit _EVT\_EXTEN\_CHANGED_ event.
*
* @method updateExtIaxDetails
* @param {object} err  The error object
* @param {object} resp The iax extension informations object
* @private
*/
function updateExtIaxDetails(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating iax extension details: ' + err.toString());
            return;
        }

        // set extension informations
        extIaxDetails(resp);

        // emit the event
        astProxy.emit(EVT_EXTEN_CHANGED, extensions[resp.exten]);
        logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for iax extension ' + resp.exten);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the details for the iax extension object.
*
* @method extIaxDetails
* @param {object} resp The extension informations object
* @private
*/
function extIaxDetails(resp) {
    try {
        // check parameter
        if (typeof resp !== 'object') { throw new Error('wrong parameter'); }

        // set the extension informations
        extensions[resp.exten].setIp(resp.ip);
        extensions[resp.exten].setPort(resp.port);
        extensions[resp.exten].setIp(resp.ip);
        logger.info(IDLOG, 'set iax details for ext ' + resp.exten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update extension information and emit _EVT\_EXTEN\_CHANGED_ event.
*
* @method updateExtSipDetails
* @param {object} err  The error object
* @param {object} resp The extension informations object
* @private
*/
function updateExtSipDetails(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating sip extension details: ' + err.toString());
            return;
        }

        // set extension informations
        extSipDetails(null, resp);

        // emit the event
        astProxy.emit(EVT_EXTEN_CHANGED, extensions[resp.exten.exten]);
        logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for sip extension ' + resp.exten.exten);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Updates the conversations for all extensions.
*
* @method updateConversationsForAllExten
* @param {object} err  The error object
* @param {object} resp The channel list as received by the _listChannels_ command plugin.
* @private
*/
function updateConversationsForAllExten(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating conversation for all extensions: ' + err.toString());
            return;
        }

        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        // removes all conversations of all extensions
        var ext;
        for (ext in extensions) { extensions[ext].removeAllConversations(); }

        // cycle in all received channels
        var chid;
        for (chid in resp) {

            ext = resp[chid].callerNum;

            // add new conversation to the extension. Queue channel is not considered,
            // otherwise an extension has also wrong conversation (e.g. 214 has the
            // conversation SIP/221-00000592>Local/221@from-queue-000009dc;2)
            if (chid.indexOf('Local')    === -1
                && chid.indexOf('@from') === -1
                && extensions[ext]) { // the extension exists

                addConversationToExten(ext, resp, chid);
            }
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Updates the conversations for all trunks.
*
* @method updateConversationsForAllTrunk
* @param {object} err  The error object
* @param {object} resp The channel list as received by the _listChannels_ command plugin.
* @private
*/
function updateConversationsForAllTrunk(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating conversations of all trunk: ' + err.toString());
            return;
        }

        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        // removes all conversations of all trunks
        var trunk;
        for (trunk in trunks) { trunks[trunk].removeAllConversations(); }

        // cycle in all received channels
        var chid;
        for (chid in resp) {

            trunk = resp[chid].callerNum;
            console.log('TODO TODO TODO TODO');

            // add new conversation to the extension. Queue channel is not considered,
            // otherwise an extension has also wrong conversation (e.g. 214 has the
            // conversation SIP/221-00000592>Local/221@from-queue-000009dc;2)
            if (chid.indexOf('Local')    === -1
                && chid.indexOf('@from') === -1
                && trunks[ext]) { // the extension exists

                addConversationToExten(ext, resp, chid);
            }
        }
    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Update the conversations of the extension.
*
* @method updateExtenConversations
* @param {object} err   The error object received by the _listChannels_ command plugin
* @param {object} resp  The object received by the _listChannels_ command plugin
* @param {string} exten The extension number
* @private
*/
function updateExtenConversations(err, resp, exten) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating conversations of extension ' + exten + ': ' + err.toString());
            return;
        }

        // check parameters
        if (typeof exten !== 'string' || !resp) { throw new Error('wrong parameters'); }

        // check if the extension exists, otherwise there is some error
        if (extensions[exten]) {

            // reset all conversations of the extension
            extensions[exten].removeAllConversations();
            logger.info(IDLOG, 'reset all conversations of the extension ' + exten);

            // cycle in all received channels
            var ext, chid;
            for (chid in resp) {

                // current extension of the channel
                ext = resp[chid].callerNum;

                // add new conversation to the extension. Queue channel is not considered,
                // otherwise an extension has also wrong conversation (e.g. 214 has the
                // conversation SIP/221-00000592>Local/221@from-queue-000009dc;2)
                if (chid.indexOf('Local')    === -1
                    && chid.indexOf('@from') === -1
                    && ext === exten) { // the current extension is of interest

                    addConversationToExten(ext, resp, chid);
                }
            }

            // emit the event
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);
            logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);

        } else {
            logger.warn(IDLOG, 'try to update channel list of the non existent extension ' + exten);
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Add new conversation to the extension.
*
* @method addConversationToExten
* @param {string} exten The extension number
* @param {object} resp The channel list object received by the _listChannels_ command plugin
* @param {string} chid The channel identifier
* @private
*/
function addConversationToExten(exten, resp, chid) {
    try {
        // check parameters
        if (typeof exten !== 'string'
            || typeof resp !== 'object'
            || typeof chid !== 'string') {

            throw new Error('wrong parameters');
        }

        if (extensions[exten]) {

            var chDest, chSource, chBridged;

            // creates the source and destination channels
            var ch = new Channel(resp[chid]);
            if (ch.isSource()) {

                chSource = ch;
                chBridged = resp[chid].bridgedChannel;
                if (resp[chBridged]) { // the call is connected
                    chDest = new Channel(resp[chBridged]);
                }

            } else {

                chDest = ch;
                chBridged = resp[chid].bridgedChannel;
                if (resp[chBridged]) { // the call is connected
                    chSource = new Channel(resp[chBridged]);
                }
            }
            // create a new conversation
            var conv = new Conversation(chSource, chDest);
            var convid = conv.getId();

            // if the conversation is recording, sets its recording status
            if (recordingConv[convid] !== undefined) {
                conv.setRecording(true);
                logger.info(IDLOG, 'set recording status to conversation ' + convid);
            }

            // add the created conversation to the extension
            extensions[exten].addConversation(conv);
            logger.info(IDLOG, 'the conversation ' + convid + ' has been added to exten ' + exten);

        } else {
            logger.warn(IDLOG, 'try to add new conversation to a non existent extensions ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the extension status received.
*
* @method extenStatus
* @param {object} err  The received error object
* @param {object} resp The received response object
* @private
*/
function extenStatus(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'setting extension status: ' + err.toString());
            return;
        }

        extensions[resp.exten].setStatus(resp.status);
        logger.info(IDLOG, 'sets status ' + resp.status + ' for extension ' + resp.exten);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the trunk status received.
*
* @method trunkStatus
* @param {object} err  The received error object
* @param {object} resp The received response object
* @private
*/
function trunkStatus(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'setting trunk status: ' + err.toString());
            return;
        }

        trunks[resp.exten].setStatus(resp.status);
        logger.info(IDLOG, 'sets status ' + resp.status + ' for trunk ' + resp.exten);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Subscribe a callback function to a custom event fired by this object.
* It's the same of nodejs _events.EventEmitter.on._
*
* @method on
* @param {string} type The name of the event
* @param {function} cb The callback to execute in response to the event
* @return {object} A subscription handle capable of detaching that subscription.
*/
function on(type, cb) {
    try {
        return emitter.on(type, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the extension list.
*
* @method getExtensions
* @return {object} The _extensions_ object.
*/
function getExtensions() {
    try {
        return extensions;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the extension status and any other information except
* the channel list. To update the channel list it request all channels
* to analize through "listChannels" command plugin.
*
* @method evtExtenStatusChanged
* @param {string} exten The extension number
* @param {string} statusCode The numeric status code as arrived from asterisk
* @private
*/
function evtExtenStatusChanged(exten, status) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof status !== 'string') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            // request sip details for current extension
            extensions[exten].setStatus(status);
            logger.info(IDLOG, 'set status ' + status + ' for extension ' + exten);

            // update extension informations. This is because when the extension becomes
            // offline/online ip, port and other informations needs to be updated
            if (extensions[exten].getChanType() === 'sip') {

                astProxy.doCmd({ command: 'sipDetails', exten: exten }, updateExtSipDetails);

            } else if (extensions[exten].getChanType() === 'iax') {

                astProxy.doCmd({ command: 'iaxDetails', exten: exten }, updateExtIaxDetails);
            }

        } else if (parkings[exten]) { // the exten is a parking

            var parking = exten; // to better understand the code

            // request all parked channels
            logger.info(IDLOG, 'requests all parked channels to update the parking ' + parking);
            astProxy.doCmd({ command: 'listParkedChannels' }, function (err, resp) {
                // update the parked channel of one parking in "parkedChannels"
                updateParkedChannelOfOneParking(err, resp, parking);
            });
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the extension dnd status.
*
* @method evtExtenDndChanged
* @param {string}  exten   The extension number
* @param {boolean} enabled True if the dnd is enabled
* @private
*/
function evtExtenDndChanged(exten, enabled) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof enabled !== 'boolean') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            // request sip details for current extension
            extensions[exten].setDnd(enabled);
            logger.info(IDLOG, 'set dnd status to ' + enabled + ' for extension ' + exten);

            // emit the event
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);
            logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);

        } else {
            logger.warn(IDLOG, 'try to set dnd status of non existent extension ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* New voice messages has been left. So it emits the _EVT\_NEW\_VOICEMAIL_ event.
*
* @method evtNewVoicemailMessage
* @param {object} data
*  @param {string} data.context   The context of the voicemail extension
*  @param {string} data.countNew  The number of the new voicemail messages
*  @param {string} data.countOld  The number of the old voicemail messages
*  @param {string} data.voicemail The voicemail identifier who received the voice message
* @private
*/
function evtNewVoicemailMessage(data) {
    try {
        // check parameter
        if (   typeof data           !== 'object'
            && typeof data.voicemail !== 'string' && typeof data.context  !== 'string'
            && typeof data.countOld  !== 'string' && typeof data.countNew !== 'string') {

            throw new Error('wrong parameter');
        }

        // emit the event
        astProxy.emit(EVT_NEW_VOICEMAIL, data);
        logger.info(IDLOG, 'emitted event ' + EVT_NEW_VOICEMAIL + ' in voicemail ' + data.voicemail +
                           ' with context ' + data.context);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Removes a waiting caller from a queue and emit the _EVT\_QUEUE\_CHANGED_ event.
*
* @method evtRemoveQueueWaitingCaller
* @param {object} data The response object received from the event plugin _leave_.
*/
function evtRemoveQueueWaitingCaller(data) {
    try {
        // check parameter
        if (typeof data !== 'object'
            || typeof data.queue   !== 'string'
            || typeof data.channel !== 'string') {

            throw new Error('wrong parameter');
        }

        var q = data.queue;

        queues[q].removeWaitingCaller(data.channel);
        logger.info(IDLOG, 'removed queue waiting caller ' + data.channel + ' from queue ' + q);

        // emit the event
        astProxy.emit(EVT_QUEUE_CHANGED, queues[q]);
        logger.info(IDLOG, 'emitted event ' + EVT_QUEUE_CHANGED + ' for queue ' + q);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds a new waiting caller to a queue.
*
* @method evtNewQueueWaitingCaller
* @param {object} data The response object received from the event plugin _join_.
*/
function evtNewQueueWaitingCaller(data) {
    try {
        // check parameter
        if (typeof data !== 'object') { throw new Error('wrong parameter'); }

        // create new waiting caller and add it to relative queue
        var wCaller = new QueueWaitingCaller(data);
        var q = wCaller.getQueue();
        queues[q].addWaitingCaller(wCaller);
        logger.info(IDLOG, 'added new queue waiting caller ' + wCaller.getNumber() + ' to queue ' + q);

        // emit the event
        astProxy.emit(EVT_QUEUE_CHANGED, queues[q]);
        logger.info(IDLOG, 'emitted event ' + EVT_QUEUE_CHANGED + ' for queue ' + q);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* If the involved spier is an extensions, it updates its conversations.
*
* @method evtSpyStartConversation
* @param {object} data The data received from the __ event plugin
*/
function evtSpyStartConversation(data) {
    try {
        // check parameter
        if (typeof data !== 'object' && typeof data.spierId !== 'string') { throw new Error('wrong parameter'); }

        astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {

            // update the conversations of the spier
            if (extensions[data.spierId]) { updateExtenConversations(err, resp, data.spierId); }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* If the involved numbers are extensions, it updates their conversations.
*
* @method evtConversationDialing
* @param {object} data The data received from the _dial_ event plugin
*/
function evtConversationDialing(data) {
    try {
        // check parameter
        if (typeof data !== 'object'
            && typeof data.chDest     !== 'string'
            && typeof data.chSource   !== 'string'
            && typeof data.callerNum  !== 'string'
            && typeof data.dialingNum !== 'string') {

            throw new Error('wrong parameter');
        }

        // when dialing each channel received from listChannels command
        // plugin hasn't the information about the bridgedChannel. So add
        // it in the following manner
        astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {

            resp[data.chDest].bridgedChannel   = data.chSource;
            resp[data.chSource].bridgedChannel = data.chDest;

            // update the conversations of the extensions
            if (extensions[data.callerNum])  { updateExtenConversations(err, resp, data.callerNum);  }
            if (extensions[data.dialingNum]) { updateExtenConversations(err, resp, data.dialingNum); }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* If the involved numbers are extensions, it updates their conversations.
*
* @method evtConversationConnected
* @param {string} num1 One of the two connected numbers
* @param {string} num2 The other of the two connected numbers
*/
function evtConversationConnected(num1, num2) {
    try {
        // check parameters
        if (typeof num1 !== 'string' || typeof num2 !== 'string') {
            throw new Error('wrong parameters');
        }

        // check if num1 is an extension
        if (extensions[num1]) {

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the extension ' + num1);
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
                // update the conversations of the extension
                updateExtenConversations(err, resp, num1);
            });
        }

        // check if num2 is an extension
        if (extensions[num2]) {

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the extension ' + num2);
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
                // update the conversations of the extension
                updateExtenConversations(err, resp, num2);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the source channel of the conversation of the specified extension.
* If the source channel isn't present, undefined will be returned. It is
* useful for those operation in which the channel type is important. For example
* the start and stop record call must be executed on the same channel.
*
* @method getExtenSourceChannelConversation
* @param {string} exten The extension number
* @param {string} convid The conversation identifier
* @return {object} The source channel or undefined value if it's not present.
* @private
*/
function getExtenSourceChannelConversation(exten, convid) {
    try {
        // check the extension existence
        if (!extensions[exten]) { return; }

        // get the conversation
        var conv = extensions[exten].getConversation(convid);

        if (!conv) { return; }

        var chSource = conv.getSourceChannel();
        var ch;

        if (chSource) { return chSource; }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the identifier of the source channel of the conversation of the specified
* extension. If the source channel isn't present, undefined will be returned. It is
* useful for those operation in which the channel type is important. For example
* the start and stop record call must be executed on the same channel.
*
* @method getExtenIdSourceChannelConversation
* @param {string} exten The extension number
* @param {string} convid The conversation identifier
* @return {object} The identifier of the source channel or undefined value if it's not present.
* @private
*/
function getExtenIdSourceChannelConversation(exten, convid) {
    try {
        // get the source channel
        var ch = getExtenSourceChannelConversation(exten, convid);
        if (ch) { return ch.getChannel(); }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return a channel identifier of the conversation of the specified extension. If the
* source channel is present it will returned its id, otherwise the destination channel
* id will be returned. It is useful for those operation in which the channel type is not
* important (e.g. the hangup operation).
*
* @method getExtenIdChannelConversation
* @param {string} exten The extension number
* @param {string} convid The conversation identifier
* @return {string} The channel identifier or undefined value if it's not present.
* @private
*/
function getExtenIdChannelConversation(exten, convid) {
    try {
        // check the extension existence
        if (!extensions[exten]) { return undefined; }

        // get the conversation
        var conv = extensions[exten].getConversation(convid);

        if (!conv) { return; }

        var chDest   = conv.getDestinationChannel();
        var chSource = conv.getSourceChannel();
        var ch;

        if (chSource)    { return chSource.getChannel(); }
        else if (chDest) { return chDest.getChannel();   }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Make a new call.
*
* @method call
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   to           The destination number
* @param {function} cb           The callback function
*/
function call(endpointType, endpointId, to, cb) {
    try {
        // check parameters
        if (   typeof cb           !== 'function'
            || typeof to           !== 'string'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var chType = extensions[endpointId].getChanType();

            logger.info(IDLOG, 'execute call from ' + endpointId + ' to ' + to);
            astProxy.doCmd({ command: 'call', chanType: chType, exten: endpointId, to: to }, function (error) {
                cb(error);
                callCb(error);
            });

        } else {
            var err = 'making new call from non existent extension ' + endpointId;
            logger.warn(IDLOG, err);
            cb(err);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Pickup a parked caller.
*
* @method pickupParking
* @param {string} parking The number of the parking
* @param {string} destType The endpoint type that pickup the conversation
* @param {string} destId The endpoint identifier that pickup the conversation
* @param {function} cb The callback function
*/
function pickupParking(parking, destType, destId, cb) {
    try {
        // check parameters
        if (typeof cb          !== 'function'
            || typeof destId   !== 'string'
            || typeof parking  !== 'string'
            || typeof destType !== 'string') {

            throw new Error('wrong parameters');
        }

        var ch = parkings[parking].getParkedCaller().getChannel();

        if (destType === 'extension' && extensions[destId] && ch !== undefined) {

            // the pickup operation is made by redirect operation
            logger.info(IDLOG, 'pickup from ' + destType + ' ' + destId + ' of the channel ' + ch + ' of parking ' + parking);
            astProxy.doCmd({ command: 'redirectChannel', chToRedirect: ch, to: destId }, function (err) {
               cb(err);
               redirectConvCb(err);
            });

        } else {
            logger.error(IDLOG, 'pickup parking from ' + destType + ' ' + destId + ' of parking ' + parking);
            cb();
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Pickup a conversation.
*
* @method pickupConversation
* @param {string} endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string} endpointId The endpoint identifier (e.g. the extension number)
* @param {string} convid The conversation identifier
* @param {string} destType The endpoint type that pickup the conversation
* @param {string} destId The endpoint identifier that pickup the conversation
* @param {function} cb The callback function
*/
function pickupConversation(endpointType, endpointId, convid, destType, destId, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof cb           !== 'function'
            || typeof destId       !== 'string'
            || typeof destType     !== 'string'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]
            && destType  === 'extension' && extensions[destId]) {

            var chToRedirect;
            var convs      = extensions[endpointId].getAllConversations();
            var conv       = convs[convid];
            var ch         = conv.getSourceChannel();
            var callerNum  = ch.getCallerNum();
            var bridgedNum = ch.getBridgedNum();

            // get the channel to redirect
            if (callerNum === endpointId) {
                chToRedirect = ch.getBridgedChannel();

            } else if (bridgedNum === endpointId) {
                chToRedirect = ch.getChannel();
            }

            if (chToRedirect !== undefined) {

                // the pickup operation is made by redirect operation
                logger.info(IDLOG, 'pickup from ' + destType + ' ' + destId + ' of the channel ' + chToRedirect + ' of ' + endpointType + ' ' + endpointId);
                astProxy.doCmd({ command: 'redirectChannel', chToRedirect: chToRedirect, to: destId }, function (err) {
                    cb(err);
                    redirectConvCb(err);
                });

            } else {
                logger.error(IDLOG, 'pickup conversation of ' + endpointType + ' ' + endpointId + ' from ' + destType + ' ' + destId);
                cb();
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* It's called when an Hangup event is raised from the asterisk. It is
* called from the _hangup_ event plugin.
*
* @method evtHangupConversation
* @param {object} data The data received from _hangup_ event plugin
*/
function evtHangupConversation(data) {
    try {
        // check parameter
        if (typeof data !== 'object'
            || typeof data.channel   !== 'string'
            || typeof data.callerNum !== 'string') {

            throw new Error('wrong parameter');
        }

        // check the extension existence
        if (extensions[data.callerNum]) {

            // request all channel list and update channels of extension
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {

                // update the conversations of the extension
                updateExtenConversations(err, resp, data.callerNum);
            });
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Hangup the conversation of the endpoint.
*
* @method hangupConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {function} cb           The callback function
*/
function hangupConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (   typeof convid       !== 'string' || typeof cb           !== 'function'
            || typeof endpointId   !== 'string' || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to hangup
            var ch = getExtenIdChannelConversation(endpointId, convid);

            if (ch) {
                // execute the hangup
                logger.info(IDLOG, 'execute hangup of the channel ' + ch + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'hangup', channel: ch }, function (err) {
                    cb(err);
                    hangupConvCb(err);
                });

            } else {
                var err = 'no channel to hangup of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, err);
                cb(err);
            }

        } else {
            var err = 'try to hangup conversation for the non existent endpoint ' + endpointType + ' ' + endpointId;
            logger.warn(IDLOG, err);
            cb(err);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* This is the callback of the _redirectChannel_ command plugin.
*
* @method redirectConvCb
* @param {object} err The error object of the operation
* @private
*/
function redirectConvCb(err) {
    try {
        if (err) { logger.error(IDLOG, 'redirect conversation failed: ' + err.toString()); }
        else     { logger.info(IDLOG, 'redirect channel succesfully');                     }

    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* This is the callback of _attendedTransfer_ command plugin.
*
* @method attendedTransferConvCb
* @param {object} err The error object of the operation
* @private
*/
function attendedTransferConvCb(err) {
    try {
        if (err) { logger.error(IDLOG, 'attended transfer conversation failed: ' + err.toString()); }
        else     { logger.info(IDLOG, 'attended transfer channel successfully');                    }

    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* This is the callback of _transferToVoicemail_ command plugin.
*
* @method transferConvToVoicemailCb
* @param {object} err The error object of the operation
* @private
*/
function transferConvToVoicemailCb(err) {
    try {
        if (err) { logger.error(IDLOG, 'transfer channel to voicemail failed: ' + err.toString()); }
        else     { logger.info(IDLOG, 'transfer channel to voicemail successfully');               }

    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* This is the callback of the call command plugin.
*
* @method callCb
* @param {object} error The error object of the operation
* @private
*/
function callCb(error) {
    try {
        if (error) { logger.warn(IDLOG, 'call failed: ' + error.message); }
        else       { logger.info(IDLOG, 'call succesfully');              }

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* This is the callback of the spy command plugin with speaking.
*
* @method startSpySpeakConvCb
* @param {object} err    The error object of the operation
* @param {string} convid The conversation identifier
* @private
*/
function startSpySpeakConvCb(err, convid) {
    try {
        if (err) { logger.error(IDLOG, 'start spy speak convid ' + convid + ' with speaking failed: ' + err.toString()); }
        else     { logger.info(IDLOG, 'start spy speak convid ' + convid + ' with speaking succesfully');                }

    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* This is the callback of the spy command plugin with only listening.
*
* @method startSpyListenConvCb
* @param {object} err    The error object of the operation
* @param {string} convid The conversation identifier
* @private
*/
function startSpyListenConvCb(err, convid) {
    try {
        if (err) { logger.error(IDLOG, 'start spy listen convid ' + convid + ' with only listening failed: ' + err.toString()); }
        else     { logger.info(IDLOG, 'start spy listen convid ' + convid + ' with only listening succesfully');                }

    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* This is the callback of the hangup command plugin.
*
* @method hangupConvCb
* @param {object} err The error object of the operation
* @private
*/
function hangupConvCb(err) {
    try {
        if (err) { logger.warn(IDLOG, 'hangup channel failed' + err.toString()); }
        else     { logger.info(IDLOG, 'hangup channel succesfully');             }

    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* Redirect the conversation.
*
* @method redirectConversation
* @param {string} endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string} endpointId The endpoint identifier (e.g. the extension number)
* @param {string} convid The conversation identifier
* @param {string} to The destination number to redirect the conversation
* @param {function} cb The callback function
*/
function redirectConversation(endpointType, endpointId, convid, to, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof cb           !== 'function'
            || typeof to           !== 'string'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs      = extensions[endpointId].getAllConversations();
            var conv       = convs[convid];
            var chSource   = conv.getSourceChannel();
            var callerNum  = chSource.getCallerNum();
            var bridgedNum = chSource.getBridgedNum();

            // redirect is only possible on own calls. So when the endpointId is the caller, the
            // channel to redirect is the destination channel. It's the source channel otherwise
            var chToRedirect = endpointId === chSource.getCallerNum() ? chSource.getBridgedChannel() : chSource.getChannel();

            if (chToRedirect !== undefined) {

                // redirect the channel
                logger.info(IDLOG, 'redirect of the channel ' + chToRedirect + ' of exten ' + endpointId + ' to ' + to);
                astProxy.doCmd({ command: 'redirectChannel', chToRedirect: chToRedirect, to: to }, function (err) {
                    cb(err);
                    redirectConvCb(err);
                });

            } else {
                var msg = 'getting the channel to redirect ' + chToRedirect;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            var msg = 'redirect conversation: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
            logger.warn(IDLOG, msg);
            cb(msg);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Attended transfer the conversation.
*
* @method attendedTransferConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {string}   to           The destination number to redirect the conversation
* @param {function} cb           The callback function
*/
function attendedTransferConversation(endpointType, endpointId, convid, to, cb) {
    try {
        // check parameters
        if (   typeof convid     !== 'string'
            || typeof cb         !== 'function' || typeof to           !== 'string'
            || typeof endpointId !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs = extensions[endpointId].getAllConversations();
            var conv  = convs[convid];

            if (!conv) {
                var msg = 'attended transfer convid "' + convid + '": no conversation present in extension ' + endpointId;
                logger.warn(IDLOG, msg);
                cb(msg);
                return;
            }

            var chSource   = conv.getSourceChannel();
            var callerNum  = chSource.getCallerNum();
            var bridgedNum = chSource.getBridgedNum();

            // attended transfer is only possible on own calls. So when the endpointId is the caller, the
            // channel to transfer is the source channel, otherwise it's the destination channel
            var chToTransfer = endpointId === chSource.getCallerNum() ? chSource.getChannel() : chSource.getBridgedChannel();

            if (chToTransfer !== undefined) {

                // attended transfer the channel
                logger.info(IDLOG, 'attended transfer of the channel ' + chToTransfer + ' of exten ' + endpointId + ' to ' + to);
                astProxy.doCmd({ command: 'attendedTransfer', chToTransfer: chToTransfer, to: to }, function (err) {
                    cb(err);
                    attendedTransferConvCb(err);
                });

            } else {
                var msg = 'attended transfer: no channel to transfer ' + chToTransfer;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            var msg = 'attended transfer conversation: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
            logger.warn(IDLOG, msg);
            cb(msg);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Transfer the conversation to the voicemail.
*
* @method transferConversationToVoicemail
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {string}   voicemail    The destination voicemail number to transfer the conversation
* @param {function} cb           The callback function
*/
function transferConversationToVoicemail(endpointType, endpointId, convid, voicemail, cb) {
    try {
        // check parameters
        if (   typeof convid     !== 'string'
            || typeof cb         !== 'function' || typeof voicemail    !== 'string'
            || typeof endpointId !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs = extensions[endpointId].getAllConversations();
            var conv  = convs[convid];

            if (!conv) {
                var msg = 'transfer convid "' + convid + '" to voicemail "' + voicemail + '": no conversation present in extension ' + endpointId;
                logger.warn(IDLOG, msg);
                cb(msg);
                return;
            }

            var chSource   = conv.getSourceChannel();
            var callerNum  = chSource.getCallerNum();
            var bridgedNum = chSource.getBridgedNum();

            // transfer to voicemail is only possible on own calls. So when the endpointId is the caller, the
            // channel to transfer is the source channel, otherwise it's the destination channel
            var chToTransfer = endpointId === chSource.getCallerNum() ? chSource.getChannel() : chSource.getBridgedChannel();

            if (chToTransfer !== undefined) {

                // transfer the channel to the voicemail
                logger.info(IDLOG, 'transfer of the channel ' + chToTransfer + ' of exten ' + endpointId + ' to voicemail ' + voicemail);
                astProxy.doCmd({ command: 'transferToVoicemail', chToTransfer: chToTransfer, voicemail: voicemail }, function (err) {
                    cb(err);
                    transferConvToVoicemailCb(err);
                });

            } else {
                var msg = 'transfer to voicemail: no channel to transfer ' + chToTransfer;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            var msg = 'transfer conversation to voicemail: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
            logger.warn(IDLOG, msg);
            cb(msg);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Park the conversation.
*
* @method parkConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {string}   applicantId  The applicant identifier of the park operation (e.g. the extension number)
* @param {function} cb           The callback function
*/
function parkConversation(endpointType, endpointId, convid, applicantId, cb) {
    try {
        // check parameters
        if (   typeof convid       !== 'string'
            || typeof cb           !== 'function' || typeof endpointId   !== 'string'
            || typeof applicantId  !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs = extensions[endpointId].getAllConversations();
            var conv  = convs[convid];

            // check the presence of the conversation
            if (typeof conv !== 'object') {
                var err = 'parking the conversation ' + convid + ': no conversation present in the endpointId ' + endpointId;
                logger.warn(IDLOG, err);
                cb(err);
                return;
            }

            var chSource   = conv.getSourceChannel();
            var callerNum  = chSource.getCallerNum();
            var bridgedNum = chSource.getBridgedNum();

            // check if the applicant of the request is an intermediary of the conversation.
            // This is because only caller or called can park the conversation
            if (callerNum !== applicantId && bridgedNum !== applicantId) {
                var err = 'applicant extension "' + applicantId + '" not allowed to park a conversation not owned by him ' + convid;
                logger.warn(IDLOG, err);
                cb(err);
                return;
            }

            var chToPark = callerNum === applicantId ? chSource.getBridgedChannel() : chSource.getChannel();
            // channel to return once elapsed the parking timeout
            var chToReturn = callerNum === applicantId ? chSource.getChannel() : chSource.getBridgedChannel();

            if (chToPark !== undefined && chToReturn !== undefined) {

                // park the channel
                logger.info(IDLOG, 'execute the park of the channel ' + chToPark + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'parkChannel', chToPark: chToPark, chToReturn: chToReturn }, function (err, resp) {
                    try {
                        if (err) {
                            logger.error(IDLOG, 'parking the channel ' + chToPark + ' by the applicant ' + applicantId);
                            cb(err);
                            return;
                        }
                        logger.info(IDLOG, 'channel ' + chToPark + ' has been parked successfully');
                        cb(null);

                    } catch (err) {
                       logger.error(IDLOG, err.stack);
                       cb(err);
                    }
                });

            } else {
                var err = 'getting the channel to park ' + chToPark;
                logger.error(IDLOG, err);
                cb(err);
            }
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Logon the specified endpoint into all queues in which it's a dynamic member.
*
* @method logonDynQueues
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {function} cb           The callback function
*/
function logonDynQueues(endpointType, endpointId, cb) {
    try {
        // check parameters
        if (   typeof cb           !== 'function'
            || typeof endpointType !== 'string' || typeof endpointId !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            logger.info(IDLOG, 'execute logon to all queues in which the ' + endpointType + ' ' + endpointId + ' is dynamic');
            astProxy.doCmd({ command: 'logonDynQueues', exten: '220' }, function (err) {
                try {
                    if (err) {
                        logger.error(IDLOG, 'logon to all queues for which exten ' + endpointId + ' is dynamic');
                        cb(err);
                        return;
                    }
                    logger.info(IDLOG, 'logon to all queues for which exten ' + endpointId + ' is dynamic has been successfull');
                    cb(null);

                } catch (err) {
                   logger.error(IDLOG, err.stack);
                   cb(err);
                }
            });
        } else {
            var err = 'logon to all queues in which the endpoint is dynamic: unknown endpointType ' + endpointType + ' or extension not present';
            logger.warn(IDLOG, err);
            cb(err);
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Stop the recording of the conversation.
*
* @method stopRecordConversation
* @param {string} endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string} endpointId The endpoint identifier (e.g. the extension number)
* @param {string} convid The conversation identifier
* @param {function} cb The callback function
*/
function stopRecordConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof cb           !== 'function'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to hangup
            var chid = getExtenIdSourceChannelConversation(endpointId, convid);

            if (recordingConv[convid] === undefined) {
                var str = 'the conversation ' + convid + ' is not recording';
                logger.info(IDLOG, str);
                cb(str);

            } else if (chid) {
                // start the recording
                logger.info(IDLOG, 'execute the stop record of the channel ' + chid + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'stopRecordCall', channel: chid }, function (err) {
                    cb(err);
                    stopRecordCallCb(err, convid);
                });

            } else {
                var str = 'no channel to stop record of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, str);
                cb(str);
            }

        } else {
            var str = 'try to stop record conversation for the non existent endpoint ' + endpointType;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        cb(err);
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the spy of the conversation with speaking.
*
* @method startSpySpeakConversation
* @param {string} convid The conversation identifier
* @param {string} endpointId The endpoint identifier that has the conversation to spy
* @param {string} endpointType The type of the endpoint that has the conversation to spy
* @param {string} destType The endpoint type that spy the conversation
* @param {string} destId The endpoint identifier that spy the conversation
* @param {function} cb The callback function
*/
function startSpySpeakConversation(endpointType, endpointId, convid, destType, destId, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof cb           !== 'function'
            || typeof destId       !== 'string'
            || typeof destType     !== 'string'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint and dest
        if (endpointType === 'extension' && extensions[endpointId] // the extension to spy exists
            && destType  === 'extension' && extensions[destId]) {  // the extension that want to spy exists

            var convs       = extensions[endpointId].getAllConversations();
            var conv        = convs[convid];
            var chSource    = conv.getSourceChannel();
            var callerNum   = chSource.getCallerNum();
            var chToSpy     = callerNum === endpointId ? chSource.getChannel() : chSource.getBridgedChannel();
            var spyChanType = extensions[destId].getChanType();
            var spierId     = spyChanType + '/' + destId;

            // start to spy
            logger.info(IDLOG, 'execute the spy with only listening from ' + destId + ' of the channel ' + chToSpy + ' of exten ' + endpointId);
            astProxy.doCmd({ command: 'spySpeak', spierId: spierId, spiedId: endpointId, chToSpy: chToSpy }, function (err) {
                cb(err);
                startSpySpeakConvCb(err, convid);
            });

        } else {
            logger.warn(IDLOG, 'spy speak conversation of ' + endpointType + ' ' + endpointId + ' from ' + destType + ' ' + destId);
            cb();
        }
    } catch (err) {
        cb();
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the spy of the conversation with only listening.
*
* @method startSpyListenConversation
* @param {string} convid The conversation identifier
* @param {string} endpointId The endpoint identifier that has the conversation to spy
* @param {string} endpointType The type of the endpoint that has the conversation to spy
* @param {string} destType The endpoint type that spy the conversation
* @param {string} destId The endpoint identifier that spy the conversation
* @param {function} cb The callback function
*/
function startSpyListenConversation(endpointType, endpointId, convid, destType, destId, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof cb           !== 'function'
            || typeof destId       !== 'string'
            || typeof destType     !== 'string'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint and dest
        if (endpointType === 'extension' && extensions[endpointId] // the extension to spy exists
            && destType  === 'extension' && extensions[destId]) {  // the extension that want to spy exists

            var convs       = extensions[endpointId].getAllConversations();
            var conv        = convs[convid];
            var chSource    = conv.getSourceChannel();
            var callerNum   = chSource.getCallerNum();
            var chToSpy     = callerNum === endpointId ? chSource.getChannel() : chSource.getBridgedChannel();
            var spyChanType = extensions[destId].getChanType();
            var spierId     = spyChanType + '/' + destId;

            // start to spy
            logger.info(IDLOG, 'execute the spy with only listening from ' + destId + ' of the channel ' + chToSpy + ' of exten ' + endpointId);
            astProxy.doCmd({ command: 'spyListen', spierId: spierId, spiedId: endpointId, chToSpy: chToSpy }, function (err) {
                cb(err);
                startSpyListenConvCb(err, convid);
            });

        } else {
            logger.warn(IDLOG, 'spy listen conversation of ' + endpointType + ' ' + endpointId + ' from ' + destType + ' ' + destId);
            cb();
        }
    } catch (err) {
        cb();
        logger.error(IDLOG, err.stack);
    }
}

/**
* Start the recording of the conversation.
*
* @method startRecordConversation
* @param {string} endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string} endpointId The endpoint identifier (e.g. the extension number)
* @param {string} convid The conversation identifier
* @param {function} cb The callback function
*/
function startRecordConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof cb           !== 'function'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to hangup
            var ch = getExtenSourceChannelConversation(endpointId, convid);

            // check if the conversation is already recording
            if (recordingConv[convid] !== undefined) {
                logger.info(IDLOG, 'the conversation ' + convid + ' is already recording');

            } else if (ch) {

                var chid = ch.getChannel(); // the channel identifier
                var filepath = getRecordConversationFilepath(ch);

                // start the recording
                logger.info(IDLOG, 'execute the record of the channel ' + chid + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'recordCall', channel: chid, filepath: filepath }, function (err) {
                    cb(err);
                    recordCallCb(err, convid);
                });

            } else {
                logger.warn(IDLOG, 'no channel to record of conversation ' + convid + ' of exten ' + endpointId);
                cb();
            }

        } else {
            logger.warn(IDLOG, 'try to record conversation for the non existent endpoint ' + endpointType);
            cb();
        }

    } catch (err) {
        cb();
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the file path to be used to record the conversation.
*
* @method getRecordConversationFilepath
* @param {object} chSource The source channel
* @return {string} The filepath to be used to record the conversation.
*/
function getRecordConversationFilepath(chSource) {
    try {
        // check parameter
        if (typeof chSource.getUniqueId !== 'function'
            || typeof chSource.getCallerNum  !== 'function'
            || typeof chSource.getBridgedNum !== 'function') {

            throw new Error('wrong parameter');
        }

        var SEP = '-';
        var EXT = '.wav';
        var PRE = 'nethcti';
        var d = new Date(chSource.getStartTime());

        // get date and time components
        var yyyy = d.getFullYear() + '';
        var mon  = d.getMonth()   < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1) + '';
        var dd   = d.getDate()    < 10 ? ('0' + d.getDate())        : d.getDate() + '';
        var hh   = d.getHours()   < 10 ? ('0' + d.getHours())       : d.getHours() + '';
        var min  = d.getMinutes() < 10 ? ('0' + d.getMinutes())     : d.getMinutes() + '';
        var ss   = d.getSeconds() < 10 ? ('0' + d.getSeconds())     : d.getSeconds() + '';

        // the dest and the source are so calculated because the channel is the source channel
        var dest     = chSource.getBridgedNum();
        var source   = chSource.getCallerNum();
        var uniqueid = chSource.getUniqueId();
        var date = yyyy + mon + dd;
        var time = hh   + min + ss;

        // construct the filename
        var filename = PRE + SEP + dest + SEP + source + SEP + date + SEP + time + SEP + uniqueid + EXT;

        // return the filepath
        return path.join(yyyy, mon, dd, filename);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* This is the callback of the stop record call command plugin.
* Reset the record status of the conversations.
*
* @method stopRecordCallCb
* @param {object} err    The error object of the operation
* @param {string} convid The conversation identifier
* @private
*/
function stopRecordCallCb(err, convid) {
    try {
        if (err) {
            logger.error(IDLOG, 'stop record convid ' + convid + ' failed: ' + err.toString());

        } else {
            logger.info(IDLOG, 'stop record convid ' + convid + ' started succesfully');

            // remove the recording status of the conversation
            delete recordingConv[convid];
            // reset the recording status of all conversations with specified convid
            setRecordStatusConversations(convid, false);
        }
    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* This is the callback of the record call command plugin.
* Sets the recording status of the conversations.
*
* @method recordCallCb
* @param {object} err    The error object of the operation
* @param {string} convid The conversation identifier
* @private
*/
function recordCallCb(err, convid) {
    try {
        if (err) {
            logger.error(IDLOG, 'record convid ' + convid + ' failed: ' + err.toString());

        } else {
            logger.info(IDLOG, 'record convid ' + convid + ' started succesfully');

            // set the recording status of the conversation to memory
            recordingConv[convid] = '';
            // set the recording status of all conversations with specified convid
            setRecordStatusConversations(convid, true);
        }
    } catch (error) {
       logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the recording status of all the conversations with the specified convid.
*
* @method setRecordStatusConversations
* @param {string} convid The conversation identifier
* @param {boolean} value The value to be set
* @private
*/
function setRecordStatusConversations(convid, value) {
    try {
        // check parameters
        if (typeof convid !== 'string' || typeof value !== 'boolean') { throw new Error('wrong parameters'); }

        // set the recording status of all the conversations with the specified convid
        var exten, convs, cid;
        for (exten in extensions) { // cycle in all extensions

            // get all the conversations of the current extension
            convs = extensions[exten].getAllConversations();
            if (convs) {

                // cycle in all conversations
                for (cid in convs) {
                    // if the current conversation identifier is the
                    // same of that specified, set its recording status
                    if (cid === convid) {
                        convs[convid].setRecording(value);
                        logger.info(IDLOG, 'set recording status ' + value + ' to conversation ' + convid);

                        // emit the event
                        astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);
                        logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
                    }
                }
            }
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sends the DTMF tones to the specified extension. If the extension as
* already busy in a conversation, or it's calling, then one channel already
* exists and then use it to play DTMF. Otherwise, if the extension is free,
* it calls the extension and then sends the DTMF digits.
*
* @method sendDTMFSequence
* @param {string}   extension The extension identifier
* @param {boolean}  sequence The DTMF digits to send to the extension
* @param {function} cb The callback function
* @private
*/
function sendDTMFSequence(extension, sequence, cb) {
    try {
        // check parameters
        if (   typeof extension !== 'string'
            || typeof sequence  !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // check if the extension exists
        if (!extensions[extension]) {
            logger.warn(IDLOG, 'sending DTMF sequence to non existing extension ' + extension);
            cb(extension + ' not exists');
            return;
        }

        // get the channel type (sip, iax, ...) of the extension
        var chanType = extensions[extension].getChanType();

        var tyext = chanType + '/' + extension;

        // gets all the active channels. If a channel of the extension already exists then
        // play DTMF tones on that channel, otherwise it calls the extension and then sends
        // the DMTF tones
        astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
            try {
                if (err) {
                    cb(err);
                    return;
                }

                // cycle in all the active channels to check if there is a channel of the extension
                var ch;
                var chdtmf;
                for (ch in resp) {

                    // check if the channel is owned by the extension
                    if (ch.substring(0, tyext.length).toLowerCase() === tyext) {
                        chdtmf = ch;
                        break;
                    }
                }

                if (chdtmf) { sendDTMFSequenceToChannel(chdtmf, sequence, cb);            }
                else        { callAndSendDTMFSequence(chanType, extension, sequence, cb); }

            } catch (e) {
               logger.error(IDLOG, e.stack);
               cb(e);
            }
        });

    } catch (error) {
       logger.error(IDLOG, error.stack);
       cb(error);
    }
}

/**
* Play sequence of DTMF digits in the specified channel.
*
* @method sendDTMFSequenceToChannel
* @param {string}   channel  The channel to play DTMF tones
* @param {string}   sequence The sequence of DTMF tones
* @param {function} cb The callback function
* @private
*/
function sendDTMFSequenceToChannel(channel, sequence, cb) {
    try {
        // check parameters
        if (   typeof channel  !== 'string'
            || typeof sequence !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // get the array from string
        var arrSequence = sequence.split('');

        // delay between to sequential DTMF tones
        var DTMF_DELAY = 300;

        // play DTMF tone for each digits
        async.eachSeries(arrSequence, function (digit, seriesCb) {

            setTimeout(function() {

                // play one DTMF digit into the specified channel
                astProxy.doCmd({ command: 'playDTMF', channel: channel, digit: digit }, function (err) {

                    if (err) {
                        logger.error(IDLOG, 'playing DTMF digit "' + digit + '" to channel ' + channel);
                        seriesCb(err);

                    } else {
                        logger.info(IDLOG, 'played DTMF digit "' + digit + '" to channel ' + channel + ' successfully');
                        seriesCb();
                    }
                });

            }, DTMF_DELAY);

        }, function (err) {

            if (err) {
                logger.error(IDLOG, 'playing DTMF sequence "' + sequence + '" to channel ' + channel + ': ' + err.toString());
                cb(err);
            }
            else {
                logger.info(IDLOG, 'played DTMF sequence "' + sequence + '" to channel ' + channel + ' successfully');
                cb(null);
            }
        });

    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Call and then send sequence of DTMF digits to the specified extension.
*
* @method callAndSendDTMFSequence
* @param {string}   chanType  The technology of the channel (e.g. SIP, IAX, ...)
* @param {string}   extension The extension identifier
* @param {string}   sequence The sequence of DTMF tones
* @param {function} cb The callback function
* @private
*/
function callAndSendDTMFSequence(chanType, extension, sequence, cb) {
    try {
        // check parameters
        if (   typeof chanType  !== 'string' || typeof cb       !== 'function'
            || typeof extension !== 'string' || typeof sequence !== 'string') {

            throw new Error('wrong parameters');
        }

        // call the extension and send DTMF sequence
        astProxy.doCmd({ command: 'callAndSendDTMF', chanType: chanType, exten: extension, sequence: sequence }, function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'calling and sending DTMF sequence "' + sequence + '" to ' + chanType + ' ' + extension);
                    cb(err);

                } else {
                    logger.info(IDLOG, 'calling and sending DTMF sequence "' + sequence + '" to ' + chanType + ' ' + extension + ' has successful'); 
                    cb();
                }

            } catch (error) {
               logger.error(IDLOG, error.stack);
               cb(error);
            }
        });

    } catch (e) {
       logger.error(IDLOG, e.stack);
       cb(e);
    }
}

/**
* Returns the extensions involved in the specified conversation.
*
* @method getExtensionsFromConversation
* @param  {string} convid The conversation identifier
* @param  {string} exten  The extension identifier which has the conversation
* @return {array}  The extensions involved in the conversation.
* @private
*/
function getExtensionsFromConversation(convid, exten) {
    try {
        // check parameters
        if (typeof convid !== 'string' || typeof exten !== 'string') {
            throw new Error('wrong parameters');
        }

        var result = [];

        // check the extension existence
        if (extensions[exten]) {

            // check if the extension has the specified conversation
            var conv = extensions[exten].getConversation(convid);
            if (typeof conv !== 'object') {
                logger.warn(IDLOG, 'getting extensions from convid ' + convid + ': no conversation in extension ' + exten);
                return result;
            }
            result.push(exten);

            // get the other number of the conversation and check if it's an extension number
            var chSource = conv.getSourceChannel();
            if (typeof chSource !== 'object') {
                logger.warn(IDLOG, 'getting extensions from convid ' + convid + ': no source channel in conversation of extension ' + exten);
                return result;
            }

            // get the other number of the conversation
            var numToCheckExten = chSource.getCallerNum() === exten ? chSource.getBridgedNum() : chSource.getCallerNum();

            // check if the other number is an extension and if it has the specified conversation
            if (extensions[numToCheckExten]) {

                // to check whether the number is an extension, check if it has the specified conversation
                if (extensions[numToCheckExten].getConversation(convid)) {
                    result.push(numToCheckExten);
                }
            }

        } else {
            logger.warn(IDLOG, 'getting the extensions of the convid ' + convid + ' from extension ' + exten + ': no extension ' + exten + ' present');
        }
        return result;

    } catch (e) {
        logger.error(IDLOG, e.stack);
        return [];
    }
}

/**
* Returns the base path of the call recording audio files.
*
* @method getBaseCallRecAudioPath
* @return {string} The base path of the call recording audio files.
*/
function getBaseCallRecAudioPath() {
    try {
        return BASE_CALL_REC_AUDIO_PATH;
    } catch (e) {
        logger.error(IDLOG, e.stack);
    }
}

// public interface
exports.on                              = on;
exports.call                            = call;
exports.start                           = start;
exports.visit                           = visit;
exports.setLogger                       = setLogger;
exports.getExtensions                   = getExtensions;
exports.pickupParking                   = pickupParking;
exports.getJSONQueues                   = getJSONQueues;
exports.getJSONTrunks                   = getJSONTrunks;
exports.logonDynQueues                  = logonDynQueues;
exports.getJSONParkings                 = getJSONParkings;
exports.sendDTMFSequence                = sendDTMFSequence;
exports.parkConversation                = parkConversation;
exports.getJSONExtensions               = getJSONExtensions;
exports.EVT_EXTEN_CHANGED               = EVT_EXTEN_CHANGED;
exports.EVT_QUEUE_CHANGED               = EVT_QUEUE_CHANGED;
exports.EVT_NEW_VOICEMAIL               = EVT_NEW_VOICEMAIL;
exports.hangupConversation              = hangupConversation;
exports.pickupConversation              = pickupConversation;
exports.evtExtenDndChanged              = evtExtenDndChanged;
exports.EVT_PARKING_CHANGED             = EVT_PARKING_CHANGED;
exports.redirectConversation            = redirectConversation;
exports.evtHangupConversation           = evtHangupConversation;
exports.evtExtenStatusChanged           = evtExtenStatusChanged;
exports.evtNewVoicemailMessage          = evtNewVoicemailMessage;
exports.stopRecordConversation          = stopRecordConversation;
exports.evtConversationDialing          = evtConversationDialing;
exports.evtSpyStartConversation         = evtSpyStartConversation;
exports.startRecordConversation         = startRecordConversation;
exports.getBaseCallRecAudioPath         = getBaseCallRecAudioPath;
exports.evtNewQueueWaitingCaller        = evtNewQueueWaitingCaller;
exports.evtConversationConnected        = evtConversationConnected;
exports.startSpySpeakConversation       = startSpySpeakConversation;
exports.startSpyListenConversation      = startSpyListenConversation;
exports.evtRemoveQueueWaitingCaller     = evtRemoveQueueWaitingCaller;
exports.attendedTransferConversation    = attendedTransferConversation;
exports.getExtensionsFromConversation   = getExtensionsFromConversation;
exports.transferConversationToVoicemail = transferConversationToVoicemail;
