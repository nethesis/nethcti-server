var fs = require("fs")
var path = require('path');
var sys = require("sys")
var iniparser = require("./lib/node-iniparser/lib/node-iniparser")
var log4js = require('./lib/log4js-node/lib/log4js')()
const PROFILER_CONFIG_FILENAME = "config/profiles.ini"
const STREAMING_SETTINGS_FILENAME = "config/streaming.ini"
const CALL_OUT = "CALL_OUT"
const CALL_IN = "CALL_IN"
const PHONEBOOK = "PHONEBOOK"
const REDIRECT = "REDIRECT"
const RECORD = "RECORD"
const HISTORY_CALL = "HISTORY_CALL"
const CUSTOMER_CARD = "CUSTOMER_CARD"
const OP_PLUS = "OP_PLUS"
const OP_BASE = "OP_BASE"
const PRIVACY = "PRIVACY";
const SMS = "SMS";
const CHAT = "CHAT";
const PHONE_SERVICE = "PHONE_SERVICE";
const VOICEMAIL = "VOICEMAIL";
const STREAMING = "STREAMING";
const ALL = "all"
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[Profiler]')
/* this is the list of actions with its relative list of extensions: the key is the action,
 * (ex. "CALL_IN") and the value is the list of the user split by ',' (ex. 500,501,all)
 * If the action is CUSTOMER_CARD then the value is another object, with the key as
 * particulare customer card (ex. default or insoluti) and the value is the list of the
 * user. The name of the key are those that has been write in .ini file.
 * An example of actions: note that it is equal to the file .ini 
actions = 
{ PHONEBOOK: { extensions: '500,501,all' },
  CALL_IN: { extensions: '501,500,ALL' },
  CALL_OUT: { extensions: '500,501,all' },
  REDIRECT: { extensions: '500,501,502,all' },
  RECORD: { extensions: '500,501,ALL' },
  HISTORY_CALL: { extensions: '500,ALL' },
  CUSTOMER_CARD: 
   { default: '500,501,all',
     insoluti: '501,502,all',
     ticket: '501,500,all' },
  OP_PLUS: { extensions: 'all' },
  OP_BASE: { extensions: 'all' } 
  PRIVACY: { extensions: 'all' } } */
actions = {}
streamingSettings = {};
// this is the controller to manage changing in the configuration file of profiles
controller = null
// Constructor
exports.Profiler = function(){
	initProfiles();
	initStreamingSettings();
	this.checkActionCallOutPermit = function(exten){ return checkActionPermit(exten, CALL_OUT) }
	this.checkActionCallInPermit = function(exten){ return checkActionPermit(exten, CALL_IN) }
	this.checkActionPhonebookPermit = function(exten){ return checkActionPermit(exten, PHONEBOOK) }
	this.checkActionRedirectPermit = function(exten){ return checkActionPermit(exten, REDIRECT) }
	this.checkActionRecordPermit = function(exten){ return checkActionPermit(exten, RECORD) }
	this.checkActionHistoryCallPermit = function(exten){ return checkActionPermit(exten, HISTORY_CALL) }
	this.checkActionSmsPermit = function(exten){ return checkActionPermit(exten, SMS) }
	this.checkActionVoicemailPermit = function(exten){ return checkActionPermit(exten, VOICEMAIL) }
	this.getTypesCustomerCardPermit = function(exten){ return getTypesCustomerCardPermit(exten) }
	this.addController = function(contr) { addController(contr) }
	this.checkActionOpPlusPermit = function(exten) { return checkActionPermit(exten, OP_PLUS) }
	this.checkActionOpBasePermit = function(exten) { return checkActionPermit(exten, OP_BASE) }
        this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[Profiler]'); logger.setLevel(level); }
	this.checkPrivacyPermit = function(exten) { return checkActionPermit(exten, PRIVACY); }
	this.getAllTypesCustomerCard = function(){ return getAllTypesCustomerCard(); }
	this.checkActionChatPermit = function(exten){ return checkActionPermit(exten, CHAT); }
	this.checkActionPhoneServicePermit = function(exten){ return checkActionPermit(exten, PHONE_SERVICE); }
	this.getAllPermissions = function(exten){ return getAllPermissions(exten); }
	this.getStreamingSettings = function(exten) { return getStreamingSettings(exten); }
	this.checkStreamingPermission = function(stream,exten) { return checkStreamingPermit(stream,exten); }
}
function checkStreamingPermit(oneStream,exten){
	var pattExt = new RegExp("\\b" + exten + "\\b");
	var pattAll = new RegExp("\\b" + ALL + "\\b", "i");
	if(pattExt.test(actions.STREAMING[oneStream]) || pattAll.test(actions.STREAMING[oneStream])){
		return true;
	}
	return false;
}
function getStreamingSettings(exten){
	var obj = {};
	if(actions[STREAMING]===undefined){
		logger.error('permission "'+STREAMING+'" isn\'t defined in config file of profiles');
		return obj;
	}
	for(var key in streamingSettings){
		if(checkStreamingPermit(key,exten)){
			obj[key] = streamingSettings[key];
		}
	}
	return obj;
}
function getAllPermissions(exten){
	var obj = {};
	obj.phonebook = checkActionPermit(exten, PHONEBOOK);
	obj.history_call = checkActionPermit(exten, HISTORY_CALL);
	obj.op_plus = checkActionPermit(exten, OP_PLUS);
	obj.op_base = checkActionPermit(exten, OP_BASE);
	obj.chat = checkActionPermit(exten, CHAT);
	obj.phone_service = checkActionPermit(exten, PHONE_SERVICE);
	obj.record = checkActionPermit(exten, RECORD);
	obj.redirect = checkActionPermit(exten, REDIRECT);
	obj.sms = checkActionPermit(exten, SMS);
	obj.voicemail = checkActionPermit(exten, VOICEMAIL);
	obj.streaming = getAllStreamingPermissions(exten);
	if(getTypesCustomerCardPermit(exten).length>0){
		obj.customer_card = true;
	} else {
		obj.customer_card = false;
	}
	return obj;
}
function getAllStreamingPermissions(exten){
	var obj = {};
	var pattExt = new RegExp("\\b" + exten + "\\b");
        var pattAll = new RegExp("\\b" + ALL + "\\b", "i");
	for(var key in actions.STREAMING){	
        	if(pattExt.test(actions.STREAMING[key]) || pattAll.test(actions.STREAMING[key])){
			obj[key] = true;
	        } else {
			obj[key] = false;
	        }
	}
	return obj;
}
function addController(contr){
	controller = contr
	logger.debug("added controller")
	controller.addFile(PROFILER_CONFIG_FILENAME)
	controller.addListener("change_file", function(filename){
		if(filename==PROFILER_CONFIG_FILENAME){
	                logger.info("update configuration file " + PROFILER_CONFIG_FILENAME)
	                updateConfiguration()
	        }
	})
}
// this function update profiles in memory after changing of confiuration file
function updateConfiguration(){
	initProfiles()
}
// return an object (ex. { default: 'all', other: 'all' })
function getAllTypesCustomerCard(){
	if(actions[CUSTOMER_CARD]===undefined){
		logger.error('permission "' + CUSTOMER_CARD + '" isn\'t present in config file of profiles');
		return {};
	}
	return Object.keys(actions[CUSTOMER_CARD]);
}
// Return an array containing the types of customer card for which the user is enable
function getTypesCustomerCardPermit(exten){
	var typePermit = []
	var pattExt = new RegExp("\\b" + exten + "\\b")
        var pattAll = new RegExp("\\b" + ALL + "\\b", "i")
	for(type in actions[CUSTOMER_CARD]){
		if( pattExt.test(actions[CUSTOMER_CARD][type]) || pattAll.test(actions[CUSTOMER_CARD][type]) )
			typePermit.push(type)
	}
	return typePermit
}
// Check if the user "exten" has the permit "action"
function checkActionPermit(exten, action){
	if(actions[action]===undefined){ // the permission action is not present in config file
		logger.error('permission "'+action+'" isn\'t defined in config file of profiles');
		return false;
	}
	var pattExt = new RegExp("\\b" + exten + "\\b");
        var pattAll = new RegExp("\\b" + ALL + "\\b", "i");
	if(actions[action]===undefined){ // missing section in config file
		logger.error('wrong profile: missing permission "' + action + '"');
		return false;
	}
        if(pattExt.test(actions[action].extensions) || (pattAll.test(actions[action].extensions) && !pattExt.test(actions[action].exclude))){
                return true;
        } else {
                return false;
	}
}
// Initialize the profiles of all extensions the reading of the config file.
function initProfiles(){
	if(!path.existsSync(PROFILER_CONFIG_FILENAME)){
		logger.error('configuration file of profiles not exists');
		process.exit(0);
	}
	this.actions = {}
	this.actions = iniparser.parseSync(PROFILER_CONFIG_FILENAME) 
}
// Initialize all streaming settings 
function initStreamingSettings(){
	this.streamingSettings = {};
	this.streamingSettings = iniparser.parseSync(STREAMING_SETTINGS_FILENAME);
}
