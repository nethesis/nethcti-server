/*
 * This object provides all data structure and operations to simplify 
 * the management of operator panel. This object require asterisk manager
 * to function properly. Is possible to add it with addAsteriskManager function.
 */
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");

const FILE_TAB_OP = "config/optab.ini";
const FILE_EXT_LIST = "/etc/asterisk/nethcti.ini";
const DIAL_FROM = 1;
const DIAL_TO = 0;

/* This is for update client on the status of all extension registered in the asterisk server.
 * The scope for the client is to create operator panel with all informations about the extensions.
 * It is created by the server at the start and it is update by the server at runtime.
 * The key is the 'ext' and the status is an object.
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
	/* initialize the list of tabs to view in operator panel by reading 
	 * configuration file "optab.ini"
	 */
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
	this.updateParkExtStatus = function(parking, extParked, parkFrom) { updateParkExtStatus(parking, extParked, parkFrom); }
	this.updateEndParkExtStatus = function(parking) { updateEndParkExtStatus(parking); }
}

// Delete old information of the parked call
function updateEndParkExtStatus(parking){
	delete extStatusForOp[parking].parkedCall;
	delete extStatusForOp[parking].parkFrom;
}

/* Update the status of the on Park extension.
 *
 */
function updateParkExtStatus(parking, extParked, parkFrom){
        extStatusForOp[parking].parkedCall = extParked;
        extStatusForOp[parking].parkFrom = parkFrom;
}


/* This function update the status of ext that receive a call. Set his status to 
 * 'dialTo' and add 'dialFromExt' key to its state with the value extFrom.
 */
function updateExtStatusOpDialTo(ext, extFrom){
        for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialDirection = DIAL_TO;
                        extStatusForOp[key].dialExt = extFrom;
                }
        }
}



/* This function update the status of ext that start call. Set his status to 
 * 'dialFrom' and add 'dialToExt' key to its state with the value extTo.
 */
function updateExtStatusOpDialFrom(ext, extTo){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialDirection = DIAL_FROM;
			extStatusForOp[key].dialExt = extTo;
		}
	}
}

/* update the cf status of extension ext and in the case of 'on' cfStatus
 * it set also cfStatusToExt
 */
function updateExtCFStatusWithExt(ext, value, extTo){
	for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1){
			if(value=='off'){
	                        extStatusForOp[key].cfStatus = value;
			}
			else if(value=='on'){
				extStatusForOp[key].cfStatus = value;
				extStatusForOp[key].cfStatusToExt = extTo;
			}
                }
        }
}

// update the dnd status of extension ext
function updateExtDNDStatusWithExt(ext, value){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			if(value=='on' || value=='off')
				extStatusForOp[key].dndStatus = value;
		}
	}
}

// return the object of status associated with ext key in extStatusForOp
function getExtStatusWithExt(ext){
	for(key in extStatusForOp){	
		if(key.indexOf(ext)!=-1){
			return extStatusForOp[key];
		}
	}
}

// Update the status of the ext givin ext (ex. 500)
function updateExtStatusForOpWithExt(ext, status){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){	
			extStatusForOp[key].status = status;
		}
	}
}

// return the object of status associated with typeext key in extStatusForOp
function getExtStatusWithTypeExt(typeext){
	return extStatusForOp[typeext];
}

// Update the status of the ext givin typeext (ex. SIP/500)
function updateExtStatusForOpWithTypeExt(typeext, status){
	// check if the typeext exists in extStatusForOp
	if(extStatusForOp[typeext]!=undefined){
	        // update extSatusForOP for future request from the clients
	        extStatusForOp[typeext].status = status;
	        log("updated extStatusForOp to new status = " + extStatusForOp[typeext].status + " for [" + typeext + "]");
	}
}

/* This function add asterisk manager to local variable. Then addListener to it and
 * finally initialize extStatusForOp.
 */
function addAsteriskManager(amanager){
	am = amanager;
	// add listener to asterisk manager to manage extStatusForOp
	addListenerToAm();
	/* initialize the status of all extensions in the asterisk server (extStatusForOp).
         * Its scope is to put the right informations to extStatusForOp to help proxycti.js
 	 * to give correct informations to operator panel of the clients.
         */
        initExtStatusForOp();
}

// This function add listeners to asterisk manager.
function addListenerToAm(){
	
	/* This event is generated for each registered user.
	 * This event is triggered after SIPPeers action is executed into the asterisk server.
	 * This action is made by initExtStatusForOp function.
	 * This event permit to add status information about extension, to extStatusForOp.
	 * The status informations are 'dndStatus', 'cfStatus' and 'status'. In the case cfStatus is 'on',
	 * then it report also 'cfStatusExtTo' information, to know the extension setted for call
	 * forwarding.
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
	        log("CLIENT: PeerEntry event: headers = ");
/**
if(headers.channeltype=='IAX2'){

headers.objectname = 'ranocchilab/from-neth';
headers.channeltype = 'IAX2';
}
*/	
	        var ext = headers.objectname;
	        var typeext = headers.channeltype + "/" + ext;
	        var status = headers.status;
	        var dndStatus = '';
	        var cfStatus = '';
	        var cfStatusToExt = '';

		// set status	
	        extStatusForOp[typeext].status = status;

		/* Check for the dnd and cf status of current ext.
	         * This is made beacuse PeerEntry event don't report the dnd and cf status, and so
	         * it can be possibile to correctly update extStatusForOp.
	         */
	        // create action DND for asterisk server
	        var cmd = "database get DND " + ext;
	        var actionCheckDNDStatus = {
	                Action: 'command',
	                Command: cmd
	        };
        	// send action to asterisk
	        am.send(actionCheckDNDStatus, function (resp) {
	                //log("check DND status action for " + ext + " has been sent to asterisk");
	                if(resp.value==undefined){
	                        //log("to create extStatusForOp: dnd status for ext[" + ext + "] is off");
	                        dndStatus = 'off';
	                }
	                else{
	                        //log("to create extStatusForOp: dnd status for ext[" + ext + "] is on");
	                        dndStatus = 'on';
	                }
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
	                //log("check CF status action for " + ext + " has been sent to asterisk");
	                if(resp.value==undefined){
	                        //log("to create extStatusForOp: cf status for ext[" + ext + "] is off");
	                        cfStatus = 'off';
	                }
	                else{
	                        //log("to create extStatusForOp: cf status for ext[" + ext + "] is on");
	                        cfStatus = 'on';
	                        cfStatusToExt = resp.value.split('\n')[0];
	                }
	                // set the status informations to ext of extStatusForOp
	                extStatusForOp[typeext].cfStatus = cfStatus;
	                extStatusForOp[typeext].cfStatusToExt = cfStatusToExt;
	        });

		/* Check for the presence of voicemail.
                 * This is made beacuse PeerEntry event don't report this information, and so
                 * it can be possibile to correctly update extStatusForOp.
		 * This piece of code can be optimized obtaining the only mailbox status for
		 * that extension obtained with command 'voicemail show users'
                 */
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


	/* This event is triggered when PeerEntry event is emitted for each user registered in asterisk.
	 * So, the initialization of extStatusForOp can be completed. 
	 */
	am.addListener('peerlistcomplete', function(){
	        log("CLIENT: PeerListComplete event");
	});


	/* This event is necessary to add information of queue member to extension status
	 * Example of QueueMember event headers
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
		log("CLIENT: QueueMember event");
		var ext = headers.name.split("/")[1];
		var queue = headers.queue;
		ext = ext.split("@")[0];
		for(key in extStatusForOp){
			var tempExt = extStatusForOp[key].Extension;
			if(tempExt==ext){
				extStatusForOp[key].queue = queue;
			}
		}		
	});	
}


/* Initialize extStatusForOp. Initially it read a configuration file that contains list of
 * all extensions. After that it send the SIPPeers action to the asterisk server. So, it
 * successively receives more PeerEntry events from the asterisk server and at the end it receive
 * PeerListComplete event.
 * The number of PeerEntry is equal to number of extensions present in the asterisk server.
 * The receive of one PeerEntry event, allow to add status information of the extension to extStatusForOp.
 */
function initExtStatusForOp(){
        log("initialize status of all extension for future request by clients for operator panel");

        // read file where are the list of all extensions
        extStatusForOp = iniparser.parseSync(FILE_EXT_LIST);

        /* create action for asterisk server that generate series of PeerEntry events
         * to add status informations to extStatusForOp
         */
        var actionSIPPeersOP = {
                Action: 'SIPPeers'
        };
        // send action to asterisk
        am.send(actionSIPPeersOP, function () {
                log("'SIPPeers' action has been sent to the asterisk server");
        });


	/* create action for asterisk server that generate series of PeerEntry events
         * to add status informations to extStatusForOp for each IAXPeer
         */
        var actionIAXPeersOP = {
                Action: 'IAXPeers'
        };
        // send action to asterisk
        am.send(actionIAXPeersOP, function () {
                log("'IAXPeers' action has been sent to the asterisk server");
        });

	/* create action for asterisk server that generate series of QueueMember events
         * to add information if the extension is present in some queue
         */
        var actionQueueStatus = {
                Action: 'QueueStatus'
        };
        // send action to asterisk
        am.send(actionQueueStatus, function () {
                log("'QueueStatus' action has been sent to the asterisk server");
        });
}

/* This function initialize all tab to be view in the operator panel, by reading 
 * the configuration file optab.ini.
 *
{ interni_commerciali: { extensions: '500,501' },
  fasci: { show: 'yes' },
  code: { show: 'yes' },
  parcheggio: { show: 'si' } }
 */
function initTabOp(){
        log("initialize tabOp for tabs to view in the operator panel");
	tabOp = iniparser.parseSync(FILE_TAB_OP);
}


function log(msg){
        console.log(new Date().toUTCString() + " - [Modop]: " + msg);
}
