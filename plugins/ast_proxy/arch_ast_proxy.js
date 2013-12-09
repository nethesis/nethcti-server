/**
* The architect component that exposes _ast\_proxy_ module.
*
* @class arch_ast_proxy
*/
var astProxy = require('./ast_proxy');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_ast_proxy]
*/
var IDLOG = '[arch_ast_proxy]';

module.exports = function (options, imports, register) {

    var logger = console;
    if (imports.logger) { logger = imports.logger; }
    
    // public interface for other architect components
    register(null, {
        astProxy: {
            /**
            * It's the _on_ method provided by _ast\_proxy_ module.
            *
            * @method on
            * @param {string} type The name of the event
            * @param {function} cb The callback to execute in response to the event
            * @return {object} A subscription handle capable of detaching that subscription
            */
            on: astProxy.on,

            /**
            * It's the _doCmd_ method provided by _ast\_proxy_ module.
            *
            * @method doCmd
            * @param {object} obj The object with the command name to execute and optional parameters
            *   @param {string} obj.command The command name to execute. A plugin command file with the
            *   same name must be present into the appropriate directory
            *   @param [obj.parameters] 0..n The parameters that can be used into the command plugin
            * @param {function} cb The callback
            */
            doCmd: astProxy.doCmd,

            /**
            * It's the _setDnd_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method setDnd
            */
            setDnd: astProxy.proxyLogic.setDnd,

            /**
            * It's the _getExtensions_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getExtensions
            * @return {object} The extension list.
            */
            getExtensions: astProxy.proxyLogic.getExtensions,

            /**
            * It's the _hangupConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method hangupConversation
            */
            hangupConversation: astProxy.proxyLogic.hangupConversation,

            /**
            * It's the _startRecordConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method startRecordConversation
            */
            startRecordConversation: astProxy.proxyLogic.startRecordConversation,

            /**
            * It's the _stopRecordConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method stopRecordConversation
            */
            stopRecordConversation: astProxy.proxyLogic.stopRecordConversation,

            /**
            * It's the _parkConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method parkConversation
            */
            parkConversation: astProxy.proxyLogic.parkConversation,

            /**
            * It's the _redirectConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method redirectConversation
            */
            redirectConversation: astProxy.proxyLogic.redirectConversation,

            /**
            * It's the _redirectWaitingCaller_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method redirectWaitingCaller
            */
            redirectWaitingCaller: astProxy.proxyLogic.redirectWaitingCaller,

            /**
            * It's the _redirectParking_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method redirectParking
            */
            redirectParking: astProxy.proxyLogic.redirectParking,

            /**
            * It's the _attendedTransferConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method attendedTransferConversation
            */
            attendedTransferConversation: astProxy.proxyLogic.attendedTransferConversation,

            /**
            * It's the _transferConversationToVoicemail_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method transferConversationToVoicemail
            */
            transferConversationToVoicemail: astProxy.proxyLogic.transferConversationToVoicemail,

            /**
            * It's the _call_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method call
            */
            call: astProxy.proxyLogic.call,

            /**
            * It's the _pickupConv_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method pickupConv
            */
            pickupConversation: astProxy.proxyLogic.pickupConversation,

            /**
            * It's the _pickupParking_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method pickupParking
            */
            pickupParking: astProxy.proxyLogic.pickupParking,

            /**
            * It's the _inoutDynQueues_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method inoutDynQueues
            */
            inoutDynQueues: astProxy.proxyLogic.inoutDynQueues,

            /**
            * It's the _queueMemberPauseUnpause_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method queueMemberPauseUnpause
            */
            queueMemberPauseUnpause: astProxy.proxyLogic.queueMemberPauseUnpause,

            /**
            * It's the _startSpyListenConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method startSpyListenConversation
            */
            startSpyListenConversation: astProxy.proxyLogic.startSpyListenConversation,

            /**
            * It's the _startSpySpeakConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method startSpySpeakConversation
            */
            startSpySpeakConversation: astProxy.proxyLogic.startSpySpeakConversation,

            /**
            * It's the _getJSONExtensions_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONExtensions
            */
            getJSONExtensions: astProxy.proxyLogic.getJSONExtensions,

            /**
            * It's the _getJSONQueues_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONQueues
            */
            getJSONQueues: astProxy.proxyLogic.getJSONQueues,

            /**
            * It's the _getJSONTrunks_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONTrunks
            */
            getJSONTrunks: astProxy.proxyLogic.getJSONTrunks,

            /**
            * It's the _getJSONParkings_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONParkings
            */
            getJSONParkings: astProxy.proxyLogic.getJSONParkings,

            /**
            * It's the _sendDTMFSequence_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method sendDTMFSequence
            */
            sendDTMFSequence: astProxy.proxyLogic.sendDTMFSequence,

            /**
            * It's the _getExtensionsFromConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getExtensionsFromConversation
            */
            getExtensionsFromConversation: astProxy.proxyLogic.getExtensionsFromConversation,

            /**
            * It's the _getBaseCallRecAudioPath_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getBaseCallRecAudioPath
            */
            getBaseCallRecAudioPath: astProxy.proxyLogic.getBaseCallRecAudioPath,

            /**
            * It's the _CF\_TYPES_ property provided by _proxy\_logic\_11/util\_call\_forward\_11_.
            *
            * @method CF_TYPES
            */
            CF_TYPES: require('./proxy_logic_11/util_call_forward_11').CF_TYPES,

            /**
            * It's the _EVT\_EXTEN\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_EXTEN_CHANGED
            */
            EVT_EXTEN_CHANGED: astProxy.proxyLogic.EVT_EXTEN_CHANGED,

            /**
            * It's the _EVT\_QUEUE\_MEMBER\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_QUEUE_MEMBER_CHANGED
            */
            EVT_QUEUE_MEMBER_CHANGED: astProxy.proxyLogic.EVT_QUEUE_MEMBER_CHANGED,

            /**
            * It's the _EVT\_TRUNK\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_TRUNK_CHANGED
            */
            EVT_TRUNK_CHANGED: astProxy.proxyLogic.EVT_TRUNK_CHANGED,

            /**
            * It's the _EVT\_EXTEN\_DIALING_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_EXTEN_DIALING
            */
            EVT_EXTEN_DIALING: astProxy.proxyLogic.EVT_EXTEN_DIALING,

            /**
            * It's the _EVT\_QUEUE\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_QUEUE_CHANGED
            */
            EVT_QUEUE_CHANGED: astProxy.proxyLogic.EVT_QUEUE_CHANGED,

            /**
            * It's the _EVT\_PARKING\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_PARKING_CHANGED
            */
            EVT_PARKING_CHANGED: astProxy.proxyLogic.EVT_PARKING_CHANGED,

            /**
            * It's the _EVT\_NEW\_VOICEMAIL_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_NEW_VOICEMAIL
            */
            EVT_NEW_VOICEMAIL: astProxy.proxyLogic.EVT_NEW_VOICEMAIL
        }
    });

    try {
        astProxy.setLogger(logger);
        astProxy.config('/etc/nethcti/asterisk.json');
        astProxy.proxyLogic.setCompDbconn(imports.dbconn);
        astProxy.proxyLogic.setCompPhonebook(imports.phonebook);
        astProxy.proxyLogic.setCompCallerNote(imports.callerNote);
        astProxy.start();
    } catch (err) {
        logger.error(err.stack);
    }
}
