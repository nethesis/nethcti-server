/*
 * This object provides all data structure and operations to simplify 
 * the management of operator panel. This object require asterisk manager
 * to function properly. Is possible to add it with addAsteriskManager function.
 */
var sys = require('sys');
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
const FILE_TAB_OP = "config/optab.ini";
const FILE_EXT_LIST = "/etc/asterisk/nethcti.ini";
const DIAL_FROM = 1;
const DIAL_TO = 0;
const START_RECORD = 1;
const STOP_RECORD = 0;
const LOGFILE = './log/proxy.log';

// logger
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF)
 */
log4js.addAppender(log4js.fileAppender(LOGFILE), '[Modop]');
var logger = log4js.getLogger('[Modop]');
logger.setLevel('ALL');

/* This is for update CTI on the status of all extensions registered in the asterisk server.
 * The scope for the clients is to create the operator panel with all informations about the extensions.
 * It is created by the server at the start and it is update by the server at runtime.
 * The key is the 'ext' and the value is an object with some informations:
 *
 'SIP/500': 
   { Label: '"500 : alessandro"',
     Extension: '500',
     Context: 'from-internal',
     Voicemail_Context: 'device',
     VoiceMailExt: '*500@from-internal',
     tab: 'interno',
     astdbkey: '500',
     status: 'OK (1 ms)',
     dndStatus: 'on',
     cfStatus: 'off',
     cfStatusToExt: '' },
*/
var extStatusForOp = {};

/* This is the list of tab to view or not in the operator panel of the clients.
 * It has the same structure as the configuration file optab.ini, with key equal
 * to section names, and the value the object that reports keywords of the section.
 */
var tabOp = {};

// this is the asterisk manager
var am;

/*
 * Constructor
 */
exports.Modop = function(){
	/* initialize the list of tabs to view in the operator panel by reading 
	 * configuration file 'optab.ini' */
	initTabOp();
	this.addAsteriskManager = function(amanager) { addAsteriskManager(amanager); }
	this.getExtStatusForOp = function() { return extStatusForOp; }
	this.updateExtStatusForOpWithTypeExt = function(typeext, status) { updateExtStatusForOpWithTypeExt(typeext, status);  }  // example of typeext is SIP/500
	this.getExtStatusWithTypeExt = function(typeext) { return getExtStatusWithTypeExt(typeext); }
	this.updateExtStatusForOpWithExt = function(ext, status) { updateExtStatusForOpWithExt(ext, status); } // example of ext is 500
	this.getExtStatusWithExt = function(ext) { return getExtStatusWithExt(ext); }
	this.updateExtDNDStatusWithExt = function(ext, value) { updateExtDNDStatusWithExt(ext, value); }
	this.updateExtCFStatusWithExt = function(ext, value, extTo) { updateExtCFStatusWithExt(ext, value, extTo); }
	this.getTabOp = function() { return tabOp; }
	this.updateExtStatusOpDialFrom = function(ext, extTo) { updateExtStatusOpDialFrom(ext, extTo); }
	this.updateExtStatusOpDialTo = function(ext, extFrom) { updateExtStatusOpDialTo(ext, extFrom); }
	this.updateParkExtStatus = function(parking, extParked, parkFrom, timeout) { updateParkExtStatus(parking, extParked, parkFrom, timeout); }
	this.updateEndParkExtStatus = function(parking) { updateEndParkExtStatus(parking); }
	this.updateStartRecordExtStatusForOpWithExt = function(ext) { updateStartRecordExtStatusForOpWithExt(ext); }
	this.updateStopRecordExtStatusForOpWithExt = function(ext) { updateStopRecordExtStatusForOpWithExt(ext); }
	this.updateVMCountWithExt = function(ext, count) { updateVMCountWithExt(ext,count) }
	this.isExtPresent = function(ext) { return isExtPresent(ext) }
	this.isTypeExtPresent = function(typeext) { return isTypeExtPresent(typeext) }
}

function isTypeExtPresent(typeext){
	if(extStatusForOp[typeext]!=undefined) return true;
	return false;
}

function isExtPresent(ext){
	for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1)
			return true;
        }
	return false;
}

// update voicemail count of the extension 
function updateVMCountWithExt(ext,count){
	for(key in extStatusForOp){
        	if(key.indexOf(ext)!=-1)
			extStatusForOp[key].voicemailCount = count;
	}
}

function updateStopRecordExtStatusForOpWithExt(ext){
        for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1)
                        extStatusForOp[key].record = STOP_RECORD;
        }
}


// update status of ext with the info of start recording
function updateStartRecordExtStatusForOpWithExt(ext){
	for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1)
			extStatusForOp[key].record = START_RECORD;
        }	
}

// Delete old information of the parked call
function updateEndParkExtStatus(parking){
	delete extStatusForOp[parking].parkedCall;
	delete extStatusForOp[parking].parkFrom;
}

function updateParkExtStatus(parking, extParked, parkFrom, timeout){
        extStatusForOp[parking].parkedCall = extParked;
        extStatusForOp[parking].parkFrom = parkFrom;
	extStatusForOp[parking].timeout = timeout;
}


/* This function update the status of 'ext' that receive a call. Set his status to 
 * 'dialTo' and add 'dialFromExt' key to its state with the value 'extFrom'. */
function updateExtStatusOpDialTo(ext, extFrom){
        for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialDirection = DIAL_TO;
                        extStatusForOp[key].dialExt = extFrom;
                }
        }
}



/* This function update the status of 'ext' that start the call. Set his 'dialDirection' to 
 * 'dialFrom' and add 'dialToExt' key to its state with the value 'extTo'. */
function updateExtStatusOpDialFrom(ext, extTo){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialDirection = DIAL_FROM;
			extStatusForOp[key].dialExt = extTo;
		}
	}
}

/* update the cf status of extension. In the case it's 'on' it set 
 * also 'cfStatusToExt' */
function updateExtCFStatusWithExt(ext, value, extTo){
	for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1){
			if(value=='off'){
	                        extStatusForOp[key].cfStatus = value;
				extStatusForOp[key].cfStatusToExt = '';
			}
			else if(value=='on'){
				extStatusForOp[key].cfStatus = value;
				extStatusForOp[key].cfStatusToExt = extTo;
			}
                }
        }
}

function updateExtDNDStatusWithExt(ext, value){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			if(value=='on' || value=='off')
				extStatusForOp[key].dndStatus = value;
		}
	}
}

// return the value object associated with 'ext' key in the 'extStatusForOp'
function getExtStatusWithExt(ext){
	for(key in extStatusForOp){	
		if(key.indexOf(ext)!=-1)
			return extStatusForOp[key];
	}
}

// example of 'ext' is: 500
function updateExtStatusForOpWithExt(ext, status){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){	
			extStatusForOp[key].lastStatus = extStatusForOp[key].status;
			extStatusForOp[key].status = status;
		}
	}
}

// return the object value of status associated with 'typeext' key in 'extStatusForOp'
function getExtStatusWithTypeExt(typeext){
	return extStatusForOp[typeext];
}

// Example of 'typeext' is: SIP/500
function updateExtStatusForOpWithTypeExt(typeext, status){
	if(extStatusForOp[typeext]!=undefined){
	        extStatusForOp[typeext].lastStatus = extStatusForOp[typeext].status;
	        extStatusForOp[typeext].status = status;
	}
}

/* This function add asterisk manager to local variable. Then addListener to it and
 * finally initialize 'extStatusForOp' */
function addAsteriskManager(amanager){
	am = amanager;
	// add listeners to asterisk manager to manage extStatusForOp
	addListenerToAm();
	/* initialize the status of all extensions ('extStatusForOp') present in the asterisk server.
         * Its scope is to put the right informations to 'extStatusForOp' to help 'proxycti.js'
 	 * to give correct informations to the clients for viewing the operator panel */
        initExtStatusForOp();
}

// This function add listeners to asterisk manager.
function addListenerToAm(){
	/* This event is generated for each registered user.
	 * This event is triggered after the 'SIPPeers' action has been executed into the asterisk server.
	 * This action is made by 'initExtStatusForOp' function.
	 * This event permit to add status informations about extension, to 'extStatusForOp'.
	 * The status informations are 'dndStatus', 'cfStatus' and 'status'. In the case 'cfStatus' is 'on',
	 * then it report also 'cfStatusExtTo' information, to know the extension setted for call forwarding.
	 *
	 * An example of PeerEntry event is: 
	 *
	{ event: 'PeerEntry',
	  actionid: 'autosip',
	  channeltype: 'SIP',
	  objectname: '501',
	  chanobjecttype: 'peer',
	  ipaddress: '192.168.5.187',
	  ipport: '46894',
	  dynamic: 'yes',
	  natsupport: 'yes',
	  videosupport: 'no',
	  textsupport: 'no',
	  acl: 'yes',
	  status: 'OK (1 ms)',
	  realtimedevice: 'no' }
	*/
	am.addListener('peerentry', function(headers) {
	        var ext = headers.objectname;
	        var status = headers.status;
	        logger.info("EVENT 'PeerEntry': ext [" + ext + "], status '" + status + "'");
	        var dndStatus = '';
	        var cfStatus = '';
	        var cfStatusToExt = '';
		/* ATTENTION:
		 * This check is for an error that is generated only in nethservice and not in development environment.
		 * In nethservice machine arrive 'PeerEntry' event that has entries as: 'objectname: ranocchilab/from-neth'.
		 * The 'typeext' generated below to access 'extStatusForOp' is constructed with this 'objectname', but in 'extStatusForOp'
		 * there aren't any key with 'IAX2/something/something', because 'extStatusForOp' is initially created considering 
		 * 'nethcti.ini' file generated from perl script and in this file there are more IAX2 entries as 'IAX2/something' and not
		 * 'IAX2/something/something'. So this line of code consider only the first part: 'IAX2/something' */
		if(headers.channeltype=='IAX2')
		        ext = headers.objectname.split("/")[0];
	        var typeext = headers.channeltype + "/" + ext;
		// set status	
		updateExtStatusForOpWithTypeExt(typeext, status);
		/* Check for the DND and CF status of current ext.
	         * This is made beacuse 'PeerEntry' event don't report the DND and CF status, and so
	         * it can be possibile to correctly update 'extStatusForOp' */
	        // create action DND for asterisk server
	        var cmd = "database get DND " + ext;
	        var actionCheckDNDStatus = {
	                Action: 'command',
	                Command: cmd
	        };
        	// send action to asterisk
	        am.send(actionCheckDNDStatus, function (resp) {
	                if(resp.value==undefined) dndStatus = 'off';
	                else dndStatus = 'on';
	                // set the status informations to ext of extStatusForOp
	                extStatusForOp[typeext].dndStatus = dndStatus;
	        });
	        // create action CF for asterisk server
	        var cmd = "database get CF " + ext;
	        var actionCheckCFStatus = {
	                Action: 'command',
	                Command: cmd
	        };
		// send action to asterisk
	        am.send(actionCheckCFStatus, function (resp) {
	                if(resp.value==undefined) 
				cfStatus = 'off';
	                else{
	                        cfStatus = 'on';
	                        cfStatusToExt = resp.value.split('\n')[0];
	                }
	                // set the status informations to ext of extStatusForOp
	                extStatusForOp[typeext].cfStatus = cfStatus;
	                extStatusForOp[typeext].cfStatusToExt = cfStatusToExt;
	        });
		/* Check for the presence of voicemail.
                 * This is made beacuse 'PeerEntry' event don't report this information, and so
                 * it can be possibile to correctly update 'extStatusForOp'.
		 * This piece of code can be optimized obtaining the only mailbox status for
		 * that extension obtained with command 'voicemail show users' */
		// create action for asterisk server
                var cmd = "database get CF " + ext;
                var actionMailboxCount = {
                        Action: 'MailboxCount',
                        Mailbox: ext
                };
		// send action to asterisk
                am.send(actionMailboxCount, function (resp) {
			var newMsgCount = resp.newmessages;
			extStatusForOp[typeext].voicemailCount = newMsgCount;
                });
	});	

	/* This event is triggered when 'PeerEntry' event is emitted for each user registered in asterisk.
	 * So, the initialization of 'extStatusForOp' can be completed */
	am.addListener('peerlistcomplete', function(){
	        logger.info("PeerListComplete event");
	});

	/* This event is necessary to add information of queue member to extension status
	 * Example of 'QueueMember event' is:
	 * 
	{ event: 'QueueMember',
	  queue: '901',
	  name: 'Local/501@from-internal/n',
	  location: 'Local/501@from-internal/n',
	  membership: 'static',
	  penalty: '0',
	  callstaken: '0',
	  lastcall: '0',
	  status: '1',
	  paused: '0',
	  actionid: '1305039851763' }
	*/
	am.addListener('queuemember', function(headers){
		logger.info("QueueMember event");
		var ext = headers.name.split("/")[1];
		var queue = headers.queue;
		ext = ext.split("@")[0];
		for(key in extStatusForOp){
			var tempExt = extStatusForOp[key].Extension;
			if(tempExt==ext)
				extStatusForOp[key].queue = queue;
		}		
	});	
}


/* Initialize 'extStatusForOp'. Initially it read a configuration file that contains list of
 * all extensions. After that it sends the 'SIPPeers' action to the asterisk server. So, it
 * successively receives more 'PeerEntry' events from the asterisk server and at the end it receive
 * 'PeerListComplete' event.
 * The number of 'PeerEntry' event is equal to the number of extensions present in the asterisk server.
 * The receive of one 'PeerEntry' event, allow to add status informations of the extension to 'extStatusForOp' */
function initExtStatusForOp(){
        logger.info("initialize status of all extensions...");
        // read file where are the list of all extensions
        extStatusForOp = iniparser.parseSync(FILE_EXT_LIST);
        // create action for asterisk server that generate series of 'PeerEntry' events
        var actionSIPPeersOP = {
                Action: 'SIPPeers'
        };
        // send action to asterisk
        am.send(actionSIPPeersOP, function () {
                logger.info("'actionSIPPeersOP' " + sys.inspect(actionSIPPeersOP) + " has been sent to AST");
        });
	/* create action for asterisk server that generate series of 'PeerEntry' events
         * to add status informations to 'extStatusForOp' for each IAXPeer */
        var actionIAXPeersOP = {
                Action: 'IAXPeers'
        };
        // send action to asterisk
        am.send(actionIAXPeersOP, function () {
                logger.info("'actionIAXPeersOP' " + sys.inspect(actionIAXPeersOP) + " has been sent to AST");
        });
	/* create action for asterisk server that generate series of 'QueueMember' events
         * to add informations if the extension is present in some queue */
        var actionQueueStatus = {
                Action: 'QueueStatus'
        };
        // send action to asterisk
        am.send(actionQueueStatus, function () {
                logger.info("'actionQueueStatus' " + sys.inspect(actionQueueStatus) + " has been sent to AST");
        });
}

/* This function initialize all tabs to be view in the operator panel, by reading 
 * the configuration file 'optab.ini'.
 *
{ interni_commerciali: { extensions: '500,501' },
  fasci: { show: 'yes' },
  code: { show: 'yes' },
  parcheggio: { show: 'si' } }
 */
function initTabOp(){
	tabOp = iniparser.parseSync(FILE_TAB_OP);
}


function log(msg){
        logger.info(msg);
}
