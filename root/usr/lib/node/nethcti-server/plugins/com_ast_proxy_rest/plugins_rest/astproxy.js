/**
* Provides asterisk proxy functions through REST API.
*
* @module com_ast_proxy_rest
* @submodule plugins_rest
*/
var urlReq  = require('url');
var httpReq = require('http');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins_rest/astproxy]
*/
var IDLOG = '[plugins_rest/astproxy]';

/**
* The string used to hide phone numbers in privacy mode.
*
* @property privacyStrReplace
* @type {string}
* @private
* @default "xxx"
*/
var privacyStrReplace = 'xxx';

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
* Dtmf tones permitted.
*
* @property dtmfTonesPermitted
* @type object
* @private
* @default [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#' ]
*/
var dtmfTonesPermitted = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#' ];

/**
* The architect component to be used for websocket communication.
*
* @property compComNethctiWs
* @type object
* @private
*/
var compComNethctiWs;

/**
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

/**
* The architect component to be used for user.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The architect component to be used for operator.
*
* @property compOperator
* @type object
* @private
*/
var compOperator;

/**
* The asterisk proxy component used for asterisk functions.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* The remote sites communication architect component.
*
* @property compComNethctiRemotes
* @type object
* @private
*/
var compComNethctiRemotes;

/**
* The configuration manager architect component used for configuration functions.
*
* @property compConfigManager
* @type object
* @private
*/
var compConfigManager;

(function(){
    try {
        /**
        * REST plugin that provides asterisk functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`astproxy/cw/:endpoint`](#cwget)
        * 1. [`astproxy/dnd/:endpoint`](#dndget)
        * 1. [`astproxy/cfvm/:type/:endpoint`](#cfvmget)
        * 1. [`astproxy/unauthe_call/:endpoint/:number`](#unauthe_callget)
        * 1. [`astproxy/prefix`](#prefixget)
        * 1. [`astproxy/remote_prefixes`](#remote_prefixesget)
        * 1. [`astproxy/cfcall/:type/:endpoint`](#cfcallget)
        * 1. [`astproxy/queues`](#queuesget)
        * 1. [`astproxy/trunks`](#trunksget)
        * 1. [`astproxy/opgroups`](#opgroupsget)
        * 1. [`astproxy/conference/:endpoint`](#conferenceget)
        * 1. [`astproxy/remote_opgroups`](#remote_opgroupsget)
        * 1. [`astproxy/parkings`](#parkingsget)
        * 1. [`astproxy/extensions`](#extensionsget)
        * 1. [`astproxy/remote_extensions`](#remote_extensionsget)
        * 1. [`astproxy/sip_webrtc`](#sip_webrtcget)
        * 1. [`astproxy/queues_stats/:day`](#queues_statsget)
        * 1. [`astproxy/queue_recall/:type/:val/:qid`](#queue_recallget)
        * 1. [`astproxy/qrecall_info/:type/:val/:cid`](#qrecall_infoget)
        * 1. [`astproxy/qrecall_check/:num`](#qrecall_checkget)
        * 1. [`astproxy/queues_qos/:day`](#queues_qosget)
        * 1. [`astproxy/agents_qos/:day`](#agents_qosget)
        * 1. [`astproxy/is_autoc2c_supported/:endpoint`](#is_autoc2c_supportedget)
        *
        * ---
        *
        * ### <a id="cwget">**`astproxy/cw/:endpoint`**</a>
        *
        * Gets the call waiting status of the endpoint of the user
        *
        * * `endpoint: the extension identifier`
        *
        * Example JSON response:
        *
        *     {
         "exten": "614",
         "cw": "on"
     }
        *
        * ---
        *
        * ### <a id="dndget">**`astproxy/dnd/:endpoint`**</a>
        *
        * Gets the don't disturb status of the endpoint of the user. The endpoint is
        * the extension identifier.
        *
        * Example JSON response:
        *
        *     {
         "exten": "614"
         "dnd": "off"
     }
        *
        * ---
        *
        * ### <a id="cfvmget">**`astproxy/cfvm/:type/:endpoint`**</a>
        *
        * Gets the call forward status to voicemail of the endpoint of the user
        *
        * * `endpoint: the extension identifier`
        * * `type: ("unconditional" | "unavailable" | "busy")`
        *
        * Example JSON response:
        *
        *     {
         "exten": "614"
         "status": "off"
         "cf_type": "unconditional"
     }
        *
        * ---
        *
        * ### <a id="unauthe_callget">**`astproxy/unauthe_call/:endpoint/:number`**</a>
        *
        * Calls a number from the specified endpoint. This api does not require the authentication.
        * It is disabled by default, so it must be explicitly enabled by the server configuration.
        *
        * * `number: the number to be called`
        * * `endpoint: the endpoint identifier that makes the new call`
        *
        * ---
        *
        * ### <a id="prefixget">**`astproxy/prefix`**</a>
        *
        * Returns the prefix number used with outgoing external calls.
        *
        * Example JSON response:
        *
        *     {
         "prefix": "0039"
     }
        *
        * ---
        *
        * ### <a id="remote_prefixesget">**`astproxy/remote_prefixes`**</a>
        *
        * Returns the prefix number of all remote sites used with outgoing external calls.
        *
        * Example JSON response:
        *
        *     {
         "site1": "6",
         "site2": "7"
     }
        *
        * ---
        *
        * ### <a id="cfcallget">**`astproxy/cfcall/:type/:endpoint`**</a>
        *
        * Gets the call forward status to a destination number of the endpoint of the user
        *
        * * `endpoint: the extension identifier`
        * * `type: ("unconditional" | "unavailable" | "busy")`
        *
        * Example JSON response:
        *
        *     {
         "exten": "614"
         "status": "off"
         "type": "unconditional"
      }
        *
        * ---
        *
        * ### <a id="queuesget">**`astproxy/queues`**</a>
        *
        * Gets the queues of the operator panel of the user.
        *
        * Example JSON response:
        *
        *     {
         "501": {
               "name": "hold501",
               "queue": "501",
               "members": {
                  "609": {
                      "type": "dynamic",
                      "name": "",
                      "queue": "501",
                      "member": "609",
                      "paused": false,
                      "loggedIn": false,
                      "callsTakenCount": 0,
                      "lastCallTimestamp": 0,
                      "lastPausedInReason": "",
                      "lastPausedInTimestamp": 0,
                      "lastPausedOutTimestamp": 0
                  }
               },
               "avgHoldTime": "0",
               "avgTalkTime": "0",
               "waitingCallers": {},
               "completedCallsCount": "0",
               "abandonedCallsCount": "0",
               "serviceLevelTimePeriod": "60",
               "serviceLevelPercentage": "0.0"
           }
     }
        *
        * ---
        *
        * ### <a id="trunksget">**`astproxy/trunks`**</a>
        *
        * Gets the trunks of the operator panel of the user.
        *
        * Example JSON response:
        *
        *     {
         "2001": {
               "ip": "",
               "port": "",
               "name": "",
               "exten": "2001",
               "status": "offline",
               "chanType": "sip",
               "maxChannels": 4,
               "sipuseragent": "",
               "conversations": {}
         }
     }
        * ---
        *
        * ### <a id="opgroupsget">**`astproxy/opgroups`**</a>
        *
        * Gets the user groups of the operator panel of the local site.
        *
        * Example JSON response:
        *
        *     {
         "Development": {
              "users": [
                  "name5",
                  "name6",
                  "name7"
              ]
          }
     }
        *
        * ---
        *
        * ### <a id="remote_opgroupsget">**`astproxy/remote_opgroups`**</a>
        *
        * Gets the user groups of the operator panel of all remote sites.
        *
        * Example JSON response:
        *
        *     {
         "nethesis",
             "Development": {
                  "users": [
                      "name5",
                      "name6",
                      "name7"
                  ]
              }
         },
         "ranocchi",
             "Support": {
                  "users": [
                      "name1",
                      "name2",
                      "name3"
                  ]
              }
         }
     }
        *
        * ---
        *
        * ### <a id="conferenceget">**`astproxy/conference/:endpoint`**</a>
        *
        * Gets the data about the extension meetme conference.
        *
        * Example JSON response:
        *
        *     {
         "id": "202",
         "users": {
             "1": {
                 "id": "1",
                 "name": "202",
                 "owner": true,
                 "muted": false,
                 "extenId": "202"
             }
         }
     }
        *
        * ---
        *
        * ### <a id="parkingsget">**`astproxy/parkings`**</a>
        *
        * Gets all the parkings with all their status informations.
        *
        * Example JSON response:
        *
        *     {
         "71": {
              "name": "71",
              "parking": "71",
              "parkedCaller": {}
          }
     }
        *
        * ---
        *
        * ### <a id="extensionsget">**`astproxy/extensions`**</a>
        *
        * Gets all the extensions with all their status informations.
        *
        * Example JSON response:
        *
        *     {
         "602": {
              "ip": "",
              "cf": "",
              "dnd": false,
              "cfVm": "",
              "port": "",
              "name": "cristian",
              "exten": "602",
              "status": "offline",
              "chanType": "sip",
              "sipuseragent": "",
              "conversations": {}
          }
     }
        *
        * ---
        *
        * ### <a id="remote_extensionsget">**`astproxy/remote_extensions`**</a>
        *
        * Gets all the extensions with all their status informations of all remote sites.
        *
        * Example JSON response:
        *
        *     {
         "nethesis": {
             "602": {
                  "ip": "",
                  "cf": "",
                  "dnd": false,
                  "cfVm": "",
                  "port": "",
                  "name": "cristian",
                  "exten": "602",
                  "status": "offline",
                  "chanType": "sip",
                  "sipuseragent": "",
                  "conversations": {}
              }
         }
     }
        *
        * ---
        *
        * ### <a id="sip_webrtcget">**`astproxy/sip_webrtc`**</a>
        *
        * Gets all the configuration about the sip WebRTC.
        *
        * Example JSON response:
        *
        *     {
         "stun_server_address": "stun.l.google.com:19302"
     }
        *
        * ---
        *
        * ### <a id="queues_statsget">**`astproxy/queues_stats/:day`**</a>
        *
        * Gets extended statistics about queues. The day must be expressed in YYYYMMDD format.
        *
        * Example JSON response:
        *
        *     {
         "general": {
              "401": {
                  "ANSWER": {
                      "4": 3,
                      "5": 6,
                      "7": 3,
                      "8": 1,
                      "9": 1,
                      "13": 1,
                      "15": 1,
                      "18": 1,
                      "28": 1,
                      "43": 1,
                      "140": 1
                  },
                  "ABANDON": {
                      "nulled": 6
                  },
                  "TIMEOUT": 0
              }
          },
          "answer": {
              "401": {
                  "queuename": "401",
                  "calls": 20,
                  "max_hold": 140,
                  "min_hold": 4,
                  "avg_hold": 16.85,
                  "max_duration": 1057,
                  "min_duration": 12,
                  "avg_duration": 289.9,
                  "id": null
              }
          }
     }
        *
        * ---
        *
        * ### <a id="queue_recallget">**`astproxy/queue_recall/:type/:val/:qid`**</a>
        *
        * Gets the recall data about the queue. The request must contains
        * the following parameters:
        *
        * * `type: ("day | "hours") the type of the interval time to be searched`
        * * `val: in case of _type=hours_ is the amount of last hours to be searched, while in case
        *         of _type=day_ is the single day date expressed using the format YYYYMMDD`
        * * `qid: the queue identifier`
        *
        * Example JSON response:
        *
        *     {
         company: "Nethesis",
         cid: "0721405516",
         action: "RECALL",
         time: "2015-12-30 17:21:45.2990102,
         qname: 2401"
     }
        *
        * ---
        *
        * ### <a id="qrecall_checkget">**`astproxy/qrecall_check/:num`**</a>
        *
        * Check if the number is already in a conversation. The _num_ is the number to be checked.
        *
        * Example JSON response:
        *
        *     {
         inConversation: true
     }
        *
        * ---
        *
        * ### <a id="qrecall_infoget">**`astproxy/qrecall_info/:type/:val/:cid`**</a>
        *
        * Gets details about the queue call. The request must contains
        * the following parameters:
        *
        * * `type: ("day | "hours") the type of the interval time to be searched`
        * * `val: in case of _type=hours_ is the amount of last hours to be searched, while in case
        *         of _type=day_ is the single day date expressed using the format YYYYMMDD`
        * * `cid: the caller identifier`
        *
        * Example JSON response:
        *
        *     {
         action: "DONE"
         cid: "0721405516"
         company: "Nethesis"
         qname: "IN"
         time: "2015-12-30T12:57:18.000Z"
     }
        *
        * ---
        *
        * ### <a id="queues_qosget">**`astproxy/queues_qos/:day`**</a>
        *
        * Gets QOS info about queues. The day must be expressed in YYYYMMDD format.
        *
        * Example JSON response:
        *
        *     [
         {
               "agent": "Andrea Marchionni"
               "period: "23-01-2014"
               "queuename: "401"
               "calls: 1
               "tot_duration: 47
               "max_duration: 47
               "min_duration: 47
               "avg_duration: 47
               "id: null
               "ringnoanswers: 21
         }
     ]
        *
        * ---
        *
        * ### <a id="agents_qosget">**`astproxy/agents_qos/:day`**</a>
        *
        * Gets QOS info about agents. The day must be expressed in YYYYMMDD format.
        *
        * Example JSON response:
        *
        *     {
         "join_leave_queue": {},
         "pause_unpause": {},
         "logon_logoff": {},
         "inqueue_outqueue": {}
     }
        *
        * ---
        *
        * ### <a id="is_autoc2c_supportedget">**`astproxy/is_autoc2c_supported/:endpoint`**</a>
        *
        * Returns true if the endpoint is supported by the automatic click2call.
        *
        * * `endpoint: the extension identifier`
        *
        * Example JSON response:
        *
        *     {
         "exten": "614",
         "agent": "Yealink SIP-T22P 7.72.0.25",
         "supported": true
     }
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`astproxy/cw`](#cwpost)
        * 1. [`astproxy/dnd`](#dndpost)
        * 1. [`astproxy/park`](#parkpost)
        * 1. [`astproxy/call`](#callpost)
        * 1. [`astproxy/remote_call`](#remote_callpost)
        * 1. [`astproxy/cfvm`](#cfvmpost)
        * 1. [`astproxy/mute`](#mutepost)
        * 1. [`astproxy/unmute`](#unmutepost)
        * 1. [`astproxy/cfcall`](#cfcallpost)
        * 1. [`astproxy/atxfer`](#atxferpost)
        * 1. [`astproxy/answer`](#answerpost)
        * 1. [`astproxy/hangup`](#hanguppost)
        * 1. [`astproxy/intrude`](#intrudepost)
        * 1. [`astproxy/end_conf`](#end_confpost)
        * 1. [`astproxy/send_dtmf`](#send_dtmfpost)
        * 1. [`astproxy/call_echo`](#call_echopost)
        * 1. [`astproxy/start_spy`](#start_spypost)
        * 1. [`astproxy/txfer_tovm`](#txfer_tovmpost)
        * 1. [`astproxy/start_conf`](#start_confpost)
        * 1. [`astproxy/join_myconf`](#join_myconfpost)
        * 1. [`astproxy/pickup_conv`](#pickup_convpost)
        * 1. [`astproxy/stop_record`](#stop_recordpost)
        * 1. [`astproxy/mute_record`](#mute_recordpost)
        * 1. [`astproxy/start_record`](#start_recordpost)
        * 1. [`astproxy/force_hangup`](#force_hanguppost)
        * 1. [`astproxy/mute_userconf`](#mute_userconfpost)
        * 1. [`astproxy/hangup_userconf`](#hangup_userconfpost)
        * 1. [`astproxy/unmute_userconf`](#unmute_userconfpost)
        * 1. [`astproxy/answer_webrtc`](#answer_webrtcpost)
        * 1. [`astproxy/blindtransfer`](#blindtransferpost)
        * 1. [`astproxy/unmute_record`](#unmute_recordpost)
        * 1. [`astproxy/hangup_channel`](#hangup_channelpost)
        * 1. [`astproxy/pickup_parking`](#pickup_parkingpost)
        * 1. [`astproxy/queuemember_add`](#queuemember_addpost)
        * 1. [`astproxy/inout_dyn_queues`](#inout_dyn_queuespost)
        * 1. [`astproxy/queuemember_pause`](#queuemember_pausepost)
        * 1. [`astproxy/queuemember_remove`](#queuemember_removepost)
        * 1. [`astproxy/queuemember_unpause`](#queuemember_unpausepost)
        * 1. [`astproxy/blindtransfer_queue`](#blindtransfer_queuepost)
        * 1. [`astproxy/blindtransfer_parking`](#blindtransfer_parkingpost)
        *
        * ---
        *
        * ### <a id="cwpost">**`astproxy/cw`**</a>
        *
        * Sets the call waiting status of the endpoint of the user. The request must contains
        * the following parameters:
        *
        * * `endpoint: the extension identifier`
        * * `status: ("on" | "off")`
        *
        * Example JSON request parameters:
        *
        *     { "endpoint": "214", "status": "on" }
        *
        * ---
        *
        * ### <a id="cfcallpost">**`astproxy/cfcall`**</a>
        *
        * Sets the call forward status of the endpoint of the user to a destination number. The request must contains
        * the following parameters:
        *
        * * `endpoint: the extension identifier`
        * * `status: ("on" | "off")`
        * * `type: ("unconditional" | "unavailable" | "busy")`
        * * `[to]: the destination number (optional when the status is off)`
        *
        * Example JSON request parameters:
        *
        *     { "endpoint": "214", "status": "on", "type": "unconditional", "to": "340123456" }
        *     { "endpoint": "214", "status": "off", "type": "unconditional" }
        *
        * **Note:** _astproxy/cfcall_ and _astproxy/cfvoicemail_ are mutually exclusive because both
        * of them use the same property in the asterisk server database. So, e.g. setting the
        * status to _off_ for _astproxy/cfcall_ type, automatically set to _off_ also the _astproxy/cfvm_
        * type and vice versa. Or setting to _on_ the _astproxy/cfcall_ type, automatically set to
        * _off_ the _astproxy/cfvm_ type.
        *
        * ---
        *
        * ### <a id="cfvmpost">**`astproxy/cfvm`**</a>
        *
        * Sets the call forward status of the endpoint of the user to voicemail. The request must contains
        * the following parameters:
        *
        * * `endpoint: the extension identifier`
        * * `status: ("on" | "off")`
        * * `type: ("unconditional" | "unavailable" | "busy")`
        * * `[to]: the destination voicemail identifier (optional when the status is off)`
        *
        * Example JSON request parameters:
        *
        *     { "endpoint": "214", "status": "on", "type": "unconditional", "to": "209" }
        *     { "endpoint": "214", "status": "off", "type": "unconditional" }
        *
        * **Note:** _astproxy/cfcall_ and _astproxy/cfvoicemail_ are mutually exclusive because both
        * of them use the same property in the asterisk server database. So, e.g. setting the
        * status to _off_ for _astproxy/cfcall_ type, automatically set to _off_ also the _astproxy/cfvm_
        * type and vice versa. Or setting to _on_ the _astproxy/cfcall_ type, automatically set to
        * _off_ the _astproxy/cfvm_ type.
        *
        * ---
        *
        * ### <a id="mutepost">**`astproxy/mute`**</a>
        *
        * Mute audio of the conversation in one direction only. The specified endpointId is able to listen.
        * The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to mute. The user must be the owner of the endpoint.`
        * * `endpointType: the type of the endpoint that has the conversation to mute`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="unmutepost">**`astproxy/unmute`**</a>
        *
        * Unmute audio of the conversation on both sides. The request must contains
        * the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to unmute. The user must be the owner of the endpoint.`
        * * `endpointType: the type of the endpoint that has the conversation to unmute`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="dndpost">**`astproxy/dnd`**</a>
        *
        * Sets the don't disturb status of the endpoint of the user. The request must contains
        * the following parameters:
        *
        * * `status: (on|off)`
        * * `endpoint`
        *
        * Example JSON request parameters:
        *
        *     { "endpoint": "214", "status": "on" }
        *
        * ---
        *
        * ### <a id="parkpost">**`astproxy/park`**</a>
        *
        * Park a conversation. The user can park only his own conversations. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to park`
        * * `applicantId: the endpoint identifier who requested the parking. It is assumed that the applicant type is the same of the endpointType`
        * * `endpointType: the type of the endpoint that has the conversation to park`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "221", "applicantId": "216" }
        *
        * ---
        *
        * ### <a id="callpost">**`astproxy/call`**</a>
        *
        * Calls a number from the specified endpoint. If the endpoint is not specified it will
        * use the user default. The request must contains the following parameters:
        *
        * * `number: the number to be called`
        * * `[endpointId]: the endpoint identifier that make the new call. It requires "endpointType".`
        * * `[endpointType]: ("extension" | "cellphone") the type of the endpoint that makes the new call. It requires "endpointId".`
        *
        * Example JSON request parameters:
        *
        *     { "number": "0123456789" }
        *     { "number": "0123456789", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="remote_callpost">**`astproxy/remote_call`**</a>
        *
        * Calls a remote extension of a remote site from a local extension. If the local extension is
        * not specified it will uses the user default. The request must contains the following parameters:
        *
        * * `site: the remote site name`
        * * `remoteExtenId: the remote extension to be called`
        * * `[fromExtenId]: the local extension identifier that make the new call`
        *
        * Example JSON request parameters:
        *
        *     { "site": "ranocchi", "remoteExtenId": "200" }
        *     { "site": "ranocchi", "remoteExtenId": "200", "fromExtenId": "300" }
        *
        * ---
        *
        * ### <a id="hanguppost">**`astproxy/hangup`**</a>
        *
        * Hangup the specified conversation. The user can hangup whatever conversation only if he has the appropriate
        * permission, otherwise he can hangup only his conversations. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to hangup. If the user hasn't the permission of the advanced
        *                operator the endpointId must to be its endpoint identifier.`
        * * `endpointType: the type of the endpoint that has the conversation to hangup`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="hangup_channelpost">**`astproxy/hangup_channel`**</a>
        *
        * Hangup the specified asterisk channel. The user can hangup only if he has the appropriate
        * permission, otherwise he can hangup only his conversations. The request must contains the following parameters:
        *
        * * `channel: the asterisk channel identifier`
        * * `endpointId: the endpoint identifier that has the channel to hangup. If the user hasn't the permission of the advanced
        *                operator the endpointId must to be its endpoint identifier.`
        * * `endpointType: the type of the endpoint that has the conversation to hangup`
        *
        * Example JSON request parameters:
        *
        *     { "channel": "SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="blindtransferpost">**`astproxy/blindtransfer`**</a>
        *
        * Transfer the conversation to the specified destination with blind type. The request must contains the
        * following parameters:
        *
        * * `to: the destination number to blind transfer the conversation`
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier of the user who has the conversation to blind transfer`
        * * `endpointType: the type of the endpoint of the user who has the conversation to blind transfer`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214", "to": "0123456789" }
        *
        * ---
        *
        * ### <a id="atxferpost">**`astproxy/atxfer`**</a>
        *
        * Attended transfer the conversation to the specified destination. The request must contains the
        * following parameters:
        *
        * * `to: the destination number to transfer the conversation`
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier of the user who has the conversation to attended transfer`
        * * `endpointType: the type of the endpoint of the user who has the conversation to attended transfer`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214", "to": "221" }
        *
        * ---
        *
        * ### <a id="answerpost">**`astproxy/answer`**</a>
        *
        * Answer the conversation from the specified endpoint. If the endpoint is not specified it will use the user default.
        * The request must contains the following parameters:
        *
        * * `[endpointId]: the endpoint identifier of the user who has the conversation to answer. It requires "endpointType".`
        * * `[endpointType]: the type of the endpoint of the user who has the conversation to answer. It requires "endpointId".`
        *
        * Example JSON request parameters:
        *
        *     {}
        *     { "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="answer_webrtcpost">**`astproxy/answer_webrtc`**</a>
        *
        * Answer the conversation from the specified webrtc endpoint. The server sends the answer command to the client that
        * will answer the call. The request must contains the following parameters:
        *
        * * `endpointId: the webrtc endpoint identifier of the user who has the conversation to answer.`
        *
        * Example JSON request parameters:
        *
        *     { "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="start_spypost">**`astproxy/start_spy`**</a>
        *
        * Spy with only listening the specified conversation. The request
        * must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier of the user who has the conversation to spy`
        * * `endpointType: the type of the endpoint of the user who has the conversation to spy`
        * * `destId: the endpoint identifier that spy the conversation`
        * * `destType: the type of the endpoint that spy the conversation`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "221", "destType": "extension", "destId": "205" }
        *
        * ---
        *
        * ### <a id="txfer_tovmpost">**`astproxy/txfer_tovm`**</a>
        *
        * Transfer the conversation to the specified voicemail. The request
        * must contains the following parameters:
        *
        * * `convid:       the conversation identifier`
        * * `username:     the username that has the endpointId that has the conversation to transfer`
        * * `endpointId:   the endpoint identifier of the user who has the conversation to transfer`
        * * `endpointType: the type of the endpoint of the user who has the conversation to transfer`
        * * `voicemailId:  the voicemail identifier to transfer the conversation. It's assumed that the destination type is the same of the endpoint type`
        *
        * Example JSON request parameters:
        *
        *     { "username": "user", "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "221", "voicemailId": "214" }
        *
        * ---
        *
        * ### <a id="start_confpost">**`astproxy/start_conf`**</a>
        *
        * Starts a meetme conference. The request must contains the following parameters:
        *
        * * `[site]: remote site name of the endpoint "addEndpointId" to be added. It can be absent or "local" to indicate local site`
        * * `convid: the conversation identifier of the owner to be added to the conference`
        * * `addEndpointId: the identifier of the extension to be added to the conference`
        * * `ownerEndpointId: the extension identifier who wants to start the meetme conference`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "ownerEndpointId": "202", "addEndpointId": "201" }
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "ownerEndpointId": "202", "addEndpointId": "201", "site": "nethesis" }
        *
        * ---
        *
        * ### <a id="pickup_convpost">**`astproxy/pickup_conv`**</a>
        *
        * Pickup the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `destId: the endpoint identifier that pickup the conversation`
        * * `destType: the endpoint type that pickup the conversation`
        * * `endpointId: the endpoint identifier that has the conversation to pickup`
        * * `endpointType: the type of the endpoint that has the conversation to pickup`
        *
        * Example JSON request parameters:
        *
        *     { "convid": ">SIP/221-000000", "endpointType": "extension", "endpointId": "221", "destType": "extension", "destId": "220"}
        *
        * ---
        *
        * ### <a id="stop_recordpost">**`astproxy/stop_record`**</a>
        *
        * Stop the recording of the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to stop recording`
        * * `endpointType: the type of the endpoint that has the conversation to stop recording`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="start_recordpost">**`astproxy/start_record`**</a>
        *
        * Starts the recording of the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to record`
        * * `endpointType: the type of the endpoint that has the conversation to record`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="force_hanguppost">**`astproxy/force_hangup`**</a>
        *
        * Force hangup of a conversation redirecting it to a non existent destination. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to record`
        * * `endpointType: the type of the endpoint that has the conversation to record`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="mute_userconfpost">**`astproxy/mute_userconf`**</a>
        *
        * Mute a user of a meetme conference. The request must contains the following parameters:
        *
        * * `confId: the conference identifier`
        * * `userId: the user identifier to be muted`
        *
        * Example JSON request parameters:
        *
        *     { "confId": "202", "userId": "2" }
        *
        * ---
        *
        * ### <a id="unmute_userconfpost">**`astproxy/unmute_userconf`**</a>
        *
        * Unmute a user of a meetme conference. The request must contains the following parameters:
        *
        * * `confId: the conference identifier`
        * * `userId: the user identifier to be muted`
        *
        * Example JSON request parameters:
        *
        *     { "confId": "202", "userId": "2" }
        *
        * ---
        *
        * ### <a id="end_confpost">**`astproxy/end_conf`**</a>
        *
        * Ends the entire meetme conference. The request must contains the following parameters:
        *
        * * `confId: the conference identifier`
        *
        * Example JSON request parameters:
        *
        *     { "confId": "202" }
        *
        * ---
        *
        * ### <a id="join_myconfpost">**`astproxy/join_myconf`**</a>
        *
        * Joins the extension owner to his meetme conference. The request must contains the following parameters:
        *
        * * `endpointId: the endpoint identifier`
        *
        * Example JSON request parameters:
        *
        *     { "endpointId": "202" }
        *
        * ---
        *
        * ### <a id="hangup_userconfpost">**`astproxy/hangup_userconf`**</a>
        *
        * Hangup a user of a meetme conference. The request must contains the following parameters:
        *
        * * `confId: the conference identifier`
        * * `extenId: the extension identifier to be hanged up`
        *
        * Example JSON request parameters:
        *
        *     { "confId": "202", "extenId": "201" }
        *
        * ---
        *
        * ### <a id="mute_recordpost">**`astproxy/mute_record`**</a>
        *
        * Mute the recording of the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to record`
        * * `endpointType: the type of the endpoint that has the conversation to record`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="pickup_parkingpost">**`astproxy/pickup_parking`**</a>
        *
        * Pickup the specified parking. The request must contains the following parameters:
        *
        * * `destId: the endpoint identifier that pickup the conversation`
        * * `parking: the parking identifier`
        * * `destType: the endpoint type that pickup the conversation`
        *
        * Example JSON request parameters:
        *
        *     { "parking": "70", "destType": "extension", "destId": "214" }
        *
        * ---
        *
        * ### <a id="unmute_recordpost">**`astproxy/unmute_record`**</a>
        *
        * Unmute the recording of the specified conversation. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to record`
        * * `endpointType: the type of the endpoint that has the conversation to record`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="intrudepost">**`astproxy/intrude`**</a>
        *
        * Intrudes into the specified conversation. Only the endpointId can listen and speak with
        * the spier, its counterpart can not do that. The request must contains the following parameters:
        *
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier that has the conversation to spy and speak`
        * * `endpointType: the type of the endpoint that has the conversation to spy and speak`
        * * `destId: the endpoint identifier that spy the conversation`
        * * `destType: the endpoint type that spy the conversation`
        *
        * Example JSON request parameters:
        *
        *     { "convid": "SIP/209-00000060>SIP/211-00000061", "endpointType": "extension", "endpointId": "209", "destType": "extension", "destId": "214" }
        *
        * ---
        *
        * ### <a id="send_dtmfpost">**`astproxy/send_dtmf`**</a>
        *
        * Sends the dtmf tone to the destination. The request must contains the following parameters:
        *
        * * `tone: the tone to send. Permitted values are: 0 1 2 3 4 5 6 7 8 9 * #`
        * * `convid: the conversation identifier`
        * * `endpointId: the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        *
        * Example JSON request parameters:
        *
        *     { "tone": "5", "convid": "SIP/214-000003d5>SIP/221-000003d6", "endpointType": "extension", "endpointId": "214" }
        *
        * ---
        *
        * ### <a id="call_echopost">**`astproxy/call_echo`**</a>
        *
        * Originates a new echo call.
        *
        * * `endpointId: the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        *
        * Example JSON request parameters:
        *
        *     { "endpointType": "extension", "endpointId": "209" }
        *
        * ---
        *
        * ### <a id="queuemember_addpost">**`astproxy/queuemember_add`**</a>
        *
        * Adds the specified extension to the queue. The request must contains the following parameters:
        *
        * * `endpointId:   the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        * * `queueId:      the queue identifier`
        * * `[paused]:     the paused status`
        * * `[penalty]:    a penalty (number) to apply to the member. Asterisk will distribute calls to members with higher penalties only after attempting to distribute calls to those with lower penalty`
        *
        * Example JSON request parameters:
        *
        *     { "endpointType": "extension", "endpointId": "209", "queueId": "401" }
        *     { "endpointType": "extension", "endpointId": "209", "queueId": "401", "paused": true, "penalty": 1 }
        *
        * ---
        *
        * ### <a id="inout_dyn_queuespost">**`astproxy/inout_dyn_queues`**</a>
        *
        * Alternates the logon and logout of the specified extension in all the queues for which it's a dynamic member.
        * The request must contains the following parameters:
        *
        * * `endpointId:   the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        *
        * Example JSON request parameters:
        *
        *     { "endpointType": "extension", "endpointId": "209" }
        *
        * ---
        *
        * ### <a id="queuemember_pausepost">**`astproxy/queuemember_pause`**</a>
        *
        * Pause the specified extension from receiving calls from the queue. The request must contains the following parameters:
        *
        * * `endpointId:   the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        * * `[queueId]:    the queue identifier. If omitted the pause is done in all queues`
        * * `[reason]:     the textual description of the reason`
        *
        * Example JSON request parameters:
        *
        *     { "endpointType": "extension", "endpointId": "209", "queueId": "401", "reason": "some reason" }
        *
        * ---
        *
        * ### <a id="queuemember_removepost">**`astproxy/queuemember_remove`**</a>
        *
        * Removes the specified extension from the queue. The request must contains the following parameters:
        *
        * * `endpointId:   the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        * * `queueId:      the queue identifier`
        *
        * Example JSON request parameters:
        *
        *     { "endpointType": "extension", "endpointId": "209", "queueId": "401" }
        *
        * ---
        *
        * ### <a id="queuemember_unpausepost">**`astproxy/queuemember_unpause`**</a>
        *
        * Unpause the specified extension to receiving calls from the queue. The request must contains the following parameters:
        *
        * * `endpointId:   the endpoint identifier`
        * * `endpointType: the type of the endpoint`
        * * `[queueId]:    the queue identifier. If omitted the unpause is done in all queues`
        *
        * Example JSON request parameters:
        *
        *     { "endpointType": "extension", "endpointId": "209", "queueId": "401" }
        *
        * ---
        *
        * ### <a id="blindtransfer_queuepost">**`astproxy/blindtransfer_queue`**</a>
        *
        * Transfer the waiting caller from a queue to the specified destination using the blind type. The request must contains the following parameters:
        *
        * * `to: the destination number`
        * * `queue: the queue identifier`
        * * `waitingCallerId: the identifier of the waiting caller`
        *
        * Example JSON request parameters:
        *
        *     { "queue": "401", "waitingCallerId": "SIP/209-00000060", "to": "209" }
        *
        * ---
        *
        * ### <a id="blindtransfer_parkingpost">**`astproxy/blindtransfer_parking`**</a>
        *
        * Transfer the parked call to the specified destination using the blind type. The request must contains the following parameters:
        *
        * * `to: the destination number`
        * * `parking: the parking identifier`
        *
        * Example JSON request parameters:
        *
        *     { "parking": "71", "to": "209" }
        *
        * @class plugin_rest_astproxy
        * @static
        */
        var astproxy = {

            // the REST api
            api: {
                'root': 'astproxy',

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} queues                         Gets all the queues of the operator panel of the user
                *   @param {string} trunks                         Gets all the trunks of the operator panel of the user
                *   @param {string} prefix                         Gets the prefix number used with outgoing external calls
                *   @param {string} remote_prefixes                Gets prefix number of all remote sites used with outgoing external calls
                *   @param {string} opgroups                       Gets all the user groups of the operator panel
                *   @param {string} remote_opgroups                Gets all the user groups of all remote sites
                *   @param {string} conference/:endpoint           Gets data about the meetme conference of the extension
                *   @param {string} parkings                       Gets all the parkings with all their status informations
                *   @param {string} extensions                     Gets all the extensions with all their status informations
                *   @param {string} sip_webrtc                     Gets all the configuration about the sip WebRTC
                *   @param {string} remote_extensions              Gets all the extensions with all their status informations of all remote sites
                *   @param {string} queues_stats/:day              Gets extended statistics about queues
                *   @param {string} queue_recall/:type/:val/:qid   Gets the recall data about the queue
                *   @param {string} qrecall_info/:type/:val/:cid   Gets the details about the queue recall
                *   @param {string} qrecall_check/:num             Checks if the number is in conversation
                *   @param {string} queues_qos/:day                Gets QOS info about queues
                *   @param {string} agents_qos/:day                Gets QOS info about agents
                *   @param {string} cw/:endpoint                   Gets the call waiting status of the endpoint of the user
                *   @param {string} dnd/:endpoint                  Gets the don't disturb status of the endpoint of the user
                *   @param {string} cfvm/:type/:endpoint           Gets the call forward status to voicemail of the endpoint of the user
                *   @param {string} cfcall/:type/:endpoint         Gets the call forward status to a destination number of the endpoint of the user
                *   @param {string} unauthe_call/:endpoint/:number Calls the number from the specified endpoint without authentication
                *   @param {string} is_autoc2c_supported/:endpoint Returns true if the endpoint is supported by the automatic click2call
                */
                'get' : [
                    'queues',
                    'trunks',
                    'prefix',
                    'opgroups',
                    'parkings',
                    'extensions',
                    'sip_webrtc',
                    'remote_opgroups',
                    'conference/:endpoint',
                    'remote_prefixes',
                    'remote_extensions',
                    'queues_stats/:day',
                    'queue_recall/:type/:val/:qid',
                    'qrecall_info/:type/:val/:cid',
                    'qrecall_check/:num',
                    'queues_qos/:day',
                    'agents_qos/:day',
                    'cw/:endpoint',
                    'dnd/:endpoint',
                    'cfvm/:type/:endpoint',
                    'cfcall/:type/:endpoint',
                    'unauthe_call/:endpoint/:number',
                    'is_autoc2c_supported/:endpoint'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} cw                    Sets the call waiting status of the endpoint of the user
                *   @param {string} dnd                   Sets the don't disturb status of the endpoint of the user
                *   @param {string} park                  Park a conversation of the user
                *   @param {string} call                  Make a new call
                *   @param {string} mute                  Mute a call in one direction only. The specified endpointId is able to listen
                *   @param {string} cfvm                  Sets the call forward status of the endpoint of the user to a destination voicemail
                *   @param {string} unmute                Unmute a call
                *   @param {string} cfcall                Sets the call forward status of the endpoint of the user to a destination number
                *   @param {string} atxfer                Transfer a conversation with attended type
                *   @param {string} answer                Answer a conversation from the extension
                *   @param {string} hangup                Hangup a conversation
                *   @param {string} intrude               Spy and speak in a conversation
                *   @param {string} end_conf              Ends the entire meetme conference
                *   @param {string} call_echo             Originates a new echo call
                *   @param {string} send_dtmf             Sends the dtmf tone to the destination
                *   @param {string} start_spy             Spy a conversation with only listening
                *   @param {string} txfer_tovm            Transfer the conversation to the voicemail
                *   @param {string} start_conf            Starts a meetme conference
                *   @param {string} join_myconf           Joins the extension owner to his meetme conference
                *   @param {string} pickup_conv           Pickup a conversation
                *   @param {string} stop_record           Stop the recording of a conversation
                *   @param {string} mute_record           Mute the recording of a conversation
                *   @param {string} start_record          Start the recording of a conversation
                *   @param {string} force_hangup          Force hangup of a conversation
                *   @param {string} mute_userconf         Mute a user of a meetme conference
                *   @param {string} answer_webrtc         Answer a conversation from the webrtc extension sending the command to the client
                *   @param {string} blindtransfer         Transfer a conversation with blind type
                *   @param {string} unmute_record         Unmute the recording of a conversation
                *   @param {string} hangup_channel        Hangup the asterisk channel
                *   @param {string} pickup_parking        Pickup a parked call
                *   @param {string} unmute_userconf       Unmute a user of a meetme conference
                *   @param {string} hangup_userconf       Hangup a user of a meetme conference
                *   @param {string} queuemember_add       Adds the specified extension to the queue
                *   @param {string} inout_dyn_queues      Alternates the logon and logout of the extension in all the queues for which it's a dynamic member
                *   @param {string} queuemember_pause     Pause the specified extension from receive calls from the queue
                *   @param {string} queuemember_remove    Removes the specified extension from the queue
                *   @param {string} queuemember_unpause   Unpause the specified extension to receive calls from the queue
                *   @param {string} blindtransfer_queue   Transfer a waiting caller from a queue to the destination with blind type
                *   @param {string} blindtransfer_parking Transfer the parked call to the destination with blind type
                *   @param {string} start_intrude_music_for_hold Start music for hold function making an intrusion
                *   @param {string} stop_intrude_music_for_hold Stop music for hold function making an hangup with regexp
                */
                'post': [
                    'cw',
                    'dnd',
                    'park',
                    'call',
                    'mute',
                    'cfvm',
                    'unmute',
                    'cfcall',
                    'atxfer',
                    'answer',
                    'hangup',
                    'intrude',
                    'end_conf',
                    'call_echo',
                    'send_dtmf',
                    'start_spy',
                    'txfer_tovm',
                    'start_conf',
                    'remote_call',
                    'pickup_conv',
                    'stop_record',
                    'join_myconf',
                    'mute_record',
                    'start_record',
                    'force_hangup',
                    'mute_userconf',
                    'answer_webrtc',
                    'blindtransfer',
                    'unmute_record',
                    'hangup_channel',
                    'pickup_parking',
                    'unmute_userconf',
                    'hangup_userconf',
                    'queuemember_add',
                    'inout_dyn_queues',
                    'queuemember_pause',
                    'queuemember_remove',
                    'queuemember_unpause',
                    'blindtransfer_queue',
                    'blindtransfer_parking',
                    'start_intrude_music_for_hold',
                    'stop_intrude_music_for_hold'
                ],
                'head': [],
                'del' : []
            },

            /**
            * Gets the operator panel user groups of the local site with the following REST API:
            *
            *     GET  opgroups
            *
            * @method opgroups
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            opgroups: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;
                    var isRemote = compComNethctiRemotes.isClientRemote(username, token);
                    var opGroups, remoteSiteName;

                    // check if the request coming from a remote site
                    if (isRemote) {

                        remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        // get all operator groups enabled for remote site
                        opGroups = compAuthorization.getAuthorizedRemoteOperatorGroups(remoteSiteName);
                        logger.info(IDLOG, 'op groups enabled for remote site "' + remoteSiteName + '" is "' + Object.keys(opGroups) + '"');
                    }
                    else {
                        // check if the user has the operator panel authorization
                        if (compAuthorization.authorizeOperatorGroupsUser(username) !== true) {

                            logger.warn(IDLOG, 'requesting operator groups: authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // get all authorized operator groups of the user
                        opGroups = compAuthorization.getAuthorizedOperatorGroups(username);
                        logger.info(IDLOG, 'op groups enabled for user "' + username + '" is "' + Object.keys(opGroups) + '"');
                    }

                    // get all operator groups
                    var allOpGroups = compOperator.getJSONGroups();

                    // extract only the authorized operator groups of the user
                    var list = {}; // object to return
                    var group;
                    for (group in allOpGroups) {

                        if (opGroups[group] === true) {
                            list[group] = allOpGroups[group];
                        }
                    }
                    logger.info(IDLOG, 'sent authorized operator groups "' + Object.keys(list) + '" to ' +
                                       (isRemote ? ('remote site "' + remoteSiteName + '"') : '') + ' user "' +
                                       username + '" ' + res.connection.remoteAddress);
                    res.send(200, list);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * It serves only the local clients: the remote sites can not ask for it.
            * Gets the operator panel user groups of all remote sites with the following REST API:
            *
            *     GET  remote_opgroups
            *
            * @method remote_opgroups
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            remote_opgroups: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        logger.warn(IDLOG, 'requesting all remote sites op groups by remote site "' + remoteSiteName + '": ' +
                                           'authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        // check if the user has the operator panel authorization
                        if (compAuthorization.authorizeRemoteSiteUser(username) !== true) {

                            logger.warn(IDLOG, 'requesting all remote sites operator groups: authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // get all operator panel groups of all remote sites
                        var allRemoteOpGroups = compComNethctiRemotes.getAllRemoteSitesOperatorGroups();
                        logger.info(IDLOG, 'sent all remote sites operator groups "' + Object.keys(allRemoteOpGroups) + '" ' +
                                           'to user "' + username + '" ' + res.connection.remoteAddress);
                        res.send(200, allRemoteOpGroups);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * It serves only the local clients: the remote sites can not ask for it.
            * Gets the meetme conference of the extension with the following REST API:
            *
            *     GET  conference/:endpoint
            *
            * @method conference
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            conference: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;
                    var extenId  = req.params.endpoint;

                    // check parameter
                    if (typeof extenId !== 'string') {
                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        logger.warn(IDLOG, 'requesting conference data by remote site "' + remoteSiteName + '": ' +
                                           'authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    // check if the endpoint is owned by the user
                    if (compAuthorization.verifyUserEndpointExten(username, extenId) === false) {

                        logger.warn(IDLOG, 'getting conference data of exten "' + extenId + '" failed: ' +
                                           '"' + extenId + '" is not owned by user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        var conf = compAstProxy.getConference(extenId);
                        logger.info(IDLOG, 'sent conference data of exten "' + extenId + '" ' +
                                           'to user "' + username + '" ' + res.connection.remoteAddress);
                        res.send(200, conf);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the parkings with all their status informations with the following REST API:
            *
            *     GET  parkings
            *
            * @method extensions
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            parkings: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOpParkingsUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting parkings: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var parkings;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username) === true) {
                        parkings = compAstProxy.getJSONParkings(privacyStrReplace);
                    } else {
                        parkings = compAstProxy.getJSONParkings();
                    }

                    logger.info(IDLOG, 'sent all parkings in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, parkings);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the queues with all their status informations with the following REST API:
            *
            *     GET  queues
            *
            * @method queues
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            queues: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'requesting queues: user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the operator panel queues authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting queues: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var queues;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username)           === true &&
                        compAuthorization.authorizeOpAdminQueuesUser(username) === false) {

                        queues = compAstProxy.getJSONQueues(privacyStrReplace);
                    } else {
                        queues = compAstProxy.getJSONQueues();
                    }

                    logger.info(IDLOG, 'sent all queues in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, queues);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the trunks with all their status informations with the following REST API:
            *
            *     GET trunks
            *
            * @method trunks
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            trunks: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check if the user has the operator panel authorization
                    if (compAuthorization.authorizeOpTrunksUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting trunks: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var trunks;

                    // check if the user has the privacy enabled
                    if (compAuthorization.isPrivacyEnabled(username) === true) {
                        trunks = compAstProxy.getJSONTrunks(privacyStrReplace);
                    } else {
                        trunks = compAstProxy.getJSONTrunks();
                    }

                    logger.info(IDLOG, 'sent all trunks in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, trunks);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Returns true if the endpoint is supported by the automatic click2call with the following REST API:
            *
            *     is_autoc2c_supported/:endpoint
            *
            * @method is_autoc2c_supported
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            is_autoc2c_supported: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // gets the user agent of the phone
                    var extenAgent  = compAstProxy.getExtensionAgent(req.params.endpoint);
                    var isSupported = compConfigManager.phoneAgentSupportAutoC2C(extenAgent);

                    logger.info(IDLOG, 'send "' + isSupported + '" for extension phone (' + req.params.endpoint + ') agent (' + extenAgent + ') support auto click2call to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, { exten: req.params.endpoint, agent: extenAgent, supported: isSupported });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the extensions with all their status informations of all remote sites with the following REST API:
            *
            *     GET  remote_extensions
            *
            * @method remote_extensions
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            remote_extensions: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        logger.warn(IDLOG, 'requesting all remote sites extensions by remote site "' + remoteSiteName + '": ' +
                                           'authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        // check if the user has the operator panel and remote site authorizations
                        if (compAuthorization.authorizeRemoteSiteUser(username)   !== true ||
                            compAuthorization.authorizeOpExtensionsUser(username) !== true) {

                            logger.warn(IDLOG, 'requesting all remote sites extensions: authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // get all extensions of all remote sites
                        var allRemoteOpExtensions;
                        if (compAuthorization.isPrivacyEnabled(username) === true) {
                            allRemoteOpExtensions = compComNethctiRemotes.getAllRemoteSitesOperatorExtensions(privacyStrReplace);
                        } else {
                            allRemoteOpExtensions = compComNethctiRemotes.getAllRemoteSitesOperatorExtensions();
                        }
                        logger.info(IDLOG, 'sent all remote sites extensions "' + Object.keys(allRemoteOpExtensions) + '" ' +
                                           'to user "' + username + '" ' + res.connection.remoteAddress);
                        res.send(200, allRemoteOpExtensions);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the extensions with all their status informations with the following REST API:
            *
            *     GET  extensions
            *
            * @method extensions
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            extensions: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        var extensions     = compAstProxy.getJSONExtensions();
                        logger.info(IDLOG, 'sent all extensions in JSON format to remote site "' + remoteSiteName +
                                           '" user "' + username + '" ' + res.connection.remoteAddress);
                        res.send(200, extensions);
                    }
                    else {
                        // check if the user has the authorization to view the extensions
                        if (compAuthorization.authorizeOpExtensionsUser(username) !== true) {

                            logger.warn(IDLOG, 'requesting extensions: authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // get all extensions associated with the user
                        var userExtensions = compUser.getAllEndpointsExtension(username);
                        var extensions;

                        // checks if the user has the privacy enabled. In case the user has the "privacy" and
                        // "admin_queues" permission enabled, then the privacy is bypassed for all the calls
                        // that pass through a queue, otherwise all the calls are obfuscated
                        if (   compAuthorization.isPrivacyEnabled(username)           === true
                            && compAuthorization.authorizeOpAdminQueuesUser(username) === false) {

                            // all the calls are obfuscated, without regard of passing through a queue
                            extensions = compAstProxy.getJSONExtensions(privacyStrReplace, privacyStrReplace);

                            // replace the extensions associated with the user to have clear number for them
                            var e;
                            for (e in userExtensions) { extensions[e] = compAstProxy.getJSONExtension(e); }

                        } else if (   compAuthorization.isPrivacyEnabled(username)           === true
                                   && compAuthorization.authorizeOpAdminQueuesUser(username) === true) { // the privacy is bypassed

                            // only the calls that does not pass through a queue are obfuscated
                            extensions = compAstProxy.getJSONExtensions(privacyStrReplace);

                            // replace the extensions associated with the user to have clear number for them
                            var e;
                            for (e in userExtensions) { extensions[e] = compAstProxy.getJSONExtension(e); }

                        } else {
                            // no call is obfuscated
                            extensions = compAstProxy.getJSONExtensions();
                        }

                        logger.info(IDLOG, 'sent all extensions in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                        res.send(200, extensions);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets all the configuration about the sip WebRTC with the following REST API:
            *
            *     GET  sip_webrtc
            *
            * @method sip_webrtc
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            sip_webrtc: function (req, res, next) {
                try {
                    var username  = req.headers.authorization_user;
                    var sipWebrtc = compAstProxy.getSipWebrtcConf();

                    logger.info(IDLOG, 'sent sip webrtc configuration to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, sipWebrtc);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets the prefix number used with outgoing external calls with the following REST API:
            *
            *     GET  prefix
            *
            * @method prefix
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            prefix: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var prefix   = compAstProxy.getPrefix();

                    logger.info(IDLOG, 'sent the prefix number "' + prefix + '" to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, { prefix: prefix });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets the prefix number of all remote sites used with outgoing external calls with the following REST API:
            *
            *     GET  remote_prefixes
            *
            * @method remote_prefixes
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            remote_prefixes: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    if (compAuthorization.authorizeRemoteSiteUser(username) !== true) {
                        logger.warn(IDLOG, 'requesting prefixes of all remote sites: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    var prefixes = compComNethctiRemotes.getAllSitesPrefixCall();

                    logger.info(IDLOG, 'sent prefixes of all remote sites to user "' + username + '" ' + res.connection.remoteAddress);
                    res.send(200, prefixes);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            *  Gets extended statistics about queues with the following REST API:
            *
            *     GET  queues_stats
            *
            * @method queues_stats
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            queues_stats: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var day      = req.params.day;

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'requesting queues statistics: user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the operator panel queues authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting queues statistics: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // check if the user has the privacy enabled

                    compAstProxy.getJSONQueuesStats(day, function (err1, stats) {
                        try {
                            if (err1) { throw err1; }

                            logger.info(IDLOG, 'sent all queues statistics of ' + day + ' in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                            res.send(200, stats);

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            *  Gets the recall data about the queue with the following REST API:
            *
            *     GET  queue_recall
            *
            * @method queue_recall
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            queue_recall: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    if (typeof req.params.qid !== 'string' ||
                        typeof req.params.val !== 'string' ||
                        (req.params.type !== 'hours' && req.params.type !== 'day')) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeLostQueueCallsUser(username) !== true) {
                        logger.warn(IDLOG, 'requesting last ' + req.params.val + ' ' + req.params.type + ' ' +
                                           'recalls info of queue "' + req.params.qid + '": authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    compAstProxy.getQueueRecallData(req.params.type, req.params.val, req.params.qid, function (err, results) {
                        try {
                            if (err) { throw err; }

                            logger.info(IDLOG, 'sent recall data about queue ' + req.params.qid +
                                               ' in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                            res.send(200, results);

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            *  Checks if some user has just recalled the number with the following REST API:
            *
            *     GET  qrecall_check
            *
            * @method qrecall_check
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            qrecall_check: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    if (typeof req.params.num !== 'string') {
                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeLostQueueCallsUser(username) !== true) {
                        logger.warn(IDLOG, 'requesting check for recall of num ' + req.params.num + ': ' +
                                           'authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    compAstProxy.checkQueueRecallingStatus(req.params.num, function (err, result) {
                        try {
                            if (err) { throw err; }

                            logger.info(IDLOG, 'sent queue recalling status "' + result + '" of num "' + req.params.num + '"' +
                                               ' to user "' + username + '" ' + res.connection.remoteAddress);
                            res.send(200, { inConversation: result });

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });
                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            *  Gets the details about the queue recall with the following REST API:
            *
            *     GET  qrecall_info
            *
            * @method qrecall_info
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            qrecall_info: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    if (typeof req.params.cid !== 'string' ||
                        typeof req.params.val !== 'string' ||
                        (req.params.type !== 'hours' && req.params.type !== 'day')) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeLostQueueCallsUser(username) !== true) {
                        logger.warn(IDLOG, 'requesting detailed info of last ' + req.params.val + ' ' + req.params.type + ' ' +
                                           'recall cid ' + req.params.cid + ' of queue: ' +
                                           'authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    compAstProxy.getQueueRecallInfo(req.params.type, req.params.val, req.params.cid, function (err, results) {
                        try {
                            if (err) { throw err; }

                            logger.info(IDLOG, 'sent details about queue recall of cid "' + req.params.cid + '" from ' +
                                               (req.params.type === 'hours' ?
                                                                             'last ' + req.params.val + ' hours'
                                                                            :
                                                                             'day ' + req.params.val
                                               ) +
                                               ' in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                            res.send(200, results);

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });
                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            *  Gets QOS info about queues with the following REST API:
            *
            *     GET  queues_qos
            *
            * @method queues_qos
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            queues_qos: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var day      = req.params.day;

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'requesting queues QOS info: user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the operator panel queues authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting queues QOS info: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // check if the user has the privacy enabled

                    compAstProxy.getJSONQueuesQOS(day, function (err1, qosinfo) {
                        try {
                            if (err1) { throw err1; }

                            logger.info(IDLOG, 'sent all queues QOS info of ' + day + ' in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                            res.send(200, qosinfo);

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            *  Gets QOS info about agents with the following REST API:
            *
            *     GET  agents_qos
            *
            * @method agents_qos
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            agents_qos: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var day      = req.params.day;

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'requesting queues QOS info: user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the operator panel queues authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting queues QOS info: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // check if the user has the privacy enabled

                    compAstProxy.getJSONAgentsStats(day, function (err1, agstats) {
                        try {
                            if (err1) { throw err1; }

                            logger.info(IDLOG, 'sent all queues agent stats of ' + day + ' in JSON format to user "' + username + '" ' + res.connection.remoteAddress);
                            res.send(200, agstats);

                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            * Manages both GET and POST requests for call forward status to voicemail of the endpoint of
            * the user with the following REST API:
            *
            *     GET  cfvm/:type/:endpoint
            *     POST cfvm
            *
            * @method cfvm
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            cfvm: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { cfvmGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { cfvmSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests for call forward status to a destination
            * number of the endpoint of the user with the following REST API:
            *
            *     GET  cfcall/:type/:endpoint
            *     POST cfcall
            *
            * @method cfcall
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            cfcall: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { cfcallGet(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { cfcallSet(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Makes a new call with the following REST API:
            *
            *     POST call
            *
            * @method call
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            call: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params        !== 'object'
                        || typeof req.params.number !== 'string'
                        || (req.params.endpointId   && !req.params.endpointType)
                        || (!req.params.endpointId  &&  req.params.endpointType)
                        || (req.params.endpointId   && typeof req.params.endpointId   !== 'string')
                        || (req.params.endpointType && typeof req.params.endpointType !== 'string')) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (!req.params.endpointId && !req.params.endpointType) {
                        req.params.endpointType = 'extension';
                        req.params.endpointId   = compConfigManager.getDefaultUserExtensionConf(username);
                    }

                    if (req.params.endpointType === 'extension') {

                        if (compAuthorization.authorizeAdminCallUser(username) === true) {

                            logger.info(IDLOG, 'make new call to "' + req.params.number + '" from ' + req.params.endpointType +
                                               ' "' + req.params.endpointId + '" by user "' + username + '": he has the "admin_call" permission');
                        }
                        // check if the endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'make new call to ' + req.params.number + ' failed: ' + req.params.endpointType +
                                               ' "' + req.params.endpointId + '" is not owned by user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        call(username, req, res);

                    } else if (req.params.endpointType === 'cellphone') {

                        if (compAuthorization.authorizeAdminCallUser(username) === true) {

                            logger.info(IDLOG, 'make new call to "' + req.params.number + '" from ' + req.params.endpointType +
                                               ' "' + req.params.endpointId + '" by user "' + username + '": he has the "admin_call" permission');
                        }
                        // check if the endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointCellphone(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'make new call to ' + req.params.number + ' failed: ' + req.params.endpointType +
                                               ' "' + req.params.endpointId + '" is not owned by user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // make a new call by asterisk
                        asteriskCall(username, req, res);

                    } else {
                        logger.warn(IDLOG, 'making new call from user "' + username + '" to ' + req.params.number + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Makes a new call to a remote extension of a remote site with the following REST API:
            *
            *     POST remote_call
            *
            * @method remot_call
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            remote_call: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;

                    // check parameters
                    if (typeof req.params               !== 'object' ||
                        typeof req.params.site          !== 'string' ||
                        typeof req.params.remoteExtenId !== 'string' ||
                        (req.params.fromExtenId && typeof req.params.fromExtenId !== 'string')) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        logger.warn(IDLOG, 'calling remote exten "' + req.params.remoteExtenId + '" from remote site ' +
                                           '"' + remoteSiteName + '" user "' + username + '": not allowed from remote');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        if (typeof req.params.fromExtenId !== 'string') {
                            req.params.fromExtenId = compConfigManager.getDefaultUserExtensionConf(username);
                        }

                        // checks permissions and endpoint ownership
                        if (compAuthorization.authorizeAdminCallUser(username)  === true &&
                            compAuthorization.authorizeRemoteSiteUser(username) === true) {

                            logger.info(IDLOG, 'make new call to remote exten "' + req.params.remoteExtenId + '" ' +
                                               ' of remote site "' + req.params.site + '" from local exten "' + req.params.fromExtenId +
                                               '" by user "' + username + '": he has the "admin_call" & "remote_site" permissions');
                        }
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.fromExtenId) === false ||
                                 compAuthorization.authorizeRemoteSiteUser(username) === false) {

                            logger.warn(IDLOG, 'calling remote exten "' + req.params.remoteExtenId + '" ' +
                                               'of remote site "' + req.params.site + '" from local exten "' + req.params.fromExtenId +
                                               '" by user "' + username + '" failed: local exten "' + req.params.fromExtenId +
                                               '" is not owned by user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // check the remote site existence
                        if (!compComNethctiRemotes.remoteSiteExists(req.params.site)) {

                            logger.warn(IDLOG, 'calling remote exten "' + req.params.remoteExtenId + '" ' +
                                               'of remote site "' + req.params.site + '" from local exten "' + req.params.fromExtenId +
                                               '" by user "' + username + '" failed: non existent remote site "' + req.params.site + '"');
                            compUtil.net.sendHttp500(IDLOG, res, 'non existent remote site "' + req.params.site + '"');
                            return;
                        }

                        var sitePrefixCall      = compComNethctiRemotes.getSitePrefixCall(req.params.site);
                        req.params.number       = sitePrefixCall + req.params.remoteExtenId;
                        req.params.endpointId   = req.params.fromExtenId;
                        req.params.endpointType = 'extension';
                        call(username, req, res);
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Makes a new call to the destination number from the endpoint of the user with the following REST API:
            *
            *     GET  unauthe_call/:endpoint/:number
            *
            * @method unauthe_call
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            unauthe_call: function (req, res, next) {
                try {
                    // check parameters
                    if (   typeof req.params        !== 'object'
                        || typeof req.params.number !== 'string' || typeof req.params.endpoint !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // make a new call by asterisk
                    req.params.endpointId   = req.params.endpoint;
                    req.params.endpointType = 'extension';
                    asteriskCall('unauthe_call rest api', req, res);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests for don't disturb status of the endpoint of
            * the user with the following REST API:
            *
            *     GET  cw/:endpoint
            *     POST cw
            *
            * @method cw
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            cw: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { cwget(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { cwset(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Manages both GET and POST requests for don't disturb status of the endpoint of
            * the user with the following REST API:
            *
            *     GET  dnd/:endpoint
            *     POST dnd
            *
            * @method dnd
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            dnd: function (req, res, next) {
                try {
                    if      (req.method.toLowerCase() === 'get' ) { dndget(req, res, next); }
                    else if (req.method.toLowerCase() === 'post') { dndset(req, res, next); }
                    else    { logger.warn(IDLOG, 'unknown requested method ' + req.method); }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Park a conversation with the following REST API:
            *
            *     POST park
            *
            * @method park
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            park: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.applicantId  !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        if (compAuthorization.authorizeAdminParkingsUser(username) === true) {

                            logger.info(IDLOG, 'park of the conversation "' + req.params.convid + '" from user "' + username + '": he has the admin_parkings permission');
                        }
                        // check if the applicant of the request is owned by the user: the user can only park a conversation
                        // that belong to him. The belonging is verfied later by the asterisk proxy component
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.applicantId) === false) {

                            logger.warn(IDLOG, 'park of the conversation "' + req.params.convid + '" from user "' + username + '" has been failed: the applicant ' +
                                                   '"' + req.params.applicantId + '" isn\'t owned by him');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        }
                        logger.info(IDLOG, 'the applicant endpoint ' + req.params.applicantId + ' is owned by "' + username + '"');

                        compAstProxy.parkConversation(req.params.endpointType, req.params.endpointId, req.params.convid, req.params.applicantId, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'parking convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.applicantId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'convid ' + req.params.convid + ' has been parked successfully by user "' + username + '" with ' + req.params.applicantId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'parking the conversation ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Hangup a conversation with the following REST API:
            *
            *     POST hangup
            *
            * @method hangup
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            hangup: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to hangup every calls
                        if (compAuthorization.authorizeAdminHangupUser(username) === true) {

                            logger.log(IDLOG, 'hangup convid "' + req.params.convid + '": authorization admin hangup successful for user "' + username + '"');
                        }
                        // check if the endpoint of the request is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'hangup convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'hangup convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.hangupConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'hangup convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'convid ' + req.params.convid + ' has been hangup successfully by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'hanging up the conversation ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Hangup the asterisk channel with the following REST API:
            *
            *     POST hangup_channel
            *
            * @method hangup_channel
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain.
            */
            hangup_channel: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params              !== 'object' ||
                        typeof req.params.channel      !== 'string' ||
                        typeof req.params.endpointId   !== 'string' ||
                        typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to hangup every calls
                        if (compAuthorization.authorizeAdminHangupUser(username) === true) {
                            logger.log(IDLOG, 'hangup asterisk channel "' + req.params.channel + '": authorization admin hangup successful for user "' + username + '"');
                        }
                        // check if the endpoint of the request is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {
                            logger.warn(IDLOG, 'hangup asterisk channel "' + req.params.channel + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        else {
                            logger.info(IDLOG, 'hangup asterisk channel "' + req.params.channel + '": the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.hangupChannel(req.params.endpointType, req.params.endpointId, req.params.channel, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'hangup asterisk channel ' + req.params.channel + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'asterisk channel ' + req.params.channel + ' has been hangup successfully by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);
                            }
                            catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });
                    } else {
                        logger.warn(IDLOG, 'hanging up the asterisk channel ' + req.params.channel + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Mute a conversation in one direction only. The specified endpointId is able to listen.
            * It does this with the following REST API:
            *
            *     POST mute
            *
            * @method mute
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            mute: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the endpoint of the request is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'mute convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'mute convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.muteConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'mute convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'convid ' + req.params.convid + ' has been muted successfully by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'mute the conversation ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Unmute a conversation with the following REST API:
            *
            *     POST unmute
            *
            * @method mute
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            unmute: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the endpoint of the request is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'unmute convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'unmute convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.unmuteConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err, response) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'unmute convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'convid ' + req.params.convid + ' has been unmuted successfully by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'unmute the conversation ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer a conversation with attended type with the following REST API:
            *
            *     POST atxfer
            *
            * @method atxfer
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            atxfer: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object'
                        || typeof req.params.convid     !== 'string' || typeof req.params.to           !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the attended transfer authorization
                        if (compAuthorization.authorizeAttendedTransferUser(username) !== true) {

                            logger.warn(IDLOG, 'attended transfer convid "' + req.params.convid + '": authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        // check if the endpoint of the request is owned by the user. The user can
                        // attended transfer only his own conversations
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'attended transfer convid "' + req.params.convid + '" by user "' + username +
                                               '" has been failed: ' + ' the ' + req.params.endpointType + ' ' + req.params.endpointId +
                                               ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'attended transfer convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.attendedTransferConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.to,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'attended transfer convid "' + req.params.convid + '" by user "' + username +
                                                           '" with ' + req.params.endpointType + ' ' + req.params.endpointId +
                                                           ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'attended transfer convid ' + req.params.convid + ' has been attended transfered ' +
                                                       'successfully by user "' + username + '" with ' + req.params.endpointType +
                                                       ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'attended transfering convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Answers to a call with the following REST API:
            *
            *     POST answer
            *
            * @method answer
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            answer: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params !== 'object'
                        || (req.params.endpointId   && !req.params.endpointType)
                        || (!req.params.endpointId  &&  req.params.endpointType)
                        || (req.params.endpointId   && typeof req.params.endpointId   !== 'string')
                        || (req.params.endpointType && typeof req.params.endpointType !== 'string')) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (!req.params.endpointId && !req.params.endpointType) {
                        req.params.endpointType = 'extension';
                        req.params.endpointId   = compConfigManager.getDefaultUserExtensionConf(username);
                    }

                    if (req.params.endpointType === 'extension') {

                        if (compAuthorization.authorizeAdminAnswerUser(username) === true) {

                            logger.info(IDLOG, 'answer to call from ' + req.params.endpointType + ' "' + req.params.endpointId + '" by user "' + username + '": he has the admin_answer permission');
                        }
                        // check if the endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'answer to call from ' + req.params.endpointType + ' "' + req.params.endpointId + '" failed: extension is not owned by user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        ajaxPhoneAnswer(username, req, res);

                    } else {
                        logger.warn(IDLOG, 'answer to call from ' + req.params.endpointId + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Answers a call directed to a webrtc extension sending the relative command to the client with the following REST API:
            *
            *     POST answer_webrtc
            *
            * @method answer_webrtc
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            answer_webrtc: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params !== 'object' ||
                        typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminAnswerUser(username) === true) {

                        logger.info(IDLOG, 'answer call from webrtc extension "' + req.params.endpointId + '" by user "' + username + '": he has the admin_answer permission');
                    }
                    // check if the endpoint is owned by the user
                    else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                        logger.warn(IDLOG, 'answer call from webrtc extension "' + req.params.endpointId + '" failed: extension is not owned by user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAstProxy.isExtenWebrtc(req.params.endpointId)) {
                        compComNethctiWs.sendAnswerWebrtcToClient(username, req.params.endpointId);
                        compUtil.net.sendHttp200(IDLOG, res);
                    }
                    else {
                        logger.warn(IDLOG, 'answer call from webrtc extension "' + req.params.endpointId + '" by user "' + username + '" failed: it is not webrtc');
                        compUtil.net.sendHttp500(IDLOG, res, req.params.endpointId + ' it is not webrtc');
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer a conversation with blind type with the following REST API:
            *
            *     POST blindtransfer
            *
            * @method blindtransfer
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            blindtransfer: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params            !== 'object' ||
                        typeof req.params.convid     !== 'string' || typeof req.params.to           !== 'string' ||
                        typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to blind transfer the call of all extensions
                        if (compAuthorization.authorizeAdminTransferUser(username) === true) {

                            logger.info(IDLOG, 'blind transfer convid ' + req.params.convid + ': admin transfer authorization successful for user "' + username + '"');
                        }
                        // check if the endpoint of the request is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'blind transfer convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        else {
                            logger.info(IDLOG, 'blind transfer convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                        compAstProxy.redirectConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.to,
                            extForCtx,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'blind transfer convid "' + req.params.convid + '" by user "' + username + '" with ' +
                                                           req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'convid ' + req.params.convid + ' has been blind transfered successfully by user "' +
                                                       username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'blind transfering the convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Start on hold music on both side of a dialog making the intrusion.
            *
            *     POST start_intrude_music_for_hold
            *
            * @method start_intrude_music_for_hold
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            start_intrude_music_for_hold: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    if (typeof req.params !== 'object' ||
                        typeof req.params.endpointId !== 'string' ||
                        typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }
                    compAstProxy.startIntrudeMusicForHold(req.params.endpointType, req.params.endpointId, function (err) {
                        try {
                            if (err) {
                                logger.warn(IDLOG, 'doing startIntrudeMusicForHold for extension ' + req.params.endpointId);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                return;
                            }
                            logger.info(IDLOG, 'done startIntrudeMusicForHold for extension ' + req.params.endpointId);
                            compUtil.net.sendHttp200(IDLOG, res);
                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Stop on hold music on both side of a dialog making the hangup with regexp.
            *
            *     POST stop_intrude_music_for_hold
            *
            * @method stop_intrude_music_for_hold
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            stop_intrude_music_for_hold: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    if (typeof req.params !== 'object' ||
                        typeof req.params.endpointId !== 'string' ||
                        typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }
                    compAstProxy.stopIntrudeMusicForHold(req.params.endpointType, req.params.endpointId, function (err) {
                        try {
                            if (err) {
                                logger.warn(IDLOG, 'doing stopIntrudeMusicForHold for extension ' + req.params.endpointId);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                return;
                            }
                            logger.info(IDLOG, 'done stopIntrudeMusicForHold for extension ' + req.params.endpointId);
                            compUtil.net.sendHttp200(IDLOG, res);
                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer the waiting caller from the queue to the specified destination with blind type with the following REST API:
            *
            *     POST blindtransfer_queue
            *
            * @method blindtransfer_queue
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            blindtransfer_queue: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params                 !== 'object' || typeof req.params.queue !== 'string' ||
                        typeof req.params.waitingCallerId !== 'string' || typeof req.params.to    !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to blind transfer the waiting callers from all queues
                    if (compAuthorization.authorizeAdminTransferUser(username) === true) {
                        logger.info(IDLOG, 'blind transfer waiting caller "' + req.params.waitingCallerId + '" from queue ' + req.params.queue + ' to ' + req.params.to + ': "admin_transfer" authorization successful for user "' + username + '"');
                    }
                    else {
                        logger.warn(IDLOG, 'blind transfer waiting caller "' + req.params.waitingCallerId + '" from queue ' + req.params.queue + ' to ' + req.params.to + ': "admin_transfer" authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                    compAstProxy.redirectWaitingCaller(
                        req.params.waitingCallerId,
                        req.params.queue,
                        req.params.to,
                        extForCtx,
                        function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'blind transfer waiting caller "' + req.params.waitingCallerId + '" from queue ' +
                                                       req.params.queue + ' to ' + req.params.to + ' by user "' + username + '" has been failed');

                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }

                                logger.info(IDLOG, 'waiting caller ' + req.params.waitingCallerId + ' has been blind transfered successfully ' +
                                                   'by user "' + username + '" ("' + defext + '") from queue ' + req.params.queue + ' to ' + req.params.to);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        }
                    );
            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        },

        /**
        * Transfer the parked call to the specified destination with blind type with the following REST API:
        *
            *     POST blindtransfer_parking
            *
            * @method blindtransfer_parking
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            blindtransfer_parking: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params         !== 'object' ||
                        typeof req.params.parking !== 'string' || typeof req.params.to !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }


                    // check if the user has the authorization to blind transfer the parked calls
                    if (compAuthorization.authorizeAdminTransferUser(username) === true) {

                        logger.info(IDLOG, 'blind transfer parking "' + req.params.parking + '" to ' + req.params.to + ': "admin_transfer" authorization successful for user "' + username + '"');
                    }
                    else {
                        logger.warn(IDLOG, 'blind transfer parking "' + req.params.parking + '" to ' + req.params.to + ': "admin_transfer" authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                    compAstProxy.redirectParking(
                        req.params.parking,
                        req.params.to,
                        extForCtx,
                        function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'blind transfer waiting caller "' + req.params.waitingCallerId + '" from queue ' +
                                                       req.params.queue + ' to ' + req.params.to + ' by user "' + username + '" has been failed');

                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }

                                logger.info(IDLOG, 'waiting caller ' + req.params.waitingCallerId + ' has been blind transfered successfully ' +
                                                   'by user "' + username + '" from queue ' + req.params.queue + ' to ' + req.params.to);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        }
                    );

            } catch (err) {
                logger.error(IDLOG, err.stack);
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
            }
        },

        /**
        * Spy a conversation with only listening it with the following REST API:
        *
            *     POST start_spy
            *
            * @method start_spy
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            start_spy: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object' || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string'
                        || typeof req.params.destType   !== 'string' || typeof req.params.destId       !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to spy
                    if (compAuthorization.authorizeSpyUser(username) !== true) {

                        logger.warn(IDLOG, 'spy convid ' + req.params.convid + ': authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension' && req.params.destType === 'extension') {

                        // check whether the conversation endpoints belong to a user with
                        // no spy permission enabled. In this case it's not possible to spy
                        var extens = compAstProxy.getExtensionsFromConversation(req.params.convid, req.params.endpointId);

                        var i, k, users;
                        for (i = 0; i < extens.length; i++) {

                            // get the users who have the current extension endpoint associated
                            users = compUser.getUsersUsingEndpointExtension(extens[i]);

                            for (k = 0; k < users.length; k++) {

                                if (compAuthorization.hasNoSpyEnabled(users[k]) === true) {

                                    logger.warn(IDLOG, 'spy convid ' + req.params.convid + ' failed: the user "' + users[k] + '"' +
                                                       ' with extension endpoint ' + extens[i] + ' can\'t be spied');
                                    compUtil.net.sendHttp403(IDLOG, res);
                                    return;
                                }
                            }
                        }

                        // check if the destination endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'spy listen convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'spy listen: the destination endpoint ' + req.params.destType + ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.startSpyListenConversation(req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.destType,
                            req.params.destId,
                            function (err) {

                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'spy listen convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'spy listen convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'starting spy listen convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType + ' or destType ' + destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer a conversation to the specified voicemail with the following REST API:
            *
            *     POST txfer_tovm
            *
            * @method txfer_tovm
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            txfer_tovm: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params            !== 'object' || typeof req.params.username     !== 'string' ||
                        typeof req.params.convid     !== 'string' || typeof req.params.voicemailId  !== 'string' ||
                        typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // all the users can redirect any calls to the destination voicemail associated with the specified endpointId
                        // req.params.username is the username that has the endpoint extension that has the conversation to transfer

                        // check if the endpoint of the request is owned by the username that has the conversation to transfer
                        if (compAuthorization.verifyUserEndpointExten(req.params.username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'transfer convid "' + req.params.convid + '" of exten "' + req.params.endpointId + '" of user "' + req.params.username + '" to voicemail "' +
                                               req.params.voicemailId + '" by user "' + username + '" has been failed: the ' + req.params.endpointId + ' isn\'t owned by user "' + req.params.username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'transfer convid "' + req.params.convid + '" of exten "' + req.params.endpointId + '" of user "' + req.params.username + '" to voicemail "' +
                                               req.params.voicemailId + '" by user "' + username + '": the ' + req.params.endpointId + ' is owned by user "' + req.params.username + '"');
                        }

                        // check if the voicemail of the request is owned by the user
                        if (compAuthorization.verifyUserEndpointVoicemail(req.params.username, req.params.voicemailId) === false) {

                            logger.warn(IDLOG, 'transfer convid "' + req.params.convid + '" of exten "' + req.params.endpointId + '" of user "' + req.params.username + '" to voicemail "' +
                                               req.params.voicemailId + '" by user "' + username + '" has been failed: the voicemail ' + req.params.voicemailId + ' isn\'t owned by the user "' + req.params.username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'transfer convid "' + req.params.convid + '" of exten "' + req.params.endpointId + '" of user "' + req.params.username + '" to voicemail "' +
                                               req.params.voicemailId + '": by user "' + username + '" the voicemail ' + req.params.voicemailId + ' is owned by user "' + req.params.username + '"');
                        }

                        var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                        compAstProxy.transferConversationToVoicemail(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.voicemailId,
                            extForCtx,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'transfer convid "' + req.params.convid + '" to voicemail "' + req.params.voicemailId + '" by user "' + username +
                                                           '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'transfer convid ' + req.params.convid + ' to voicemail "' + req.params.voicemailId + '" has been attended transfered ' +
                                                       'successfully by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'transfering convid ' + req.params.convid + ' to voicemail ' + req.params.voicemailId + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Transfer a conversation to the specified voicemail with the following REST API:
            *
            *     POST start_conf
            *
            * @method start_conf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            start_conf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params                 !== 'object' ||
                        typeof req.params.convid          !== 'string' ||
                        typeof req.params.addEndpointId   !== 'string' ||
                        typeof req.params.ownerEndpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // if site is "local" set it to undefined to avoid following if statements
                    if (req.params.site && req.params.site.toLowerCase() === 'local') { req.params.site = undefined; }

                    if (compAuthorization.verifyUserEndpointExten(username, req.params.ownerEndpointId) === false) {

                        logger.warn(IDLOG, 'starting meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                           'by user "' + username + '" has been failed: the "' + req.params.ownerEndpointId + '" is not owned by him');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        logger.info(IDLOG, 'starting meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                           'by user "' + username + '": the ' + req.params.ownerEndpointId + ' is owned by him');
                    }

                    // check remote site permission
                    if (req.params.site && compAuthorization.authorizeRemoteSiteUser(username) === false) {

                        logger.warn(IDLOG, 'starting meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                           'with remote endpoint "' + req.params.addEndpointId + '" of remote site "' + req.params.site + '" ' +
                                           'by user "' + username + '" has been failed: no remote site permission');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // check the remote site existence
                    if (req.params.site && !compComNethctiRemotes.remoteSiteExists(req.params.site)) {

                        logger.warn(IDLOG, 'starting meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                           'with remote endpoint "' + req.params.addEndpointId + '" of remote site "' + req.params.site + '" ' +
                                           'by user "' + username + '" has been failed: remote site does not exist');
                        compUtil.net.sendHttp500(IDLOG, res, 'non existent remote site "' + req.params.site + '"');
                        return;
                    }

                    // case 1
                    // the owner of the conference is already into its conference. So hangup
                    // its conversation and call the extension to be added
                    if (compAstProxy.isExtenInMeetmeConf(req.params.ownerEndpointId)) {

                        compAstProxy.hangupConversation('extension', req.params.ownerEndpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'starting meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                                       'by user "' + username + '" has been failed: ' + err.toString());
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }

                                req.params.number = req.params.addEndpointId;
                                // add remote site prefix if it has been requested
                                if (req.params.site) { req.params.number = compComNethctiRemotes.getSitePrefixCall(req.params.site) + req.params.number; }
                                req.params.endpointId = req.params.ownerEndpointId;
                                req.params.endpointType = 'extension';
                                call(username, req, res);

                                logger.info(IDLOG, 'started meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                                   'by user "' + username + '" adding exten "' + req.params.addEndpointId + '" ' +
                                                   ( req.params.site ? ('of remote site ' + req.params.site) : '' ));
                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });
                    }
                    // case 2
                    // the owner of the conference is not into the conference
                    else {
                        compAstProxy.startMeetmeConference(
                            req.params.convid,
                            req.params.ownerEndpointId,
                            req.params.addEndpointId,
                            function (err, newUser) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'starting meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                                           'by user "' + username + '" has been failed: ' + err.toString());
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    // case 2a
                                    // the owner is busy with extension to be added. Both enter into the conference
                                    if (newUser) { req.params.number = compAstProxy.getMeetmeConfCode() + req.params.ownerEndpointId; }
                                    // case 2b
                                    // the owner is busy with another extension different from that to be added.
                                    // So call the extension to be added
                                    else {
                                        req.params.number = req.params.addEndpointId;
                                        // add remote site prefix if it has been requested
                                        if (req.params.site) { req.params.number = compComNethctiRemotes.getSitePrefixCall(req.params.site) + req.params.number; }
                                    }

                                    req.params.endpointId = req.params.ownerEndpointId;
                                    req.params.endpointType = 'extension';
                                    call(username, req, res);

                                    logger.info(IDLOG, 'started meetme conf from "' + req.params.ownerEndpointId + '" ' +
                                                       'by user "' + username + '" adding exten "' + req.params.addEndpointId + '" ' +
                                                       ( req.params.site ? ('of remote site ' + req.params.site) : '' ));
                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Pickup a conversation with the following REST API:
            *
            *     POST pickup_conv
            *
            * @method pickup_conv
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            pickup_conv: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object' || typeof req.params.convid       !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string'
                        || typeof req.params.destType   !== 'string' || typeof req.params.destId       !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension' && req.params.destType === 'extension') {

                        // check if the user has the authorization to pickup the specified conversation
                        if (compAuthorization.authorizeAdminPickupUser(username) === true) {

                            logger.log(IDLOG, 'pickup convid "' + req.params.convid + '": admin pickup authorization successful for user "' + username + '"');
                        }
                        // check if the user has the authorization to pickup conversation of specified extension
                        else if (compAuthorization.authorizePickupUser(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'pickup convid "' + req.params.convid + '" failed: user "' + username + '" ' +
                                               ' isn\'t authorized to pickup conversation of endpoint ' + req.params.endpointType + ' ' + req.params.endpointId);
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'pickup convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'pickup convid "' + req.params.convid + ': the destination endpoint ' + req.params.destType +
                                               ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                        compAstProxy.pickupConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.destType,
                            req.params.destId,
                            extForCtx,
                            function (err) {

                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'pickup convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'pickup convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'picking up convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType + ' or destType ' + destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Stop the record of the specified conversation with the following REST API:
            *
            *     POST stop_record
            *
            * @method stop_record
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            stop_record: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to stop record all the conversations
                        if (compAuthorization.authorizeAdminRecordingUser(username) === true) {

                            logger.info(IDLOG, 'stop recording convid ' + req.params.convid + ': admin recording authorization successful for user "' + username + '"');
                        }
                        // check if the user has the authorization to stop record his own conversations
                        else if (compAuthorization.authorizeRecordingUser(username) !== true) {

                            logger.warn(IDLOG, 'stop recording convid ' + req.params.convid + ': recording authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'stopping record convid ' + req.params.convid + ' by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'stopping record convid ' + req.params.convid + ': the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.stopRecordConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'stopping record convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'stopped record convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'stopping record of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Starts the record of the specified conversation with the following REST API:
            *
            *     POST start_record
            *
            * @method start_record
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            start_record: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to record all the conversations
                        if (compAuthorization.authorizeAdminRecordingUser(username) === true) {

                            logger.info(IDLOG, 'start recording convid ' + req.params.convid + ': admin recording authorization successful for user "' + username + '"');
                        }
                        // check if the user has the authorization to record his own conversations
                        else if (compAuthorization.authorizeRecordingUser(username) !== true) {

                            logger.warn(IDLOG, 'start recording convid ' + req.params.convid + ': recording authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'starting record convid ' + req.params.convid + ' by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'starting record convid ' + req.params.convid + ': the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.startRecordConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'starting record convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'started record convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'starting record of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Force hangup of the specified conversation with the following REST API:
            *
            *     POST force_hangup
            *
            * @method force_hangup
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            force_hangup: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params              !== 'object' || typeof req.params.convid     !== 'string' ||
                        typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to hangup every calls
                        if (compAuthorization.authorizeAdminHangupUser(username) === true) {

                            logger.log(IDLOG, 'force hangup convid "' + req.params.convid + '": authorization admin hangup successful for user "' + username + '"');
                        }
                        // check if the endpoint of the request is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {

                            logger.warn(IDLOG, 'force hangup convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        else {
                            logger.info(IDLOG, 'force hangup convid "' + req.params.convid + '": the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                        compAstProxy.forceHangupConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            extForCtx,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'force hangup convid "' + req.params.convid + '" by user "' + username + '" with ' +
                                                           req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'convid ' + req.params.convid + ' has been forced hangup successfully by user "' +
                                                       username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'forcing hangup of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Mute a user of a meetme conference with the following REST API:
            *
            *     POST mute_userconf
            *
            * @method mute_userconf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            mute_userconf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params        !== 'object' ||
                        typeof req.params.confId !== 'string' ||
                        typeof req.params.userId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the conference belongs to the user
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.confId) !== true) {

                        logger.warn(IDLOG, 'muting user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '" ' +
                                           'by user "' + username + '" has been failed: ' + req.params.confId + ' is not owned by the user');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        logger.info(IDLOG, 'muting user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '": ' +
                                           req.params.confId + ' is owned by "' + username + '"');
                    }

                    compAstProxy.muteUserMeetmeConf(
                        req.params.confId,
                        req.params.userId,
                        function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'muting user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '" ' +
                                                       ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '" ' +
                                                   'has been muted successfully by user "' + username + '"');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        }
                    );
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Unmute a user of a meetme conference with the following REST API:
            *
            *     POST unmute_userconf
            *
            * @method unmute_userconf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            unmute_userconf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params        !== 'object' ||
                        typeof req.params.confId !== 'string' ||
                        typeof req.params.userId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the conference belongs to the user
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.confId) !== true) {

                        logger.warn(IDLOG, 'unmuting user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '" ' +
                                           'by user "' + username + '" has been failed: ' + req.params.confId + ' is not owned by the user');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        logger.info(IDLOG, 'unmuting user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '": ' +
                                           req.params.confId + ' is owned by "' + username + '"');
                    }

                    compAstProxy.unmuteUserMeetmeConf(
                        req.params.confId,
                        req.params.userId,
                        function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'unmuting user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '" ' +
                                                       'has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'user "' + req.params.userId + '" of meetme conf "' + req.params.confId + '" ' +
                                                   'has been unmuted successfully by user "' + username + '"');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        }
                    );
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Ends the entire meetme conference with the following REST API:
            *
            *     POST end_conf
            *
            * @method end_conf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            end_conf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params        !== 'object' ||
                        typeof req.params.confId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the conference belongs to the user
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.confId) !== true) {

                        logger.warn(IDLOG, 'ending meetme conf "' + req.params.confId + '" ' +
                                           'by user "' + username + '" has been failed: ' + req.params.confId + ' is not owned by the user');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        logger.info(IDLOG, 'ending meetme conf "' + req.params.confId + '": ' +
                                           req.params.confId + ' is owned by "' + username + '"');
                    }

                    compAstProxy.endMeetmeConf(
                        req.params.confId,
                        function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'ending meetme conf "' + req.params.confId + '" by user "' + username + '" has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'meetme conf "' + req.params.confId + '" ' +
                                                   'has been ended successfully by user "' + username + '"');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        }
                    );
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Joins the extension owner to his meetme conference with the following REST API:
            *
            *     POST join_myconf
            *
            * @method join_myconf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            join_myconf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params            !== 'object' ||
                        typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the conference belongs to the user
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) !== true) {

                        logger.warn(IDLOG, 'joining meetme conf "' + req.params.endpointId + '" ' +
                                           'by user "' + username + '" has been failed: ' + req.params.endpointId + ' is not owned by the user');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        logger.info(IDLOG, 'joining meetme conf "' + req.params.endpointId + '": ' +
                                           req.params.endpointId + ' is owned by "' + username + '"');
                    }

                    logger.warn(IDLOG, 'starting join exten "' + req.params.endpointId + '" to its meetme conf ' +
                                       'by user "' + username + '"');
                    req.params.number = compAstProxy.getMeetmeConfCode() + req.params.endpointId;
                    req.params.endpointType = 'extension';
                    call(username, req, res);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Hangup a user of a meetme conference with the following REST API:
            *
            *     POST hangup_userconf
            *
            * @method hangup_userconf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            hangup_userconf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params         !== 'object' ||
                        typeof req.params.confId  !== 'string' ||
                        typeof req.params.extenId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the conference belongs to the user
                    if (compAuthorization.verifyUserEndpointExten(username, req.params.confId) !== true) {

                        logger.warn(IDLOG, 'hanging up user "' + req.params.extenId + '" of meetme conf "' + req.params.confId + '" ' +
                                           'by user "' + username + '" has been failed: ' + req.params.confId + ' is not owned by the user');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        logger.info(IDLOG, 'hanging up user "' + req.params.extenId + '" of meetme conf "' + req.params.confId + '": ' +
                                           req.params.confId + ' is owned by "' + username + '"');
                    }

                    compAstProxy.hangupUserMeetmeConf(
                        req.params.confId,
                        req.params.extenId,
                        function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'hanging up user "' + req.params.extenId + '" of meetme conf "' + req.params.confId + '" ' +
                                                       'has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'user "' + req.params.extenId + '" of meetme conf "' + req.params.confId + '" ' +
                                                   'has been hanged up successfully by user "' + username + '"');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        }
                    );
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Mute the record of the specified conversation with the following REST API:
            *
            *     POST mute_record
            *
            * @method mute_record
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            mute_record: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to record all the conversations
                        if (compAuthorization.authorizeAdminRecordingUser(username) === true) {

                            logger.info(IDLOG, 'mute recording convid ' + req.params.convid + ': admin recording authorization successful for user "' + username + '"');
                        }
                        // check if the user has the authorization to record his own conversations
                        else if (compAuthorization.authorizeRecordingUser(username) !== true) {

                            logger.warn(IDLOG, 'mute recording convid ' + req.params.convid + ': recording authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'muting record convid ' + req.params.convid + ' by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'muting record convid ' + req.params.convid + ': the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.muteRecordConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'muting record convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'mute record convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'muting record of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Unmute the record of the specified conversation with the following REST API:
            *
            *     POST unmute_record
            *
            * @method unmute_record
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            unmute_record: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the user has the authorization to record all the conversations
                        if (compAuthorization.authorizeAdminRecordingUser(username) === true) {

                            logger.info(IDLOG, 'unmute recording convid ' + req.params.convid + ': admin recording authorization successful for user "' + username + '"');
                        }
                        // check if the user has the authorization to record his own conversations
                        else if (compAuthorization.authorizeRecordingUser(username) !== true) {

                            logger.warn(IDLOG, 'unmute recording convid ' + req.params.convid + ': recording authorization failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'unmuting record convid ' + req.params.convid + ' by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'unmuting record convid ' + req.params.convid + ': the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.unmuteRecordConversation(req.params.endpointType, req.params.endpointId, req.params.convid, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'unmuting record convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'unmuting record convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'unmuting record of convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Pickup a parked call with the following REST API:
            *
            *     POST pickup_parking
            *
            * @method pickup_parking
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            pickup_parking: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params          !== 'object' || typeof req.params.parking !== 'string' ||
                        typeof req.params.destType !== 'string' || typeof req.params.destId  !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to pickup a parked call
                    if (compAuthorization.authorizeOpParkingsUser(username)    !== true &&
                        compAuthorization.authorizeAdminParkingsUser(username) !== true) {

                        logger.warn(IDLOG, 'pickup parking "' + req.params.parking + '": authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (req.params.destType === 'extension') {

                        if (compAuthorization.authorizeAdminParkingsUser(username) === true) {

                            logger.info(IDLOG, 'pickup parking "' + req.params.parking + '" by user "' + username + '": he has the admin_parkings permission');
                        }
                        // check if the destination endpoint is owned by the user
                        else if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'pickup parking "' + req.params.parking + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        else {
                            logger.info(IDLOG, 'pickup parking "' + req.params.parking + '": the destination endpoint ' + req.params.destType +
                                               ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        var extForCtx = compConfigManager.getDefaultUserExtensionConf(username);

                        compAstProxy.pickupParking(req.params.parking, req.params.destType, req.params.destId, extForCtx, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'pickup parking ' + req.params.parking + ' by user "' + username + '" with ' +
                                                       req.params.destType + ' ' + req.params.destId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }
                                logger.info(IDLOG, 'pickup parking ' + req.params.parking + ' has been successful by user "' + username + '" ' +
                                                   'with ' + req.params.destType + ' ' + req.params.destId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });
                    } else {
                        logger.warn(IDLOG, 'picking up parking ' + req.params.parking + ': unknown destType ' + req.params.destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Logon the extension in the queue in which is dynamic member with the following REST API:
            *
            *     POST queuemember_add
            *
            * @method queuemember_add
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            queuemember_add: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    // the "paused" and "penalty" parameters are optional
                    if (   typeof req.params              !== 'object' || typeof req.params.queueId !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" in the queue "' + req.params.queueId + '": user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the queues operator panel authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" in the queue "' + req.params.queueId + '": authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    // the user has the "queues" authorization. So check if the endpoint is owned by the user
                    else {

                        logger.info(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" in the queue "' + req.params.queueId + '": user "' + username + '" has the "queues" authorization');

                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                               req.params.endpointId + '" in the queue "' + req.params.queueId + '" by user "' + username + '" has been failed: ' +
                                               '"' + req.params.endpointId + '" is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                               req.params.endpointId + '" in the queue "' + req.params.queueId + '": "' + req.params.endpointId + '" is owned by user "' + username + '"');
                        }
                    }

                    if (req.params.endpointType === 'extension') {

                        compAstProxy.queueMemberAdd(req.params.endpointType, req.params.endpointId, req.params.queueId, req.params.paused, req.params.penalty, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                                       req.params.endpointId + '" in the queue "' + req.params.queueId + '" by user "' + username +
                                                       '" has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }

                                logger.info(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                                   req.params.endpointId + '" in the queue "' + req.params.queueId + '" by user "' + username +
                                                   '" has been successf');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'logging in "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" in the queue "' + req.params.queueId + '": unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Logout the extension from the queue in which is dynamic member with the following REST API:
            *
            *     POST queuemember_remove
            *
            * @method queuemember_remove
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            queuemember_remove: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.queueId !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" from the queue "' + req.params.queueId + '": user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the queues operator panel authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" from the queue "' + req.params.queueId + '": authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    // the user has the "queues" authorization. So check if the endpoint is owned by the user
                    else {

                        logger.info(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" from the queue "' + req.params.queueId + '": user "' + username + '" has the "queues" authorization');

                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                               req.params.endpointId + '" from the queue "' + req.params.queueId + '" by user "' + username + '" has been failed: ' +
                                               '"' + req.params.endpointId + '" is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                               req.params.endpointId + '" from the queue "' + req.params.queueId + '": "' + req.params.endpointId + '" is owned by user "' + username + '"');
                        }
                    }

                    if (req.params.endpointType === 'extension') {

                        compAstProxy.queueMemberRemove(req.params.endpointType, req.params.endpointId, req.params.queueId, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                                       req.params.endpointId + '" from the queue "' + req.params.queueId + '" by user "' + username +
                                                       '" has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }

                                logger.info(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                                   req.params.endpointId + '" from the queue "' + req.params.queueId + '" by user "' + username +
                                                   '" has been successf');
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'logging out "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '" from the queue "' + req.params.queueId + '": unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Logon the extension in all the queues in which is dynamic member with the following REST API:
            *
            *     POST inout_dyn_queues
            *
            * @method inout_dyn_queues
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            inout_dyn_queues: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params              !== 'object' ||
                        typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the administration operator panel queues authorization
                    if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

                        logger.info(IDLOG, 'inout dynamic all queues for "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '": user "' + username + '" has the "admin_queues" authorization');
                    }
                    // otherwise check if the user has the queues operator panel authorization
                    else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

                        logger.warn(IDLOG, 'inout dynamic all queues for "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '": authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    // the user has the "queues" authorization. So check if the endpoint is owned by the user
                    else {

                        logger.info(IDLOG, 'inout dynamic all queues for "' + req.params.endpointType + '" "' +
                                           req.params.endpointId + '": user "' + username + '" has the "queues" authorization');

                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'inout dynamic all queues by user "' + username + '" has been failed: ' +
                                               ' the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'inout dynamic all queues: endpoint ' + req.params.endpointType + ' ' +
                                               req.params.endpointId + ' is owned by user "' + username + '"');
                        }
                    }

                    if (req.params.endpointType === 'extension') {

                        compAstProxy.inoutDynQueues(req.params.endpointType, req.params.endpointId, function (err) {
                            try {
                                if (err) {
                                    logger.warn(IDLOG, 'inout dynamic all queues by user "' + username + '" with ' +
                                                       req.params.endpointType + ' ' + req.params.endpointId + ' has been failed');
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                    return;
                                }

                                logger.info(IDLOG, 'inout dynamic all queues has been successful by user "' + username + '" ' +
                                                   'with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                compUtil.net.sendHttp200(IDLOG, res);

                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                        });

                    } else {
                        logger.warn(IDLOG, 'inout dynamic all queues: unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Pause the specified extension from receiving calls from the queue with the following REST API:
            *
            *     POST queuemember_pause
            *
            * @method queuemember_pause
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            queuemember_pause: function (req, res, next) {
                try {
                    queueMemberPauseUnpause(req, res, true);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Unpause the specified extension to receive calls from the queue with the following REST API:
            *
            *     POST queuemember_unpause
            *
            * @method queuemember_unpause
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            queuemember_unpause: function (req, res, next) {
                try {
                    queueMemberPauseUnpause(req, res, false);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Sends the dtmf code to the destination with the following REST API:
            *
            *     POST send_dtmf
            *
            * @method send_dtmf
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            send_dtmf: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params            !== 'object'
                        || typeof req.params.convid     !== 'string' || typeof req.params.tone         !== 'string'
                        || typeof req.params.endpointId !== 'string' || typeof req.params.endpointType !== 'string'
                        || dtmfTonesPermitted.indexOf(req.params.tone) === -1) {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension') {

                        // check if the endpoint of the request is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'send dtmf tone "' + req.params.tone + '" to the convid "' + req.params.convid +
                                               '" by user "' + username + '" has been failed: ' + ' the ' + req.params.endpointType +
                                               ' ' + req.params.endpointId + ' is not owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'send dtmf tone "' + req.params.tone + '" to the convid "' + req.params.convid +
                                               '": the endpoint ' + req.params.endpointType + ' ' + req.params.endpointId +
                                               ' is owned by "' + username + '"');
                        }

                        compAstProxy.sendDtmfToConversation(
                            req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.tone,
                            function (err) {
                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'send dtmf tone "' + req.params.tone + '" to the convid "' + req.params.convid +
                                                           '" by user "' + username + '" with ' + req.params.endpointType + ' ' +
                                                           req.params.endpointId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'dtmf tone "' + req.params.tone + '" has been sent successfully to the convid ' + req.params.convid +
                                                       ' by user "' + username + '" with ' + req.params.endpointType + ' ' + req.params.endpointId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'sending dtmf tone the convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Originates a new echo call with the following REST API:
            *
            *     POST call_echo
            *
            * @method call_echo
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            call_echo: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object'
                        || typeof req.params.endpointId   !== 'string'
                        || typeof req.params.endpointType !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // add the destination number used to originate a new echo call
                    req.params.number = compAstProxy.getEchoCallDestination();

                    if (req.params.endpointType === 'extension') {

                        // check if the endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                            logger.warn(IDLOG, 'make new echo call failed: ' + req.params.endpointId + ' is not owned by user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        call(username, req, res);

                    } else {
                        logger.warn(IDLOG, 'making new echo call from user "' + username + '": unknown endpointType ' + req.params.endpointType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Spy and speak in a conversation with the following REST API:
            *
            *     POST intrude
            *
            * @method intrude
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            intrude: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params              !== 'object' || typeof req.params.convid     !== 'string'
                        || typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string'
                        || typeof req.params.destType     !== 'string' || typeof req.params.destId     !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // check if the user has the authorization to spy
                    if (compAuthorization.authorizeIntrudeUser(username) !== true) {

                        logger.warn(IDLOG, 'start spy & speak convid ' + req.params.convid + ': authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (req.params.endpointType === 'extension' && req.params.destType === 'extension') {

                        // check whether the conversation endpoints belong to a user with
                        // no spy permission enabled. In this case it's not possible to spy
                        var extens = compAstProxy.getExtensionsFromConversation(req.params.convid, req.params.endpointId);

                        var i, k, users;
                        for (i = 0; i < extens.length; i++) {

                            // get the users who have the current extension endpoint associated
                            users = compUser.getUsersUsingEndpointExtension(extens[i]);

                            for (k = 0; k < users.length; k++) {

                                if (compAuthorization.hasNoSpyEnabled(users[k]) === true) {

                                    logger.warn(IDLOG, 'spy & speak convid ' + req.params.convid + ' failed: the user "' + users[k] + '"' +
                                                       ' with extension endpoint ' + extens[i] + ' can\'t be spied');
                                    compUtil.net.sendHttp403(IDLOG, res);
                                    return;
                                }
                            }
                        }

                        // check if the destination endpoint is owned by the user
                        if (compAuthorization.verifyUserEndpointExten(username, req.params.destId) === false) {

                            logger.warn(IDLOG, 'start spy & speak convid "' + req.params.convid + '" by user "' + username + '" has been failed: ' +
                                               ' the destination ' + req.params.destType + ' ' + req.params.destId + ' isn\'t owned by the user');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;

                        } else {
                            logger.info(IDLOG, 'start spy & speak the destination endpoint ' + req.params.destType + ' ' + req.params.destId + ' is owned by "' + username + '"');
                        }

                        compAstProxy.startSpySpeakConversation(req.params.endpointType,
                            req.params.endpointId,
                            req.params.convid,
                            req.params.destType,
                            req.params.destId,
                            function (err) {

                                try {
                                    if (err) {
                                        logger.warn(IDLOG, 'start spy & speak convid ' + req.params.convid + ' by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId + ' has been failed');
                                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                        return;
                                    }
                                    logger.info(IDLOG, 'start spy & speak convid ' + req.params.convid + ' has been successful by user "' + username + '" with ' + req.params.destType + ' ' + req.params.destId);
                                    compUtil.net.sendHttp200(IDLOG, res);

                                } catch (err) {
                                    logger.error(IDLOG, err.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                }
                            }
                        );

                    } else {
                        logger.warn(IDLOG, 'starting spy and speak convid ' + req.params.convid + ': unknown endpointType ' + req.params.endpointType + ' or destType ' + req.params.destType);
                        compUtil.net.sendHttp400(IDLOG, res);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.cw                       = astproxy.cw;
        exports.api                      = astproxy.api;
        exports.dnd                      = astproxy.dnd;
        exports.park                     = astproxy.park;
        exports.call                     = astproxy.call;
        exports.mute                     = astproxy.mute;
        exports.cfvm                     = astproxy.cfvm;
        exports.unmute                   = astproxy.unmute;
        exports.cfcall                   = astproxy.cfcall;
        exports.queues                   = astproxy.queues;
        exports.trunks                   = astproxy.trunks;
        exports.prefix                   = astproxy.prefix;
        exports.hangup                   = astproxy.hangup;
        exports.atxfer                   = astproxy.atxfer;
        exports.answer                   = astproxy.answer;
        exports.intrude                  = astproxy.intrude;
        exports.end_conf                 = astproxy.end_conf;
        exports.opgroups                 = astproxy.opgroups;
        exports.parkings                 = astproxy.parkings;
        exports.call_echo                = astproxy.call_echo;
        exports.send_dtmf                = astproxy.send_dtmf;
        exports.start_spy                = astproxy.start_spy;
        exports.setLogger                = setLogger;
        exports.txfer_tovm               = astproxy.txfer_tovm;
        exports.start_conf               = astproxy.start_conf;
        exports.conference               = astproxy.conference;
        exports.extensions               = astproxy.extensions;
        exports.sip_webrtc               = astproxy.sip_webrtc;
        exports.queues_qos               = astproxy.queues_qos;
        exports.agents_qos               = astproxy.agents_qos;
        exports.setPrivacy               = setPrivacy;
        exports.setCompUtil              = setCompUtil;
        exports.join_myconf              = astproxy.join_myconf;
        exports.pickup_conv              = astproxy.pickup_conv;
        exports.remote_call              = astproxy.remote_call;
        exports.stop_record              = astproxy.stop_record;
        exports.setCompUser              = setCompUser;
        exports.mute_record              = astproxy.mute_record;
        exports.queue_recall             = astproxy.queue_recall;
        exports.qrecall_info             = astproxy.qrecall_info;
        exports.qrecall_check            = astproxy.qrecall_check;
        exports.queues_stats             = astproxy.queues_stats;
        exports.start_record             = astproxy.start_record;
        exports.unauthe_call             = astproxy.unauthe_call;
        exports.force_hangup             = astproxy.force_hangup;
        exports.mute_userconf            = astproxy.mute_userconf;
        exports.blindtransfer            = astproxy.blindtransfer;
        exports.unmute_record            = astproxy.unmute_record;
        exports.answer_webrtc            = astproxy.answer_webrtc;
        exports.hangup_channel           = astproxy.hangup_channel;
        exports.pickup_parking           = astproxy.pickup_parking;
        exports.remote_opgroups          = astproxy.remote_opgroups;
        exports.unmute_userconf          = astproxy.unmute_userconf;
        exports.hangup_userconf          = astproxy.hangup_userconf;
        exports.setCompOperator          = setCompOperator;
        exports.setCompAstProxy          = setCompAstProxy;
        exports.queuemember_add          = astproxy.queuemember_add;
        exports.remote_prefixes          = astproxy.remote_prefixes;
        exports.inout_dyn_queues         = astproxy.inout_dyn_queues;
        exports.remote_extensions        = astproxy.remote_extensions;
        exports.queuemember_pause        = astproxy.queuemember_pause;
        exports.queuemember_remove       = astproxy.queuemember_remove;
        exports.queuemember_unpause      = astproxy.queuemember_unpause;
        exports.blindtransfer_queue      = astproxy.blindtransfer_queue;
        exports.start_intrude_music_for_hold = astproxy.start_intrude_music_for_hold;
        exports.stop_intrude_music_for_hold = astproxy.stop_intrude_music_for_hold;
        exports.setCompComNethctiWs      = setCompComNethctiWs;
        exports.is_autoc2c_supported     = astproxy.is_autoc2c_supported;
        exports.setCompAuthorization     = setCompAuthorization;
        exports.setCompConfigManager     = setCompConfigManager;
        exports.blindtransfer_parking    = astproxy.blindtransfer_parking;
        exports.setCompComNethctiRemotes = setCompComNethctiRemotes;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Originates a new call.
*
* @method call
* @param {string} username The username that originate the call
* @param {object} req      The client request
* @param {object} res      The client response
*/
function call(username, req, res) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof req !== 'object' || typeof res !== 'object') {
            throw new Error('wrong parameters');
        }


        // if source extension is of webrtc type it sends a websocket event to make
        // the client to originate the call: this is used with conference.
        // If the user has enabled the automatic click2call then make an HTTP
        // request directly to the phone, otherwise make a new call by asterisk
        if (compAstProxy.isExtenWebrtc(req.params.endpointId)) {
            compComNethctiWs.sendCallWebrtcToClient(username, req.params.number);
            compUtil.net.sendHttp200(IDLOG, res);
        }
        else if (!compConfigManager.isAutomaticClick2callEnabled(username)) { asteriskCall(username, req, res); }
        else { ajaxPhoneCall(username, req, res); }

    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Originates a new call sending an HTTP GET request to the phone device.
*
* @method ajaxPhoneCall
* @param {string} username The username that originate the call
* @param {object} req      The client request
* @param {object} res      The client response
*/
function ajaxPhoneCall(username, req, res) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof req !== 'object' || typeof res !== 'object') {
            throw new Error('wrong parameters');
        }

        var to             = compAstProxy.addPrefix(req.params.number);
        var exten          = req.params.endpointId;
        var extenIp        = compAstProxy.getExtensionIp(exten);
        var extenAgent     = compAstProxy.getExtensionAgent(exten);
        var serverHostname = compConfigManager.getServerHostname();

        // get the url to call to originate the new call. If the url is an empty
        // string, the phone is not supported, so the call fails
        var url = compConfigManager.getCallUrlFromAgent(extenAgent);

        if (typeof url === 'string' && url !== '') {

            // the credential to access the phone via url
            var phoneUser = compConfigManager.getC2CAutoPhoneUser(username);
            var phonePass = compConfigManager.getC2CAutoPhonePass(username);

            // replace the parameters of the url template
            url = url.replace(/\$SERVER/g,     serverHostname);
            url = url.replace(/\$NUMBER/g,     to);
            url = url.replace(/\$ACCOUNT/g,    exten);
            url = url.replace(/\$PHONE_IP/g,   extenIp);
            url = url.replace(/\$PHONE_USER/g, phoneUser);
            url = url.replace(/\$PHONE_PASS/g, phonePass);

            // alcatel phones accept GET/401/GET/2xx handshake
            // first request get 401 response
            // second request get 204 response
            // more details here: Nethesis/dev#5115
            if (extenAgent.toLowerCase().indexOf('alcatel') !== -1) {

              httpReq.get(url, function (httpResp) {
                  try {
                      if (httpResp.statusCode === 200 || httpResp.statusCode === 204) {

                          logger.info(IDLOG, 'new call to ' + to + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.info(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });

                      } else if (httpResp.statusCode === 401) {

                        httpReq.get(url, function (httpResp) {
                            try {
                                if (httpResp.statusCode === 200 || httpResp.statusCode === 204) {

                                    logger.info(IDLOG, 'new call to ' + to + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                                      ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                                    logger.info(IDLOG, url);
                                    res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });

                                } else {
                                    logger.warn(IDLOG, 'new call to ' + to + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                                      ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                                    logger.warn(IDLOG, url);
                                    res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });
                                }
                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }

                        }).on('error', function (err1) {
                            logger.error(IDLOG, err1.message);
                            compUtil.net.sendHttp500(IDLOG, res, err1.message);
                        });

                      } else {
                          logger.warn(IDLOG, 'new call to ' + to + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.warn(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });
                      }
                  } catch (err) {
                      logger.error(IDLOG, err.stack);
                      compUtil.net.sendHttp500(IDLOG, res, err.toString());
                  }

              }).on('error', function (err1) {
                  logger.error(IDLOG, err1.message);
                  compUtil.net.sendHttp500(IDLOG, res, err1.message);
              });

            // other phones
            } else {

              httpReq.get(url, function (httpResp) {
                  try {
                      if (httpResp.statusCode === 200 || httpResp.statusCode === 204) {

                          logger.info(IDLOG, 'new call to ' + to + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.info(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });

                      } else {
                          logger.warn(IDLOG, 'new call to ' + to + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.warn(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });
                      }
                  } catch (err) {
                      logger.error(IDLOG, err.stack);
                      compUtil.net.sendHttp500(IDLOG, res, err.toString());
                  }

              }).on('error', function (err1) {
                  logger.error(IDLOG, err1.message);
                  compUtil.net.sendHttp500(IDLOG, res, err1.message);
              });
            }

        } else {
            logger.warn(IDLOG, 'failed call to ' + to + ' via HTTP GET request sent to the phone ' + exten + ' ' + extenIp + ' by the user "' + username + '": ' + extenAgent + ' is not supported');
            compUtil.net.sendHttp500(IDLOG, res, 'the phone "' + extenAgent + '" is not supported');
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Answer to call from the extension sending an HTTP GET request to the phone device.
*
* @method ajaxPhoneAnswer
* @param {string} username The username that originate the call
* @param {object} req      The client request
* @param {object} res      The client response
*/
function ajaxPhoneAnswer(username, req, res) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof req !== 'object' || typeof res !== 'object') {
            throw new Error('wrong parameters');
        }

        var exten      = req.params.endpointId;
        var extenIp    = compAstProxy.getExtensionIp(exten);
        var extenAgent = compAstProxy.getExtensionAgent(exten);

        // get the url to call to originate the new call. If the url is an empty
        // string, the phone is not supported, so the call fails
        var url = compConfigManager.getAnswerUrlFromAgent(extenAgent);

        if (typeof url === 'string' && url !== '') {

            // the credential to access the phone via url
            var phoneUser = compConfigManager.getC2CAutoPhoneUser(username);
            var phonePass = compConfigManager.getC2CAutoPhonePass(username);

            // replace the parameters of the url template
            url = url.replace(/\$PHONE_IP/g,   extenIp);
            url = url.replace(/\$PHONE_USER/g, phoneUser);
            url = url.replace(/\$PHONE_PASS/g, phonePass);

            // alcatel phones accept GET/401/GET/2xx handshake
            // first request get 401 response
            // second request get 204 response
            // more details here: Nethesis/dev#5115
            if (extenAgent.toLowerCase().indexOf('alcatel') !== -1) {

              httpReq.get(url, function (httpResp) {
                  try {
                      if (httpResp.statusCode === 200 || httpResp.statusCode === 204) {

                          logger.info(IDLOG, 'answer to ' + exten + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.info(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });

                      } else if (httpResp.statusCode === 401) {

                        httpReq.get(url, function (httpResp) {
                            try {
                                if (httpResp.statusCode === 200 || httpResp.statusCode === 204) {

                                    logger.info(IDLOG, 'answer to ' + exten + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                                      ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                                    logger.info(IDLOG, url);
                                    res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });

                                } else {
                                    logger.warn(IDLOG, 'answer to ' + exten + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                                      ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                                    logger.warn(IDLOG, url);
                                    res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });
                                }
                            } catch (err) {
                                logger.error(IDLOG, err.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }

                        }).on('error', function (err1) {
                            logger.error(IDLOG, err1.message);
                            compUtil.net.sendHttp500(IDLOG, res, err1.message);
                        });

                      } else {
                          logger.warn(IDLOG, 'answer to ' + exten + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.warn(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });
                      }
                  } catch (err) {
                      logger.error(IDLOG, err.stack);
                      compUtil.net.sendHttp500(IDLOG, res, err.toString());
                  }

              }).on('error', function (err1) {
                  logger.error(IDLOG, err1.message);
                  compUtil.net.sendHttp500(IDLOG, res, err1.message);
              });

            // other phones
            } else {

              httpReq.get(url, function (httpResp) {
                  try {
                      if (httpResp.statusCode === 200 || httpResp.statusCode === 204) {

                          logger.info(IDLOG, 'answer to ' + exten + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.info(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });

                      } else {
                          logger.warn(IDLOG, 'answer to ' + exten + ': sent HTTP GET to the phone ' + exten + ' ' + extenIp +
                            ' by the user "' + username + '" (resp status code: ' + httpResp.statusCode + ')');
                          logger.warn(IDLOG, url);
                          res.send(httpResp.statusCode, { phoneRespStatusCode: httpResp.statusCode });
                      }
                  } catch (err) {
                      logger.error(IDLOG, err.stack);
                      compUtil.net.sendHttp500(IDLOG, res, err.toString());
                  }

              }).on('error', function (err1) {
                  logger.error(IDLOG, err1.message);
                  compUtil.net.sendHttp500(IDLOG, res, err1.message);
              });
            }

        } else {
            logger.warn(IDLOG, 'failed answer to ' + exten + ' via HTTP GET request sent to the phone ' + exten + ' ' + extenIp + ' by the user "' + username + '": ' + extenAgent + ' is not supported');
            compUtil.net.sendHttp500(IDLOG, res, 'the phone "' + extenAgent + '" is not supported');
        }

    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Originates a new call by asterisk.
*
* @method asteriskCall
* @param {string} username The username that originate the call
* @param {object} req      The client request
* @param {object} res      The client response
*/
function asteriskCall(username, req, res) {
    try {
        // check parameters
        if (typeof username !== 'string' || typeof req !== 'object' || typeof res !== 'object') {
            throw new Error('wrong parameters');
        }

        // extension to be used to get the "context" to make the new call.
        // "endpointType" can be a cellphone in "callback call" mode (e.g. using the mobile app)
        // In this case the "context" to be used for the call must to be of the default extension of the user
        var extenForContext = req.params.endpointId;
        if (req.params.endpointType === 'cellphone') {
            extenForContext = compConfigManager.getDefaultUserExtensionConf(username);
        }

        compAstProxy.call(req.params.endpointType, req.params.endpointId, req.params.number, extenForContext, function (err) {
            try {
                if (err) {
                    logger.warn(IDLOG, 'failed call from user "' + username + '" to ' + req.params.number + ' ' +
                                       'using ' + req.params.endpointType + ' ' + req.params.endpointId + ' ' +
                                       'with exten for context ' + extenForContext);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                    return;
                }
                logger.info(IDLOG, 'new call from user "' + username + '" to ' + req.params.number + ' with ' +
                                   req.params.endpointType + ' ' + req.params.endpointId + ' and exten for ' +
                                   'context "' + extenForContext + '" has been successful');
                compUtil.net.sendHttp200(IDLOG, res);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
        });
    } catch (error) {
       logger.error(IDLOG, error.stack);
       compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the string used to hide last digits of phone numbers in privacy mode.
*
* @method setPrivacy
* @param {object} str The string used to hide last digits of phone numbers.
*/
function setPrivacy(str) {
    try {
        privacyStrReplace = str;
        logger.info(IDLOG, 'set privacy with string ' + privacyStrReplace);
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set remote sites communication architect component.
*
* @method setCompComNethctiRemotes
* @param {object} comp The remote sites communication architect component.
*/
function setCompComNethctiRemotes(comp) {
    try {
        compComNethctiRemotes = comp;
        logger.info(IDLOG, 'set remote sites communication architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set configuration manager architect component used by configuration functions.
*
* @method setCompConfigManager
* @param {object} cm The configuration manager architect component.
*/
function setCompConfigManager(cm) {
    try {
        compConfigManager = cm;
        logger.info(IDLOG, 'set configuration manager architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the operator architect component.
*
* @method setCompOperator
* @param {object} comp The operator architect component.
*/
function setCompOperator(comp) {
    try {
        compOperator = comp;
        logger.info(IDLOG, 'set operator architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set the logger to be used.
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
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = comp;
        logger.log(IDLOG, 'authorization component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the websocket communication architect component.
*
* @method setCompComNethctiWs
* @param {object} comp The architect websocket communication component
* @static
*/
function setCompComNethctiWs(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compComNethctiWs = comp;
        logger.log(IDLOG, 'websocket communication component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the user architect component.
*
* @method setCompUser
* @param {object} comp The architect user component
* @static
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compUser = comp;
        logger.log(IDLOG, 'user component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the asterisk proxy component used for asterisk functions.
*
* @method setCompAstProxy
* @param {object} ap The asterisk proxy component.
*/
function setCompAstProxy(ap) {
    try {
        compAstProxy = ap;
        logger.info(IDLOG, 'set asterisk proxy architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the utility architect component.
*
* @method setCompUtil
* @param {object} comp The utility architect component.
*/
function setCompUtil(comp) {
    try {
        compUtil = comp;
        logger.info(IDLOG, 'set util architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the don't disturb status of the endpoint of the user.
*
* @method dndset
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function dndset(req, res, next) {
    try {
        // extract the parameters needed
        var status   = req.params.status;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (   typeof status   !== 'string'
            || typeof endpoint !== 'string'
            || (status !== 'on' && status !== 'off') ) {

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the dnd authorization
        if (compAuthorization.authorizeDndUser(username) !== true) {

            logger.warn(IDLOG, 'setting dnd: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the don't disturb status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization dnd set failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        compAstProxy.setDnd(endpoint, activate, function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'setting dnd for extension ' + endpoint + ' of user "' + username + '"');
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                    return;
                }

                logger.info(IDLOG, 'dnd ' + status + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
                compUtil.net.sendHttp200(IDLOG, res);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
        });

    } catch (error) {
        logger.error(IDLOG, error.stack);
        compUtil.net.sendHttp500(IDLOG, res, error.toString());
    }
}

/**
* Sets the call waiting status of the endpoint of the user.
*
* @method cwset
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cwset(req, res, next) {
    try {
        // extract the parameters needed
        var status   = req.params.status;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (   typeof status   !== 'string'
            || typeof endpoint !== 'string'
            || (status !== 'on' && status !== 'off') ) {

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the call waiting status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization cw set failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        compAstProxy.doCmd({ command: 'cwSet', exten: endpoint, activate: activate }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cw "' + status + '" for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cw "' + status + '" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the don't disturb status of the endpoint of the user.
*
* @method dndget
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function dndget(req, res, next) {
    try {
        // extract the parameters needed
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof endpoint !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the dnd authorization
        if (compAuthorization.authorizeDndUser(username) !== true) {

            logger.warn(IDLOG, 'requesting dnd: authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the don't disturb status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization dnd get failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        compAstProxy.doCmd({ command: 'dndGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting dnd for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'dnd for extension endpoint ' + endpoint + ' of user "' + username + '" has been get successfully: the status is ' + resp.dnd);
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call waiting status of the endpoint of the user.
*
* @method cwget
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cwget(req, res, next) {
    try {
        // extract the parameters needed
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof endpoint !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the call waiting status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization cw get failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        compAstProxy.doCmd({ command: 'cwGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cw for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cw for extension endpoint ' + endpoint + ' of user "' + username + '" has been get successfully: the status is ' + resp.cw);
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call forward status to a voicemail of the endpoint of the user.
*
* @method cfvmGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cfvmGet(req, res, next) {
    try {
        // extract the parameters needed
        var type     = req.params.type;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof endpoint !== 'string' || typeof type !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the operator panel authorization
        if (compAuthorization.authorizePhoneRedirectUser(username) !== true) {

            logger.warn(IDLOG, 'getting cfvm status of type ' + type + ' for extension ' + endpoint + ': authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization to get "cfvm ' + type + '" failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        if (type === compAstProxy.CF_TYPES.unconditional) {
            cfvmGetUnconditional(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.busy) {
            cfvmGetBusy(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.unavailable) {
            cfvmGetUnavailable(endpoint, username, res);

        } else {
            logger.warn(IDLOG, 'getting cfvm status of type ' + type + ' for extension ' + endpoint + ': unknown call forward type to get: ' + type);
            compUtil.net.sendHttp400(IDLOG, res);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the unconditional call forward status to voicemail of the endpoint of the user.
*
* @method cfvmGetUnconditional
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfvmGetUnconditional(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfVmGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting unconditional cfvm for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'unconditional cfvm for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call forward on busy status to voicemail of the endpoint of the user.
*
* @method cfvmGetBusy
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfvmGetBusy(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfbVmGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cfvm busy for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cfvm busy for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call forward on unavailable status to voicemail of the endpoint of the user.
*
* @method cfvmGetUnavailable
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfvmGetUnavailable(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfuVmGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cfvm unavailable for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cfvm unavailable for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call forward status to a destination number of the endpoint of the user.
*
* @method cfcallGet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cfcallGet(req, res, next) {
    try {
        // extract the parameters needed
        var type     = req.params.type;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (typeof endpoint !== 'string' || typeof type !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the operator panel authorization
        if (compAuthorization.authorizePhoneRedirectUser(username) !== true) {

            logger.warn(IDLOG, 'getting cfcall status of type ' + type + ' for extension ' + endpoint + ': authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only get the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization to get "cfcall ' + type + '" failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        if (type === compAstProxy.CF_TYPES.unconditional) {
            cfcallGetUnconditional(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.busy) {
            cfcallGetBusy(endpoint, username, res);

        } else if (type === compAstProxy.CF_TYPES.unavailable) {
            cfcallGetUnavailable(endpoint, username, res);

        } else {
            logger.warn(IDLOG, 'getting cfcall status of type ' + type + ' for extension ' + endpoint + ': unknown call forward type to get: ' + type);
            compUtil.net.sendHttp400(IDLOG, res);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the unconditional call forward status to destination number of the endpoint of the user.
*
* @method cfcallGetUnconditional
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfcallGetUnconditional(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting unconditional cfcall for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'unconditional cfcall for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call forward on busy status to a destination number of the endpoint of the user.
*
* @method cfcallGetBusy
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfcallGetBusy(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfbGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cfcall busy for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cfcall busy for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Gets the call forward on unavailable status to a destination number of the endpoint of the user.
*
* @method cfcallGetUnavailable
* @param {string} endpoint The extension identifier
* @param {string} username The username
* @param {object} res      The response object
*/
function cfcallGetUnavailable(endpoint, username, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string'
            || typeof username !== 'string' || typeof res !== 'object') {

            throw new Error('wrong parameters');
        }

        compAstProxy.doCmd({ command: 'cfuGet', exten: endpoint }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'getting cfcall unavailable for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            logger.info(IDLOG, 'cfcall unavailable for extension ' + endpoint + ' of user "' + username + '" has been get successfully: ' +
                               'status "' + resp.status + '"' + (IDLOG, resp.to ? ' to ' + resp.to : ''));
            res.send(200, resp);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the call forward status of the endpoint of the user to a destination voicemail.
*
* @method cfvmSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cfvmSet(req, res, next) {
    try {
        // extract the needed parameters
        var to       = req.params.to;
        var type     = req.params.type;
        var status   = req.params.status;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (   typeof status   !== 'string'
            || typeof type     !== 'string'
            || typeof endpoint !== 'string'
            || (status !== 'on' && status    !== 'off')
            || (status === 'on' && typeof to !== 'string') ) {

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the operator panel authorization
        if (compAuthorization.authorizePhoneRedirectUser(username) !== true) {

            logger.warn(IDLOG, 'setting phone cfvm of extension ' + endpoint + ': authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization cfvm set of type ' + type + ' failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        if (type === compAstProxy.CF_TYPES.unconditional) {
            cfvmSetUnconditional(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.busy) {
            cfvmSetBusy(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.unavailable) {
            cfvmSetUnavailable(endpoint, username, activate, to, res);

        } else {
            logger.warn(IDLOG, 'setting phone cfvm of extension ' + endpoint + ': unknown call forward type to set: ' + type);
            compUtil.net.sendHttp400(IDLOG, res);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the unconditional call forward status to a voicemail of the endpoint of the user.
*
* @method cfvmSetUnconditional
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the unconditional call forward must be activated
* @param {string}  [to]     The voicemail destination of the unconditional call forward
* @param {object}  res      The response object
*/
function cfvmSetUnconditional(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.setUnconditionalCfVm(endpoint, activate, to, function (err1, resp) {

            if (err1) {
                logger.error(IDLOG, 'setting unconditional cfvm for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'unconditional cfvm "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'unconditional cfvm "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the call forward on busy status to voicemail of the endpoint of the user.
*
* @method cfvmSetBusy
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward on busy must be activated
* @param {string}  [to]     The voicemail destination of the call forward on busy
* @param {object}  res      The response object
*/
function cfvmSetBusy(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfbVmSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cfvm busy for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cfvm busy "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cfvm busy "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the call forward unavailable status to a voicemail of the endpoint of the user.
*
* @method cfvmSetUnavailable
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward unavailable must be activated
* @param {string}  [to]     The voicemail destination of the call forward on unavailable
* @param {object}  res      The response object
*/
function cfvmSetUnavailable(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfuVmSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cfvm unavailable for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cfvm unavailable "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cfvm unavailable "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the call forward status of the endpoint of the user to a destination number.
*
* @method cfcallSet
* @param {object} req  The request object
* @param {object} res  The response object
* @param {object} next
*/
function cfcallSet(req, res, next) {
    try {
        // extract the needed parameters
        var to       = req.params.to;
        var type     = req.params.type;
        var status   = req.params.status;
        var endpoint = req.params.endpoint;
        var username = req.headers.authorization_user;

        // check parameters
        if (   typeof status   !== 'string'
            || typeof type     !== 'string'
            || typeof endpoint !== 'string'
            || (status !== 'on' && status    !== 'off')
            || (status === 'on' && typeof to !== 'string') ) {

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // check if the user has the operator panel authorization
        if (compAuthorization.authorizePhoneRedirectUser(username) !== true) {

            logger.warn(IDLOG, 'setting phone cfcall of extension ' + endpoint + ': authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        // check if the endpoint in the request is an endpoint of the applicant user. The user
        // can only set the call forward status of his endpoints
        if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {

            logger.warn(IDLOG, 'authorization cfcall set of type ' + type + ' failed for user "' + username + '": extension ' +
                               endpoint + ' not owned by him');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }

        var activate = (status === 'on') ? true : false;

        if (type === compAstProxy.CF_TYPES.unconditional) {
            cfcallSetUnconditional(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.busy) {
            cfcallSetBusy(endpoint, username, activate, to, res);

        } else if (type === compAstProxy.CF_TYPES.unavailable) {
            cfcallSetUnavailable(endpoint, username, activate, to, res);

        } else {
            logger.warn(IDLOG, 'setting phone cfcall of extension ' + endpoint + ': unknown call forward type to set: ' + type);
            compUtil.net.sendHttp400(IDLOG, res);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the unconditional call forward status to a destination number of the endpoint of the user.
*
* @method cfcallSetUnconditional
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the unconditional call forward must be activated
* @param {string}  [to]     The destination of the unconditional call forward
* @param {object}  res      The response object
*/
function cfcallSetUnconditional(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.setUnconditionalCf(endpoint, activate, to, function (err1, resp) {
            try {
                if (err1) {
                    logger.error(IDLOG, 'setting unconditional cfcall for extension ' + endpoint + ' of user "' + username + '"');
                    compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                    return;
                }

                if (activate) {
                    logger.info(IDLOG, 'unconditional cfcall "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
                } else {
                    logger.info(IDLOG, 'unconditional cfcall "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
                }
                compUtil.net.sendHttp200(IDLOG, res);

            } catch (err2) {
                logger.error(IDLOG, err2.stack);
                compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the call forward on busy status to a destination number of the endpoint of the user.
*
* @method cfcallSetBusy
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward on busy must be activated
* @param {string}  [to]     The destination of the call forward on busy
* @param {object}  res      The response object
*/
function cfcallSetBusy(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfbSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cfcall busy for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cfcall busy "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cfcall busy "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Sets the call forward unavailable status to a destination number of the endpoint of the user.
*
* @method cfcallSetUnavailable
* @param {string}  endpoint The extension identifier
* @param {string}  username The username
* @param {boolean} activate True if the call forward unavailable must be activated
* @param {string}  [to]     The destination of the call forward on unavailable
* @param {object}  res      The response object
*/
function cfcallSetUnavailable(endpoint, username, activate, to, res) {
    try {
        // check parameters
        if (   typeof endpoint !== 'string' || typeof activate !== 'boolean'
            || typeof username !== 'string' || typeof res      !== 'object') {

            throw new Error('wrong parameters');
        }

        // when "activate" is false, "to" can be undefined if the client hasn't specified it.
        // This is not important because in this case, the asterisk command plugin doesn't use "val" value
        compAstProxy.doCmd({ command: 'cfuSet', exten: endpoint, activate: activate, val: to }, function (err, resp) {

            if (err) {
                logger.error(IDLOG, 'setting cfcall unavailable for extension ' + endpoint + ' of user "' + username + '"');
                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                return;
            }

            if (activate) {
                logger.info(IDLOG, 'cfcall unavailable "on" to ' + to + ' for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            } else {
                logger.info(IDLOG, 'cfcall unavailable "off" for extension ' + endpoint + ' of user "' + username + '" has been set successfully');
            }
            compUtil.net.sendHttp200(IDLOG, res);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}


/**
* Pause or unpause an extension of a queue. The parameter "queueId" can be omitted. In this
* case the pause or unpause is done in all queues.
*
* @method queueMemberPauseUnpause
* @param {object}  req    The client request
* @param {object}  res    The client response
* @param {boolean} paused If the extension must be paused or unpaused. If it's true the extension will be paused from the queue.
*/
function queueMemberPauseUnpause(req, res, paused) {
    try {
        var username = req.headers.authorization_user;

        // check parameters
        if (    typeof req.params              !== 'object' || typeof paused                !== 'boolean'
            ||  typeof req.params.endpointType !== 'string' || typeof req.params.endpointId !== 'string'
            || (typeof req.params.queueId      !== 'string' && req.params.queueId) ) {

            compUtil.net.sendHttp400(IDLOG, res);
            return;
        }

        // the reason is an optional parameter, and it's used only to pause the extension. So if it's not
        // present, it's initialized to an empty string. In the unpause case, simply it's ignored
        if (!req.params.reason) { req.params.reason = ''; }

        // used to discriminate the output log between the two operation: pause or unpause
        var logWord = (paused ? 'pause' : 'unpause');
        // used to discriminate the presence of the queueId parameter. If it's omitted the pause or unpause
        // is done in all queues
        var logQueue = (req.params.queueId ? 'queue "' + req.params.queueId + '"' : 'all queues');

        // check if the user has the administration queues operator panel authorization
        if (compAuthorization.authorizeOpAdminQueuesUser(username) === true) {

            logger.info(IDLOG, logWord + ' "' + req.params.endpointType + '" "' +
                               req.params.endpointId + '" from ' + logQueue + ': user "' +
                               username + '" has "admin_queues" authorization');
        }
        // otherwise check if the user has the queues operator panel authorization
        else if (compAuthorization.authorizeOpQueuesUser(username) !== true) {

            logger.warn(IDLOG, logWord + ' "' + req.params.endpointType + '" "' +
                               req.params.endpointId + '" from ' + logQueue + ': authorization failed for user "' + username + '"');
            compUtil.net.sendHttp403(IDLOG, res);
            return;
        }
        // the user has the "queues" authorization. So check if the endpoint is owned by the user
        else {

            logger.info(IDLOG, logWord + ' "' + req.params.endpointType + '" "' + req.params.endpointId +
                               '" from ' + logQueue + ': user "' + username + '" has "queues" authorization');

            if (compAuthorization.verifyUserEndpointExten(username, req.params.endpointId) === false) {

                logger.warn(IDLOG, logWord + ' "' + req.params.endpointType + '" "' + req.params.endpointId + '" from ' + logQueue +
                                   ' by user "' + username + '" has been failed: the endpoint isn\'t owned by the user');
                compUtil.net.sendHttp403(IDLOG, res);
                return;

            } else {
                logger.info(IDLOG, logWord + ' "' + req.params.endpointType + '" "' + req.params.endpointId +
                                   '" from ' + logQueue + ': the endpoint is owned by user "' + username + '"');
            }
        }

        if (req.params.endpointType === 'extension') {

            compAstProxy.queueMemberPauseUnpause(
                req.params.endpointType,
                req.params.endpointId,
                req.params.queueId,
                req.params.reason,
                paused,
                function (err) {
                    try {
                        if (err) {
                            logger.warn(IDLOG, logWord + ' "' + req.params.endpointType + '" "' + req.params.endpointId +
                                               '" from ' + logQueue + ' by user "' + username + '": has been failed');
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            return;
                        }

                        logger.info(IDLOG, logWord + ' "' + req.params.endpointType + '" "' + req.params.endpointId +
                                           '" from ' + logQueue + ' has been successful by user "' + username + '"');
                        compUtil.net.sendHttp200(IDLOG, res);

                    } catch (err) {
                        logger.error(IDLOG, err.stack);
                        compUtil.net.sendHttp500(IDLOG, res, err.toString());
                    }
                }
            );
        } else {
            logger.warn(IDLOG, logWord + ' endpoint from a queue: unknown endpointType ' + req.params.endpointType);
            compUtil.net.sendHttp400(IDLOG, res);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}