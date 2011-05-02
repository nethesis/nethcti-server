/*
 * This object provides all data structure and operations to simplify 
 * the management of operator panel. This object require asterisk manager
 * to function properly. Is possible to add it with addAsteriskManager function.
 */
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");

const FILE_TAB_OP = "config/optab.ini";
const FILE_EXT_LIST = "/etc/asterisk/nethcti.ini";

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
 * to section names, and the value the object the report keywords of section.
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
	this.updateExtStatusForOp = function(typeext, status) { updateExtStatusForOp(typeext, status);  }
}

// Update the status of the ext
function updateExtStatusForOp(ext, status){
        // update extSatusForOP for future request from the clients
        extStatusForOp[ext].status = status;
        log("updated extStatusForOp to new status = " + extStatusForOp[ext].status + " for [" + ext + "]");
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
	        log("CLIENT: PeerEntry event");
	
	        var ext = headers.objectname;
	        var typeext = headers.channeltype + "/" + ext;
	        var status = headers.status;
	        var dndStatus = '';
	        var cfStatus = '';
	        var cfStatusToExt = '';

		// set status	
	        extStatusForOp[typeext].status = status;

		/* check for the dnd and cf status of current ext.
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
	                log("check DND status action for " + ext + " has been sent to asterisk");
	                if(resp.value==undefined){
	                        log("to create extStatusForOp: dnd status for ext[" + ext + "] is off");
	                        dndStatus = 'off';
	                }
	                else{
	                        log("to create extStatusForOp: dnd status for ext[" + ext + "] is on");
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
	                log("check CF status action for " + ext + " has been sent to asterisk");
	                if(resp.value==undefined){
	                        log("to create extStatusForOp: cf status for ext[" + ext + "] is off");
	                        cfStatus = 'off';
	                }
	                else{
	                        log("to create extStatusForOp: cf status for ext[" + ext + "] is on");
	                        cfStatus = 'on';
	                        cfStatusToExt = resp.value.split('\n')[0];
	                }
	                // set the status informations to ext of extStatusForOp
	                extStatusForOp[typeext].cfStatus = cfStatus;
	                extStatusForOp[typeext].cfStatusToExt = cfStatusToExt;
	        });
	});	


	/* This event is triggered when PeerEntry event is emitted for each user registered in asterisk.
	 * So, the initialization of extStatusForOp can be completed. 
	 */
	am.addListener('peerlistcomplete', function(){
	        if(DEBUG) sys.puts("CLIENT: PeerListComplete event");
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
        var actionUpdateOP = {
                Action: 'SIPPeers'
        };
        // send action to asterisk
        am.send(actionUpdateOP, function () {
                log("'SIPPeers' action has been sent to the asterisk server");
        });
}

/* This function initialize all tab to be view in the operator panel, by reading 
 * the configuration file optab.ini.
 */
function initTabOp(){
        log("initialize tabOp for tabs to view in the operator panel");
        tabOp = iniparser.parseSync(FILE_TAB_OP);
}

function log(msg){
        console.log(new Date().toUTCString() + " - [Modop]: " + msg);
}
