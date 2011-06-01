var fs = require("fs");
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
const AUTHENTICATOR_CONFIG_FILENAME = "/etc/asterisk/sip_additional.conf";
const LOGFILE = './log/proxy.log';

/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF)
 */
log4js.addAppender(log4js.fileAppender(LOGFILE), '[Authenticator]');
var logger = log4js.getLogger('[Authenticator]');
logger.setLevel('ALL');

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



/*
 * Constructor
 */
exports.Authenticator = function(){
	initProfiles();
	this.authenticateUser = function(ext, secret){ return authenticateUser(ext, secret); }
}


/*
 * Initialize the profiles of all users by means the reading of the config file.
 */
function initProfiles(){
        this.userAuthProfiles = iniparser.parseSync(AUTHENTICATOR_CONFIG_FILENAME);
}

/*
 * Return true if the specified user and secret corresponding to 
 * initialized user authentication profile.
 */
authenticateUser = function(ext, secret){
	if(userAuthProfiles[ext].secret==secret)
		return true;
	return false;
}

// custom log function to output debug info
function log(msg){
	logger.info(msg);
}
