var fs = require("fs");
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
const AUTHENTICATOR_CONFIG_FILENAME = "/etc/asterisk/sip_additional.conf";

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
	log(userAuthProfiles[ext].secret);
	if(userAuthProfiles[ext].secret==secret)
		return true;
	return false;
}

// custom log function to output debug info
function log(msg){
	if(DEBUG) console.log(new Date().toUTCString() + " - [authenticator]: " + msg);
}
