/**
* The architect component that exposes _ast\_proxy_ module.
*
* @class arch_ast_proxy
*/
var astProxy = require('./ast_proxy');
var queueRecallingManager = require('./queue_recalling_manager');

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
            * It's the _getSipWebrtcConf_ method provided by _ast\_proxy_.
            *
            * @method getSipWebrtcConf
            */
            getSipWebrtcConf: astProxy.getSipWebrtcConf,

            /**
            * It's the _setDnd_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method setDnd
            */
            setDnd: astProxy.proxyLogic.setDnd,

            /**
            * It's the _getConference_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getConference
            */
            getConference: astProxy.proxyLogic.getConference,

            /**
            * It's the _getEchoCallDestination_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getEchoCallDestination
            */
            getEchoCallDestination: astProxy.proxyLogic.getEchoCallDestination,

            /**
            * It's the _getMeetmeConfCode_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getMeetmeConfCode
            */
            getMeetmeConfCode: astProxy.proxyLogic.getMeetmeConfCode,

            /**
            * It's the _unmuteUserMeetmeConf_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method unmuteUserMeetmeConf
            */
            unmuteUserMeetmeConf: astProxy.proxyLogic.unmuteUserMeetmeConf,

            /**
            * It's the _muteUserMeetmeConf_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method muteUserMeetmeConf
            */
            muteUserMeetmeConf: astProxy.proxyLogic.muteUserMeetmeConf,

            /**
            * It's the _isExtenInMeetmeConf_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method isExtenInMeetmeConf
            */
            isExtenInMeetmeConf: astProxy.proxyLogic.isExtenInMeetmeConf,

            /**
            * It's the _setUnconditionalCfVm_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method setUnconditionalCfVm
            */
            setUnconditionalCfVm: astProxy.proxyLogic.setUnconditionalCfVm,

            /**
            * It's the _startMeetmeConference_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method startMeetmeConference
            */
            startMeetmeConference: astProxy.proxyLogic.startMeetmeConference,

            /**
            * It's the _setUnconditionalCf_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method setUnconditionalCf
            */
            setUnconditionalCf: astProxy.proxyLogic.setUnconditionalCf,

            /**
            * It's the _getExtensions_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getExtensions
            * @return {object} The extension list.
            */
            getExtensions: astProxy.proxyLogic.getExtensions,

            /**
            * It's the _getExtensionAgent_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getExtensionAgent
            */
            getExtensionAgent: astProxy.proxyLogic.getExtensionAgent,

            /**
            * It's the _getExtensionIp_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getExtensionIp
            */
            getExtensionIp: astProxy.proxyLogic.getExtensionIp,

            /**
            * It's the _getPrefix_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getPrefix
            */
            getPrefix: astProxy.proxyLogic.getPrefix,

            /**
            * It's the _addPrefix_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method addPrefix
            */
            addPrefix: astProxy.proxyLogic.addPrefix,

            /**
            * It's the _hangupChannel_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method hangupChannel
            */
            hangupChannel: astProxy.proxyLogic.hangupChannel,

            /**
            * It's the _hangupConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method hangupConversation
            */
            hangupConversation: astProxy.proxyLogic.hangupConversation,

            /**
            * It's the _forceHangupConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method forceHangupConversation
            */
            forceHangupConversation: astProxy.proxyLogic.forceHangupConversation,

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
            * It's the _muteRecordConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method muteRecordConversation
            */
            muteRecordConversation: astProxy.proxyLogic.muteRecordConversation,

            /**
            * It's the _unmuteRecordConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method unmuteRecordConversation
            */
            unmuteRecordConversation: astProxy.proxyLogic.unmuteRecordConversation,

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
            * It's the _muteConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method mute
            */
            muteConversation: astProxy.proxyLogic.muteConversation,

            /**
            * It's the _unmuteConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method unmute
            */
            unmuteConversation: astProxy.proxyLogic.unmuteConversation,

            /**
            * It's the _sendDtmfToConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method sendDtmfToConversation
            */
            sendDtmfToConversation: astProxy.proxyLogic.sendDtmfToConversation,

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
            * It's the _queueMemberAdd_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method queueMemberAdd
            */
            queueMemberAdd: astProxy.proxyLogic.queueMemberAdd,

            /**
            * It's the _queueMemberRemove_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method queueMemberRemove
            */
            queueMemberRemove: astProxy.proxyLogic.queueMemberRemove,

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
            * It's the _getJSONExtension_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONExtension
            */
            getJSONExtension: astProxy.proxyLogic.getJSONExtension,

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
            * It's the _getJSONQueuesStats_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONQueuesStats
            */
            getJSONQueuesStats: astProxy.proxyLogic.getJSONQueuesStats,

            /**
            * It's the _getJSONQueuesQOS_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONQueuesQOS
            */
            getJSONQueuesQOS: astProxy.proxyLogic.getJSONQueuesQOS,

            /**
            * It's the _getJSONAgentsStats_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONAgentsStats
            */
            getJSONAgentsStats: astProxy.proxyLogic.getJSONAgentsStats,

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
            * It's the _getQueueIdsOfExten_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getQueueIdsOfExten
            */
            getQueueIdsOfExten: astProxy.proxyLogic.getQueueIdsOfExten,

            /**
            * It's the _recordAudioFile_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method recordAudioFile
            */
            recordAudioFile: astProxy.proxyLogic.recordAudioFile,

            /**
            * It's the _isExtenDynMemberQueue_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method isExtenDynMemberQueue
            */
            isExtenDynMemberQueue: astProxy.proxyLogic.isExtenDynMemberQueue,

            /**
            * It's the _isExtenWebrtc_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method isExtenWebrtc
            */
            isExtenWebrtc: astProxy.proxyLogic.isExtenWebrtc,

            /**
            * It's the _isDynMemberLoggedInQueue_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method isDynMemberLoggedInQueue
            */
            isDynMemberLoggedInQueue: astProxy.proxyLogic.isDynMemberLoggedInQueue,

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
            * It's the _EVT\_NEW\_CDR_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_NEW_CDR
            */
            EVT_NEW_CDR: astProxy.proxyLogic.EVT_NEW_CDR,

            /**
            * It's the _EVT\_QUEUE\_MEMBER\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_QUEUE_MEMBER_CHANGED
            */
            EVT_QUEUE_MEMBER_CHANGED: astProxy.proxyLogic.EVT_QUEUE_MEMBER_CHANGED,

            /**
            * It's the _EVT\_MEETME\_CONF\_END_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_MEETME_CONF_END
            */
            EVT_MEETME_CONF_END: astProxy.proxyLogic.EVT_MEETME_CONF_END,

            /**
            * It's the _EVT\_MEETME\_CONF\_CHANGED_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_MEETME_CONF_CHANGED
            */
            EVT_MEETME_CONF_CHANGED: astProxy.proxyLogic.EVT_MEETME_CONF_CHANGED,

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
            * It's the _EVT\_NEW\_VOICE\_MESSAGE_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_NEW_VOICE_MESSAGE
            */
            EVT_NEW_VOICE_MESSAGE: astProxy.proxyLogic.EVT_NEW_VOICE_MESSAGE,

            /**
            * It's the _EVT\_UPDATE\_VOICE\_MESSAGES_ property provided by _ast\_proxy.proxyLogic_.
            *
            * @method EVT_UPDATE_VOICE_MESSAGES
            */
            EVT_UPDATE_VOICE_MESSAGES: astProxy.proxyLogic.EVT_UPDATE_VOICE_MESSAGES,

            /**
            * It's the _getQueueRecallData_ method provided by _queue\_recalling\_manager_.
            *
            * @method getQueueRecallData
            */
            getQueueRecallData: queueRecallingManager.getQueueRecallData,

            /**
            * It's the _getQueueRecallInfo_ method provided by _queue\_recalling\_manager_.
            *
            * @method getQueueRecallInfo
            */
            getQueueRecallInfo: queueRecallingManager.getQueueRecallInfo,

            /**
            * It is the _checkQueueRecallingStatus_ method provided by _queue\_recalling\_manager_.
            *
            * @method checkQueueRecallingStatus
            */
            checkQueueRecallingStatus: queueRecallingManager.checkQueueRecallingStatus
        }
    });

    try {
        imports.dbconn.on(imports.dbconn.EVT_READY, function () {
            astProxy.setLogger(logger);
            astProxy.config('/etc/nethcti/asterisk.json');
            astProxy.configSipWebrtc('/etc/nethcti/sip_webrtc.json');
            astProxy.proxyLogic.setCompDbconn(imports.dbconn);
            astProxy.proxyLogic.setCompPhonebook(imports.phonebook);
            astProxy.proxyLogic.setCompCallerNote(imports.callerNote);
            astProxy.start();
            queueRecallingManager.setLogger(logger);
            queueRecallingManager.setCompAstProxy(astProxy);
            queueRecallingManager.setCompDbconn(imports.dbconn);
        });
    } catch (err) {
        logger.error(err.stack);
    }
};
