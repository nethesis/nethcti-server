var fs = require("fs");
var sys = require("sys");
var iniparser = require("iniparser");
var log4js = require('log4js');
var AUTHENTICATOR_CONFIG_FILENAME = "/etc/asterisk/sip_additional.conf";
var VOICEMAIL_AUTH_FILENAME = "/etc/asterisk/voicemail_additional.conf";
var AUTH_IAX_FILEPATH = '/etc/asterisk/iax_additional.conf'; 

/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF)
 */
var logger = log4js.getLogger('[Authenticator]');

/* this is the authentication profile created by parsing the config file.
 * The key is the section of the file: the exten. The value is the content of the section,
 * where can be found the secret of the extension.
 */
/* An example:
userAuthProfiles = 
{ '500': 
   { deny: '0.0.0.0/0.0.0.0',
     type: 'friend',
     secret: '500',
     qualify: 'yes',
     port: '5060',
     pickupgroup: '',
     permit: '0.0.0.0/0.0.0.0',
     nat: 'yes',
     mailbox: '500@device',
     host: 'dynamic',
     dtmfmode: 'rfc2833',
     dial: 'SIP/500',
     context: 'from-internal',
     canreinvite: 'no',
     callgroup: '',
     callerid: 'device <500>',
     accountcode: '',
     'call-limit': '50' } }
*/
userAuthProfiles = {};


voicemailAuthProfiles = {};

/*
 * Constructor
 */
exports.Authenticator = function(){
	initProfiles();
	this.authenticateUser = function(ext, secret){ return authenticateUser(ext, secret); }
	this.authenticateVoicemail = function(vm,pwd){ return authenticateVoicemail(vm,pwd); }
        this.getPasswordUser = function (ext) { return userAuthProfiles[ext].secret; }
        this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[Authenticator]'); logger.setLevel(level); }
}
function authenticateVoicemail(vm,pwd){
	if(voicemailAuthProfiles[vm]===pwd){
		return true;
	}
	return false;
}
function initVoicemailAuthProfiles(){
        var fileContent = iniparser.parseSync(VOICEMAIL_AUTH_FILENAME);
	var objVm = undefined;
	var section = undefined;
	var keyVm = undefined;
	var pwd = undefined;
	for(section in fileContent){
		objVm = fileContent[section];
		for(keyVm in objVm){
			pwd = objVm[keyVm].split('>')[1].split(',')[0];
			pwd = pwd.replace(/[' ']/g, ''); // remove white space
			this.voicemailAuthProfiles[keyVm] = pwd;
		}
	}
}

/*
 * Initialize the profiles of all users by means the reading of the config file.
 */
function initProfiles(){
        this.userAuthProfiles = iniparser.parseSync(AUTHENTICATOR_CONFIG_FILENAME);
        var iaxAuthProfiles = iniparser.parseSync(AUTH_IAX_FILEPATH);
        for (var key in iaxAuthProfiles) {
            this.userAuthProfiles[key] = iaxAuthProfiles[key];
        }

	initVoicemailAuthProfiles();
}

/*
 * Return true if the specified user and secret corresponding to 
 * initialized user authentication profile.
 */
authenticateUser = function(ext, secret){
	if(userAuthProfiles[ext]!==undefined && userAuthProfiles[ext].secret===secret){
		return true;
	}
	return false;
}

// custom log function to output debug info
function log(msg){
	logger.info(msg);
}
