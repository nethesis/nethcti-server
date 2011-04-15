var fs = require("fs");
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
const PROFILER_CONFIG_FILENAME = "profiles.ini";
const CALL_OUT = "CALL_OUT";
const CALL_IN = "CALL_IN";
const PHONEBOOK = "PHONEBOOK";
const REDIRECT = "REDIRECT";
const RECORD = "RECORD";
const HISTORY_CALL = "HISTORY_CALL";
const CUSTOMER_CARD = "CUSTOMER_CARD";
const ALL = "all";


/* this is the list of actions with its relative list of users: the key is the action,
 * (ex. "CALL_IN") and the value is the list of the user split by ',' (ex. 500,501,all)
 * If the action is CUSTOMER_CARD then the value is another object, with the key as
 * particulare customer card (ex. default or insoluti) and the value is the list of the
 * user. The name of the key are those that has been write in .ini file.
 */
/* An example of actions: note that it is equal to the file .ini
actions = 
{ PHONEBOOK: { users: '500,501' },
  CALL_IN: { users: '500,501' },
  CALL_OUT: { users: '500,501,all' },
  REDIRECT: { users: '500,501' },
  RECORD: { users: '500,501' },
  HISTORY_CALL: { users: '500,501' },
  CUSTOMER_CARD: 
   { default: '500,501',
     insoluti: '500,501',
     ticket: '500,501' } }
*/
actions = {};

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
}

/* 
 * Return the type of customer card for which the user is enable
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
        if( pattExt.test(actions[action].users) || pattAll.test(actions[action].users)  )
                return true;
        else
                return false;
}


/*
 * Initialize the profiles of all users by means the reading of the config file.
 */
function initProfiles(){
	this.actions = iniparser.parseSync(PROFILER_CONFIG_FILENAME); 
}

