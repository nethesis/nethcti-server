/**
* This is the asterisk proxy logic linked to version 11
* of the asterisk server.
*
* @class proxy_logic_11
* @static
*/
var path         = require('path');
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
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllExten);

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
        astProxy.doCmd({ command: 'listChannels' }, updateConversationsForAllExten);

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

            // add the created conversation to the extension
            extensions[exten].addConversation(conv);
            logger.info('the conversation ' + conv.getId() + ' has been added to exten ' + exten);

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

        // request all channels
        logger.info(IDLOG, 'requests the channel list to update the extension ' + exten);
        astProxy.doCmd({ command: 'listChannels' }, function (resp) {
            // update the conversations of the extension
            updateExtenConversations(exten, resp);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* If the involved numbers are extensions, it updates their converextensions.
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

        var convs = extensions[exten].getConversations();

        if (!convs) { return; }

        // get the conversation to hangup by conversation identifier
        var conv = convs[convid];

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

        var convs = extensions[exten].getConversations();

        if (!convs) { return; }

        // get the conversation to hangup by conversation identifier
        var conv = convs[convid];

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

            if (chid) {
                // start the recording
                logger.info(IDLOG, 'execute the stop record of the channel ' + chid + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'stopRecordCall', channel: chid }, function (resp) {
                    cb(resp);
                    stopRecordCb(resp);
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

            if (ch) {

                var chid = ch.getChannel(); // the channel identifier
                var filepath = getRecordConversationFilepath(ch);

                // start the recording
                logger.info(IDLOG, 'execute the record of the channel ' + chid + ' of exten ' + endpointId);
                astProxy.doCmd({ command: 'recordCall', channel: chid, filepath: filepath }, function (resp) {
                    cb(resp);
                    recordCb(resp);
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
*
* @method stopRecordCb
* @param {object} resp The response object of the operation
* @private
*/
function stopRecordCb(resp) {
    try {
        if (typeof resp === 'object' && resp.result === true) {
            logger.info(IDLOG, 'stop record channel started succesfully');

        } else {
            logger.warn(IDLOG, 'stop record channel failed' + (resp.cause ? (': ' + resp.cause) : '') );
        }

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* This is the callback of the record call command plugin.
*
* @method recordCb
* @param {object} resp The response object of the operation
* @private
*/
function recordCb(resp) {
    try {
        if (typeof resp === 'object' && resp.result === true) {
            logger.info(IDLOG, 'record channel started succesfully');

        } else {
            logger.warn(IDLOG, 'record channel failed' + (resp.cause ? (': ' + resp.cause) : '') );
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
exports.extenStatusChanged = extenStatusChanged;
exports.hangupConversation = hangupConversation;
exports.recordConversation = recordConversation;
exports.conversationConnected  = conversationConnected;
exports.stopRecordConversation = stopRecordConversation;
