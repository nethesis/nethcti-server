var fs = require("fs");
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");

const DEBUG = true;
const PROFILER_CONFIG_FILENAME = "config/profiles.ini";
const CALL_OUT = "CALL_OUT";
const CALL_IN = "CALL_IN";
const PHONEBOOK = "PHONEBOOK";
const REDIRECT = "REDIRECT";
const RECORD = "RECORD";
const HISTORY_CALL = "HISTORY_CALL";
const CUSTOMER_CARD = "CUSTOMER_CARD";
const OP_PLUS = "OP_PLUS";
const OP_BASE = "OP_BASE";
const ALL = "all";


/* this is the list of actions with its relative list of extensions: the key is the action,
 * (ex. "CALL_IN") and the value is the list of the user split by ',' (ex. 500,501,all)
 * If the action is CUSTOMER_CARD then the value is another object, with the key as
 * particulare customer card (ex. default or insoluti) and the value is the list of the
 * user. The name of the key are those that has been write in .ini file.
 */
/* An example of actions: note that it is equal to the file .ini
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
  OP_BASE: { extensions: 'all' } }
*/
actions = {};

// this is the controller to manage changing in the configuration file of profiles
controller = null;

/*
 * Constructor
 */
exports.Profiler = function(){
	initProfiles();
	this.checkActionCallOutPermit = function(exten){ return checkActionPermit(exten, CALL_OUT) }
	this.checkActionCallInPermit = function(exten){ return checkActionPermit(exten, CALL_IN) }
	this.checkActionPhonebookPermit = function(exten){ return checkActionPermit(exten, PHONEBOOK) }
	this.checkActionRedirectPermit = function(exten){ return checkActionPermit(exten, REDIRECT) }
	this.checkActionRecordPermit = function(exten){ return checkActionPermit(exten, RECORD) }
	this.checkActionHistoryCallPermit = function(exten){ return checkActionPermit(exten, HISTORY_CALL) }
	this.getTypesCustomerCardPermit = function(exten){ return getTypesCustomerCardPermit(exten) }
	this.addController = function(contr) { addController(contr) }
	this.checkActionOpPlusPermit = function(exten) { return checkActionPermit(exten, OP_PLUS) }
	this.checkActionOpBasePermit = function(exten) { return checkActionPermit(exten, OP_BASE) }
}

function addController(contr){
	controller = contr;
	log("added controller");
	controller.addFile(PROFILER_CONFIG_FILENAME);
	controller.addListener("change_file", function(filename){
 	       if(filename==PROFILER_CONFIG_FILENAME){
	                log("update configuration file " + PROFILER_CONFIG_FILENAME);
	                updateConfiguration();
	        }
	});
}


/* this function update profiles in memory after changing of confiuration
 * file.
 */
function updateConfiguration(){
	initProfiles();
}


/* 
 * Return an array containing the types of customer card for which the user is enable
 */
function getTypesCustomerCardPermit(exten){
	var typePermit = [];
	var pattExt = new RegExp("\\b" + exten + "\\b");
        var pattAll = new RegExp("\\b" + ALL + "\\b", "i");
	for(type in actions[CUSTOMER_CARD]){
		if( pattExt.test(actions[CUSTOMER_CARD][type]) || pattAll.test(actions[CUSTOMER_CARD][type]) )
			typePermit.push(type);
	}
	return typePermit;
}

/*
 * Check if the user "exten" has the permit "action"
 */
function checkActionPermit(exten, action){
	var pattExt = new RegExp("\\b" + exten + "\\b");
        var pattAll = new RegExp("\\b" + ALL + "\\b", "i");
        if( pattExt.test(actions[action].extensions) || pattAll.test(actions[action].extensions)  )
                return true;
        else
                return false;
}


/*
 * Initialize the profiles of all extensions by means the reading of the config file.
 */
function initProfiles(){
	this.actions = {};
	this.actions = iniparser.parseSync(PROFILER_CONFIG_FILENAME); 
}

function log(msg){
	if(DEBUG) console.log(new Date().toString() + " - [Profiler]: " + msg);
}
