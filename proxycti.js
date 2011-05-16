var ast = require('./asterisk');
var net = require('net');
var dataReq = require("./dataCollector.js");
var proReq = require("./profiler.js");
var authReq = require("./authenticator.js");
var contrReq = require("./controller.js");
var modopReq = require("./modop.js");
var http = require('http');
var url = require('url');
var fs = require('fs');
var io = require('./lib/socket.io');
var sys = require(process.binding('natives').util ? 'util' : 'sys');
var pathreq = require('path');
var normal = require("./lib/normal-template/lib/normal-template");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");


//
var am;
var server;
/* The list of the logged clients. The key is the exten and the value is the 
 * object relative to the client. When the client logs off, the corresponding key 
 * and value are removed.
 */
var clients = {};


/* Audio file list of recorded call. This is an hash table that has the unique id of the file
 * as the key and the filename as value.
 * (view createAudioFileList function).
 */
var audioFileList = {};


const DEBUG = true;
const PROXY_CONFIG_FILENAME = "config/proxycti.ini";
const TEMPLATE_DECORATOR_VCARD_FILENAME = "./template/decorator_vcard.html";
const TEMPLATE_DECORATOR_CUSTOMERCARD_FILENAME = "./template/decorator_customerCard.html";
const TEMPLATE_DECORATOR_HISTORY_CALL_FILENAME = "./template/decorator_historyCall.html";
const AST_CALL_AUDIO_DIR = "/var/spool/asterisk/monitor";
const CALL_PREFIX = "CTI-";
const SPY_PREFIX = "SPY-";
const START_TAG_FILENAME = "auto-";

// The response that this server pass to the clients.
var ResponseMessage = function(clientSessionId, typeMessage, respMessage){
	this.clientSessionId = clientSessionId;
	this.typeMessage = typeMessage;
	this.respMessage = respMessage;
}

function log(msg){
	if (DEBUG) console.log(new Date().toUTCString() + " - [ProxyCTI]: " + msg);
}


// START
console.log("\n\n\n---------------------------------------------");
console.log("------------------- START -------------------");

// initialize parameters for this server and for asterisk server
initServerAndAsteriskParameters();


// Profiler object
var profiler = new proReq.Profiler();
log("Profiler object created");

// Data collector object for execute queries
var dataCollector = new dataReq.DataCollector();
log("DataCollector object created");

// Authenticator object
var authenticator = new authReq.Authenticator();
log("Authenticator object created");

// Modop object. (Module Operator Panel)
var modop = new modopReq.Modop();
log("Modop object created");

// create the list of audio files of recorded call
createAudioFileList();

// Controller object to check changing in audio directory
var controller = new contrReq.Controller();
log("Controller object created");
controller.addDir(AST_CALL_AUDIO_DIR);
controller.addListener("change_dir", function(dir){
	if(dir==AST_CALL_AUDIO_DIR){
		log("update audio file list");
		createAudioFileList();
	}
});

/* add controller to profiler and to dataCollector. They use it to 
 * manage changing in its configuration file.
 */
profiler.addController(controller);
dataCollector.addController(controller);

/* This function create hash table of audio file. The key is the unique id of the file, 
 * and the value is set to filename.
 */
function createAudioFileList(){
	var temp = fs.readdirSync(AST_CALL_AUDIO_DIR);
	for(i=0; i<temp.length; i++){
		var u = getUniqueIdFromFilename(temp[i]);
		audioFileList[u] = temp[i];
	}
	log("audio file list created");
}

/* This function return the unique id of the filename. The uniqueid field is different for
 * those files that has been recorded from cti. 
 * ex. of file name recorded by cti: auto-500-501-20110426-113833-1303810692.18-in.wav
 * ex. of file name recorded by asterisk: OUT202-20110405-173946-1302017986.4016.wav
 * The unique id field is the last field of filename before extension and before "in" indication
 * in the case of cti recorded call.
 */
function getUniqueIdFromFilename(filename){
	if(filename.indexOf(START_TAG_FILENAME)!=-1){
		return filename.split("-")[5];
	}
	else{
		var x = filename.split("-")[3];
		return x.split(".")[0] + "." + x.split(".")[1];
	}
}


/******************************************************
 * This is the section relative to asterisk interaction    
 */
am = new ast.AsteriskManager({user: asterisk_user, password: asterisk_pass, host: asterisk_host});

am.addListener('serverconnect', function() {
	am.login(function () {
		log("Logged in to Asterisk Manager.");

		// Add asterisk manager to modop
		log("add asterisk manager 'am' to modop");
		modop.addAsteriskManager(am);
	});
});

am.addListener('serverdisconnect', function(had_error) {
	if(DEBUG) sys.puts("CLIENT: Disconnected! had_error == " + (had_error ? "true" : "false"));
});

am.addListener('servererror', function(err) {
	if(DEBUG) sys.puts("CLIENT: Error: " + err);
});

am.addListener('agentcalled', function(fromid, fromname, queue, destchannel) {
	log("AgentCalled: from [" + fromid + " : " + fromname + "] to queue " + queue + " and to -> " + destchannel);
	
	var start = destchannel.indexOf("/")+1;
	var end = destchannel.indexOf("@");
	var to = destchannel.substring(start, end);
	
	if(to!=undefined && clients[to]!=undefined){

		// check the permit of the user to receive the call
                if(!profiler.checkActionCallInPermit(to)){
                        log("The user [" + to + "] hasn't the permit of receiving call !");
                        return;
                }

		// create the response for the client
	        var msg = "Call incoming from [" + fromid + " : " + fromname + "] to queue " + queue + " and to " + to;	
		var c = clients[to];
		/* in this response the html is not passed, because the chrome desktop 
                 * notification of the client accept only one absolute or relative url. */
		var response = new ResponseMessage(c.sessionId, "dialing", msg);
		response.from = fromid;
		response.to = to;

		var typesCC = profiler.getTypesCustomerCardPermit(to);
                log("The user [" + to + "] has the permit of view following types of customer card");
                console.log(typesCC);
		if(typesCC.length==0){
                        // the user hasn't the authorization of view customer card: the length is 0
                        log("The user " + to + " hasn't the permit of view customer card");
                        response.customerCard = ["Sorry, but you don't have permission of view customer card !"];
                        c.send(response)
                        log("Notify of calling has been sent to client " + to);
                        return;
                }
		var customerCardResult = [];
                for(i=0; i<typesCC.length; i++){
                        dataCollector.getCustomerCard(fromid, typesCC[i], function(cc){
                                var custCardHTML = createCustomerCardHTML(cc[0], fromid);
                                customerCardResult.push(custCardHTML);
                                if(customerCardResult.length==typesCC.length){
                                        response.customerCard = customerCardResult;
                                        c.send(response);
                                        log("Notify of calling has been sent to client " + to + " with relative customer card");
                                }
                        });
                }
	}
});


am.addListener('dialing', function(from, to) {

	/* check if the call come from queue: in this case, "from" and "to" are equal.
	 * So, the queue call is managed by 'agentcalled' event.
	 */
	var inde = from.number.indexOf("@");
	if(inde!=-1){
		// deeper inspection
//		var tempFrom = from.number.substring(0,inde);
//		if(tempFrom==to.number)
			return;
	}

	log("Dial: " + sys.inspect(from) + " -> "+ sys.inspect(to));
	
	// check if the user is logged in
	if(to!=undefined && clients[to.number]!=undefined){

		// check the permit of the user to receive the call
		if(!profiler.checkActionCallInPermit(to.number)){
			log("The user [" + to.number + "] hasn't the permit of receiving call !");
			return;
		}
	
		// create the response for the client
		var msg = "Call incoming from " + from.number + " to " + to.number;
		var c = clients[to.number];
		/* in this response the html is not passed, because the chrome desktop 
        	 * notification of the client accept only one absolute or relative url. */
		var response = new ResponseMessage(c.sessionId, "dialing", msg);
		response.from = from.number;
		response.to = to.number;
			
		var typesCC = profiler.getTypesCustomerCardPermit(to.number);
		log("The user [" + to.number + "] has the permit of view following types of customer card");
		console.log(typesCC);

		if(typesCC.length==0){
			// the user hasn't the authorization of view customer card, then the length is 0
                        log("The user " + to.number + " hasn't the permit of view customer card");
                        response.customerCard = ["Sorry, but you don't have permission of view customer card !"];
                        c.send(response)
                        log("Notify of calling has been sent to client " + to.number);
			return;
		}		
		var customerCardResult = [];
		for(i=0; i<typesCC.length; i++){
			dataCollector.getCustomerCard(from.number, typesCC[i], function(cc){
				var custCardHTML = createCustomerCardHTML(cc[0], from.number);
				customerCardResult.push(custCardHTML);
				if(customerCardResult.length==typesCC.length){	
					response.customerCard = customerCardResult;
			                c.send(response);
			                log("Notify of calling has been sent to client " + to.number + " with relative customer card");
				}
			});
		}
	}
	if(to!=undefined){
		// update ext status of extension that start the call
		modop.updateExtStatusOpDialFrom(from.number, to.number);	
		// update all clients for op
		updateAllClientsForOpWithExt(from.number);
		// update ext status of extension that receive the call
		modop.updateExtStatusOpDialTo(to.number, from.number);
		// update all clients for op
	        updateAllClientsForOpWithExt(to.number);
		log("update dial from info for op");
		log("update dial to info for op");
	}
});

am.addListener('callconnected', function(from, to) {
	if(DEBUG) sys.puts("CLIENT: Connected call between " + from.number + " (" + from.name + ") and " + to.number + " (" + to.name + ")");
	
	if(clients[from.number]!=undefined){
		var c = clients[from.number];
		var msg = "Call from " + from.number + " to " + to.number + " CONNECTED";
		var response = new ResponseMessage(c.sessionId, "callconnected", msg);
		response.from = from.number;
		response.to = to.number;
		c.send(response);
		log("Notify of connected calling has been sent to " + from.number);
	}
	if(clients[to.number]!=undefined){
		var c = clients[to.number];
		var msg = "Call from " + from.number + " to " + to.number + " CONNECTED";
		var response = new ResponseMessage(c.sessionId, "callconnected", msg);
		response.from = from.number;
		response.to = to.number;
		c.send(response);
		log("Notify of connected calling has been sent to " + to.number);
	}
});

am.addListener('calldisconnected', function(from, to) {
	
	if(DEBUG) sys.puts("CLIENT: Disconnected call between " + from.number + " (" + from.name + ") and " + to.number + " (" + to.name + ")");
});

am.addListener('hold', function(participant) {
	var other = am.getParticipant(participant['with']);
	if(DEBUG) sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has put " + other.number + " (" + other.name + ") on hold");
});

am.addListener('unhold', function(participant) {
	var other = am.getParticipant(participant['with']);
	if(DEBUG) sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has taken " + other.number + " (" + other.name + ") off hold");
});

am.addListener('hangup', function(participant, code, text) {
	if(participant!=undefined){
		var ext = participant.number;
		if(DEBUG) log("CLIENT: " + ext + " (" + participant.name + ") has hung up. Reason: " + code + "  ( Code: " + text + ")");
		if(clients[ext]!=undefined){
			var c = clients[ext];
			var msg = "Call has hung up. Reason: " + text + "  (Code: " + code + ")";
			var response = new ResponseMessage(c.sessionId, "hangup", msg);
			c.send(response);
			log("Notify of hangup has been sent to " + ext);
		}
		/* bug fix of asterisk.js in the wrong management of am.participants.
		 * If this code is commented, am.participants grow with more entry of the same extension,
		 * so it refer wrong with number in follow hangup request.
	 	 */
/*
		for(key in am.participants){
			if(am.participants[key].number==participant.number){
				delete am.participants[key];
				log("deleted from am.participants the entry relative to " + participant.number);
				log("Then the am.participants is = ");
				console.log(am.participants);
			}
		}
*/		
		// update ext status for op
		modop.updateExtStatusForOpWithExt(ext, 'hangup');
		// update all clients with the new state of extension, for update operator panel
		updateAllClientsForOpWithExt(ext);
	}
});

am.addListener('callreport', function(report) {
	if(DEBUG) sys.puts("CLIENT: Call report: " + sys.inspect(report));
});

/*
{ event: 'PeerStatus',
  privilege: 'system,all',
  channeltype: 'SIP',
  peer: 'SIP/504',
  peerstatus: 'Registered' }
*/
am.addListener('peerstatus', function(headers) {
        if(DEBUG) sys.puts("CLIENT: PeerStatus with peerstatus = " + headers.peerstatus + " for peer: " + headers.peer);
	var statusEvent = headers.peerstatus.toLowerCase();
	var currStatus = modop.getExtStatusWithTypeExt(headers.peer).status;
	/* if status of the event is 'registered' and current status of peer is different 
 	 * from unregistered, then the event is ignored. In this way, when the calling is in progress, the arrive of
	 * this event with status 'registered' don't change the status of the extension.
	 */
	if(statusEvent=='registered' && currStatus!='unregistered'){
		log("ignore event peerstatus '" + headers.peerstatus + "' because status of peer " + headers.peer + " is already different from 'unregistered'");
		return;
	}
	// update ext status for op
	modop.updateExtStatusForOpWithTypeExt(headers.peer, headers.peerstatus.toLowerCase());
	// update all clients with the new state of extension, for update operator panel
	updateAllClientsForOpWithTypeExt(headers.peer);
});


/*
{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'SIP/500-0000000b',
  channelstate: '5',
  channelstatedesc: 'Ringing',
  calleridnum: '500',
  calleridname: '',
  uniqueid: '1303228098.13' }
*/
am.addListener('newstate', function(headers){
        if(DEBUG) sys.puts("CLIENT: newstate event " + headers.channelstatedesc + " for " + headers.calleridnum);
	var typeext = headers.channel.split("-")[0];
	var statusEvent = headers.channelstatedesc.toLowerCase();
	// update ext status for op
	modop.updateExtStatusForOpWithTypeExt(typeext, statusEvent);
	// update all clients with the new state of extension, for update operator panel
	updateAllClientsForOpWithTypeExt(typeext);
})

/* This function update all clients with the new state of extension, givin ext. 
 * This sent is used by the clients to update operator panel.
 * example of ext is 500
 */

function updateAllClientsForOpWithExt(ext){	
	// get new state of the extension ext
        var newState = modop.getExtStatusWithExt(ext);
        // send update to all clients with the new state of the typeext for op (operator panel)
        for(key in clients){
                var c = clients[key];
                var msg = "state of " + newState.Label + " has changed: update ext new state";
                var response = new ResponseMessage(c.sessionId, "update_ext_new_state_op", msg);
                response.extNewState = newState;
                c.send(response);
                log("Notify of new ext state has been sent to client " + c.sessionId);
        }	
}

/* This function update all clients with the new state of extension, givin typeext. 
 * This sent is used by the clients to update operator panel.
 * example of typeext is SIP/500
 */
function updateAllClientsForOpWithTypeExt(typeext){
	// get new state of the extension typeext
	var newState = modop.getExtStatusWithTypeExt(typeext);	
	// send update to all clients with the new state of the typeext for op (operator panel)
        for(key in clients){
                var c = clients[key];
                var msg = "state of " + newState.Label + " has changed: update ext new state";
                var response = new ResponseMessage(c.sessionId, "update_ext_new_state_op", msg);
                response.extNewState = newState;
                c.send(response);
                log("Notify of new ext state has been sent to client " + c.sessionId);
        }
}

am.addListener('peerentry', function(headers) {
	if(DEBUG) log("CLIENT: PeerEntry event");
});


/* This event is generated only by the phone of the user.
 * An example of UserEvent event:
{ event: 'UserEvent',
  privilege: 'user,all',
  serevent: 'ASTDB',
  channel: 'SIP/503-0000000d^Family',
  extra: 'Family: DND^Value: Attivo^' }
 */
am.addListener('userevent', function(headers){
	if(DEBUG) sys.puts("CLIENT: UserEvent event");
	// get ext, family and value
	var ext = headers.channel.split("/")[1]; // 503-0000000d^Family
	ext = ext.split("-")[0]; // 503
	var family = headers.extra.split("^")[0]; // Family: DND
	family = family.split(":")[1]; // DND
	var value = headers.extra.split("^")[1]; // Value: Attivo
	value = value.split(":")[1]; // Attivo or ' '
	// remove whitespace from 'family' and 'value'
	family = family.split(' ').join('');
	value = value.split(' ').join('');
	family = family.toLowerCase();
	value = value.toLowerCase();

	if(family=='dnd'){
		log("[" + ext + "] has set its " + family + " to value '" + value + "'");
		/* in this case the client who has modified its DND value is connected to cti
 		 * and has modified its DND through his telephone. So he'll be advise of changing
		 * to update its cti.
		 */
		if(clients[ext]!=undefined){	
			var c = clients[ext];
			if(value==""){ // DND is disabled by the phone user
				log("[" + ext + "] disable its " + family);
				var msg = ext + " has disabled its " + family;
        		        var response = new ResponseMessage(c.sessionId, "dnd_status_off", msg);
		                c.send(response);
		                log("Notify of " + family + " off of ext [" + ext + "] has been sent to the client " + c.sessionId);
			}	
			else if(value=="attivo"){ // DND is enable by the phone user
				log("[" + ext + "] enable its " + family);
				var msg = ext + " has enabled its " + family;
                                var response = new ResponseMessage(c.sessionId, "dnd_status_on", msg);
                                c.send(response);
                                log("Notify of " + family + " on of ext [" + ext + "] has been sent to the client " + c.sessionId);
			}
		}
		// update extStatusForOp with the changing in dnd status
		if(value==""){
			modop.updateExtDNDStatusWithExt(ext, "off");
		}else if(value=="attivo"){
			modop.updateExtDNDStatusWithExt(ext, "on");
		}
                // update all clients with the new state of extension, for update operator panel
                updateAllClientsForOpWithExt(ext);
	}
	else if(family=='cf'){
		log("[" + ext + "] has set its " + family + " to value '" + value + "'");
		/* in this case the client who has modified its CF value is connected to cti
                 * and has modified its CF through his telephone. So he'll be advise of changing
                 * to update its cti.
                 */
                if(clients[ext]!=undefined){
                        var c = clients[ext];
                        if(value==""){ // CF is disabled by the phone user
                                log("[" + ext + "] disable its " + family);
                                var msg = ext + " has disabled its " + family;
                                var response = new ResponseMessage(c.sessionId, "cf_status_off", msg);
                                c.send(response);
                                log("Notify of " + family + " off of ext [" + ext + "] has been sent to the client " + c.sessionId);
                        }
                        else { // CF is enable by the phone user
                                log("[" + ext + "] enable its " + family + " to [" + value + "]");
                                var msg = ext + " has enabled its " + family + " to " + value;
                                var response = new ResponseMessage(c.sessionId, "cf_status_on", msg);
				response.extTo = value;
                                c.send(response);
                                log("Notify of " + family + " on for ext [" + ext + "] to [" + value + "] has been sent to the client " + c.sessionId);
                        }
                }
		// update extStatusForOp with the changing in dnd status
                if(value==""){
                        modop.updateExtCFStatusWithExt(ext, "off");
                }else {
                        modop.updateExtCFStatusWithExt(ext, "on", value);
                }
                // update all clients with the new state of extension, for update operator panel
                updateAllClientsForOpWithTypeExt(ext);
	}
});


/* This event is necessary to add information to parked members of what extension is parked on it.
 * Example of ParkedCall event headers
 * 
 { Event: ParkedCall
   Privilege: call,all
   Exten: 71
   Channel: SIP/500-0000013c
   From: SIP/502-0000013b
   Timeout: 15
   CallerIDNum: 500
   CallerIDName: <unknown>
   Uniqueid: 1305117424.486 }
 */
am.addListener('parkedcall', function(headers){
	log("CLIENT: ParkedCall event");
	var parking = 'PARK' + headers.exten;
	var extParked = headers.channel.split("/")[1];
	extParked = extParked.split("-")[0];
	var parkFrom = headers.from.split("/")[1];
	parkFrom = parkFrom.split("-")[0];
	// update status of park ext
	modop.updateParkExtStatus(parking, extParked, parkFrom);
	// update all clients with the new state of extension, for update operator panel
        updateAllClientsForOpWithExt(parking);
});


/* This event is necessary to update the end of parked call to status of park extensions.
 * Example of ParkeCallTimeOut event headers
 * 
 { Event: ParkedCallTimeOut
   Privilege: call,all
   Exten: 71
   Channel: SIP/502-00000171
   CallerIDNum: 502
   CallerIDName: giovanni }
 */
am.addListener('parkedcalltimeout', function(headers){
        log("CLIENT: ParkedCallTimeOut event");
        var parking = 'PARK' + headers.exten;
        // update status of park ext
        modop.updateEndParkExtStatus(parking);
        // update all clients with the new state of extension, for update operator panel
        updateAllClientsForOpWithExt(parking);
});


/*
 * End of section relative to asterisk interaction
 *************************************************/



/*******************************************************************************
 * HTTP REQUEST
 *******************************************************************************/

//
server = http.createServer(function(req, res){
  	
  	var parsed_url = url.parse(req.url,true);
	var path = parsed_url.pathname;
	var params = parsed_url.query;

	switch (path){
	    case '/':
    		path = "/index.html";
		    fs.readFile(__dirname + path, function(err, data){
    	    	if (err) return send404(res);
		        res.writeHead(200, {'Content-Type': 'text/html'});
    		    res.write(data, 'utf8');
    		    res.end();
    	  	});
	    break;
	    case '/getCallAudioFile':
		var filename = params.file;
		var extFrom = params.extFrom;
		// check if the requested file exists
                var tempPath = AST_CALL_AUDIO_DIR + "/" + filename;
                pathreq.exists(tempPath, function(exists){
                        if(exists){
                                // check the extension of the file
                                var fileExt = pathreq.extname(tempPath);
                                var type;
				if(params.down==0) type='application/octect-stream'; // this is to force download of audio file
                                else if(fileExt.toLowerCase()=='.wav') type = 'audio/x-wav';
                                else if(fileExt=='.mp3') type = 'audio/mpeg';
                                else if(fileExt=='.ogg') type = 'application/ogg';
                                fs.readFile(tempPath, function(err, data){
                                        if (err) return send404(res);
                                        res.writeHead(200, {'Content-Type': type});
                                        res.write(data, 'utf8');
                                        res.end();
                                });
                        }
                        else{
				log("file not found: " + filename);
                                send404(res);
                        }
                });
	    break;
	    default: 
    		// check if the requested file exists
    		var tempPath = __dirname + path;
    		pathreq.exists(tempPath, function(exists){
    			
    			if(exists){
    				
    				// check the extension of the file
    				var fileExt = pathreq.extname(tempPath);
    				var type;
    				if(fileExt=='.js') type = 'text/javascript';
    				else if(fileExt=='.html' || fileExt=='htm') type = 'text/html';
    				else if(fileExt=='.css') type = 'text/css';
    				fs.readFile(tempPath, function(err, data){
				        if (err) return send404(res);
				        res.writeHead(200, {'Content-Type': type});
				        res.write(data, 'utf8');
				        res.end();
				    });
    			}
    			else{
		    		send404(res);
    			}
    		});
  	}	//switch
});	


send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(port);
log("Listening on port: " + port);

var io = io.listen(server);


/*******************************************************************************
 * MESSAGES
 *******************************************************************************/

 
io.on('connection', function(client){

	// send acknowledgment of established connection 
	client.send(new ResponseMessage(client.sessionId, "connected", "[DEBUG] client " + client.sessionId + " connected"));
	log("aknowledgment to connection has been sent to the client: " + client.sessionId);


	client.on('message', function(message){

		// all received message have the information of exten from and the information about the action
  		var extFrom = message.extFrom;
  		var action = message.action;
  		
  		const ACTION_LOGIN = "login";
  		const ACTION_CALLOUT = "call_out_from_client";
  		const ACTION_LOGOUT = "logout";
  		const ACTION_HANGUP = "hangup";
  		const ACTION_SEARCH_CONTACT_PHONEBOOK = "search_contact_phonebook";
  		const ACTION_REDIRECT = "redirect";
  		const ACTION_RECORD = "record";
  		const ACTION_STOP_RECORD = "stoprecord";
  		const ACTION_DND_ON = "dnd_on";
  		const ACTION_DND_OFF = "dnd_off";
  		const ACTION_CW_ON = "cw_on";
  		const ACTION_CW_OFF = "cw_off";
  		const ACTION_CHECK_DND_STATUS = "check_dnd_status";
  		const ACTION_CHECK_CW_STATUS = "check_cw_status";
  		const ACTION_CF_ON = "cf_on";
  		const ACTION_CF_OFF = "cf_off";
  		const ACTION_CHECK_CF_STATUS = "check_cf_status";
  		const ACTION_GET_DAY_HISTORY_CALL = "get_day_history_call";
  		const ACTION_GET_CURRENT_WEEK_HISTORY_CALL = "get_current_week_history_call";
  		const ACTION_GET_CURRENT_MONTH_HISTORY_CALL = "get_current_month_history_call";
  		const ACTION_CHECK_CALL_AUDIO_FILE = "check_call_audio_file";
  		const ACTION_GET_PEER_LIST_COMPLETE_OP = "get_peer_list_complete_op";
  		const ACTION_PARK = "park";
  		const ACTION_SPY_LISTEN = "spy_listen";
  		const ACTION_PICKUP = "pickup";
		
  		log("received " + action + " request from exten [" + extFrom + "] with sessiondId = " + client.sessionId + " with message = ");	
		console.log(message);
  		
  		// manage request
  		switch(action){
  			case ACTION_LOGIN:

				console.log("am.participants in action_login = ");
				console.log(am.participants);
	  		
	  			if(authenticator.authenticateUser(extFrom, message.secret)){  // the user is authenticated
  				
					// check if the user sessionId with extFrom is already logged in
  					if(testAlreadyLoggedUser(client.sessionId, extFrom)){
  						log("client with sessionId = " + client.sessionId + " is already logged in as " + extFrom);
  						log("clients length = " + Object.keys(clients).length);
  						printLoggedClients();
				    	client.send(new ResponseMessage(client.sessionId, "already_logged_in", "You are already logged in !"));
				    	log("already_logged_in has been sent to [" + extFrom + "] with: " + client.sessionId);
  						return;
  					}
  				
  					// check if the user sessionId is already logged in
  					if(testAlreadyLoggedSessionId(client.sessionId)){
  						log("client with sessionId = " + client.sessionId + " is already logged in");
  						log("clients length = " + Object.keys(clients).length);
  						printLoggedClients();
				    	client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, but you are already logged in !"));
				    	log("error_login has been sent to [" + extFrom + "] with: " + client.sessionId);
  						return;
  					}
  					// check if the user extFrom is already logged in
  					if(testAlreadyLoggedExten(extFrom)){
  						log("Client [" + extFrom + "] already logged in !");
				    	log("clients length = " + Object.keys(clients).length);
				    	printLoggedClients();
				    	client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, but the client [" + extFrom + "] is already logged in"));
				    	log("error_login has been sent to [" + extFrom + "] with: " + client.sessionId);
				    	return;
  					}
  					// authenticate the user
  					else{
		  				client.extension = extFrom;
		  				clients[extFrom] = client;  
		  				var ipAddrClient = client.connection.remoteAddress;
			  			log("client [" + extFrom + "] with IP = [" + ipAddrClient + "] and sessionId = [" + client.sessionId + "] logged in");
			  			log("clients length  = " + Object.keys(clients).length);
			  			printLoggedClients();
			  			var respMsg = new ResponseMessage(client.sessionId, "ack_login", "Login succesfully");
			  			respMsg.ext = extFrom;
			  			respMsg.secret = message.secret;
		  				client.send(respMsg);
		  				log("Acknowledgment to login action has been sent to [" + extFrom + "] with: " + client.sessionId);
  					}
  				}
  				else{ // the user is not authenticated
  					log("Authentication failed: [" + extFrom + "] with secret [" + message.secret + "]");
  					client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, authentication failed !"));
  					log("error_login has been sent to [" + extFrom + "] with: " + client.sessionId);
  				}
	  			
	  		break;
	  		case ACTION_CALLOUT:
	  			
	  			// in this case the message has also the information about the exten to call
  				var extToCall = message.extToCall;
  				
  				// check if the client is logged in
	  			if(clients[extFrom]==undefined){
	  				log("ERROR: client " + extFrom + " not logged in");
	  				client.send(new ResponseMessage(client.sessionId, 'error_call', 'Error in calling: client not logged in'));
	  				log("error_call has been sent to [" + extFrom + "] with: " + client.sessionId);
	  				return;
  				}
	  			// security check of real authenticity of the user who originated the call
	  			else if(client.sessionId != clients[extFrom].sessionId){
	  				log("Security ERROR: attempt to fake the sender: session " + client.sessionId + " attempt to call with the fake exten " + extFrom + " !");
	  				client.send(new ResponseMessage(client.sessionId, 'error_call', 'Error in calling: attempt to call with the fake exten ' + extFrom));
	  				log("error_call has been sent to [" + extFrom + "] with: " + client.sessionId);
	  				return;
	  			}

  				// check if the user has the permit of dial out
  				if(profiler.checkActionCallOutPermit(extFrom)){
  					log("[" + extFrom + "] enabled to calling out: execute calling...");
	  				// create call action for asterisk server
	  				var actionCall = {
						Action: 'Originate',
						Channel: 'SIP/' + extFrom,
						Exten: extToCall,
						Context: 'from-internal',
						Priority: 1,
						Callerid: CALL_PREFIX + extFrom,
						Account: extToCall,
						Timeout: 30000
					};
					// send action to asterisk
					am.send(actionCall, function () {
						log("call action has been sent to asterisk: " + extFrom + " -> " + extToCall);
					});
	  			}
  				else{
		  			log("ATTENTION: " + extFrom + " is not enabled to calling out !");
		  			client.send(new ResponseMessage(client.sessionId, 'error_call', "Sorry, but you don't have permission to call !"));
		  			log("error_call has been sent to [" + extFrom + "] with: " + client.sessionId);
  				}
		  	break;
		  	case ACTION_HANGUP:
	  		
	  			// retrieve the id of the client who has request the hangup
	  			var id;
	  			for(key in am.participants){
	  				if(am.participants[key].number==extFrom){
	  					id = key;
	  					break;
	  				}
	  			}
				console.log("am.participants = ");
				console.log(am.participants);
	  			
	  			// create hangup action for asterisk server
		  		var actionCall = {
					Action: 'Hangup',
					Channel: id
				};
				// send action to asterisk
				am.send(actionCall, function () {
					log("hangup action from " + extFrom + " [" + id + "] has been sent to asterisk: ");
				});
	  		break;
	  		case ACTION_LOGOUT:
	  		
	  			removeClient(client.sessionId);
	  			if(!testAlreadyLoggedSessionId(client.sessionId)){
			  		log("Client " + client.sessionId + " logged out");
			  		client.send(new ResponseMessage(client.sessionId, "ack_logout", "logout has been succesfully"));
			  		log("acknowlwdge of logout has been sent to the client");
			  	}
		  		log("clients length = " + Object.keys(clients).length);
	  		break;
	  		case ACTION_REDIRECT:
	  			
	  			// check if the user has the permit of dial out
				if(profiler.checkActionRedirectPermit(extFrom)){
	  			
	  				log("[" + extFrom + "] enabled to redirect call: execute redirecting...");
	  				
	  				// get the channel
	  				var channel = '';
	  				for(key in am.participants){
	  					if(am.participants[key].number==message.redirectFrom){
	  						channel = key;
	  					}
	  				}
	  				
		  			// create redirect action for the asterisk server
		  			var actionRedirect = {
						Action: 'Redirect',
						Channel: channel,
						Context: 'from-internal',
						Exten: message.redirectTo,
						Priority: 1
					};
					// send action to asterisk
					am.send(actionRedirect, function () {
						log("redirect action from " + message.redirectFrom + " to " + message.redirectTo + " has been sent to asterisk");
						client.send(new ResponseMessage(client.sessionId, 'ack_redirect'), 'Redirection has been taken');
						log("ack_redirect has been sent to [" + extFrom + "] with: " + client.sessionId);
					});
		  		}
	  			else{
			  		log("ATTENTION: " + extFrom + " is not enabled to redirect call!");
			  		client.send(new ResponseMessage(client.sessionId, "error_redirect", "Sorry: you don't have permission to redirect !"));
			  		log("error_redirect has been sent to [" + extFrom + "] with: " + client.sessionId);
	  			}
	  		break;
	  		case ACTION_SEARCH_CONTACT_PHONEBOOK:
	  			// check if the user has the permit to search contact in phonebook
				var res = profiler.checkActionPhonebookPermit(extFrom);
	  			if(res){
	  				// execute query to search contact in phonebook
	  				var namex = message.namex;
					dataCollector.getContactsPhonebook(namex, function(results){
	  					var resultHTML = createResultSearchContactsPhonebook(results);
	  					var mess = new ResponseMessage(client.sessionId, "search_contacts_results", "received phonebook contacts");
	  					mess.resultHTML = resultHTML;
	  					client.send(mess);
	  					log("Results of searching contacts in phonebook has been sent to client");
	  				});
	  			}
	  			else{
	  				log("ATTENTION: " + extFrom + " is not enabled to search contacts in phonebook !");
  					client.send(new ResponseMessage(client.sessionId, "error_search_contacts", "Sorry: you don't have permission to search contacts in phonebook !"));
  					log("error_search_contacts has been sent to [" + extFrom + "] with: " + client.sessionId);
	  			}
	  		break;
	  		case ACTION_RECORD:
	  			
	  			// check if the user has the permit of dial out
				if(profiler.checkActionRecordPermit(extFrom)){
	  				var channel = '';
					var uniqueid = '';
					var callFromExt = message.callFromExt;
	  				for(key in am.participants){
	  					if(am.participants[key].number==callFromExt){
	  						channel = key;
							uniqueid = am.participants[key].with;
	  					}
	  				}
	  				// create filename	
					var d = new Date();
					var yyyy = d.getFullYear();
					var mm = (d.getUTCMonth()+1); if(mm<10) mm = '0' + mm;
					var dd = d.getUTCDate();      if(dd<10) dd = '0' + dd;
					var yyyyMMdd = yyyy + "" + mm + "" + dd;
					var hh = d.getHours(); if(hh<10) hh = '0' + hh; 
					var mm = d.getMinutes(); if(mm<10) mm = '0' + mm;
					var ss = d.getSeconds(); if(ss<10) ss = '0' + ss;
					var hhmmss = hh + "" + mm + "" + ss;
	  				var filename = START_TAG_FILENAME + message.callFromExt + "-" + message.callToExt + "-" + yyyyMMdd + "-" + hhmmss + "-" + uniqueid; 
	  				// create record action for asterisk server
			  		var actionRecord = {
						Action: 'Monitor',
						Channel: channel,
						File: filename,
						Mix: 1
					};
					// send action to asterisk
					am.send(actionRecord, function () {
						log("record action from " + extFrom + " has been sent to asterisk");
						var msgstr = 'Recording of call ' + filename + ' started...';
						client.send(new ResponseMessage(client.sessionId, 'ack_record', msgstr));
						log("ack_record has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					});
				}
				else{
			  		log("ATTENTION: " + extFrom + " is not enabled to record !");
			  		client.send(new ResponseMessage(client.sessionId, "error_record", "Sorry: you don't have permission to record call !"));
			  		log("error_record has been sent to [" + extFrom + "] with: " + client.sessionId);
	  			}	
	  		break;
	  		case ACTION_STOP_RECORD:
  				// get channel
  				var channel = '';
  				for(key in am.participants){
  					if(am.participants[key].number==extFrom){
  						channel = key;
  					}
  				}
	  			// create stop record action for asterisk server
			  	var actionStopRecord = {
					Action: 'StopMonitor',
					Channel: channel
				};
				// send action to asterisk
				am.send(actionStopRecord, function () {
					log("stop record action from " + extFrom + " has been sent to asterisk");
					var msgstr = 'Recording for ' + extFrom + ' stopped';
					client.send(new ResponseMessage(client.sessionId, 'ack_stoprecord', msgstr));
					log("ack_stoprecord has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
				});
	  		break;
	  		case ACTION_DND_ON:
	  			// create action for asterisk server
	  			var cmd = "database put DND " + extFrom + " 1";
			  	var actionDNDon = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionDNDon, function () {
					log("DND on action from " + extFrom + " has been sent to asterisk");
					var msgstr = "Don't disturb  of [" + extFrom + "] is ON";
					client.send(new ResponseMessage(client.sessionId, 'ack_dnd_on', msgstr));
					log("ack_dnd_on has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
					// update ext DND status
					modop.updateExtDNDStatusWithExt(extFrom, 'on');
					// update all clients for op
					updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
	  		case ACTION_DND_OFF:
		  		// create action for asterisk server
	  			var cmd = "database del DND " + extFrom;
			  	var actionDNDoff = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionDNDoff, function () {
					log("DND off action from " + extFrom + " has been sent to asterisk");
					var msgstr = "Don't disturb  of [" + extFrom + "] is OFF";
					client.send(new ResponseMessage(client.sessionId, 'ack_dnd_off', msgstr));
					log("ack_dnd_off has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
					// update ext DND status
                                        modop.updateExtDNDStatusWithExt(extFrom, 'off');
					// update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
	  		case ACTION_CHECK_DND_STATUS:
	  			// create action for asterisk server
	  			var cmd = "database get DND " + extFrom;
			  	var actionCheckDNDStatus = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCheckDNDStatus, function (resp) {
					log("check DND status action from " + extFrom + " has been sent to asterisk");
					
					if(resp.value==undefined){
						var msgstr = "Don't disturb  status of [" + extFrom + "] is OFF";
						client.send(new ResponseMessage(client.sessionId, 'dnd_status_off', msgstr));
						log("dnd_status_off has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					}
					else{
						var msgstr = "Don't disturb  status of [" + extFrom + "] is ON";
						client.send(new ResponseMessage(client.sessionId, 'dnd_status_on', msgstr));
						log("dnd_status_on has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					}
				});
	  		break;
	  		case ACTION_CW_ON:
	  			// create action for asterisk server
	  			var cmd = "database put CW " + extFrom + " 1";
			  	var actionCWon = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCWon, function () {
					log("CW on action from " + extFrom + " has been sent to asterisk");
					var msgstr = "Call waiting  of [" + extFrom + "] is ON";
					client.send(new ResponseMessage(client.sessionId, 'ack_cw_on', msgstr));
					log("ack_cw_on has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
				});
	  		break;
	  		case ACTION_CW_OFF:
		  		// create action for asterisk server
	  			var cmd = "database del CW " + extFrom;
			  	var actionCWoff = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCWoff, function () {
					log("CW off action from " + extFrom + " has been sent to asterisk");
					var msgstr = "Call waiting  of [" + extFrom + "] is OFF";
					client.send(new ResponseMessage(client.sessionId, 'ack_cw_off', msgstr));
					log("ack_cw_off has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
				});
	  		break;
	  		case ACTION_CHECK_CW_STATUS:
	  			// create action for asterisk server
	  			var cmd = "database get CW " + extFrom;
			  	var actionCheckCWStatus = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCheckCWStatus, function (resp) {
					log("check CW status action from " + extFrom + " has been sent to asterisk");
					
					if(resp.value==undefined){
						var msgstr = "Call waiting  status of [" + extFrom + "] is OFF";
						client.send(new ResponseMessage(client.sessionId, 'cw_status_off', msgstr));
						log("cw_status_off has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					}
					else{
						var msgstr = "Call waiting  status of [" + extFrom + "] is ON";
						client.send(new ResponseMessage(client.sessionId, 'cw_status_on', msgstr));
						log("cw_status_on has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					}
				});
	  		break;
	  		case ACTION_CF_ON:
	  			var extTo = message.extTo;
	  			// create action for asterisk server
	  			var cmd = "database put CF " + extFrom + " " + extTo;
			  	var actionCFon = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCFon, function () {
					log("CF on action from " + extFrom + " to " + extTo + " has been sent to asterisk");
					var msgstr = "Call forwarding  of [" + extFrom + "] is ON to " + extTo;
					client.send(new ResponseMessage(client.sessionId, 'ack_cf_on', msgstr));
					log("ack_cf_on has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
					// update ext CF status
                                        modop.updateExtCFStatusWithExt(extFrom, 'on', extTo);
                                        // update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
	  		case ACTION_CF_OFF:
		  		// create action for asterisk server
	  			var cmd = "database del CF " + extFrom;
			  	var actionCFoff = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCFoff, function () {
					log("CF off action from " + extFrom + " has been sent to asterisk");
					var msgstr = "Call forwarding  of [" + extFrom + "] is OFF";
					client.send(new ResponseMessage(client.sessionId, 'ack_cf_off', msgstr));
					log("ack_cf_off has been sent to [" + extFrom + "] with: " + client.sessionId);
					log(msgstr);
					// update ext CF status
                                        modop.updateExtCFStatusWithExt(extFrom, 'off');
                                        // update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
	  		case ACTION_CHECK_CF_STATUS:
	  			// create action for asterisk server
	  			var cmd = "database get CF " + extFrom;
			  	var actionCheckCFStatus = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCheckCFStatus, function (resp) {
					log("check CF status action from " + extFrom + " has been sent to asterisk");
					if(resp.value==undefined){
						var msgstr = "Call forwarding  status of [" + extFrom + "] is OFF";
						client.send(new ResponseMessage(client.sessionId, 'cf_status_off', msgstr));
						log("cf_status_off has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					}
					else{
						var extTo = resp.value.split('\n')[0];
						var msgstr = "Call forwarding  status of [" + extFrom + "] is ON to " + extTo;
						var respMessage = new ResponseMessage(client.sessionId, 'cf_status_on', msgstr);
						respMessage.extTo = extTo;
						client.send(respMessage);
						log("cf_status_on has been sent to [" + extFrom + "] with: " + client.sessionId);
						log(msgstr);
					}
				});
	  		break;
			case ACTION_GET_DAY_HISTORY_CALL:

				// check if the user has the permit to get the history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
					// format date for query sql
					var dateFormat = formatDate(message.date);					
					console.log("dateFormat for query = " + dateFormat);
                                        // execute query to search contact in phonebook
                                        dataCollector.getDayHistoryCall(extFrom, dateFormat, function(results){
                                                var mess = new ResponseMessage(client.sessionId, "day_history_call", "received day history call");
                                                mess.results = createHistoryCallResponse(results);
                                                client.send(mess);
                                                log("Day history call of [" + extFrom + "] has been sent to the client: the number of entry is: " + results.length);
                                        });
                                }
                                else{
                                        log("ATTENTION: " + extFrom + " is not enabled to view day history call !");
                                        client.send(new ResponseMessage(client.sessionId, "error_day_history_call", "Sorry: you don't have permission to view day history call !"));
                                        log("error_day_history_call has been sent to [" + extFrom + "] with: " + client.sessionId);
                                }
                        break;
			case ACTION_GET_CURRENT_WEEK_HISTORY_CALL:

                                // check if the user has the permit to get history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
                                        // execute query to search contact in phonebook
                                        dataCollector.getCurrentWeekHistoryCall(extFrom, function(results){
                                                var mess = new ResponseMessage(client.sessionId, "current_week_history_call", "received current week history call");
						mess.results = createHistoryCallResponse(results);
                                                client.send(mess);
                                                log("Current week history call of [" + extFrom + "] has been sent to the client");
                                        });
                                }
                                else{
                                        log("ATTENTION: " + extFrom + " is not enabled to view current week history call !");
                                        client.send(new ResponseMessage(client.sessionId, "error_current_week_history_call", "Sorry: you don't have permission to view current week history call !"));
                                        log("error_current_week_history_call has been sent to [" + extFrom + "] with: " + client.sessionId);
                                }
                        break;
			case ACTION_GET_CURRENT_MONTH_HISTORY_CALL:
                                // check if the user has the permit to get history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
                                        // execute query to search contact in phonebook
                                        dataCollector.getCurrentMonthHistoryCall(extFrom, function(results){
                                                var mess = new ResponseMessage(client.sessionId, "current_month_history_call", "received current month history call");
						mess.results = createHistoryCallResponse(results);
                                                client.send(mess);
                                                log("Current month history call of [" + extFrom + "] has been sent to the client");
                                        });
                                }
                                else{
                                        log("ATTENTION: " + extFrom + " is not enabled to view current month history call !");
                                        client.send(new ResponseMessage(client.sessionId, "error_current_month_history_call", "Sorry: you don't have permission to view current month history call !"));
                                        log("error_current_month_history_call has been sent to [" + extFrom + "] with: " + client.sessionId);
                                }
                        break;
			case ACTION_CHECK_CALL_AUDIO_FILE:
				// check if there are some audio file with particular uniqueid
				var uniqueid = message.uniqueid;
				var audioFiles = [];
				fs.readdir(AST_CALL_AUDIO_DIR, function(err, files){					
					if(err){
						console.log(err);
						return;
					}
					for(i=0; i<files.length; i++){
						if( (files[i].indexOf(uniqueid))!=-1 )	{
							audioFiles.push(files[i]);
						}
					}	
					var mess = new ResponseMessage(client.sessionId, "audio_file_call_list", "received list of audio file of call");
	                                mess.results = audioFiles;
	                                client.send(mess);
	                                log("Audio file list of call has been sent to the client [" + extFrom + "] and it is = " + sys.inspect(audioFiles));
				});	
                        break;
			case ACTION_GET_PEER_LIST_COMPLETE_OP:
				/* check if the user has the permit to view operator panel.
				 * First check if the user has the "OP_PLUS" permit. If he hasn't the permit, then
 				 * it check if he has the "OP_BASE" permit. 
				 */
                                if(profiler.checkActionOpPlusPermit(extFrom)){
					// create message
	                                var msgstr = "received extStatusForOp to create operator panel";
	                                var mess = new ResponseMessage(client.sessionId, "ack_get_peer_list_complete_op", msgstr);
	                                mess.extStatusForOp = modop.getExtStatusForOp();
					mess.tabOp = modop.getTabOp();
					mess.opPermit = 'plus';
	                                client.send(mess);
	                                log("ack_get_peer_list_complete_op has been sent to [" + extFrom + "] with: " + client.sessionId);
				}
				else if(profiler.checkActionOpBasePermit(extFrom)) {
					// create message
                                        var msgstr = "received extStatusForOp to create operator panel";
                                        var mess = new ResponseMessage(client.sessionId, "ack_get_peer_list_complete_op", msgstr);
                                        mess.extStatusForOp = modop.getExtStatusForOp();
                                        mess.tabOp = modop.getTabOp();
                                        mess.opPermit = 'base';
                                        client.send(mess);
                                        log("ack_get_peer_list_complete_op has been sent to [" + extFrom + "] with: " + client.sessionId);
				}
				else{
					// create message
                                        var msgstr = "Sorry but you haven't the permit of view the operator panel";
                                        var mess = new ResponseMessage(client.sessionId, "error_get_peer_list_complete_op", msgstr);
                                        client.send(mess);
                                        log("error_get_peer_list_complete_op has been sent to [" + extFrom + "] with: " + client.sessionId);	
				}
                        break;
			case ACTION_PARK:
				var callToPark = message.callToPark;
				// get channel1 and channel2
                                var channel1_toPark = ''; // the extension to be parked
				var channel2 = '';  // the extension that has been request the park
                                for(key in am.participants){
                                        if(am.participants[key].number==callToPark){
                                                channel1_toPark = key;
                                        }
					else if(am.participants[key].number==extFrom){
						channel2 = key;
					}
                                }
				// create action for asterisk server
                                var actionPark = {
                                        Action: 'Park',
					Channel: channel1_toPark,
					Channel2: channel2
                                };
                                // send action to asterisk
                                am.send(actionPark, function (resp) {
                                        log("Park action: callToPark [" + callToPark + "] request by extFrom ["  + extFrom + "] has been sent to asterisk");
					// create message
	                                var msgstr = "received acknowledgment for parking the call";
	                                var mess = new ResponseMessage(client.sessionId, "ack_park", msgstr);
	                                client.send(mess);
	                                log("ack_park has been sent to [" + extFrom + "] with: " + client.sessionId)
                                });
			break;
			case ACTION_SPY_LISTEN:
				var extToSpy = message.extToSpy;
				// create action to spy channel
				var actionSpyListen = {
					Action: 'Originate',
					Channel: 'SIP/' + extFrom,
					Application: 'ChanSpy',
					Data: extToSpy,
					Callerid: SPY_PREFIX + extToSpy
				};
				// send spy action to the asterisk server
				am.send(actionSpyListen, function(){
					log('spy_listen action from [' + extFrom + '] to spy [' + extToSpy +'] has been sent to the asterisk');
				});
			break;
			case ACTION_PICKUP:
                                var callerExt = message.callerExt;
				// get channel
                                var channel = '';
                                for(key in am.participants){
                                        if(am.participants[key].number==callerExt){
                                                channel = key;
                                        }
                                }
                                // create action to pickup the call. It is realized with redirect action 
                                var actionPickup = {
                                        Action: 'Redirect',
                                        Channel: channel,
					Context: 'from-internal',
					Exten: extFrom,
					Priority: 1
                                };
                                // send the action to the asterisk server
                                am.send(actionPickup, function(){
                                        log('pickup action for [' + callerExt + '] to [' + extFrom +'] has been sent to the asterisk');
                                });
                        break;
	  		default:
	  			log("ATTENTION: action '" + action + "' not provided");
	  		break;
	  	}
  	});

  	client.on('disconnect', function(){
  		log("Client " + client.sessionId + " disconnected");
  		removeClient(client.sessionId);
  		if(!testAlreadyLoggedSessionId(client.sessionId)){
  			log("removed client with sessionId=[" + client.sessionId + "]");
	  	}
	  	log("clients length = " + Object.keys(clients).length);
  	});
});

log("asterisk manager connection");
am.connect();





/************************************************************************************************
 *                             Functions							*
 ***********************************************************************************************/

/* This function create the response for the client with the history call
 * that the client has been requested.
 */
function createHistoryCallResponse(results){
	var res = [];
/*
 * An example of result obtained by the database of history call
[ { calldate: Tue, 26 Apr 2011 11:38:12 GMT,
    clid: 'CTI500',
    src: '',
    dst: '501',
    dcontext: 'from-internal',
    channel: 'SIP/500-00000012',
    dstchannel: 'SIP/501-00000013',
    lastapp: 'Dial',
    lastdata: 'SIP/501,"",tr',
    duration: 35,
    billsec: 16,
    disposition: 'ANSWERED',
    amaflags: 3,
    accountcode: '501',
    uniqueid: '1303810692.18',
    userfield: '' },
    ...]
*/
	for(i=0; i<results.length; i++){		
		var currRes = results[i];
		var temp = {};
		temp.calldate = currRes.calldate;
		temp.clid = currRes.clid;
		temp.dst = currRes.dst;
		temp.duration = currRes.duration;
		temp.disposition = currRes.disposition;
		temp.uniqueid = currRes.uniqueid;
		if(audioFileList[currRes.uniqueid]!=undefined)
			temp.recording = true;
		else
			temp.recording = false;
		res.push(temp);
	}
	return res;
}


// Format date from gg/mm/yyyy to yyyy-mm-dd
function formatDate(date){
	var ar = date.split('/');	
	var result = ar[2] + "-";
	result += ar[1] + "-";
	result += ar[0];
	return result;
}

/*
 * Remove client with specified sessionId
 */ 
removeClient = function(sessionId){
	for(client in clients){
		if( (clients[client].sessionId)==sessionId ){
			delete clients[client];
		}
	}
}

/*
 * Check if the user exten already present in memory.
 */ 
testAlreadyLoggedExten = function(exten){

	if(clients[exten]!=undefined)
		return true;
	return false;
}

/*
 * Check if the user exten already present in memory and its sessionId correspond.
 */ 
testAlreadyLoggedUser = function(sessionId, exten){

	if(clients[exten]!=undefined && clients[exten].sessionId==sessionId)
		return true;
	return false;
}

/*
 * Check if the user sessionId already present in memory.
 */
testAlreadyLoggedSessionId = function(sessionId){

	for(client in clients){
		if(clients[client].sessionId==sessionId)
			return true;
	}
	
	return false;
}

/*
 * Create html code to return to the client after when he receive calling. This code is 
 * the customer card of the calling user
 */
createCustomerCardHTML = function(customerCard, from){
	      		
	// read file
	var htmlTemplate = fs.readFileSync(TEMPLATE_DECORATOR_CUSTOMERCARD_FILENAME, "UTF-8", function(err, data) {
		if(err){
			sys.puts("error in reading file");
			sys.puts(err);
			return;
		}
		return data;
	});

	/* customerCard is undefined if the user that has do the request
  	 * hasn't the relative permission or the calling user is not in db*/
	if(customerCard==undefined){
		customerCard = {};
		customerCard.customerNotInDB = "true";
		customerCard.from = from;
	}

	var template = normal.compile(htmlTemplate);
	customerCard.server_address = "http://" + hostname + ":" + port;
	var toAdd = template(customerCard);
	var HTMLresult = toAdd;
		
	return HTMLresult;
}



/* Create the html code for viewing result of searching contacts in phonebook.
 * It read template html file and personalize it with the parameter results.
 */
function createResultSearchContactsPhonebook(results){
	      		
	console.log(results);
	var HTMLresult = '';
	      		
	// read file
	var htmlTemplate = fs.readFileSync(TEMPLATE_DECORATOR_VCARD_FILENAME, "UTF-8", function(err, data) {
		if(err){
			sys.puts("error in reading file");
			sys.puts(err);
			return;
		}
		return data;
	});
	
	// repeat htmlTemplate for number of results
	var currentUser = '';
	var temp = '';
	var template = '';
	for(var i=0; i<results.length; i++){
	
		currentUser = results[i];
		template = normal.compile(htmlTemplate);
		currentUser.server_address = "http://" + hostname + ":" + port;
		temp = template(currentUser);
		
		HTMLresult += temp;
	}
	
	return HTMLresult;
}

//
function printLoggedClients(){
	log("the list of logged clients is:");
	for(keyClient in clients){
		console.log("\t[" + keyClient + "] - IP = [" + clients[keyClient].connection.remoteAddress + "] - sessionId = [" + clients[keyClient].sessionId + "]");
	}
}

/* Initialize some configuration parameters.
 *
server_conf = 
{ ASTERISK: { user: 'vtiger', pass: 'vtiger', host: 'localhost' },
  SERVER_PROXY: { hostname: 'amaduzzi', port: '8080' } }
*/
function initServerAndAsteriskParameters(){
	var server_conf = iniparser.parseSync(PROXY_CONFIG_FILENAME);
	asterisk_user = server_conf.ASTERISK.user;
	asterisk_pass = server_conf.ASTERISK.pass;
	asterisk_host = server_conf.ASTERISK.host;
	hostname = server_conf.SERVER_PROXY.hostname;
	port = server_conf.SERVER_PROXY.port;
}






process.on('uncaughtException', function(err){
	log('*********************************************');
	log('Caught not provided exception: ');
	log(err);
	log("\nSTACK:");
	log(err.stack);
	log('*********************************************');
});





