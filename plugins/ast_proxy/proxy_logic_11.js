/**
* This is the asterisk proxy logic linked to version 11
* of the asterisk server.
*
* @class proxy_logic_11
* @static
*/
var Channel      = require('./channel').Channel;
var iniparser    = require('iniparser');
var Extension    = require('./extension').Extension;
var Conversation = require('./conversation').Conversation;
var EventEmitter = require('events').EventEmitter;

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
* @event extension
* @param {object} msg The extension object
*/
var EVT_EXTEN_CHANGED = 'extenChanged';

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
        var iaxlist = {};
        var i;
        for (i = 0; i < resp.length; i++) { iaxlist[resp[i].ext] = ''; }

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
        initializeIaxExten();
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
* @private
*/
function initializeIaxExten() {
    try {
        var k, exten;
        for (k in struct) {

            if (struct[k].type    === INI_STRUCT.TYPE.EXTEN
                && struct[k].tech === INI_STRUCT.TECH.IAX) { // all iax extensions

                exten = new Extension(struct[k].extension, struct[k].tech);
                extensions[exten.getExten()] = exten;
                extensions[exten.getExten()].setName(struct[k].label);
            }
        }
        // request iax details for all extensions
        astProxy.doCmd({ command: 'listIaxPeers' }, listIaxPeers);

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
        }
        // request all channels
        logger.info(IDLOG, 'requests the channel list to initialize iax extensions');
        astProxy.doCmd({ command: 'listChannels' }, listChannels);

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
            }
        }
        // request all channels
        logger.info(IDLOG, 'requests the channel list to initialize sip extensions');
        astProxy.doCmd({ command: 'listChannels' }, listChannels);

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
            extensions[data.exten].setIp(data.ip);
            logger.info(IDLOG, 'set sip details for ext ' + data.exten);

        } else {
            logger.warn(IDLOG, 'sip details ' + (resp.message !== undefined ? resp.message : ''));
        }
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
        logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for extension ' + resp.exten.exten);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Creates the _conversation_ objects and add them to
* the extensions.
*
* @method listChannels
* @param {object} resp The channel list.
* @private
*/
function listChannels(resp) {
    try {
        // check parameter
        if (!resp) { throw new Error('wrong parameter'); }

        var ch, ext, chid, conv, chSource, chDest, chBridged;
        // cycle in all received channels
        for (chid in resp) {

            ext = resp[chid].callerNum;

            if (extensions[ext]) {

                chDest    = undefined;
                chSource  = undefined;
                chBridged = undefined;

                // creates the source and destination channels
                ch = new Channel(resp[chid]);
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
                conv = new Conversation(chSource, chDest);

                // add the created conversation to the extension
                extensions[ext].addConversation(conv);
                logger.info('the conversation ' + conv.getId() + ' has been added to exten ' + ext);
            }
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
* Remove the conversation from an extension and emit
* _EVT\_EXTEN\_CHANGED_ event.
*
* @method hangupConversation
* @param {object} obj
* @param {string} obj.ext The extension number
* @param {string} obj.channel The channel identifier
*/
function hangupConversation(obj) {
    try {
        // check parameter
        if (!obj
            || typeof obj.ch  !== 'string'
            || typeof obj.ext !== 'string') {

            throw new Error('wrong parameter');
        }

        var ch  = obj.ch;
        var ext = obj.ext;

        logger.info(IDLOG, 'hangup conversation for exten ' + ext + ' channel ' + ch);

        // check extension presence
        if (extensions[ext]) {

            // search conversation to remove by channel
            var convs = extensions[ext].getConversations();
            var convid;
            for (convid in convs) {

                if (convid.indexOf(ch) !== -1 // the conversation id contains the channel id
                    && ( // additional check
                        convs[convid].getDestinationChannel().getChannel() === ch
                        || convs[convid].getSourceChannel().getChannel()   === ch
                    )) {

                    extensions[ext].removeConversation(convid);
                    logger.info(IDLOG, 'removed conversation ' + convid + ' from extension ' + ext);
                    astProxy.emit(EVT_EXTEN_CHANGED, extensions[ext]);
                    logger.info(IDLOG, 'emitted event ' + EVT_EXTEN_CHANGED + ' for extension ' + ext);
                    return;
                }
            }
        }
        logger.info(IDLOG, 'conversation to delete not found for extension ' + ext);
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
* the channel list.
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

        // request sip details for current extension
        extensions[exten].setStatus(status);
        logger.info(IDLOG, 'set status ' + status + ' for extension ' + exten);

        // update extension informations. This is because when the extension becomes
        // offline/online ip, port and other informations needs to be updated
        astProxy.doCmd({ command: 'sipDetails', exten: exten }, updateExtSipDetails);

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
exports.hangupConversation = hangupConversation;
exports.extenStatusChanged = extenStatusChanged;
