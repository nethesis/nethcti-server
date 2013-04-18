/**
* This is the asterisk proxy logic linked to version 11
* of the asterisk server.
*
* @class proxy_logic_11
* @static
*/
var path         = require('path');
var Queue        = require('./queue').Queue;
var Channel      = require('./channel').Channel;
var Parking      = require('./parking').Parking;
var iniparser    = require('iniparser');
var Extension    = require('./extension').Extension;
var QueueMember  = require('./queueMember').QueueMember;
var EventEmitter = require('events').EventEmitter;
var ParkedCaller = require('./parkedCaller').ParkedCaller;
var Conversation = require('./conversation').Conversation;
var QueueWaitingCaller = require('./queueWaitingCaller').QueueWaitingCaller;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [ast_proxy]
*/
var IDLOG = '[proxy_logic_11]';

/**
* Fired when something changed in an extension.
*
* @event extenChanged
* @param {object} msg The extension object
*/
var EVT_EXTEN_CHANGED = 'extenChanged';

/**
* Fired when something changed in a parking.
*
* @event parkingChanged
* @param {object} msg The parking object
*/
var EVT_PARKING_CHANGED = 'parkingChanged';

/**
* Fired when something changed in a queue.
*
* @event queueChanged
* @param {object} msg The queue object
*/
var EVT_QUEUE_CHANGED = 'queueChanged';

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
        PARK:  'park',
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
* @param {array} resp The response received from the command.
* @private
*/
function sipExtenStructValidation(resp) {
    try {
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
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}


/**
* Validates all iax extensions of the structure ini file and
* initialize iax _Extension_ objects.
*
* @method iaxExtenStructValidation
* @param {array} resp The response received from the command.
* @private
*/
function iaxExtenStructValidation(resp) {
    try {
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
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Validates all queues of the structure ini file.
*
* @method queueStructValidation
* @param {array} resp The response received from the command.
* @private
*/
function queueStructValidation(resp) {
    try {
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
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Validates all parkings of the structure ini file.
*
* @method parkStructValidation
* @param {array} resp The response received from the command.
* @private
*/
function parkStructValidation(resp) {
    try {
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
    } catch (err) {
        logger.error(IDLOG, err.stack);
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

            extensions[resp[i].exten].setIp(resp[i].ip);
            extensions[resp[i].exten].setPort(resp[i].port);
            logger.info(IDLOG, 'set iax details for ext ' + resp[i].exten);

            // request the extension status
            astProxy.doCmd({ command: 'extenStatus', exten: resp[i].exten }, extenStatus);
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
* @param {object} resp The reponse object received from the "listParkedChannels" command plugin
* @private
*/
function listParkedChannels(resp) {
    try {
        // check the parameter
        if (typeof resp !== 'object') { throw new Error('wrong parameter'); }

        if (resp && resp.result === true) {

            // store parked channels in global variable "parkedChannels"
            parkedChannels = resp.parkedChannels;

            // request all channels to get the caller number information for each parked channel
            astProxy.doCmd({ command: 'listChannels' }, updateParkedCallerForAllParkings);

        } else {
            logger.warn(IDLOG, 'getting parked channels');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates specified parking key of the _parkedChannels_ property with the
* object received from _listParkedChannels_ command plugin.
*
* @method updateParkedChannelOfOneParking
* @param {string} parking The parking identifier
* @param {resp} The response object received from _listParkedChannels_ command plugin
* @private
*/
function updateParkedChannelOfOneParking(parking, resp) {
    try {
        // check the parameters
        if (typeof resp !== 'object' || typeof parking !== 'string') {
            throw new Error('wrong parameters');
        }

        if (resp.result === true) {

            // check if the response contains a parked channel for the specified parking
            // It it's not present, the parking is free
            if (typeof resp.parkedChannels[parking] === 'object') {

                // update the parked channel of the parking
                parkedChannels[parking] = resp.parkedChannels[parking];

                // request all channels to get the caller number information of
                // the parked channel of the specified parking
                logger.info(IDLOG, 'request all channels to update parked caller informations for parking ' + parking);
                astProxy.doCmd({ command: 'listChannels' }, function (resp) {
                    // update the parked caller of one parking in "parkings" object list
                    updateParkedCallerOfOneParking(parking, resp);
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

        } else {
            logger.warn(IDLOG, 'in update parked caller for parking ' + parking);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the parked caller of the specified parking.
*
* @method updateParkedCallerOfOneParking
* @param {string} parking The parking identifier
* @param {object} resp The response received from the _listChannels_ command plugin
* @private
*/
function updateParkedCallerOfOneParking(parking, resp) {
    try {
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

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates all parking lost with their relative parked calls,
* if they are present.
*
* @method updateParkedCallerForAllParkings
* @param {object} resp The object received from the "listChannels" command plugin
* @private
*/
function updateParkedCallerForAllParkings(resp) {
    try {
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
    } catch (err) {
        logger.error(IDLOG, err.stack);
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
* @param {object} resp The queue informations object
* @private
*/
function queueDetails(resp) {
    try {
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

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the JSON representation of all queues.
*
* @method getJSONQueues
* @return {object} The JSON representation of all queues.
*/
function getJSONQueues() {
    try {
        var qliteral = {};
        var q;
        for (q in queues) { qliteral[q] = queues[q].toJSON(); }
        return qliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the JSON representation of all parkings.
*
* @method getJSONParkings
* @return {object} The JSON representation of all parkings.
*/
function getJSONParkings() {
    try {
        var p;
        var pliteral = {};
        for (p in parkings) { pliteral[p] = parkings[p].toJSON(); }
        return pliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the JSON representation of the all extensions.
*
* @method getJSONExtensions
* @return {object} The JSON representation of the all extensions.
*/
function getJSONExtensions() {
    try {
        var eliteral = {};
        var ext;
        for (ext in extensions) { eliteral[ext] = extensions[ext].toJSON(); }
        return eliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
* Set the call forward status of the extension.
*
* @method setCfStatus
* @param {object} resp The response object of the _cfGet_ command plugin.
* @private
*/
function setCfStatus(resp) {
    try {
        // check parameter
        if (typeof resp !== 'object' || typeof resp.exten !== 'string') { throw new Error('wrong parameter'); }

        if (extensions[resp.exten]) { // the extension exists

            if (resp.cf === 'yes') {
                extensions[resp.exten].setCf(resp.cfExten);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' cf enable to ' + resp.cfExten);

            } else {
                extensions[resp.exten].disableCf();
                logger.info(IDLOG, 'set extension ' + resp.exten + ' cf disable');
            }

        } else {
            logger.warn(IDLOG, 'request cf for not existing extension ' + resp.exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the don't disturb status of the extension.
*
* @method setDndStatus
* @param {object} resp The response object of the _dndGet_ command plugin.
* @private
*/
function setDndStatus(resp) {
    try {
        // check parameter
        if (typeof resp !== 'object' || typeof resp.exten !== 'string') { throw new Error('wrong parameter'); }

        if (extensions[resp.exten]) { // the extension exists

            if (resp.dnd === 'yes') {
                extensions[resp.exten].setDnd(true);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' dnd true');

            } else {
                extensions[resp.exten].setDnd(false);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' dnd false');
            }

        } else {
            logger.warn(IDLOG, 'request dnd for not existing extension ' + resp.exten);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the details for the sip extension object.
*
* @method extSipDetails
* @param {object} resp The extension informations object
* @private
*/
function extSipDetails(resp) {
    try {
        // check parameter
        if (!resp || resp.result === undefined) { throw new Error('wrong parameter'); }

        if (resp.result === true) {

            // extract extension object from the response
            var data = resp.exten;

            // set the extension informations
            extensions[data.exten].setIp(data.ip);
            extensions[data.exten].setPort(data.port);
            extensions[data.exten].setName(data.name);
            extensions[data.exten].setSipUserAgent(data.sipuseragent);
            logger.info(IDLOG, 'set sip details for ext ' + data.exten);

        } else {
            logger.warn(IDLOG, 'sip details ' + (resp.message !== undefined ? resp.message : ''));
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update iax extension information and emit _EVT\_EXTEN\_CHANGED_ event.
*
* @method updateExtIaxDetails
* @param {object} resp The iax extension informations object
* @private
*/
function updateExtIaxDetails(resp) {
    try {
        // set extension informations
        extIaxDetails(resp);

        // emit the event
        astProxy.emit(EVT_EXTEN_CHANGED, extensions[resp.exten]);
        logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for iax extension ' + resp.exten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
* @param {object} resp The extension informations object
* @private
*/
function updateExtSipDetails(resp) {
    try {
        // set extension informations
        extSipDetails(resp);

        // emit the event
        astProxy.emit(EVT_EXTEN_CHANGED, extensions[resp.exten.exten]);
        logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for sip extension ' + resp.exten.exten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the conversations for all extensions.
*
* @method updateConversationsForAllExten
* @param {object} resp The channel list as received by the _listChannels_ command plugin.
* @private
*/
function updateConversationsForAllExten(resp) {
    try {
        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        // removes all conversations of all extensions
        var ext;
        for (ext in extensions) { extensions[ext].removeAllConversations(); }

        // cycle in all received channels
        var chid;
        for (chid in resp) {

            ext = resp[chid].callerNum;

            // add new conversation to the extension through the current channel object
            if (extensions[ext]) { addConversationToExten(ext, resp, chid); }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Update the conversations of the extension.
*
* @method updateExtenConversations
* @param {string} exten The extension number
* @param {object} resp The object received by the _listChannels_ command plugin
* @private
*/
function updateExtenConversations(exten, resp) {
    try {
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

                // add conversation if the current extension is of interest
                if (ext === exten) { addConversationToExten(ext, resp, chid); }
            }

            // emit the event
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);
            logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);

        } else {
            logger.warn(IDLOG, 'try to update channel list of the non existent extension ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
* @param {object} resp The received response object
* @private
*/
function extenStatus(resp) {
    try {
        extensions[resp.exten].setStatus(resp.status);
        logger.info(IDLOG, 'sets status ' + resp.status + ' for extension ' + resp.exten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
* @method extenStatusChanged
* @param {string} exten The extension number
* @param {string} statusCode The numeric status code as arrived from asterisk
* @private
*/
function extenStatusChanged(exten, status) {
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
            if (extensions[exten].chanType() === 'sip') {

                astProxy.doCmd({ command: 'sipDetails', exten: exten }, updateExtSipDetails);

            } else if (extensions[exten].chanType() === 'iax') {

                astProxy.doCmd({ command: 'iaxDetails', exten: exten }, updateExtIaxDetails);
            }

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the extension ' + exten);
            astProxy.doCmd({ command: 'listChannels' }, function (resp) {
                // update the conversations of the extension
                updateExtenConversations(exten, resp);
            });

        } else if (parkings[exten]) { // the exten is a parking

            var parking = exten; // to better understand the code

            // request all parked channels
            logger.info(IDLOG, 'requests all parked channels to update the parking ' + parking);
            astProxy.doCmd({ command: 'listParkedChannels' }, function (resp) {
                // update the parked channel of one parking in "parkedChannels"
                updateParkedChannelOfOneParking(parking, resp);
            });
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Remove a waiting caller from a queue.
*
* @method removeQueueWaitingCaller
* @param {object} data The response object received from the event plugin _leave_.
*/
function removeQueueWaitingCaller(data) {
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
* @method newQueueWaitingCaller
* @param {object} data The response object received from the event plugin _join_.
*/
function newQueueWaitingCaller(data) {
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
* If the involved numbers are extensions, it updates their conversations.
*
* @method conversationConnected
* @param {string} num1 One of the two connected numbers
* @param {string} num2 The other of the two connected numbers
*/
function conversationConnected(num1, num2) {
    try {
        // check parameters
        if (typeof num1 !== 'string' || typeof num2 !== 'string') {
            throw new Error('wrong parameters');
        }

        // check if num1 is an extension
        if (extensions[num1]) {

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the extension ' + num1);
            astProxy.doCmd({ command: 'listChannels' }, function (resp) {
                // update the conversations of the extension
                updateExtenConversations(num1, resp);
            });
        }

        // check if num2 is an extension
        if (extensions[num2]) {

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the extension ' + num2);
            astProxy.doCmd({ command: 'listChannels' }, function (resp) {
                // update the conversations of the extension
                updateExtenConversations(num2, resp);
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
* Hangup the conversation of the endpoint.
*
* @method hangupConversation
* @param {string} endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string} endpointId The endpoint identifier (e.g. the extension number)
* @param {string} convid The conversation identifier
* @param {function} cb The callback function
*/
function hangupConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to hangup
            var ch = getExtenIdChannelConversation(endpointId, convid);

            if (ch) {
                // execute the hangup
                logger.info(IDLOG, 'execute hangup of the channel ' + ch + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'hangup', channel: ch }, function (resp) {
                    cb(resp);
                    hangupCb(resp);
                });

            } else {
                logger.warn(IDLOG, 'no channel to hangup of conversation ' + convid + ' of exten ' + endpointId);
                cb();
            }

        } else {
            logger.warn(IDLOG, 'try to hangup conversation for the non existent endpoint ' + endpointType);
            cb();
        }

    } catch (err) {
        cb();
        logger.error(IDLOG, err.stack);
    }
}

/**
* This is the callback of the hangup command plugin.
*
* @method hangupCb
* @param {object} resp The response object of the operation
* @private
*/
function hangupCb(resp) {
    try {
        if (typeof resp === 'object' && resp.result === true) {
            logger.info(IDLOG, 'hangup channel succesfully');

        } else {
            logger.warn(IDLOG, 'hangup channel failed' + (resp.cause ? (': ' + resp.cause) : '') );
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
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
            || typeof endpointId   !== 'string'
            || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to hangup
            var chid = getExtenIdSourceChannelConversation(endpointId, convid);

            if (recordingConv[convid] === undefined) {
                logger.info(IDLOG, 'the conversation ' + convid + ' is not recording');

            } else if (chid) {
                // start the recording
                logger.info(IDLOG, 'execute the stop record of the channel ' + chid + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'stopRecordCall', channel: chid }, function (resp) {
                    cb(resp);
                    stopRecordCallCb(resp, convid);
                });

            } else {
                logger.warn(IDLOG, 'no channel to stop record of conversation ' + convid + ' of exten ' + endpointId);
                cb();
            }

        } else {
            logger.warn(IDLOG, 'try to stop record conversation for the non existent endpoint ' + endpointType);
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
* @method recordConversation
* @param {string} endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string} endpointId The endpoint identifier (e.g. the extension number)
* @param {string} convid The conversation identifier
* @param {function} cb The callback function
*/
function recordConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid !== 'string'
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
                astProxy.doCmd({ command: 'recordCall', channel: chid, filepath: filepath }, function (resp) {
                    cb(resp);
                    recordCallCb(resp, convid);
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
* @param {object} resp The response object of the operation
* @param {string} convid The conversation identifier
* @private
*/
function stopRecordCallCb(resp, convid) {
    try {
        if (typeof resp === 'object' && resp.result === true) {
            logger.info(IDLOG, 'stop record channel started succesfully');

            // remove the recording status of the conversation
            delete recordingConv[convid];
            // reset the recording status of all conversations with specified convid
            setRecordStatusConversations(convid, false);

        } else {
            logger.warn(IDLOG, 'stop record channel failed' + (resp.cause ? (': ' + resp.cause) : '') );
        }

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* This is the callback of the record call command plugin.
* Sets the recording status of the conversations.
*
* @method recordCallCb
* @param {object} resp The response object of the operation
* @param {string} convid The conversation identifier
* @private
*/
function recordCallCb(resp, convid) {
    try {
        // the operation was succesfully
        if (typeof resp === 'object' && resp.result === true) {
            logger.info(IDLOG, 'record channel started succesfully');

            // set the recording status of the conversation to memory
            recordingConv[convid] = '';
            // set the recording status of all conversations with specified convid
            setRecordStatusConversations(convid, true);

        } else {
            logger.warn(IDLOG, 'record channel failed' + (resp.cause ? (': ' + resp.cause) : '') );
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
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

// public interface
exports.on                 = on;
exports.start              = start;
exports.visit              = visit;
exports.setLogger          = setLogger;
exports.getExtensions      = getExtensions;
exports.getJSONQueues      = getJSONQueues;
exports.getJSONParkings    = getJSONParkings;
exports.getJSONExtensions  = getJSONExtensions;
exports.extenStatusChanged = extenStatusChanged;
exports.hangupConversation = hangupConversation;
exports.recordConversation = recordConversation;
exports.newQueueWaitingCaller    = newQueueWaitingCaller;
exports.conversationConnected    = conversationConnected;
exports.stopRecordConversation   = stopRecordConversation;
exports.removeQueueWaitingCaller = removeQueueWaitingCaller;
