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
var path                    = require('path');
var async                   = require('async');
var Queue                   = require('../queue').Queue;
var Trunk                   = require('../trunk').Trunk;
var moment                  = require('moment');
var Channel                 = require('../channel').Channel;
var Parking                 = require('../parking').Parking;
var iniparser               = require('iniparser');
var Extension               = require('../extension').Extension;
var QueueMember             = require('../queueMember').QueueMember;
var EventEmitter            = require('events').EventEmitter;
var ParkedCaller            = require('../parkedCaller').ParkedCaller;
var Conversation            = require('../conversation').Conversation;
var TrunkConversation       = require('../trunkConversation').TrunkConversation;
var QueueWaitingCaller      = require('../queueWaitingCaller').QueueWaitingCaller;
var QUEUE_MEMBER_TYPES_ENUM = require('../queueMember').QUEUE_MEMBER_TYPES_ENUM;

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
* Fired when something changed in an queue member.
*
* @event queueMemberChanged
* @param {object} msg The queue member object
*/
/**
* The name of the queue member changed event.
*
* @property EVT_QUEUE_MEMBER_CHANGED
* @type string
* @default "queueMemberChanged"
*/
var EVT_QUEUE_MEMBER_CHANGED = 'queueMemberChanged';

/**
* Fired when something changed in a trunk.
*
* @event trunkChanged
* @param {object} msg The trunk object
*/
/**
* The name of the trunk changed event.
*
* @property EVT_TRUNK_CHANGED
* @type string
* @default "trunkChanged"
*/
var EVT_TRUNK_CHANGED = 'trunkChanged';

/**
* Fired when an extension ringing.
*
* @event extenDialing
* @param {object} data The caller identity
*/
/**
* The name of the extension dialing event.
*
* @property EVT_EXTEN_DIALING
* @type string
* @default "extenDialing"
*/
var EVT_EXTEN_DIALING = 'extenDialing';

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
* @event newVoiceMessage
* @param {object} msg The data about the voicemail, with the number of new and old messages
*/
/**
* The name of the new voicemail event.
*
* @property EVT_NEW_VOICE_MESSAGE
* @type string
* @default "newVoiceMessage"
*/
var EVT_NEW_VOICE_MESSAGE = 'newVoiceMessage';

/**
* Fired when new call detail records (cdr) has been logged into the call history.
*
* @event newCdr
* @param {object} msg The call detail records.
*/
/**
* The name of the new call detail records (cdr) event.
*
* @property EVT_NEW_CDR
* @type string
* @default "newCdr"
*/
var EVT_NEW_CDR = 'newCdr';

/**
* Something has appen in the voice messages of the voicemail, for example the listen
* of a new voice message from the phone.
*
* @event updateVoiceMessages
* @param {object} msg The data about the voicemail
*/
/**
* The name of the update voice messages event.
*
* @property EVT_UPDATE_VOICE_MESSAGES
* @type string
* @default "updateVoiceMessages"
*/
var EVT_UPDATE_VOICE_MESSAGES = 'updateVoiceMessages';

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
* The interval time to update the details of all the queues.
*
* @property INTERVAL_UPDATE_QUEUE_DETAILS
* @type number
* @private
* @final
* @default 60000
*/
var INTERVAL_UPDATE_QUEUE_DETAILS = 60000;

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
* The phonebook component.
*
* @property compPhonebook
* @type object
* @private
*/
var compPhonebook;

/**
* The database component.
*
* @property compDbconn
* @type object
* @private
*/
var compDbconn;

/**
* The caller note component.
*
* @property compCallerNote
* @type object
* @private
*/
var compCallerNote;

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
* The prefix number to be used in outgoing call. It is not used in
* internal calls between extensions.
*
* @property prefix
* @type string
* @private
* @default ""
*/
var prefix = '';

/**
* Contains the informations about the caller. The key is the caller
* number and the value is the information object. The data are about
* the created caller notes and the phonebook contacts from the centralized
* and nethcti address book that match on the caller number. The informations
* are retrieved when a _UserEvent_ is received and are used when _Dialing_
* events occurs. This is because when a call is directed to a queue, only
* one _UserEvent_ is emitted and many _Dialing_ events for each members of
* the queue. So it executes only one query per call. Due to asynchronous nature
* of the query, it may happen that when _Dialing_ event occurs the query is
* not completed. In this case the informations of the caller are those returned
* by the asterisk event. In this manner we give more importance to the speed
* rather than to informations completeness.
*
* @property callerIdentityData
* @type object
* @private
* @default {}
*/
var callerIdentityData = {};

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
        if (typeof log       === 'object'   &&
            typeof log.info  === 'function' &&
            typeof log.warn  === 'function' &&
            typeof log.error === 'function') {

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
* Sets the prefix number to be used in all outgoing calls.
* It does not to be used with internal calls between extensions.
*
* @method setPrefix
* @param {string} prefix The prefix number.
* @static
*/
function setPrefix(code) {
    try {
        // check parameter
        if (typeof code !== 'string') { throw new Error('wrong prefix type'); }

        prefix = code;

        logger.info(IDLOG, 'prefix number has been set to "' + prefix + '"');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the prefix number used in all outgoing calls.
* It is not used with internal calls between extensions.
*
* @method getPrefix
* @return {string} prefix The prefix number.
* @static
*/
function getPrefix() {
    try {
        return prefix;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the phonebook architect component.
*
* @method setCompPhonebook
* @param {object} comp The phonebook architect component.
*/
function setCompPhonebook(comp) {
    try {
        compPhonebook = comp;
        logger.info(IDLOG, 'set phonebook architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the database architect component.
*
* @method setCompDbconn
* @param {object} comp The database architect component.
*/
function setCompDbconn(comp) {
    try {
        compDbconn = comp;
        logger.info(IDLOG, 'set database architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the caller note architect component.
*
* @method setCompCallerNote
* @param {object} comp The caller note architect component.
*/
function setCompCallerNote(comp) {
    try {
        compCallerNote = comp;
        logger.info(IDLOG, 'set caller note architect component');
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
            if (struct[k].tech === INI_STRUCT.TECH.SIP &&
                struct[k].type === INI_STRUCT.TYPE.EXTEN) {

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
            if (struct[k].tech === INI_STRUCT.TECH.SIP &&
                struct[k].type === INI_STRUCT.TYPE.TRUNK) {

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
* Validates all iax trunks of the structure ini file and
* initialize iax _Trunk_ objects.
*
* @method iaxTrunkStructValidation
* @param {object} err  The error received from the command
* @param {array}  resp The response received from the command
* @private
*/
function iaxTrunkStructValidation(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'validating iax trunk structure: ' + err.toString());
            return;
        }

        // creates temporary object used to rapid check the
        // existence of a trunk into the asterisk
        var iaxlist = {};
        var i;
        for (i = 0; i < resp.length; i++) { iaxlist[resp[i].exten] = ''; }

        // cycles in all elements of the structure ini file to validate
        var k;
        for (k in struct) {

            // validates all iax trunks
            if (struct[k].tech === INI_STRUCT.TECH.IAX &&
                struct[k].type === INI_STRUCT.TYPE.TRUNK) {

                // current trunk of the structure ini file isn't present
                // into the asterisk. So remove it from the structure ini file
                if (iaxlist[struct[k].extension] === undefined) {

                    delete struct[k];
                    logger.warn(IDLOG, 'inconsistency between ini structure file and asterisk for ' + k);
                }
            }
        }
        logger.info(IDLOG, 'all iax trunks have been validated');

        // initialize all iax trunks as 'Trunk' objects into the 'trunks' property
        initializeIaxTrunk(resp);

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
            if (struct[k].tech === INI_STRUCT.TECH.IAX &&
                struct[k].type === INI_STRUCT.TYPE.EXTEN) {

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
        // validates all sip extensions
        astProxy.doCmd({ command: 'listSipPeers' }, sipExtenStructValidation);
        // validates all iax extensions
        astProxy.doCmd({ command: 'listIaxPeers' }, iaxExtenStructValidation);
        // validates all queues
        astProxy.doCmd({ command: 'listQueues'   }, queueStructValidation);
        // validates all parkings
        astProxy.doCmd({ command: 'listParkings' }, parkStructValidation);
        // validates all sip trunks
        astProxy.doCmd({ command: 'listSipPeers' }, sipTrunkStructValidation);
        // validates all iax trunks
        astProxy.doCmd({ command: 'listIaxPeers' }, iaxTrunkStructValidation);

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

            if (struct[k].type === INI_STRUCT.TYPE.EXTEN &&
                struct[k].tech === INI_STRUCT.TECH.IAX) { // all iax extensions

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
            logger.info(IDLOG, 'emit event ' + EVT_PARKING_CHANGED + ' for parking ' + parking);
            astProxy.emit(EVT_PARKING_CHANGED, parkings[parking]);
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
                logger.info(IDLOG, 'emit event ' + EVT_PARKING_CHANGED + ' for parking ' + parking);
                astProxy.emit(EVT_PARKING_CHANGED, parkings[parking]);
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

        logger.info(IDLOG, 'start the interval period to update the details of all the queues each ' + INTERVAL_UPDATE_QUEUE_DETAILS + ' msec');
        startIntervalUpdateQueuesDetails(INTERVAL_UPDATE_QUEUE_DETAILS);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the data about all queues each interval of time.
*
* @method startIntervalUpdateQueuesDetails
* @param {number} interval The interval time to update the details of all the queues.
* @private
*/
function startIntervalUpdateQueuesDetails(interval) {
    try {
        // check the parameter
        if (typeof interval !== 'number') { throw new Error('wrong parameter'); }

        setInterval(function () {

            var q;
            for (q in queues) {

                // request details for the current queue
                logger.info(IDLOG, 'update details of queue ' + q);
                astProxy.doCmd({ command: 'queueDetails', queue: q }, queueDetailsUpdate);
            }

        }, interval);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the details for the queue object.
*
* @method queueDetailsUpdate
* @param {object} err  The error response object
* @param {object} resp The queue informations object
* @private
*/
function queueDetailsUpdate(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating queue details: ' + err.toString());
            return;
        }

        // check the parameter
        if (typeof resp !== 'object' ||
            resp.queue                  === undefined || resp.members                === undefined ||
            resp.holdtime               === undefined || resp.talktime               === undefined ||
            resp.completedCallsCount    === undefined || resp.abandonedCallsCount    === undefined ||
            resp.serviceLevelTimePeriod === undefined || resp.serviceLevelPercentage === undefined) {

            throw new Error('wrong parameter');
        }

        var q = resp.queue; // the queue number

        // check the existence of the queue
        if (!queues[q]) {
            logger.warn(IDLOG, 'try to update details of not existent queue "' + q + '"');
            return;
        }

        // update the queue data
        setQueueData(q, resp);

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_QUEUE_CHANGED + ' for queue ' + q);
        astProxy.emit(EVT_QUEUE_CHANGED, queues[q]);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the data for the queue object.
*
* @method setQueueData
* @param {string} q    The queue name
* @param {object} resp The queue informations object
* @private
*/
function setQueueData(q, resp) {
    try {
        // check the parameter
        if (typeof q                    !== 'string'  || typeof resp                 !== 'object'  ||
            resp.holdtime               === undefined || resp.talktime               === undefined ||
            resp.completedCallsCount    === undefined || resp.abandonedCallsCount    === undefined ||
            resp.serviceLevelTimePeriod === undefined || resp.serviceLevelPercentage === undefined) {

            throw new Error('wrong parameter');
        }

        queues[q].setAvgHoldTime(resp.holdtime);
        queues[q].setAvgTalkTime(resp.talktime);
        queues[q].setCompletedCallsCount(resp.completedCallsCount);
        queues[q].setAbandonedCallsCount(resp.abandonedCallsCount);
        queues[q].setServiceLevelTimePeriod(resp.serviceLevelTimePeriod);
        queues[q].setServiceLevelPercentage(resp.serviceLevelPercentage);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Updates waiting callers of the queue object.
*
* @method updateQueueWaitingCallers
* @param {object} err  The error response object
* @param {object} resp The queue informations object
* @private
*/
function updateQueueWaitingCallers(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating queue waiting callers: ' + err.toString());
            return;
        }

        // check the parameter
        if (typeof resp !== 'object' || resp.queue === undefined) { throw new Error('wrong parameter'); }

        var q = resp.queue; // the queue number

        // check the existence of the queue
        if (!queues[q]) {
            logger.warn(IDLOG, 'try to update queue waiting callers of the queue "' + q + '"');
            return;
        }

        logger.info(IDLOG, 'update all waiting callers of queue "' + q + '"');

        // remove all current waiting callers
        queues[q].removeAllWaitingCallers();

        // set all waiting callers. If the waiting callers is already present in the queue, it will be
        // overwrite. In this manner the position is updated
        var ch, wCaller;
        for (ch in resp.waitingCallers) {
            wCaller = new QueueWaitingCaller(resp.waitingCallers[ch]);
            queues[q].addWaitingCaller(wCaller);
            logger.info(IDLOG, 'updated waiting caller ' + wCaller.getName() + ' of queue ' + wCaller.getQueue());
        }

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_QUEUE_CHANGED + ' for queue ' + q);
        astProxy.emit(EVT_QUEUE_CHANGED, queues[q]);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the details for the queue object. The details include the members and
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
        if (typeof resp !== 'object' ||
            resp.queue                  === undefined || resp.members             === undefined ||
            resp.holdtime               === undefined || resp.talktime            === undefined ||
            resp.completedCallsCount    === undefined || resp.abandonedCallsCount === undefined ||
            resp.serviceLevelTimePeriod === undefined) {

            throw new Error('wrong parameter');
        }

        var q = resp.queue; // the queue number

        // check the existence of the queue
        if (!queues[q]) {
            logger.warn(IDLOG, 'try to set details of not existent queue "' + q + '"');
            return;
        }

        // set the queue data
        setQueueData(q, resp);

        // add all static and dynamic members that are logged in
        var m;
        for (m in resp.members) {
            addQueueMemberLoggedIn(resp.members[m], q);
        }

        // adds all static and dynamic members that are logged out. To do so it cycle
        // in all elements of the structure ini file getting the dynamic member list from each queue
        // and checking if each member has already been added to the queue. If it's not present means
        // that it's not logged in, becuase asterisk didn't generate the event for the member
        var structKey, structDynMembers, structQueueId;
        for (structKey in struct) {

            // get the "queue" value of the structure json content. If the content isn't of a queue the value is undefined
            structQueueId = struct[structKey].queue;

            if (struct[structKey].type === INI_STRUCT.TYPE.QUEUE && q === structQueueId) {

                // check if the "dynmembers" key exist in the configuration file
                if (struct[structKey].dynmembers === undefined) {
                    logger.warn(IDLOG, 'no "dynmembers" key for "' + structKey + '" in configuration file');
                    continue;
                }

                // check if there is at least one dynamic member. If not exist, the key "dynmembers" is en empty string
                if (struct[structKey].dynmembers === '') {
                    logger.info(IDLOG, 'queue "' + structQueueId + '" does not have dynamic members');
                    continue;
                }

                structDynMembers = struct[structKey].dynmembers.split(',');

                var i, structDynMemberId;
                var allMembersQueue = queues[q].getAllMembers();

                for (i = 0; i < structDynMembers.length; i++) {

                    structDynMemberId = structDynMembers[i];

                    // all the logged in member as already been added to the queue in the above code using
                    // the asterisk events. So if it's not present means that the member isn't logged in and
                    // adds the member to the queue as logged off
                    if (!allMembersQueue[structDynMemberId]) {
                        addQueueMemberLoggedOut(structDynMemberId, q);
                    }
                }
            }
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
* Add a member to a queue with logged status set to out.
*
* @method addQueueMemberLoggedOut
* @param {string} memberId The queue member identifier
* @param {string} queueId  The queue identifier
* @private
*/
function addQueueMemberLoggedOut(memberId, queueId) {
    try {
        // check parameters
        if (typeof memberId !== 'string' || typeof queueId !== 'string') {
            throw new Error('wrong parameters');
        }

        // check the existence of the queue
        if (!queues[queueId]) {
            logger.warn(IDLOG, 'try to add logged out member "' + memberId + '" to the not existent queue "' + queueId + '"');
            return;
        }

        // create new queue member object
        // false value of the third parameter is used as "paused" parameter because asterisk doesn't
        // provides this information. When the queue member logged in the queue a new "QueueMemberAdded"
        // event is generated from the asterisk and so the member is updated with all the updated values
        var member = new QueueMember(memberId, queueId, false, false);
        member.setType(QUEUE_MEMBER_TYPES_ENUM.DYNAMIC);
        // set the member name
        if (extensions[memberId]) { member.setName(extensions[memberId].getName()); }

        // add the member to the queue
        queues[queueId].addMember(member);
        logger.info(IDLOG, 'added logged off member ' + member.getMember() + ' to the queue ' + queueId);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Add a member to the queue with logged status set to in.
*
* @method addQueueMemberLoggedIn
* @param {object} data
*    @param {string}  data.member            The member identifier
*    @param {boolean} data.paused            The paused status of the member
*    @param {string}  data.name              The name of the member
*    @param {string}  data.type              The type of the member (dynamic, static, realtime)
*    @param {number}  data.callsTakenCount   The number of the taken calls
*    @param {number}  data.lastCallTimestamp The timestamp of the last call received by the member
* @param {string} queueId The queue identifier
* @private
*/
function addQueueMemberLoggedIn(data, queueId) {
    try {
        // check parameters
        if (typeof data                 !== 'object' || typeof queueId                !== 'string'  ||
            typeof data.member          !== 'string' || typeof data.paused            !== 'boolean' ||
            typeof data.name            !== 'string' || typeof data.type              !== 'string'  ||
            typeof data.callsTakenCount !== 'number' || typeof data.lastCallTimestamp !== 'number') {

            throw new Error('wrong parameters');
        }

        if (!queues[queueId]) {
            logger.warn(IDLOG, 'try to add the queue member "' + data.member + '" to a not existent queue "' + queueId + '"');
            return;
        }

        // create new queue member object
        var member = new QueueMember(data.member, queueId, data.paused, true);
        member.setName(data.name);
        member.setType(data.type);
        member.setCallsTakenCount(data.callsTakenCount);
        member.setLastCallTimestamp(data.lastCallTimestamp);

        // add the member to the queue
        queues[queueId].addMember(member);
        logger.info(IDLOG, 'added member ' + member.getMember() + ' to the queue ' + queueId);

        // set the last pause data to the member
        updateQueueMemberLastPauseData(member.getName(), data.member, queueId);

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Sets the "last started pause" and the "last ended pause" data to the member.
*
* @method updateQueueMemberLastPauseData
* @param {string} memberName The queue member name
* @param {string} memberId   The queue member identifier
* @param {string} queueId    The queue identifier
* @private
*/
function updateQueueMemberLastPauseData(memberName, memberId, queueId) {
    try {
        // check parameters
        if (typeof memberName !== 'string' ||
            typeof memberId   !== 'string' || typeof queueId !== 'string') {

            throw new Error('wrong parameters');
        }

        if (!queues[queueId]) {
            logger.warn(IDLOG, 'try to update "last pause" data for the queue member "' + memberId + '" to a not existent queue "' + queueId + '"');
            return;
        }

        async.parallel([

            function (callback) {

                // set the last started pause data of the member
                compDbconn.getQueueMemberLastPausedInData(memberName, queueId, memberId, function (err1, result) {
                    try {
                        if (err1) { throw err1; }

                        // if the queue member has never paused, the timestamp is null
                        if (result.queueId && result.memberId && result.timestamp) {
                            queues[result.queueId].getMember(result.memberId).setLastPausedInData(result.timestamp, result.reason);
                        }
                        callback();

                    } catch (err2) {
                        logger.error(IDLOG, err2.stack);
                        callback(err2);
                    }
                });
            },
            function (callback) {

                // set the last ended pause data of the member
                compDbconn.getQueueMemberLastPausedOutData(memberName, queueId, memberId, function (err3, result3) {
                    try {
                        if (err3) { throw err3; }

                        // if the queue member has never paused, the timestamp is null
                        if (result3.queueId && result3.memberId && result3.timestamp) {
                            queues[result3.queueId].getMember(result3.memberId).setLastPausedOutData(result3.timestamp);
                        }
                        callback();

                    } catch (err4) {
                        logger.error(IDLOG, err4.stack);
                        callback(err4);
                    }
                });
            }

        ], function (err) {

            if (err) { logger.error(IDLOG, err); }
            else {

                logger.info(IDLOG, 'set "last paused in" and "last paused out" data of the member "' + memberId + '" of queue "' + queueId + '"');

                // emit the event
                logger.info(IDLOG, 'emit event ' + EVT_QUEUE_MEMBER_CHANGED + ' for member ' + memberId + ' of queue ' + queueId);
                astProxy.emit(EVT_QUEUE_MEMBER_CHANGED, queues[queueId].getMember(memberId));
            }
        });
    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Return the JSON representation of extended queue statistics.
*
* @method getJSONQueuesStats
* @param  {string}   day      The day expressed in YYYYMMDD format
* @param  {function} callback The callback function
* @return {object}   The JSON representation of extended queue statistics.
*/
function getJSONQueuesStats(day, callback) {
    try {
        // check parameters
        if (typeof day !== 'string' || typeof callback !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconn.getQueuesStats(day, function (err1, result) {
            callback(err1, result);
        });

    } catch (error) {
        logger.error(IDLOG, error.stack);
        callback(error);
    }
}

/**
* Return the JSON representation of queues QOS.
*
* @method getJSONQueuesQOS
* @param  {string}   day      The day expressed in YYYYMMDD format
* @param  {function} callback The callback function
* @return {object}   The JSON representation of queues QOS.
*/
function getJSONQueuesQOS(day, callback) {
    try {
        // check parameters
        if (typeof day !== 'string' || typeof callback !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconn.getQueuesQOS(day, function (err1, result) {
            callback(err1, result);
        });

    } catch (error) {
        logger.error(IDLOG, error.stack);
        callback(error);
    }
}

/**
* Return the JSON representation of agent stats.
*
* @method getJSONAgentsStats
* @param  {string}   day      The day expressed in YYYYMMDD format
* @param  {function} callback The callback function
* @return {object}   The JSON representation of agent stats.
*/
function getJSONAgentsStats(day, callback) {
    try {
        // check parameters
        if (typeof day !== 'string' || typeof callback !== 'function') {
            throw new Error('wrong parameters');
        }

        compDbconn.getAgentsStats(day, function (err1, result) {
            callback(err1, result);
        });

    } catch (error) {
        logger.error(IDLOG, error.stack);
        callback(error);
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
* Returns the JSON representation of all the extensions. If some error occurs it returns an empty object.
*
* @method getJSONExtensions
* @param  {string} [privacyStrOutQueue] If it is specified, it obfuscates the number of all calls that does not pass through a queue
* @param  {string} [privacyStrInQueue]  If it is specified, it obfuscates the number of all calls that pass through a queue
* @return {object} The JSON representation of the all extensions.
*/
function getJSONExtensions(privacyStrOutQueue, privacyStrInQueue) {
    try {
        var eliteral = {};
        var ext;
        for (ext in extensions) { eliteral[ext] = extensions[ext].toJSON(privacyStrOutQueue, privacyStrInQueue); }
        return eliteral;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Returns the JSON representation of the extension. If some error
* occurs it returns an empty object.
*
* @method getJSONExtension
* @param  {string} exten                The extension identifier
* @param  {string} [privacyStrOutQueue] If it is specified, it obfuscates the number of all calls that does not pass through a queue
* @param  {string} [privacyStrInQueue]  If it is specified, it obfuscates the number of all calls that pass through a queue
* @return {object} The JSON representation of the extension.
*/
function getJSONExtension(exten, privacyStrOutQueue, privacyStrInQueue) {
    try {
        // check the parameter
        if (typeof exten !== 'string') { throw new Error('wrong parameter'); }

        return extensions[exten].toJSON(privacyStrOutQueue, privacyStrInQueue);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Returns the IP address of the extension.
*
* @method getExtensionIp
* @param  {string} exten The extension identifier
* @return {string} The IP address of the extension.
*/
function getExtensionIp(exten) {
    try {
        // check the parameter
        if (typeof exten !== 'string') { throw new Error('wrong parameter'); }

        return extensions[exten].getIp();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Returns the extension user agent.
*
* @method getExtensionAgent
* @param  {string} exten The extension identifier
* @return {string} The extension user agent.
*/
function getExtensionAgent(exten) {
    try {
        // check the parameter
        if (typeof exten !== 'string') { throw new Error('wrong parameter'); }

        return extensions[exten].getUserAgent();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
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

            if (struct[k].type === INI_STRUCT.TYPE.EXTEN &&
                struct[k].tech === INI_STRUCT.TECH.SIP) { // all sip extensions

                exten = new Extension(struct[k].extension, struct[k].tech);
                extensions[exten.getExten()] = exten;

                // set extension websocket transport usage
                if (struct[k].transport.indexOf('ws') > -1) {
                    exten.setUseWebsocket(true);
                } else {
                    exten.setUseWebsocket(false);
                }

                // request sip details for current extension
                astProxy.doCmd({ command: 'sipDetails', exten: exten.getExten() }, extSipDetails);
                // request the extension status
                astProxy.doCmd({ command: 'extenStatus', exten: exten.getExten() }, extenStatus);
                // get the dnd status
                astProxy.doCmd({ command: 'dndGet', exten: exten.getExten() }, setDndStatus);
                // get the call forward status
                astProxy.doCmd({ command: 'cfGet', exten: exten.getExten() }, setCfStatus);
                // get the call forward to voicemail status
                astProxy.doCmd({ command: 'cfVmGet', exten: exten.getExten() }, setCfVmStatus);
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

            if (struct[k].type === INI_STRUCT.TYPE.TRUNK &&
                struct[k].tech === INI_STRUCT.TECH.SIP) { // all sip trunks

                trunk = new Trunk(struct[k].extension, struct[k].tech, struct[k].max_channels);
                trunks[trunk.getExten()] = trunk;

                // request sip details for current trunk
                astProxy.doCmd({ command: 'sipDetails', exten: trunk.getExten() }, trunkSipDetails);

                // request the trunk status
                astProxy.doCmd({ command: 'sipTrunkStatus', trunk: trunk.getExten() }, sipTrunkStatus);
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
* Initialize all iax trunks as _Trunk_ object into the _trunks_ property.
*
* @method initializeIaxTrunk
* @param {object} resp The response of the _listIaxPeers_ command plugin.
* @private
*/
function initializeIaxTrunk(resp) {
    try {
        var k, trunk;
        for (k in struct) {

            if (struct[k].type === INI_STRUCT.TYPE.TRUNK &&
                struct[k].tech === INI_STRUCT.TECH.IAX) { // all iax trunks

                trunk = new Trunk(struct[k].extension, struct[k].tech, struct[k].max_channels);
                trunks[trunk.getExten()] = trunk;
                trunks[trunk.getExten()].setName(struct[k].label);
            }
        }

        // set iax informations
        for (i = 0; i < resp.length; i++) {

            // this check is because some iax extensions can be present in the resp,
            // so in this function extensions are not considered
            if (trunks[resp[i].exten]) {

                trunks[resp[i].exten].setIp(resp[i].ip);
                trunks[resp[i].exten].setPort(resp[i].port);
                trunks[resp[i].exten].setStatus(resp[i].status);
                logger.info(IDLOG, 'set iax details for trunk ' + resp[i].exten);
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
        if (typeof resp       !== 'object' ||
            typeof resp.exten !== 'string' || typeof resp.status !== 'string') {

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
* Sets the call forward to voicemail status of the extension.
*
* @method setCfVmStatus
* @param {object} err  The error object of the _cfVmGet_ command plugin.
* @param {object} resp The response object of the _cfVmGet_ command plugin.
* @private
*/
function setCfVmStatus(err, resp) {
    try {
        // check the error
        if (err) { throw err; }

        // check parameter
        if (typeof resp       !== 'object' ||
            typeof resp.exten !== 'string' || typeof resp.status !== 'string') {

            throw new Error('wrong parameter');
        }

        if (extensions[resp.exten]) { // the extension exists

            if (resp.status === 'on') {
                extensions[resp.exten].setCfVm(resp.to);
                logger.info(IDLOG, 'set extension ' + resp.exten + ' cfvm enable to ' + resp.to);

            } else {
                extensions[resp.exten].disableCfVm();
                logger.info(IDLOG, 'set extension ' + resp.exten + ' cfvm disabled');
            }

        } else {
            logger.warn(IDLOG, 'request cfvm for not existing extension ' + resp.exten);
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
        logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for iax extension ' + resp.exten);
        astProxy.emit(EVT_EXTEN_CHANGED, extensions[resp.exten]);

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
        logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for sip extension ' + resp.exten.exten);
        astProxy.emit(EVT_EXTEN_CHANGED, extensions[resp.exten.exten]);

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

            ext = resp[chid].channelExten;

            // add new conversation to the extension. Queue channel is not considered,
            // otherwise an extension has also wrong conversation (e.g. 214 has the
            // conversation SIP/221-00000592>Local/221@from-queue-000009dc;2)
            if (chid.indexOf('Local') === -1 &&
                chid.indexOf('@from') === -1 &&
                extensions[ext]) { // the extension exists

                addConversationToExten(ext, resp, chid);

                // emit the event
                logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + ext);
                astProxy.emit(EVT_EXTEN_CHANGED, extensions[ext]);
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

            trunk = resp[chid].channelExten;

            // add new conversation to the trunk. Queue channel is not considered,
            // otherwise a trunk has also wrong conversation (e.g. 3001 has the
            // conversation SIP/3001-00000592>Local/221@from-queue-000009dc;1)
            if (chid.indexOf('Local') === -1 &&
                chid.indexOf('@from') === -1 &&
                trunks[trunk]) { // the trunk exists

                addConversationToTrunk(trunk, resp, chid);
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
                ext = resp[chid].channelExten;

                // add new conversation to the extension. Queue channel is not considered,
                // otherwise an extension has also wrong conversation (e.g. 214 has the
                // conversation SIP/221-00000592>Local/221@from-queue-000009dc;2)
                if (chid.indexOf('Local') === -1 &&
                    chid.indexOf('@from') === -1 &&
                    ext === exten) { // the current extension is of interest

                    addConversationToExten(ext, resp, chid);
                }
            }

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);

        } else {
            logger.warn(IDLOG, 'try to update channel list of the non existent extension ' + exten);
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
    }
}

/**
* Update the conversations of the extension.
*
* @method updateTrunkConversations
* @param {object} err   The error object received by the _listChannels_ command plugin
* @param {object} resp  The object received by the _listChannels_ command plugin
* @param {string} trunk The trunk number
* @private
*/
function updateTrunkConversations(err, resp, trunk) {
    try {
        if (err) {
            logger.error(IDLOG, 'updating conversations of trunk ' + trunk + ': ' + err.toString());
            return;
        }

        // check parameters
        if (typeof trunk !== 'string' || !resp) { throw new Error('wrong parameters'); }

        // check if the extension exists, otherwise there is some error
        if (trunks[trunk]) {

            // reset all conversations of the trunk
            trunks[trunk].removeAllConversations();
            logger.info(IDLOG, 'reset all conversations of the trunk ' + trunk);

            // cycle in all received channels
            var trunkid, chid;
            for (chid in resp) {

                // current trunk of the channel
                trunkid = resp[chid].channelExten;

                // add new conversation to the trunk. Queue channel is not considered,
                // otherwise a trunk has also wrong conversation (e.g. 3001 has the
                // conversation SIP/3001-00000592>Local/221@from-queue-000009dc;2)
                if (chid.indexOf('Local') === -1 &&
                    chid.indexOf('@from') === -1 &&
                    trunkid === trunk) { // the current trunk is of interest

                    addConversationToTrunk(trunkid, resp, chid);
                }
            }

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_TRUNK_CHANGED + ' for trunk ' + trunk);
            astProxy.emit(EVT_TRUNK_CHANGED, trunks[trunk]);

        } else {
            logger.warn(IDLOG, 'try to update channel list of the non existent trunk ' + trunk);
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
        if (typeof exten !== 'string' ||
            typeof resp  !== 'object' ||
            typeof chid  !== 'string') {

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

            var queue;
            if (resp[chid].bridgedChannel.slice(-2)              === ';2' &&
                resp[chid].bridgedChannel.indexOf('Local/')      !== -1   &&
                resp[chid].bridgedChannel.indexOf('@from-queue') !== -1) {

                var tempChid = resp[chid].bridgedChannel.substring(0, resp[chid].bridgedChannel.length - 2) + ';1';
                queue        = resp[tempChid].queue;
            }

            // create a new conversation
            var conv = new Conversation(exten, chSource, chDest, queue);
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
            logger.warn(IDLOG, 'try to add new conversation to a non existent extension ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Add new conversation to the trunk.
*
* @method addConversationToTrunk
* @param {string} trunk The trunk number
* @param {object} resp  The channel list object received by the _listChannels_ command plugin
* @param {string} chid  The channel identifier
* @private
*/
function addConversationToTrunk(trunk, resp, chid) {
    try {
        // check parameters
        if (typeof trunk !== 'string' ||
            typeof resp  !== 'object' ||
            typeof chid  !== 'string') {

            throw new Error('wrong parameters');
        }

        if (trunks[trunk]) {

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
            var conv = new TrunkConversation(trunk, chSource, chDest);
            var convid = conv.getId();

            // check if the name of the internal extension involved in the conversation is empty.
            // In that case get the name and set it
            if (conv.getInternalName() === "") {

                var internalNum = conv.getInternalNum();

                if (extensions[internalNum]) {
                    var name = extensions[internalNum].getName();
                    conv.setInternalName(name);
                }
            }

            // if the conversation is recording, sets its recording status
            if (recordingConv[convid] !== undefined) {
                conv.setRecording(true);
                logger.info(IDLOG, 'set recording status to conversation ' + convid);
            }

            // add the created conversation to the trunk
            trunks[trunk].addConversation(conv);
            logger.info(IDLOG, 'the conversation ' + convid + ' has been added to trunk ' + trunk);

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_TRUNK_CHANGED + ' for trunk ' + trunk);
            astProxy.emit(EVT_TRUNK_CHANGED, trunks[trunk]);

        } else {
            logger.warn(IDLOG, 'try to add new conversation to a non existent trunk ' + trunk);
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
* Sets the sip trunk status received.
*
* @method sipTrunkStatus
* @param {object} err  The received error object
* @param {object} resp The received response object
* @private
*/
function sipTrunkStatus(err, resp) {
    try {
        if (err) {
            logger.error(IDLOG, 'setting trunk status: ' + err.toString());
            return;
        }

        trunks[resp.trunk].setStatus(resp.status);
        logger.info(IDLOG, 'sets status ' + resp.status + ' for trunk ' + resp.trunk);

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
        if (typeof exten !== 'string' || typeof status !== 'string') {
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
* Updates the queue member paused status and it start time.
*
* @method evtQueueMemberPausedChanged
* @param {string}  queueId  The queue identifier
* @param {string}  memberId The queue member identifier
* @param {boolean} paused   True if the extension has been paused from the queue
* @param {string}  reason   True reason description of the pause
* @private
*/
function evtQueueMemberPausedChanged(queueId, memberId, paused, reason) {
    try {
        // check parameters
        if (typeof queueId  !== 'string' || typeof reason !== 'string' ||
            typeof memberId !== 'string' || typeof paused !== 'boolean') {

            throw new Error('wrong parameters');
        }

        if (!queues[queueId]) {
            logger.warn(IDLOG, 'received event queue member paused changed for not existent queue "' + queueId + '"');
            return;
        }

        // get the queue member object and set its "paused" status
        var member = queues[queueId].getMember(memberId);

        if (member) {

            member.setPaused(paused, reason);
            logger.info(IDLOG, 'paused status of queue member "' + memberId + '" of queue "' + queueId + '" has been changed to "' + paused + '"');

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_QUEUE_MEMBER_CHANGED + ' for queue member ' + memberId + ' of queue ' + queueId);
            astProxy.emit(EVT_QUEUE_MEMBER_CHANGED, member);

        } else {
            logger.warn(IDLOG, 'received event queue member paused changed for non existent member "' + memberId + '"');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* An event about queue member status has been received from the asterisk.
* It updates the data about the queue member.
*
* @method evtQueueMemberStatus
* @param {object} data
*   @param {string}  data.type              The membership type (static or dynamic)
*   @param {string}  data.name              The name of the member
*   @param {string}  data.queueId           The queue identifier
*   @param {string}  data.member            The queue member identifier
*   @param {boolean} data.paused            True if the extension has been paused from the queue
*   @param {number}  data.lastCallTimestamp The timestamp of the last call received by the member
*   @param {number}  data.callsTakenCount   The number of the taken calls
* @private
*/
function evtQueueMemberStatus(data) {
    try {
        // check parameters
        if (typeof data         !== 'object'  || typeof data.type              !== 'string' ||
            typeof data.queueId !== 'string'  || typeof data.lastCallTimestamp !== 'number' ||
            typeof data.member  !== 'string'  || typeof data.callsTakenCount   !== 'number' ||
            typeof data.paused  !== 'boolean' || typeof data.name              !== 'string') {

            throw new Error('wrong parameters');
        }

        if (!queues[data.queueId]) {
            logger.warn(IDLOG, 'received event queue member status (' + data.member + ') for not existent queue "' + queueId + '"');
            return;
        }

        // the update of the data is done by two steps:
        // 1. removing the current member
        // 2. creating a new one
        // The alternative could be to update the data of the already present member, or to create a new one
        // if it is not present. But this is more error prone, especially for the future development if some
        // data is added: the developer should modify more code
        queues[data.queueId].removeMember(data.member);
        // add the new member to the queue
        addQueueMemberLoggedIn(data, data.queueId);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* An event about queue member added has been received from the asterisk.
*
* @method evtQueueMemberAdded
* @param {object} data
*   @param {string}  data.type              The membership type (static or dynamic)
*   @param {string}  data.name              The name of the member
*   @param {string}  data.queueId           The queue identifier
*   @param {string}  data.member            The queue member identifier
*   @param {boolean} data.paused            True if the extension has been paused from the queue
*   @param {number}  data.lastCallTimestamp The timestamp of the last call received by the member
*   @param {number}  data.callsTakenCount   The number of the taken calls
* @private
*/
function evtQueueMemberAdded(data) {
    try {
        // check parameters
        if (typeof data         !== 'object'  || typeof data.type              !== 'string' ||
            typeof data.queueId !== 'string'  || typeof data.lastCallTimestamp !== 'number' ||
            typeof data.member  !== 'string'  || typeof data.callsTakenCount   !== 'number' ||
            typeof data.paused  !== 'boolean' || typeof data.name              !== 'string') {

            throw new Error('wrong parameters');
        }

        if (!queues[data.queueId]) {
            logger.warn(IDLOG, 'received event queue member added for not existent queue "' + queueId + '"');
            return;
        }

        // add the new member to the queue
        addQueueMemberLoggedIn(data, data.queueId);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* An event about channel renaming has been received from the asterisk. It updates
* the waiting callers of all queues.
*
* @method evtRename
* @private
*/
function evtRename() {
    try {
        // request details for the current queue to update the waiting callers. This is done
        // because during a transfer ("Rename" event) the names changing
        var q;
        for (q in queues) { astProxy.doCmd({ command: 'queueDetails', queue: q }, updateQueueWaitingCallers); }

        // request all channels to update the conversations of all extensions
        logger.info(IDLOG, 'requests the channel list to update the conversations of all extensions');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllExten);

        // request all channels to update the conversations of all trunks
        logger.info(IDLOG, 'requests the channel list to update the conversations of all trunks');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllTrunk);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* An event about queue member removed has been received from the asterisk.
* So updates the queue member status.
*
* @method evtQueueMemberRemoved
* @param {object} data
*   @param {string} data.queueId The queue identifier
*   @param {string} data.member  The queue member identifier
* @private
*/
function evtQueueMemberRemoved(data) {
    try {
        // check parameters
        if (typeof data         !== 'object' ||
            typeof data.queueId !== 'string' || typeof data.member !== 'string') {

            throw new Error('wrong parameters');
        }

        if (!queues[data.queueId]) {
            logger.warn(IDLOG, 'received event queue member removed for not existent queue "' + queueId + '"');
            return;
        }

        // update the logged in status of the member
        var member = queues[data.queueId].getMember(data.member);

        if (!member) {
            logger.warn(IDLOG, 'try to set logged in status to "false" of not existent member "' + data.member + '" of queue "' + data.queueId + '"');
            return;
        }

        member.setLoggedIn(false);
        logger.info(IDLOG, 'set the member "' + data.member + '" of queue "' + data.queueId + '" to logged off');

        member.setPaused(false);
        logger.info(IDLOG, 'set the member "' + data.member + '" of queue "' + data.queueId + '" to paused false');

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_QUEUE_MEMBER_CHANGED + ' for queue member ' + data.member + ' of queue ' + data.queueId);
        astProxy.emit(EVT_QUEUE_MEMBER_CHANGED, member);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* A new external call is received. So it retrieves the data about the caller.
* It gets the created caller notes for the specified number and the central and
* cti phonebook contacts. Then add the data into the _callerIdentityData_ property
* to use it when _Dialing_ events are received. This method is called by the
* _plugins\_event\_11/userevent.js_.
*
* @method evtNewExternalCall
* @param {string} number The caller number
*/
function evtNewExternalCall(number) {
    try {
        // check parameter
        if (typeof number !== 'string') { throw new Error('wrong parameter'); }

        logger.info(IDLOG, 'new external call from number ' + number + ': get data about the caller');

        // initialize the caller data object. Due to asy
        if (callerIdentityData[number] === undefined) { callerIdentityData[number] = {}; }

        // get the caller notes data
        compCallerNote.getAllValidCallerNotesByNum(number, function (err, results) {
            try {
                if (err) {
                    logger.warn(IDLOG, 'retrieving caller notes data for new external call from number ' + number);

                } else {
                    logger.info(IDLOG, 'add caller notes data for new external call from number ' + number);
                    callerIdentityData[number].callerNotes = results;
                }
            } catch (err) {
                logger.error(IDLOG, err.stack);
            }
        });

        // get the phonebook contacts
        compPhonebook.getPbContactsByNum(number, function (err, results) {
            try {
                if (err) {
                    logger.warn(IDLOG, 'retrieving phonebook contacts data for new external call from number ' + number);

                } else {
                    logger.info(IDLOG, 'add phonebook contacts data for new external call from number ' + number);
                    callerIdentityData[number].pbContacts = results;
                }
            } catch (err) {
                logger.error(IDLOG, err.stack);
            }
        });

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

            extensions[exten].setDnd(enabled);
            logger.info(IDLOG, 'set dnd status to ' + enabled + ' for extension ' + exten);

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);

        } else {
            logger.warn(IDLOG, 'try to set dnd status of non existent extension ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the extension unconditional call forward status.
*
* @method evtExtenUnconditionalCfChanged
* @param {string}  exten   The extension number
* @param {boolean} enabled True if the call forward is enabled
* @param {string}  [to]    The destination number of the call forward
* @private
*/
function evtExtenUnconditionalCfChanged(exten, enabled, to) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof enabled !== 'boolean') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            if (enabled) {
                logger.info(IDLOG, 'set cf status to ' + enabled + ' for extension ' + exten + ' to ' + to);
                extensions[exten].setCf(to);

                // disable the call forward to voicemail because the call forward set the same property in the database
                evtExtenUnconditionalCfVmChanged(exten, false);

            } else {
                logger.info(IDLOG, 'set cf status to ' + enabled + ' for extension ' + exten);
                extensions[exten].disableCf();
            }

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);

        } else {
            logger.warn(IDLOG, 'try to set call forward status of non existent extension ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Updates the extension unconditional call forward to voicemail status.
*
* @method evtExtenUnconditionalCfVmChanged
* @param {string}  exten   The extension number
* @param {boolean} enabled True if the call forward to voicemail is enabled
* @param {string}  [vm]    The destination voicemail number of the call forward
* @private
*/
function evtExtenUnconditionalCfVmChanged(exten, enabled, vm) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof enabled !== 'boolean') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            if (enabled) {
                logger.info(IDLOG, 'set cfvm status to ' + enabled + ' for extension ' + exten + ' to voicemail ' + vm);
                extensions[exten].setCfVm(vm);

                // disable the call forward because the call forward to voicemail set the same property in the database
                evtExtenUnconditionalCfChanged(exten, false);

            } else {
                logger.info(IDLOG, 'set cfvm status to ' + enabled + ' for extension ' + exten);
                extensions[exten].disableCfVm();
            }

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
            astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);

        } else {
            logger.warn(IDLOG, 'try to set call forward to voicemail status of non existent extension ' + exten);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Enable/disable the do not disturb status of the endpoint.
* The used plugin command _dndSet_ does not generate any
* asterisk events, so simulates it.
*
* @method setDnd
* @param {string}   exten    The extension number
* @param {boolean}  activate True if the dnd must be enabled
* @param {function} cb       The callback function
*/
function setDnd(exten, activate, cb) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof activate !== 'boolean') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            // this command doesn't generate any asterisk event, so if it's successful, it simulate the event
            astProxy.doCmd({ command: 'dndSet', exten: exten, activate: activate }, function (err) {

                cb(err);
                if (err === null) { evtExtenDndChanged(exten, activate); }
            });

        } else {
            var str = 'try to set dnd status of non existent extension ' + exten;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Enable/disable the unconditional call forward status of the endpoint. The used plugin command _cfSet_
* doesn't generate any asterisk events, so simulates it.
*
* @method setUnconditionalCf
* @param {string}   exten    The extension number
* @param {boolean}  activate True if the call forward must be enabled
* @param {string}   [to]     The destination number of the call forward to be set
* @param {function} cb       The callback function
*/
function setUnconditionalCf(exten, activate, to, cb) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof activate !== 'boolean') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            // this command doesn't generate any asterisk event, so if it's successful, it simulate the event
            astProxy.doCmd({ command: 'cfSet', exten: exten, activate: activate, val: to }, function (err, resp) {

                cb(err, resp);
                if (err === null) { evtExtenUnconditionalCfChanged(exten, activate, to); }
            });

        } else {
            var str = 'try to set unconditional call forward status of non existent extension ' + exten;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Enable/disable the call forward to voicemail status of the endpoint. The used plugin command _cfVmSet_
* doesn't generate any asterisk events, so simulates it.
*
* @method setUnconditionalCfVm
* @param {string}   exten    The extension number
* @param {boolean}  activate True if the call forward to voicemail must be enabled
* @param {string}   [to]     The destination voicemail identifier of the call forward to be set
* @param {function} cb       The callback function
*/
function setUnconditionalCfVm(exten, activate, to, cb) {
    try {
        // check parameters
        if (typeof exten !== 'string' && typeof activate !== 'boolean') {
            throw new Error('wrong parameters');
        }

        if (extensions[exten]) { // the exten is an extension

            // this command doesn't generate any asterisk event, so if it's successful, it simulate the event
            astProxy.doCmd({ command: 'cfVmSet', exten: exten, activate: activate, val: to }, function (err, resp) {

                cb(err, resp);
                if (err === null) { evtExtenUnconditionalCfVmChanged(exten, activate, to); }
            });

        } else {
            var str = 'try to set call forward to voicemail of non existent extension ' + exten;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
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
        if (typeof data           !== 'object' &&
            typeof data.voicemail !== 'string' && typeof data.context  !== 'string' &&
            typeof data.countOld  !== 'string' && typeof data.countNew !== 'string') {

            throw new Error('wrong parameter');
        }

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_NEW_VOICE_MESSAGE + ' in voicemail ' + data.voicemail + ' with context ' + data.context);
        astProxy.emit(EVT_NEW_VOICE_MESSAGE, data);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* New call detail records (cdr) has been logged into the call history. So it emits the _EVT\_NEW\_CDR_ event.
*
* @method evtNewCdr
* @param {object} data
*  @param {string} data.source             The calling party’s caller ID number
*  @param {string} data.channel            The calling party’s channel
*  @param {string} data.endtime            The end time of the call
*  @param {string} data.duration           The number of seconds between the start and end times for the call
*  @param {string} data.amaflags           The Automatic Message Accounting (AMA) flag associated with this call. This may be one of the following: OMIT, BILLING, DOCUMENTATION, or Unknown
*  @param {string} data.uniqueid           The unique ID for the src channel
*  @param {string} data.callerid           The full caller ID, including the name, of the calling party
*  @param {string} data.starttime          The start time of the call
*  @param {string} data.answertime         The answered time of the call
*  @param {string} data.destination        The destination extension for the call
*  @param {string} data.disposition        An indication of what happened to the call. This may be NO ANSWER, FAILED, BUSY, ANSWERED, or UNKNOWN
*  @param {string} data.lastapplication    The last dialplan application that was executed
*  @param {string} data.billableseconds    The number of seconds between the answer and end times for the call
*  @param {string} data.destinationcontext The destination context for the call
*  @param {string} data.destinationchannel The called party’s channel
* @private
*/
function evtNewCdr(data) {
    try {
        // check parameter
        if (typeof data                    !== 'object' &&
            typeof data.source             !== 'string' && typeof data.channel            !== 'string' &&
            typeof data.endtime            !== 'string' && typeof data.duration           !== 'string' &&
            typeof data.amaflags           !== 'string' && typeof data.uniqueid           !== 'string' &&
            typeof data.callerid           !== 'string' && typeof data.starttime          !== 'string' &&
            typeof data.answertime         !== 'string' && typeof data.destination        !== 'string' &&
            typeof data.disposition        !== 'string' && typeof data.lastapplication    !== 'string' &&
            typeof data.billableseconds    !== 'string' && typeof data.destinationcontext !== 'string' &&
            typeof data.destinationchannel !== 'string') {

            throw new Error('wrong parameter');
        }

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_NEW_CDR + ' with uniqueid "' + data.uniqueid + '"');
        astProxy.emit(EVT_NEW_CDR, data);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Something has appens in the voice messages of the voicemail, for example the listen
* of a new voice message from the phone. So it emits the _EVT\_UPDATE\_VOICE\_MESSAGES_ event.
*
* @method evtUpdateVoicemailMessages
* @param {object} data
*  @param {string} data.context   The context of the voicemail extension
*  @param {string} data.voicemail The voicemail identifier who received the voice message
* @private
*/
function evtUpdateVoicemailMessages(data) {
    try {
        // check parameter
        if (typeof data           !== 'object' &&
            typeof data.voicemail !== 'string' && typeof data.context !== 'string') {

            throw new Error('wrong parameter');
        }

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_UPDATE_VOICE_MESSAGES + ' of voicemail ' + data.voicemail + ' with context ' + data.context);
        astProxy.emit(EVT_UPDATE_VOICE_MESSAGES, data);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* A queue waiting caller has left the queue. So update all queue waiting callers.
*
* @method evtRemoveQueueWaitingCaller
* @param {object} data The response object received from the event plugin _leave_.
*/
function evtRemoveQueueWaitingCaller(data) {
    try {
        // check parameter
        if (typeof data !== 'object' || typeof data.queue !== 'string') {
            throw new Error('wrong parameter');
        }

        logger.info(IDLOG, 'queue waiting caller ' + data.channel + ' has left the queue ' + data.queue);

        // request details for the current queue to update the waiting callers.
        // This is done to remove the current one and update the position of the remaining waiting callers
        astProxy.doCmd({ command: 'queueDetails', queue: data.queue }, updateQueueWaitingCallers);

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

        // request all channels
        logger.info(IDLOG, 'update conversations of all trunks');
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllTrunk);

        // emit the event
        logger.info(IDLOG, 'emit event ' + EVT_QUEUE_CHANGED + ' for queue ' + q);
        astProxy.emit(EVT_QUEUE_CHANGED, queues[q]);

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
* If the involved numbers are extensions, it updates their conversations. If the called
* is an extension it emits a dialing event to him with caller identity.
*
* @method evtConversationDialing
* @param {object} data The data received from the _dial_ event plugin
*/
function evtConversationDialing(data) {
    try {
        // check parameter
        if (typeof data               !== 'object' &&
            typeof data.chDest        !== 'string' &&
            typeof data.chSource      !== 'string' &&
            typeof data.callerNum     !== 'string' &&
            typeof data.chDestExten   !== 'string' &&
            typeof data.chSourceExten !== 'string') {

            throw new Error('wrong parameter');
        }

        // if the destination is an extension, it emits the dialing event with caller
        // identity data. If the call is an external call, an _UserEvent_ has occured
        // and the identity data could be present in the _callerIdentityData_ object if
        // the query was successful before this event. If the data isn't present or the
        // call isn't an external call, the used identity data are those present in the
        // event itself

        // check if the destination is an extension
        if (extensions[data.chDestExten]) {

            var obj;
            var callerNum    = data.callerNum;
            var dialingExten = data.chDestExten;

            if (callerIdentityData[callerNum]) {
                obj = callerIdentityData[callerNum];

            } else {
                obj = {};
            }

            // add data about the caller and the called
            obj.numCalled  = data.chDestExten;
            obj.callerNum  = data.callerNum;
            obj.callerName = data.callerName;

            // emit the event
            logger.info(IDLOG, 'emit event ' + EVT_EXTEN_DIALING + ' for extension ' + dialingExten + ' with caller identity');
            astProxy.emit(EVT_EXTEN_DIALING, { dialingExten: dialingExten, callerIdentity: obj });
        }

        // when dialing each channel received from listChannels command
        // plugin hasn't the information about the bridgedChannel. So add
        // it in the following manner
        astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
            try {
                if (resp[data.chDest])   { resp[data.chDest].bridgedChannel   = data.chSource; }
                if (resp[data.chSource]) { resp[data.chSource].bridgedChannel = data.chDest;   }

                // update the conversations of the extensions
                if (extensions[data.chSourceExten]) { updateExtenConversations(err, resp, data.chSourceExten); }
                if (extensions[data.chDestExten])   { updateExtenConversations(err, resp, data.chDestExten);   }

                // update conversations of all trunks
                logger.info(IDLOG, 'update conversations of all trunks');
                updateConversationsForAllTrunk(err, resp);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
            }
        });

    } catch (error) {
        logger.error(IDLOG, error.stack);
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

        // check if num1 is a trunk
        if (trunks[num1]) {

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the trunk ' + num1);
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
                // update the conversations of the trunk
                updateTrunkConversations(err, resp, num1);
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

        // check if num2 is a trunk
        if (trunks[num2]) {

            // request all channels
            logger.info(IDLOG, 'requests the channel list to update the trunk ' + num2);
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {
                // update the conversations of the trunk
                updateTrunkConversations(err, resp, num2);
            });
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the name of the audio file to record the conversation of the specified extension.
*
* @method getRecordFilename
* @param  {string} exten  The extension number
* @param  {string} convid The conversation identifier
* @param  {object} now    A date object
* @return {string} The name of the audio file or undefined value if it is not present.
* @private
*/
function getRecordFilename(exten, convid, now) {
    try {
        // check the extension existence
        if (!extensions[exten]) { return; }

        // get the conversation
        var conv = extensions[exten].getConversation(convid);

        if (!conv) { return; }

        var YYYYMMDD = moment(now).format('YYYYMMDD');
        var HHmmss   = moment(now).format('HHmmss');
        var msec     = now.getMilliseconds();

        if (conv.isIncoming()) {
            return 'exten-' + exten + '-' + conv.getCounterpartNum() + '-' + YYYYMMDD + '-' + HHmmss + '-' + msec + '.wav';
        } else {
            return 'exten-' + conv.getCounterpartNum() + '-' + exten + '-' + YYYYMMDD + '-' + HHmmss + '-' + msec + '.wav';
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the path of the audio file to record the conversation of the specified extension.
*
* @method getRecordFilepath
* @param  {string} exten  The extension number
* @param  {string} convid The conversation identifier
* @param  {object} now    A date object
* @return {string} The path of the audio file or undefined value if it is not present.
* @private
*/
function getRecordFilepath(exten, convid, now) {
    try {
        // check the extension existence
        if (!extensions[exten]) { return; }

        // get the conversation
        var conv = extensions[exten].getConversation(convid);
        if (!conv) { return; }

        var filename = getRecordFilename(exten, convid, now);
        var YYYYMMDD = moment(now).format('YYYY' + path.sep + 'MM' + path.sep + 'DD');
        return YYYYMMDD + path.sep + filename;

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

        // get the channel of the extension "exten"
        if (chSource && chSource.isExtension(exten) === true) {
            return chSource.getChannel();
        }

        if (chDest && chDest.isExtension(exten) === true) {
            return chDest.getChannel();
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adds a prefix to the number only if it is not already present and if
* it is not an extension.
*
* @method addPrefix
* @param  {string} num The number to call
* @return {string} The number to call
*/
function addPrefix(num) {
    try {
        // check parameter
        if (typeof num !== 'string') { throw new Error('wrong parameter'); }

        // replace plus sign used in prefix with the '00' sequence
        if (num.substring(0, 1) === '+') { num = num.replace('+', '00'); }

        // check if the prefix is to be added. It is added only for outgoing calls and not
        // between extensions. So checks if the destination is an extension and add the prefix
        // only in negative case and if it does not already contain it
        if (!extensions[num] &&             // the destination is not an extension
            num.substring(0, 2) !== '00') { // it does not contain the prefix

            num = prefix + num;
        }
        return num;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return num;
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
        if (typeof cb           !== 'function' ||
            typeof to           !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        if (endpointType === 'extension' && !extensions[endpointId]) {
            var err = 'making new call from non existent extension ' + endpointId;
            logger.warn(IDLOG, err);
            cb(err);
            return;
        }

        to = addPrefix(to);

        logger.info(IDLOG, 'execute call from ' + endpointId + ' to ' + to);
        astProxy.doCmd({ command: 'call', from: endpointId, to: to }, function (error) {
            cb(error);
            callCb(error);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Mute a call.
*
* @method muteConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier to be muted
* @param {function} cb           The callback function
*/
function muteConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof convid       !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to mute
            var ch = getExtenIdChannelConversation(endpointId, convid);

            logger.info(IDLOG, 'execute mute of convid "' + convid + '" by "' + endpointType + '" "' + endpointId + '"');
            astProxy.doCmd({ command: 'mute', channel: ch }, function (error) {
                cb(error);
                muteCb(error);
            });

        } else {
            var err = 'muting conversation "' + convid + '" by a non existent extension ' + endpointId;
            logger.warn(IDLOG, err);
            cb(err);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Unmute a call.
*
* @method unmuteConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier to be unmuted
* @param {function} cb           The callback function
*/
function unmuteConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof convid       !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to mute
            var ch = getExtenIdChannelConversation(endpointId, convid);

            logger.info(IDLOG, 'execute unmute of convid "' + convid + '" by "' + endpointType + '" "' + endpointId + '"');
            astProxy.doCmd({ command: 'unmute', channel: ch }, function (error) {
                cb(error);
                muteCb(error);
            });

        } else {
            var err = 'unmuting conversation "' + convid + '" by a non existent extension ' + endpointId;
            logger.warn(IDLOG, err);
            cb(err);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Sends the dtmf tone to the conversation destination.
*
* @method sendDtmfToConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {string}   tone         The dtmf tone to send
* @param {function} cb           The callback function
*/
function sendDtmfToConversation(endpointType, endpointId, convid, tone, cb) {
    try {
        // check parameters
        if (typeof cb         !== 'function' ||
            typeof tone       !== 'string'   || typeof convid       !== 'string' ||
            typeof endpointId !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var conv           = extensions[endpointId].getConversation(convid);
            var srcChannel     = conv.getSourceChannel();
            var counterpartNum = conv.getCounterpartNum();
            var chToSend       = ( srcChannel.getCallerNum() === counterpartNum ? srcChannel.getChannel() : srcChannel.getBridgedChannel() );

            logger.info(IDLOG, 'send dtmf tone "' + tone + '" from exten "' + endpointId + '" to channel "' + chToSend + '" of convid "' + convid + '"');
            astProxy.doCmd({ command: 'playDTMF', channel: chToSend, digit: tone }, function (error) {
                if (error) { logger.warn(IDLOG, 'play dtmf tone "' + tone + '" to channel "' + chToSend + '" has been failed: ' + error.message); }
                else       { logger.info(IDLOG, 'played dtmf tone "' + tone + '" to channel "' + chToSend + '" succesfully');              }
                cb(error);
            });

        } else {
            var err = 'sending dtmf tone "' + tone + '" from a non existent extension ' + endpointId;
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
        if (typeof cb       !== 'function' ||
            typeof destId   !== 'string'   ||
            typeof parking  !== 'string'   ||
            typeof destType !== 'string') {

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
            var str = 'pickup parking from ' + destType + ' ' + destId + ' of parking ' + parking;
            logger.error(IDLOG, str);
            cb(str);
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
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {string}   destType     The endpoint type that pickup the conversation
* @param {string}   destId       The endpoint identifier that pickup the conversation
* @param {function} cb           The callback function
*/
function pickupConversation(endpointType, endpointId, convid, destType, destId, cb) {
    try {
        // check parameters
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof destId       !== 'string'   ||
            typeof destType     !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId] &&
            destType     === 'extension' && extensions[destId]) {

            var chToRedirect;
            var convs      = extensions[endpointId].getAllConversations();
            var conv       = convs[convid];
            var ch         = conv.getDestinationChannel();
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
                var str = 'pickup conversation of ' + endpointType + ' ' + endpointId + ' from ' + destType + ' ' + destId;
                logger.error(IDLOG, str);
                cb(str);
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
        if (typeof data              !== 'object' ||
            typeof data.channel      !== 'string' ||
            typeof data.channelExten !== 'string') {

            throw new Error('wrong parameter');
        }

        // check the extension existence
        if (extensions[data.channelExten]) {

            // request all channel list and update channels of extension
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {

                // update the conversations of the extension
                updateExtenConversations(err, resp, data.channelExten);
            });
        }

        // check the trunk existence
        if (trunks[data.channelExten]) {

            // request all channel list and update channels of trunk
            astProxy.doCmd({ command: 'listChannels' }, function (err, resp) {

                // update the conversations of the trunk
                updateTrunkConversations(err, resp, data.channelExten);
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
        if (typeof convid     !== 'string' || typeof cb           !== 'function' ||
            typeof endpointId !== 'string' || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var err;
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
                err = 'no channel to hangup of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, err);
                cb(err);
            }

        } else {
            err = 'try to hangup conversation for the non existent endpoint ' + endpointType + ' ' + endpointId;
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
        if (err) { logger.error(IDLOG, 'redirect channel failed: ' + err.toString()); }
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
* This is the callback of the mute command plugin.
*
* @method muteCb
* @param {object} error The error object of the operation
* @private
*/
function muteCb(error) {
    try {
        if (error) { logger.warn(IDLOG, 'mute failed: ' + error.message); }
        else       { logger.info(IDLOG, 'mute succesfully');              }

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
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof to           !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var msg;
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
                msg = 'getting the channel to redirect ' + chToRedirect;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            msg = 'redirect conversation: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
            logger.warn(IDLOG, msg);
            cb(msg);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Force hangup of the conversation.
*
* @method forceHangupConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {function} cb           The callback function
*/
function forceHangupConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid     !== 'string' || typeof cb           !== 'function' ||
            typeof endpointId !== 'string' || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var msg;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs    = extensions[endpointId].getAllConversations();
            var conv     = convs[convid];
            var chSource = conv.getSourceChannel();
            var chDest   = conv.getDestinationChannel();

            // force hangup is realized with a redirection to a non existent destination.
            var chToHangup;
            if (chSource) {
                chToHangup = endpointId === chSource.getCallerNum() ? chSource.getChannel() : chSource.getBridgedChannel();
            } else {
                chToHangup = endpointId === chDest.getCallerNum() ? chDest.getChannel() : chDest.getBridgedChannel();
            }

            if (chToHangup !== undefined) {

                var to = 'xyzw';

                // redirect the channel to a non existent destination to force the hangup
                logger.info(IDLOG, 'force hangup of the channel ' + chToHangup + ' of exten ' + endpointId + ' to non existent destination ' + to);
                astProxy.doCmd({ command: 'redirectChannel', chToRedirect: chToHangup, to: to }, function (err) {
                    cb(err);
                    if (err) { logger.error(IDLOG, 'force hangup channel failed: ' + err.toString()); }
                    else     { logger.info(IDLOG, 'force hangup channel succesfully'); }
                });

            } else {
                msg = 'getting the channel to force hangup ' + chToHangup;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            msg = 'force hangup conversation: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
            logger.warn(IDLOG, msg);
            cb(msg);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Redirect the waiting caller from the queue to the specified destination.
*
* @method redirectWaitingCaller
* @param {string}   waitingCallerId The identifier of the waiting caller
* @param {string}   queue           The identifier of the queue in which the caller waiting
* @param {string}   to              The destination number to redirect the conversation
* @param {function} cb              The callback function
*/
function redirectWaitingCaller(waitingCallerId, queue, to, cb) {
    try {
        // check parameters
        if (typeof cb              !== 'function' || typeof to    !== 'string' ||
            typeof waitingCallerId !== 'string'   || typeof queue !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the queue existence
        if (queues[queue]) {

            var ch = queues[queue].getAllWaitingCallers()[waitingCallerId].getChannel();

            if (ch !== undefined) {

                logger.info(IDLOG, 'redirect channel ' + ch + ' of waitingCaller ' + waitingCallerId + ' from queue ' + queue + ' to ' + to);
                astProxy.doCmd({ command: 'redirectChannel', chToRedirect: ch, to: to }, function (err) {
                   cb(err);
                   redirectConvCb(err);
                });

            } else {
                var str = 'redirecting waiting caller ' + waitingCallerId + ' from queue ' + queue + ' to ' + to + ': no channel found';
                logger.error(IDLOG, str);
                cb(str);
            }

        } else {
            var msg = 'redirecting waiting caller ' + waitingCallerId + ' from queue ' + queue + ' to ' + to + ': non existent queue ' + queue;
            logger.warn(IDLOG, msg);
            cb(msg);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Redirect the parkde call to the specified destination.
*
* @method redirectParking
* @param {string}   parking The identifier of the parking
* @param {string}   to      The destination number to redirect the parked call
* @param {function} cb      The callback function
*/
function redirectParking(parking, to, cb) {
    try {
        // check parameters
        if (typeof cb      !== 'function' ||
            typeof parking !== 'string'   || typeof to !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the parking existence
        if (parkings[parking]) {

            var ch = parkings[parking].getParkedCaller().getChannel();

            if (ch !== undefined) {

                logger.info(IDLOG, 'redirect channel ' + ch + ' from parking ' + parking + ' to ' + to);
                astProxy.doCmd({ command: 'redirectChannel', chToRedirect: ch, to: to }, function (err) {
                   cb(err);
                   redirectConvCb(err);
                });

            } else {
                var str = 'redirecting parked caller of parking ' + parking + ' to ' + to + ': no channel found';
                logger.error(IDLOG, str);
                cb(str);
            }

        } else {
            var msg = 'redirecting parked caller of parking ' + parking + ' to ' + to + ': non existent parking ' + parking;
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
        if (typeof convid     !== 'string'   ||
            typeof cb         !== 'function' || typeof to           !== 'string' ||
            typeof endpointId !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var msg;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs = extensions[endpointId].getAllConversations();
            var conv  = convs[convid];

            if (!conv) {
                msg = 'attended transfer convid "' + convid + '": no conversation present in extension ' + endpointId;
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
                msg = 'attended transfer: no channel to transfer ' + chToTransfer;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            msg = 'attended transfer conversation: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
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
        if (typeof convid     !== 'string'   ||
            typeof cb         !== 'function' || typeof voicemail    !== 'string' ||
            typeof endpointId !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var msg;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs = extensions[endpointId].getAllConversations();
            var conv  = convs[convid];

            if (!conv) {
                msg = 'transfer convid "' + convid + '" to voicemail "' + voicemail + '": no conversation present in extension ' + endpointId;
                logger.warn(IDLOG, msg);
                cb(msg);
                return;
            }

            var chSource   = conv.getSourceChannel();
            var callerNum  = chSource.getCallerNum();
            var bridgedNum = chSource.getBridgedNum();

            // when the endpointId is the caller, the channel to transfer is the destination channel
            var chToTransfer = endpointId === chSource.getCallerNum() ? chSource.getBridgedChannel() : chSource.getChannel();

            if (chToTransfer !== undefined) {

                // transfer the channel to the voicemail
                logger.info(IDLOG, 'transfer of the channel ' + chToTransfer + ' of exten ' + endpointId + ' to voicemail ' + voicemail);
                astProxy.doCmd({ command: 'transferToVoicemail', chToTransfer: chToTransfer, voicemail: voicemail }, function (err) {
                    cb(err);
                    transferConvToVoicemailCb(err);
                });

            } else {
                msg = 'transfer to voicemail: no channel to transfer ' + chToTransfer;
                logger.error(IDLOG, msg);
                cb(msg);
            }

        } else {
            msg = 'transfer conversation to voicemail: unknown endpointType ' + endpointType + ' or extension ' + endpointId + ' not present';
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
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' || typeof endpointId   !== 'string' ||
            typeof applicantId  !== 'string'   || typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var convs = extensions[endpointId].getAllConversations();
            var conv  = convs[convid];

            var err;
            // check the presence of the conversation
            if (typeof conv !== 'object') {
                err = 'parking the conversation ' + convid + ': no conversation present in the endpointId ' + endpointId;
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
                err = 'applicant extension "' + applicantId + '" not allowed to park a conversation not owned by him ' + convid;
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
                err = 'getting the channel to park ' + chToPark;
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
* Record an audio file.
*
* @method recordAudioFile
* @param {object} data
*   @param {string} data.exten    The extension to be used for recording
*   @param {string} data.filepath The path of the audio file to be stored
* @param {function} cb            The callback function
*/
function recordAudioFile(data, cb) {
    try {
        // check parameters
        if (typeof data       !== 'object' || typeof cb            !== 'function' ||
            typeof data.exten !== 'string' || typeof data.filepath !== 'string') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'execute record audio file "' + data.filepath + '" with exten "' + data.exten + '"');
        astProxy.doCmd({ command: 'recordAudioFile', exten: data.exten, filepath: data.filepath }, function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'recording audio file "' + data.filepath + '" with exten "' + data.exten + '"');
                    cb(err);
                    return;
                }
                logger.info(IDLOG, 'record audio file "' + data.filepath + '" with exten "' + data.exten + '" has been started');
                cb(null);

            } catch (err) {
               logger.error(IDLOG, err.stack);
               cb(err);
            }
        });
    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Alternates the logon and logout of the specified extension in all the queues
* for which it's a dynamic member.
*
* @method inoutDynQueues
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {function} cb           The callback function
*/
function inoutDynQueues(endpointType, endpointId, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof endpointType !== 'string'   || typeof endpointId !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            logger.info(IDLOG, 'execute inout to all queues in which the ' + endpointType + ' ' + endpointId + ' is dynamic');
            astProxy.doCmd({ command: 'inoutDynQueues', exten: endpointId }, function (err) {
                try {
                    if (err) {
                        logger.error(IDLOG, 'inout to all queues for which exten ' + endpointId + ' is dynamic');
                        cb(err);
                        return;
                    }
                    logger.info(IDLOG, 'inout to all queues for which exten ' + endpointId + ' is dynamic has been successful');
                    cb(null);

                } catch (err) {
                   logger.error(IDLOG, err.stack);
                   cb(err);
                }
            });
        } else {
            var err = 'inout to all queues in which the endpoint is dynamic: unknown endpointType ' + endpointType + ' or extension not present';
            logger.warn(IDLOG, err);
            cb(err);
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Pause or unpause an extension from a specific queue or from all queues omitting the _queueId_ parameter.
*
* @method queueMemberPauseUnpause
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   queueId      The queue identifier
* @param {string}   reason       The textual description of the reason. In the unpause case, simply it's ignored
* @param {boolean}  paused       If the extension must be paused or unpaused. If it's true the extension will be paused from the queue
* @param {function} cb           The callback function
*/
function queueMemberPauseUnpause(endpointType, endpointId, queueId, reason, paused, cb) {
    try {
        // check parameters
        if ( typeof cb           !== 'function' || typeof paused     !== 'boolean' ||
             typeof endpointType !== 'string'   || typeof endpointId !== 'string'  ||
            (typeof queueId      !== 'string'   && queueId) ||
             typeof reason       !== 'string') {

            throw new Error('wrong parameters');
        }

        // used to discriminate the output log between the two operation: pause or unpause
        var logWord = (paused ? 'pause' : 'unpause');
        // used to discriminate the presence of the queueId parameter. If it's omitted the pause or unpause
        // is done in all queues
        var logQueue = (queueId ? 'queue "' + queueId + '"' : 'all queues');

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var obj = {};

            // sequentially executes two operations:
            // 1. pause or resume the member to/from the queue
            // 2. add a new entry into the "asteriskcdrdb.queue_log" database with the name of the member
            // This is used by "queue report" application. Without the second operation asterisk only add
            // an entry with extension identifier data
            async.series([

                // add the member to the queue
                function(callback) {

                    obj = {
                        command: 'queueMemberPauseUnpause',
                        exten:   endpointId,
                        reason:  reason,
                        paused:  paused
                    };

                    // if queueId is omitted the action is done on all queues
                    if (queueId) { obj.queue = queueId; }

                    logger.info(IDLOG, 'execute ' + logWord + ' ' + endpointType + ' ' + endpointId + ' of ' + logQueue);
                    astProxy.doCmd(obj, function (err1) {
                        try {
                            if (err1) {
                                var str = logWord + ' extension ' + endpointId + ' from ' + logQueue + ' has been failed: ' + err1.toString();
                                callback(str);

                            } else {
                                logger.info(IDLOG, logWord + ' extension ' + endpointId + ' from ' + logQueue + ' has been successful');
                                callback();
                            }
                        } catch (err2) {
                           logger.error(IDLOG, err2.stack);
                           cb(err2.stack);
                        }
                    });
                },

                // add the entry into the "asteriskcdrdb.queue_log" database
                function(callback) {

                    var name          = extensions[endpointId].getName();
                    var queueLogEvent = (paused ? 'PAUSE' : 'UNPAUSE');

                    obj = {
                        command:   'queueLog',
                        queue:     queueId ? queueId : 'all', // queueId is optional and if omitted it means all queues
                        event:     queueLogEvent,
                        message:   reason,
                        interface: name
                    };

                    logger.info(IDLOG, 'add new entry in queue_log asterisk db: interface "' + name + '", queue "' + queueId + '", event "' + queueLogEvent + '" and reason "' + reason + '"');
                    astProxy.doCmd(obj, function (err3) {
                        try {
                            if (err3) {
                                var str = 'add new entry in "queue_log" asterisk db has been failed: interface "' + name + '", queue "' + queueId + '", event "' + queueLogEvent + '" and reason "' + reason + '": ' + err3.toString();
                                callback(str);

                            } else {
                                logger.info(IDLOG, 'add new entry in "queue_log" asterisk db has been successful: interface "' + name + '", queue "' + queueId + '", event "' + queueLogEvent + '" and reason "' + reason + '"');
                                callback();
                            }

                        } catch (err4) {
                           logger.error(IDLOG, err4.stack);
                           callback(err4.stack);
                        }
                    });
                }

            ], function (err5) {

                if (err5) { logger.error(IDLOG, err5); }

                cb(err5);
            });

        } else {
            var err = logWord + ' queue member: unknown endpointType ' + endpointType + ' or extension not present';
            logger.warn(IDLOG, err);
            cb(err);
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Adds the member to the queue.
*
* @method queueMemberAdd
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   queueId      The queue identifier
* @param {string}   [paused]     To pause or not the member initially
* @param {boolean}  [penalty]    A penalty (number) to apply to this member. Asterisk will distribute calls to members
*                                with higher penalties only after attempting to distribute calls to those with lower penalty
* @param {function} cb           The callback function
*/
function queueMemberAdd(endpointType, endpointId, queueId, paused, penalty, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof endpointType !== 'string'   || typeof endpointId !== 'string' ||
            typeof queueId      !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var obj = {};

            // sequentially executes two operations:
            // 1. add the member to the queue
            // 2. add a new entry into the "asteriskcdrdb.queue_log" database with the name of the member
            // This is used by "queue report" application. Without the second operation asterisk only add
            // an entry with extension identifier data
            async.series([

                // add the member to the queue
                function(callback) {

                    obj = {
                        command:    'queueMemberAdd',
                        queue:      queueId,
                        exten:      endpointId,
                        memberName: extensions[endpointId].getName()
                    };

                    // add optional parameters
                    if (paused)  { obj.paused  = paused;  }
                    if (penalty) { obj.penalty = penalty; }

                    logger.info(IDLOG, 'execute queue member add of ' + endpointType + ' ' + endpointId + ' to queue ' + queueId);
                    astProxy.doCmd(obj, function (err1) {
                        try {
                            if (err1) {
                                var str = 'queue member add of ' + endpointType + ' ' + endpointId + ' to queue ' + queueId + ' has been failed: ' + err1.toString();
                                callback(str);

                            } else {
                                logger.info(IDLOG, 'queue member add of ' + endpointType + ' ' + endpointId + ' to queue ' + queueId + ' has been successful');
                                callback();
                            }

                        } catch (err2) {
                           logger.error(IDLOG, err2.stack);
                           callback(err2.stack);
                        }
                    });
                },

                // add the entry into the "asteriskcdrdb.queue_log" database
                function(callback) {

                    var name = extensions[endpointId].getName();

                    obj = {
                        command:   'queueLog',
                        queue:     queueId,
                        event:     'ADDMEMBER',
                        interface: name
                    };

                    logger.info(IDLOG, 'add new entry in queue_log asterisk db: interface "' + name + '", queue "' + queueId + '" and event "ADDMEMBER"');
                    astProxy.doCmd(obj, function (err3) {
                        try {
                            if (err3) {
                                var str = 'add new entry in "queue_log" asterisk db has been failed: interface "' + name + '", queue "' + queueId + '" and event "ADDMEMBER": ' + err3.toString();
                                callback(str);

                            } else {
                                logger.info(IDLOG, 'add new entry in "queue_log" asterisk db has been successful: interface "' + name + '", queue "' + queueId + '" and event "ADDMEMBER"');
                                callback();
                            }

                        } catch (err4) {
                           logger.error(IDLOG, err4.stack);
                           callback(err4.stack);
                        }
                    });
                }

            ], function (err5) {

                if (err5) { logger.error(IDLOG, err5); }

                cb(err5);
            });

        } else {
            var str = 'queue member add of ' + endpointType + ' ' + endpointId + ' to queue ' + queueId + ': unknown "' + endpointType + '" or extension not present';
            logger.warn(IDLOG, str);
            cb(str);
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err.stack);
    }
}

/**
* Removes the extension from a specific queue.
*
* @method queueMemberRemove
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   queueId      The queue identifier
* @param {function} cb           The callback function
*/
function queueMemberRemove(endpointType, endpointId, queueId, cb) {
    try {
        // check parameters
        if (typeof cb           !== 'function' ||
            typeof endpointType !== 'string'   || typeof endpointId !== 'string' ||
            typeof queueId      !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            var obj = {};

            // sequentially executes two operations:
            // 1. remove the member from the queue
            // 2. add a new entry into the "asteriskcdrdb.queue_log" database with the name of the member
            // This is used by "queue report" application. Without the second operation asterisk only add
            // an entry with extension identifier data
            async.series([

                // remove the member from the queue
                function(callback) {

                    obj = {
                        command: 'queueMemberRemove',
                        queue:   queueId,
                        exten:   endpointId
                    };

                    logger.info(IDLOG, 'execute queue member remove of ' + endpointType + ' ' + endpointId + ' from queue ' + queueId);
                    astProxy.doCmd(obj, function (err1) {
                        try {
                            if (err1) {
                                var str = 'queue member remove of ' + endpointType + ' ' + endpointId + ' from queue ' + queueId + ' has been failed: ' + err1.toString();
                                callback(str);

                            } else {
                                logger.info(IDLOG, 'queue member remove of ' + endpointType + ' ' + endpointId + ' from queue ' + queueId + ' has been successful');
                                callback();
                            }

                        } catch (err2) {
                           logger.error(IDLOG, err2.stack);
                           cb(err2.stack);
                        }
                    });
                },

                // add the entry into the "asteriskcdrdb.queue_log" database
                function(callback) {

                    var name = extensions[endpointId].getName();

                    obj = {
                        command:   'queueLog',
                        queue:     queueId,
                        event:     'REMOVEMEMBER',
                        interface: name
                    };

                    logger.info(IDLOG, 'add new entry in queue_log asterisk db: interface "' + name + '", queue "' + queueId + '" and event "REMOVEMEMBER"');
                    astProxy.doCmd(obj, function (err3) {
                        try {
                            if (err3) {
                                var str = 'add new entry in "queue_log" asterisk db has been failed: interface "' + name + '", queue "' + queueId + '" and event "REMOVEMEMBER": ' + err3.toString();
                                callback(str);

                            } else {
                                logger.info(IDLOG, 'add new entry in "queue_log" asterisk db has been successful: interface "' + name + '", queue "' + queueId + '" and event "REMOVEMEMBER"');
                                callback();
                            }

                        } catch (err4) {
                           logger.error(IDLOG, err4.stack);
                           callback(err4.stack);
                        }
                    });
                }

            ], function (err5) {

                if (err5) { logger.error(IDLOG, err5); }

                cb(err5);
            });

        } else {
            var err = 'queue member remove of ' + endpointType + ' ' + endpointId + ' from queue ' + queueId + ': unknown "' + endpointType + '" or extension not present';
            logger.warn(IDLOG, err);
            cb(err);
        }

    } catch (err) {
       logger.error(IDLOG, err.stack);
       cb(err);
    }
}

/**
* Returns all the queue identifiers to which the specified extension belongs.
*
* @method getQueueIdsOfExten
* @param  {string} extenId The extension identifier
* @return {object} The queue identifier list as keys of an object.
*/
function getQueueIdsOfExten(extenId) {
    try {
        // check parameters
        if (typeof extenId !== 'string') { throw new Error('wrong parameter extenId "' + extenId + '"'); }

        var q, allMembers;
        var result = {};

        // check the endpoint existence
        if (extensions[extenId]) {

            for (q in queues) {

                // all member of current queue
                allMembers = queues[q].getAllMembers();

                // check if the specified extension is present in the member list of current queue.
                // If it is, it is added to the result to be returned
                if (extenId in allMembers) { result[q] = ""; }
            }
        }
        return result;

    } catch (err) {
       logger.error(IDLOG, err.stack);
       return {};
    }
}

/**
* Checks if the specified extension is a dynamic member of the specified queue.
*
* @method isExtenDynMemberQueue
* @param  {string}  extenId The extension identifier
* @param  {string}  queueId The queue identifier
* @return {boolean} True if the specified extension is a dynamic member of the specified queue.
*/
function isExtenDynMemberQueue(extenId, queueId) {
    try {
        // check parameters
        if (typeof extenId !== 'string' || typeof queueId !== 'string') {
            throw new Error('wrong parameters extenId "' + extenId + '", queueId "' + queueId + '"');
        }

        if (!queues[queueId]) {
            logger.warn(IDLOG, 'checking if the exten "' + extenId + '" is dynamic member of non existent queue "' + queueId + '"');
            return false;
        }

        // all member of the queue
        var allMembers = queues[queueId].getAllMembers();
        if (extenId in allMembers) {

            return allMembers[extenId].isDynamic();

        } else {
            logger.warn(IDLOG, 'checking if the exten "' + extenId + '" is a dynamic member of queue "' + queueId + '": it is not its member');
        }
        return false;

    } catch (err) {
       logger.error(IDLOG, err.stack);
       return false;
    }
}

/**
* Checks if the specified queue dynamic member is logged into the specified queue.
*
* @method isDynMemberLoggedInQueue
* @param  {string}  extenId The extension identifier
* @param  {string}  queueId The queue identifier
* @return {boolean} True if the specified queue dynamic member is logged into the specified queue.
*/
function isDynMemberLoggedInQueue(extenId, queueId) {
    try {
        // check parameters
        if (typeof extenId !== 'string' || typeof queueId !== 'string') {
            throw new Error('wrong parameters extenId "' + extenId + '", queueId "' + queueId + '"');
        }

        if (!queues[queueId]) {
            logger.warn(IDLOG, 'checking if the queue dyn member "' + extenId + '" is logged into non existent queue "' + queueId + '"');
            return false;
        }

        // all member of the queue
        var m = queues[queueId].getMember(extenId);
        if (m) { return m.isLoggedIn(); }
        else   { logger.warn(IDLOG, 'checking if the queue dyn member "' + extenId + '" is logged into the queue "' + queueId + '": it is not its member'); }
        return false;

    } catch (err) {
       logger.error(IDLOG, err.stack);
       return false;
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
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var str;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to hangup
            var chid = getExtenIdSourceChannelConversation(endpointId, convid);

            if (recordingConv[convid] === undefined) {
                str = 'the conversation ' + convid + ' is not recording';
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
                str = 'no channel to stop record of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, str);
                cb(str);
            }

        } else {
            str = 'try to stop record conversation for the non existent endpoint ' + endpointType;
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
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof destId       !== 'string'   ||
            typeof destType     !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint and dest
        if (endpointType === 'extension' && extensions[endpointId] && // the extension to spy exists
            destType     === 'extension' && extensions[destId]) {  // the extension that want to spy exists

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
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof destId       !== 'string'   ||
            typeof destType     !== 'string'   ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        // check the endpoint and dest
        if (endpointType === 'extension' && extensions[endpointId] && // the extension to spy exists
            destType  === 'extension' && extensions[destId]) {  // the extension that want to spy exists

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
            var str = 'spy listen conversation of ' + endpointType + ' ' + endpointId + ' from ' + destType + ' ' + destId;
            logger.warn(IDLOG, str);
            cb(str);
        }
    } catch (err) {
        cb(err);
        logger.error(IDLOG, err.stack);
    }
}

/**
* Mute the recording of the conversation.
*
* @method muteRecordConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {function} cb           The callback function
*/
function muteRecordConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var str;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to record
            var ch = getExtenSourceChannelConversation(endpointId, convid);

            // check if the conversation is already recording
            if (recordingConv[convid] === undefined) {
                logger.info(IDLOG, 'the conversation ' + convid + ' is not recording, so it can not be mute');
                cb();

            } else if (ch) {

                var chid = ch.getChannel(); // the channel identifier

                // start the recording
                logger.info(IDLOG, 'mute the recording of convid "' + convid + '" of extension "' + endpointId + '" with channel ' + chid);
                astProxy.doCmd({ command: 'muteRecordCall', channel: chid }, function (err) {
                    try {
                        if (err) {
                            logger.error(IDLOG, 'muting recording of convid "' + convid + '" of extension "' + endpointId + '" with channel ' + chid);
                            cb(err);
                            return;
                        }
                        logger.info(IDLOG, 'mute the recording of convid "' + convid + '" of extension "' + endpointId + '" with channel ' + chid + ' has been successfully');

                        // set the recording status mute of all conversations with specified convid
                        setRecordStatusMuteConversations(convid);
                        cb();

                    } catch (e) {
                       logger.error(IDLOG, e.stack);
                       cb(e);
                    }
                });

            } else {
                str = 'no channel to mute record of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, str);
                cb(str);
            }

        } else {
            str = 'try to mute the record conversation for the non existent endpoint ' + endpointType;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        cb(err);
        logger.error(IDLOG, err.stack);
    }
}

/**
* Unmute the recording of the conversation.
*
* @method unmuteRecordConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {function} cb           The callback function
*/
function unmuteRecordConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var str;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to record
            var ch = getExtenSourceChannelConversation(endpointId, convid);

            // check if the conversation is already recording
            if (recordingConv[convid] === undefined) {
                logger.info(IDLOG, 'the conversation ' + convid + ' is not recording, so it can not be unmute');
                cb();

            } else if (ch) {

                var chid = ch.getChannel(); // the channel identifier

                // start the recording
                logger.info(IDLOG, 'unmute the recording of convid "' + convid + '" of extension "' + endpointId + '" with channel ' + chid);
                astProxy.doCmd({ command: 'unmuteRecordCall', channel: chid }, function (err) {
                    try {
                        if (err) {
                            logger.error(IDLOG, 'unmuting recording of convid "' + convid + '" of extension "' + endpointId + '" with channel ' + chid);
                            cb(err);
                            return;
                        }
                        logger.info(IDLOG, 'unmuting the recording of convid "' + convid + '" of extension "' + endpointId + '" with channel ' + chid + ' has been successfully');

                        // set the recording status of all conversations with specified convid
                        setRecordStatusConversations(convid, true);
                        cb();

                    } catch (e) {
                       logger.error(IDLOG, e.stack);
                       cb(e);
                    }
                });

            } else {
                str = 'no channel to unmute record of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, str);
                cb(str);
            }

        } else {
            str = 'try to unmute the record conversation for the non existent endpoint ' + endpointType;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        cb(err);
        logger.error(IDLOG, err.stack);
    }
}

/**
* Starts the recording of the conversation.
*
* @method startRecordConversation
* @param {string}   endpointType The type of the endpoint (e.g. extension, queue, parking, trunk...)
* @param {string}   endpointId   The endpoint identifier (e.g. the extension number)
* @param {string}   convid       The conversation identifier
* @param {function} cb           The callback function
*/
function startRecordConversation(endpointType, endpointId, convid, cb) {
    try {
        // check parameters
        if (typeof convid       !== 'string'   ||
            typeof cb           !== 'function' ||
            typeof endpointId   !== 'string'   ||
            typeof endpointType !== 'string') {

            throw new Error('wrong parameters');
        }

        var str;
        // check the endpoint existence
        if (endpointType === 'extension' && extensions[endpointId]) {

            // get the channel to record
            var ch = getExtenSourceChannelConversation(endpointId, convid);
            // get the name of the audio file
            var now = new Date();
            var filename = getRecordFilename(endpointId, convid, now);
            var filepath = getRecordFilepath(endpointId, convid, now);

            // check if the conversation is already recording
            if (recordingConv[convid] !== undefined) {
                logger.info(IDLOG, 'the conversation ' + convid + ' is already recording');
                cb();

            } else if (ch) {

                var chid = ch.getChannel(); // the channel identifier

                logger.info(IDLOG, 'set asterisk variables to record the convid "' + convid + '" of extension "' + endpointId + '"');
                // set some asterisk variables to fill the "recordingfile" field of the
                // asteriskcdrdb.cdr database table and then record the conversation
                async.series([

                    // set the asterisk variables
                    function(callback) {

                        logger.info(IDLOG, 'set "MASTER_CHANNEL(ONETOUCH_REC)" asterisk variable');
                        astProxy.doCmd({ command: 'setVariable', name: 'MASTER_CHANNEL(ONETOUCH_REC)', value: 'RECORDING', channel: chid }, function (err) {
                            try {
                                if (err) { callback(err); }
                                else     { callback();    }

                            } catch (e) {
                               logger.error(IDLOG, e.stack);
                               callback(e);
                            }
                        });
                    },

                    function(callback) {

                        logger.info(IDLOG, 'set "MASTER_CHANNEL(REC_STATUS)" asterisk variable');
                        astProxy.doCmd({ command: 'setVariable', name: 'MASTER_CHANNEL(REC_STATUS)', value: 'RECORDING', channel: chid }, function (err) {
                            try {
                                if (err) { callback(err); }
                                else     { callback();    }

                            } catch (e) {
                               logger.error(IDLOG, e.stack);
                               callback(e);
                            }
                        });
                    },

                    function(callback) {

                        logger.info(IDLOG, 'set "AUDIOHOOK_INHERIT(MixMonitor)" asterisk variable');
                        astProxy.doCmd({ command: 'setVariable', name: 'AUDIOHOOK_INHERIT(MixMonitor)', value: 'yes', channel: chid }, function (err) {
                            try {
                                if (err) { callback(err); }
                                else     { callback();    }

                            } catch (e) {
                               logger.error(IDLOG, e.stack);
                               callback(e);
                            }
                        });
                    },

                    function(callback) {

                        logger.info(IDLOG, 'set "MASTER_CHANNEL(CDR(recordingfile))" asterisk variable with filename "' + filename + '"');
                        astProxy.doCmd({ command: 'setVariable', name: 'MASTER_CHANNEL(CDR(recordingfile))', value: filename, channel: chid }, function (err) {
                            try {
                                if (err) { callback(err); }
                                else     { callback();    }

                            } catch (e) {
                               logger.error(IDLOG, e.stack);
                               callback(e);
                            }
                        });
                    },

                    function(callback) {

                        logger.info(IDLOG, 'set "MASTER_CHANNEL(CDR(recordingfile))" asterisk variable');
                        astProxy.doCmd({ command: 'setVariable', name: 'MASTER_CHANNEL(ONETOUCH_RECFILE)', value: filename, channel: chid }, function (err) {
                            try {
                                if (err) { callback(err); }
                                else     { callback();    }

                            } catch (e) {
                               logger.error(IDLOG, e.stack);
                               callback();
                            }
                        });
                    }

                ], function (err) {

                    if (err) {
                        logger.error(IDLOG, 'setting asterisk variables to record the convid "' + convid + '" of extension "' + endpointId + '"');
                        return;
                    }

                    logger.info(IDLOG, 'asterisk variables to record the convid "' + convid + '" of extension "' + endpointId + '" has been set');

                    // start the recording
                    logger.info(IDLOG, 'record the convid "' + convid + '" of extension "' + endpointId + '"');
                    astProxy.doCmd({ command: 'recordCall', channel: chid, filepath: filepath }, function (err) {
                        try {
                            if (err) {
                                logger.error(IDLOG, 'recording the convid "' + convid + '" of extension "' + endpointId + '"');
                                cb(err);
                                return;
                            }
                            logger.info(IDLOG, 'record the convid "' + convid + '" of extension "' + endpointId + '" has been successfully started in ' + filepath);

                            // set the recording status of the conversation
                            startRecordCallCb(convid);
                            cb();

                        } catch (e) {
                           logger.error(IDLOG, e.stack);
                           cb(e);
                        }
                    });
                });

            } else {
                str = 'no channel to record of conversation ' + convid + ' of exten ' + endpointId;
                logger.warn(IDLOG, str);
                cb(str);
            }

        } else {
            str = 'try to record conversation for the non existent endpoint ' + endpointType;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
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
* Sets the recording status of the conversations.
*
* @method startRecordCallCb
* @param {string} convid The conversation identifier
* @private
*/
function startRecordCallCb(convid) {
    try {
        // set the recording status of the conversation to memory
        recordingConv[convid] = '';
        // set the recording status of all conversations with specified convid
        setRecordStatusConversations(convid, true);

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
                        logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
                        astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);
                    }
                }
            }
        }

        var trunk;
        for (trunk in trunks) { // cycle in all trunks

            // get all the conversations of the current trunk
            convs = trunks[trunk].getAllConversations();
            if (convs) {

                // cycle in all conversations
                for (cid in convs) {
                    // if the current conversation identifier is the
                    // same of that specified, set its recording status
                    if (cid === convid) {
                        convs[convid].setRecording(value);
                        logger.info(IDLOG, 'set recording status ' + value + ' to conversation ' + convid);

                        // emit the event
                        logger.info(IDLOG, 'emit event ' + EVT_TRUNK_CHANGED + ' for trunk ' + trunk);
                        astProxy.emit(EVT_TRUNK_CHANGED, trunks[trunk]);
                    }
                }
            }
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the recording status mute of all the conversations with the specified convid.
*
* @method setRecordStatusMuteConversations
* @param {string} convid The conversation identifier
* @private
*/
function setRecordStatusMuteConversations(convid) {
    try {
        // check parameter
        if (typeof convid !== 'string') { throw new Error('wrong parameter'); }

        // set the recording status mute of all the conversations with the specified convid
        var exten, convs, cid;
        for (exten in extensions) { // cycle in all extensions

            // get all the conversations of the current extension
            convs = extensions[exten].getAllConversations();
            if (convs) {

                // cycle in all conversations
                for (cid in convs) {
                    // if the current conversation identifier is the
                    // same of that specified, set its recording status to mute
                    if (cid === convid) {
                        convs[convid].setRecordingMute();
                        logger.info(IDLOG, 'set recording status "mute" to conversation ' + convid);

                        // emit the event
                        logger.info(IDLOG, 'emit event ' + EVT_EXTEN_CHANGED + ' for extension ' + exten);
                        astProxy.emit(EVT_EXTEN_CHANGED, extensions[exten]);
                    }
                }
            }
        }

        var trunk;
        for (trunk in trunks) { // cycle in all trunks

            // get all the conversations of the current trunk
            convs = trunks[trunk].getAllConversations();
            if (convs) {

                // cycle in all conversations
                for (cid in convs) {
                    // if the current conversation identifier is the
                    // same of that specified, set its recording status to mute
                    if (cid === convid) {
                        convs[convid].setRecordingMute();
                        logger.info(IDLOG, 'set recording status "mute" to conversation ' + convid);

                        // emit the event
                        logger.info(IDLOG, 'emit event ' + EVT_TRUNK_CHANGED + ' for trunk ' + trunk);
                        astProxy.emit(EVT_TRUNK_CHANGED, trunks[trunk]);
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
* @param {boolean}  sequence  The DTMF digits to send to the extension
* @param {string}   callerid  The caller identifier
* @param {function} cb        The callback function
* @private
*/
function sendDTMFSequence(extension, sequence, callerid, cb) {
    try {
        // check parameters
        if (typeof extension !== 'string' || typeof callerid !== 'string' ||
            typeof sequence  !== 'string' || typeof cb       !== 'function') {

            throw new Error('wrong parameters');
        }

        // check if the extension exists
        if (!extensions[extension]) {
            logger.warn(IDLOG, 'sending DTMF sequence to non existing extension ' + extension);
            cb(extension + ' doesn\'t exist');
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

                if (chdtmf) { sendDTMFSequenceToChannel(chdtmf, sequence, cb);                      }
                else        { callAndSendDTMFSequence(chanType, extension, sequence, callerid, cb); }

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
        if (typeof channel  !== 'string' ||
            typeof sequence !== 'string' || typeof cb !== 'function') {

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
* @param {string}   sequence  The sequence of DTMF tones
* @param {string}   callerid  The caller identifier
* @param {function} cb        The callback function
* @private
*/
function callAndSendDTMFSequence(chanType, extension, sequence, callerid, cb) {
    try {
        // check parameters
        if (typeof chanType  !== 'string'   ||
            typeof cb        !== 'function' || typeof callerid !== 'string' ||
            typeof extension !== 'string'   || typeof sequence !== 'string') {

            throw new Error('wrong parameters');
        }

        // call the extension and send DTMF sequence
        astProxy.doCmd({ command: 'callAndSendDTMF', chanType: chanType, exten: extension, sequence: sequence, callerid: callerid }, function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'calling and sending DTMF sequence "' + sequence + '" to ' + chanType + ' ' + extension + ' with callerid ' + callerid);
                    cb(err);

                } else {
                    logger.info(IDLOG, 'calling and sending DTMF sequence "' + sequence + '" to ' + chanType + ' ' + extension + ' with callerid ' + callerid + ' has successful');
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
* Returns the destination number to compose to make a new echo call.
*
* @method getEchoCallDestination
* @return {string} The destination number to compose to make a new echo call.
*/
function getEchoCallDestination() {
    try {
        return '*43';
    } catch (e) {
       logger.error(IDLOG, e.stack);
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
exports.setDnd                          = setDnd;
exports.setLogger                       = setLogger;
exports.setPrefix                       = setPrefix;
exports.getPrefix                       = getPrefix;
exports.addPrefix                       = addPrefix;
exports.evtRename                       = evtRename;
exports.evtNewCdr                       = evtNewCdr;
exports.EVT_NEW_CDR                     = EVT_NEW_CDR;
exports.setCompDbconn                   = setCompDbconn;
exports.getExtensions                   = getExtensions;
exports.pickupParking                   = pickupParking;
exports.getJSONQueues                   = getJSONQueues;
exports.getExtensionIp                  = getExtensionIp;
exports.getJSONTrunks                   = getJSONTrunks;
exports.queueMemberAdd                  = queueMemberAdd;
exports.inoutDynQueues                  = inoutDynQueues;
exports.getJSONParkings                 = getJSONParkings;
exports.recordAudioFile                 = recordAudioFile;
exports.getJSONQueuesQOS                = getJSONQueuesQOS;
exports.redirectParking                 = redirectParking;
exports.muteConversation                = muteConversation;
exports.sendDTMFSequence                = sendDTMFSequence;
exports.parkConversation                = parkConversation;
exports.setCompPhonebook                = setCompPhonebook;
exports.getJSONExtension                = getJSONExtension;
exports.getExtensionAgent               = getExtensionAgent;
exports.getJSONExtensions               = getJSONExtensions;
exports.setCompCallerNote               = setCompCallerNote;
exports.queueMemberRemove               = queueMemberRemove;
exports.EVT_EXTEN_CHANGED               = EVT_EXTEN_CHANGED;
exports.EVT_TRUNK_CHANGED               = EVT_TRUNK_CHANGED;
exports.EVT_EXTEN_DIALING               = EVT_EXTEN_DIALING;
exports.EVT_QUEUE_CHANGED               = EVT_QUEUE_CHANGED;
exports.getQueueIdsOfExten              = getQueueIdsOfExten;
exports.getJSONQueuesStats              = getJSONQueuesStats;
exports.getJSONAgentsStats              = getJSONAgentsStats;
exports.unmuteConversation              = unmuteConversation;
exports.setUnconditionalCf              = setUnconditionalCf;
exports.hangupConversation              = hangupConversation;
exports.evtNewExternalCall              = evtNewExternalCall;
exports.pickupConversation              = pickupConversation;
exports.evtExtenDndChanged              = evtExtenDndChanged;
exports.evtQueueMemberAdded             = evtQueueMemberAdded;
exports.EVT_PARKING_CHANGED             = EVT_PARKING_CHANGED;
exports.evtQueueMemberStatus            = evtQueueMemberStatus;
exports.setUnconditionalCfVm            = setUnconditionalCfVm;
exports.redirectConversation            = redirectConversation;
exports.isExtenDynMemberQueue           = isExtenDynMemberQueue;
exports.EVT_NEW_VOICE_MESSAGE           = EVT_NEW_VOICE_MESSAGE;
exports.evtQueueMemberRemoved           = evtQueueMemberRemoved;
exports.redirectWaitingCaller           = redirectWaitingCaller;
exports.evtHangupConversation           = evtHangupConversation;
exports.evtExtenStatusChanged           = evtExtenStatusChanged;
exports.sendDtmfToConversation          = sendDtmfToConversation;
exports.getEchoCallDestination          = getEchoCallDestination;
exports.evtNewVoicemailMessage          = evtNewVoicemailMessage;
exports.stopRecordConversation          = stopRecordConversation;
exports.evtConversationDialing          = evtConversationDialing;
exports.muteRecordConversation          = muteRecordConversation;
exports.forceHangupConversation         = forceHangupConversation;
exports.evtSpyStartConversation         = evtSpyStartConversation;
exports.startRecordConversation         = startRecordConversation;
exports.getBaseCallRecAudioPath         = getBaseCallRecAudioPath;
exports.queueMemberPauseUnpause         = queueMemberPauseUnpause;
exports.EVT_QUEUE_MEMBER_CHANGED        = EVT_QUEUE_MEMBER_CHANGED;
exports.evtNewQueueWaitingCaller        = evtNewQueueWaitingCaller;
exports.evtConversationConnected        = evtConversationConnected;
exports.unmuteRecordConversation        = unmuteRecordConversation;
exports.isDynMemberLoggedInQueue        = isDynMemberLoggedInQueue;
exports.EVT_UPDATE_VOICE_MESSAGES       = EVT_UPDATE_VOICE_MESSAGES;
exports.startSpySpeakConversation       = startSpySpeakConversation;
exports.startSpyListenConversation      = startSpyListenConversation;
exports.evtUpdateVoicemailMessages      = evtUpdateVoicemailMessages;
exports.evtQueueMemberPausedChanged     = evtQueueMemberPausedChanged;
exports.evtRemoveQueueWaitingCaller     = evtRemoveQueueWaitingCaller;
exports.attendedTransferConversation    = attendedTransferConversation;
exports.getExtensionsFromConversation   = getExtensionsFromConversation;
exports.evtExtenUnconditionalCfChanged  = evtExtenUnconditionalCfChanged;
exports.transferConversationToVoicemail = transferConversationToVoicemail;
