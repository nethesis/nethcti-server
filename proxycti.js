var ast = require('./asterisk');
var net = require('net');
var normal = require("./lib/normal-template/lib/normal-template");
var dataReq = require("./dataCollector.js");
var proReq = require("./profiler.js");
var authReq = require("./authenticator.js");
var http = require('http');
var url = require('url');
var fs = require('fs');
var io = require('./lib/socket.io');
var sys = require(process.binding('natives').util ? 'util' : 'sys');
var pathreq = require('path');
//
var am;
var server;
/* The list of the logged clients. The key is the exten and the value is the 
 * object relative to the client. When the client logs off, the corresponding key 
 * and value are removed.
 */
var clients = {};
var DEBUG = true;
var PROXY_CONFIG_FILENAME = "proxycti.conf";
var NOTIFICATION_URL_PHONEBOOK = "templateNotificationCallingPhonebook.html";
var NOTIFICATION_URL_NORMAL = "templateNotificationCalling.html";

// The response that this server pass to the clients.
var ResponseMessage = function(clientSessionId, typeMessage, respMessage){
	this.clientSessionId = clientSessionId;
	this.typeMessage = typeMessage;
	this.respMessage = respMessage;
}


function initAsteriskParameters(){
	// read file
	var conf = fs.readFileSync(PROXY_CONFIG_FILENAME, "UTF-8", function(err, data) {
		if(err){
			sys.puts("error in reading file");
			sys.puts(err);
			return;
		}
		return data;
	});

	var categoriesArray = conf.split("[");
	categoriesArray = categoriesArray.slice(1,categoriesArray.length);
	
	for(var i=0; i<categoriesArray.length; i++){
	
		var tempCategoryStr = categoriesArray[i];	
		var tempCategoryArray = tempCategoryStr.split("\n");
		var categoryName = tempCategoryArray[0].slice(0, tempCategoryArray[0].length-1);

		if(categoryName=='ASTERISK'){			
			var user;
			var secret;
			var asterisk_server_address;
			
			for(token=1; token<tempCategoryArray.length; token++){
		
				// array with permit actions
				if(tempCategoryArray[token].indexOf("user") != -1){
					var userStr = tempCategoryArray[token];
					asterisk_user = userStr.split("=")[1];
				}
				// array with deny actions
				else if(tempCategoryArray[token].indexOf("pass") != -1){
					var astPassStr = tempCategoryArray[token];
					asterisk_pass = astPassStr.split("=")[1];
				}
				// array with users
				else if(tempCategoryArray[token].indexOf("host") != -1){
					var astAddrStr = tempCategoryArray[token];
					asterisk_host = astAddrStr.split("=")[1];
				}
			}
		}
	}
}

// initialize parameters for connection with asterisk server
initAsteriskParameters();

// Profiler object
var profiler = new proReq.Profiler();
if(DEBUG) console.log("Profiler object created");

// Data collector object for execute queries
var dataCollector = new dataReq.DataCollector();
if(DEBUG) console.log("DataCollector object created");

// Authenticator object
var authenticator = new authReq.Authenticator();
if(DEBUG) console.log("Authenticator object created");


/******************************************************
 * This is the section relative to asterisk interaction    
 */
am = new ast.AsteriskManager({user: asterisk_user, password: asterisk_pass, host: asterisk_host});

am.addListener('serverconnect', function() {
	am.login(function () {
		if(DEBUG) sys.debug("Logged in to Asterisk Manager.");
	});
});

am.addListener('serverdisconnect', function(had_error) {
	if(DEBUG) sys.puts("CLIENT: Disconnected! had_error == " + (had_error ? "true" : "false"));
});

am.addListener('servererror', function(err) {
	if(DEBUG) sys.puts("CLIENT: Error: " + err);
});

am.addListener('agentcalled', function(fromid, fromname, queue, destchannel) {
	if(DEBUG) sys.debug("AgentCalled: from [" + fromid + " : " + fromname + "] to queue " + queue + " and to -> " + destchannel);
	
	var start = destchannel.indexOf("/")+1;
	var end = destchannel.indexOf("@");
	var to = destchannel.substring(start, end);
	
	if(to!=undefined && clients[to]!=undefined){

        var msg = "Call incoming from [" + fromid + " : " + fromname + "] to queue " + queue + " and to " + to;	
		var c = clients[to];
		var response = new ResponseMessage(c.sessionId, "dialing", msg);
		response.from = fromid;
       	response.to = to;
		if(dataCollector.testUserPermitPhonebook(to)){
	    	// the user has the authorization of view customer card 
	    	if(DEBUG) console.log("The user " + to + " has the permit of view customer card of [" + fromid + " : " + fromname + "]");
	    	
			response.notificationURL = NOTIFICATION_URL_PHONEBOOK;
			
	        dataCollector.getCustomerCard(to, fromid, function(phonebook){
	        
	        	var custCardHTML = createCustomerCardHTML(customerCard[0], from.number);
  				response.customerCard = custCardHTML;
  				c.send(response);
				if(DEBUG) console.log("Notify of calling has been sent to client " + to.number);
            });
		}
	    else{
        	// the user hasn't the authorization of view customer card
        	if(DEBUG) console.log("The user " + to + " hasn't the permit of view customer card");
          	response.notificationURL = NOTIFICATION_URL_NORMAL;
          	response.customerCard = "<p>" + to + "hasn't the permit of view customer card !</p>";
            c.send(response);
            if(DEBUG) console.log("Notify of calling has been sent to client " + to);
       	}
	}
});

am.addListener('dialing', function(from, to) {

	/* check if the call come from queue: in this case, from and to are equal.
	 * So, the queue call is managed by 'agentcalled' event.
	 */
	var inde = from.number.indexOf("@");
	if(inde!=-1){
		// deeper inspection
//		var tempFrom = from.number.substring(0,inde);
//		if(tempFrom==to.number)
			return;
	}

	if(DEBUG) sys.debug("Dial: " + sys.inspect(from) + " -> "+ sys.inspect(to));
	
	
	if(to!=undefined && clients[to.number]!=undefined){
	
		var msg = "Call incoming from " + from.number + " to " + to.number;
		var c = clients[to.number];
		/* in this response the html is not passed, because the chrome desktop 
         * notification of the client accept only one absolute or relative url. */
		var response = new ResponseMessage(c.sessionId, "dialing", msg);
		response.from = from.number;
		response.to = to.number;
			
		if(dataCollector.testUserPermitPhonebook(to.number)){
    		// the user has the authorization of view customer card	
    		if(DEBUG) console.log("The user " + to.number + " has the permit of view customer card of " + from.number);
    			
    		response.notificationURL = NOTIFICATION_URL_PHONEBOOK;
    		
    		dataCollector.getCustomerCard(to.number, from.number, function(customerCard){

  				var custCardHTML = createCustomerCardHTML(customerCard[0], from.number);
  				response.customerCard = custCardHTML;
  				c.send(response);
				if(DEBUG) console.log("Notify of calling has been sent to client " + to.number);
  			});
    	}
    	else{
		   	// the user hasn't the authorization of view customer card
		   	if(DEBUG) console.log("The user " + to + " hasn't the permit of view customer card");
		   	response.notificationURL = NOTIFICATION_URL_NORMAL;
		   	response.customerCard = "<p>" + to + "hasn't the permit of view customer card !</p>";
		   	c.send(response);
			if(DEBUG) console.log("Notify of calling has been sent to client " + to.number);
    	}
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
		if(DEBUG) console.log("Notify of connected calling has been sent to " + from.number);
	}
	if(clients[to.number]!=undefined){
		var c = clients[to.number];
		var msg = "Call from " + from.number + " to " + to.number + " CONNECTED";
		var response = new ResponseMessage(c.sessionId, "callconnected", msg);
		response.from = from.number;
		response.to = to.number;
		c.send(response);
		if(DEBUG) console.log("Notify of connected calling has been sent to " + to.number);
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
	var other = am.getParticipant(participant['with']);
	if(DEBUG) sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has hung up. Reason: " + code + "  ( Code: " + text + ")");
	
	var ext = participant.number;
	if(clients[ext]!=undefined){
		var c = clients[ext];
		var msg = "Call has hung up. Reason: " + text + "  (Code: " + code + ")";
		var response = new ResponseMessage(c.sessionId, "hangup", msg);
		c.send(response);
		if(DEBUG) console.log("Notify of hangup has been sent to " + ext);
	}
	
	
	
	// it is needed for manage hangup
	delete am.participants[participant['with']];
});

am.addListener('callreport', function(report) {
	if(DEBUG) sys.puts("CLIENT: Call report: " + sys.inspect(report));
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

server.listen(8080);
if(DEBUG) sys.debug("Listening on port 8080");


var io = io.listen(server);


/*******************************************************************************
 * MESSAGES
 *******************************************************************************/

 
io.on('connection', function(client){

	// send acknowledgment of established connection 
	client.send(new ResponseMessage(client.sessionId, "connected", "[DEBUG] client " + client.sessionId + " connected"));
	if(DEBUG) console.log("aknowledgment to connection has been sent to the client: " + client.sessionId);


	client.on('message', function(message){

		// all received message have the information of exten from and the information about the action
  		var extFrom = message.extFrom;
  		var action = message.action;
  		
  		var ACTION_LOGIN = "login";
  		var ACTION_CALLOUT = "call_out_from_client";
  		var ACTION_LOGOUT = "logout";
  		var ACTION_HANGUP = "hangup";
  		var ACTION_SEARCH_CONTACT_PHONEBOOK = "search_contact_phonebook";
  		var ACTION_REDIRECT = "redirect";
  		var ACTION_RECORD = "record";
  		var ACTION_STOP_RECORD = "stoprecord";
  		
  		// manage request
  		switch(action){
  			case ACTION_LOGIN:
	  		
	  			if(DEBUG) console.log("received login request from exten [" + extFrom + "] with secret [" + message.secret + "]");
  	
	  			if(authenticator.authenticateUser(extFrom, message.secret)){
  				
					// check if the user sessionId is already logged in
  					if(testAlreadyLoggedUser(client.sessionId, extFrom)){
  						if(DEBUG) console.log("client with sessionId = " + client.sessionId + " is already logged in as " + extFrom);
  						if(DEBUG) console.log("clients length = " + Object.keys(clients).length);
				    	client.send(new ResponseMessage(client.sessionId, "already_logged_in", "You are already logged in !"));
  						return;
  					}
  				
  					// check if the user sessionId is already logged in
  					if(testAlreadyLoggedSessionId(client.sessionId)){
  						if(DEBUG) console.log("client with sessionId = " + client.sessionId + " is already logged in");
  						if(DEBUG) console.log("clients length = " + Object.keys(clients).length);
				    	client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, but you are already logged in !"));
  						return;
  					}
  					// check if the user extFrom is already logged in
  					if(testAlreadyLoggedExten(extFrom)){
  						if(DEBUG) console.log("Client [" + extFrom + "] already logged in !");
				    	if(DEBUG) console.log("clients length = " + Object.keys(clients).length);
				    	client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, but the client [" + extFrom + "] is already logged in"));
  					}
  					// authenticate the user
  					else{
		  				client.extension = extFrom;
		  				clients[extFrom] = client;  
			  			if(DEBUG) console.log("client [" + extFrom + "] logged in");
			  			if(DEBUG) console.log("clients length  = " + Object.keys(clients).length);
			  			var respMsg = new ResponseMessage(client.sessionId, "ack_login", "Login succesfully");
			  			respMsg.ext = extFrom;
			  			respMsg.secret = message.secret;
		  				client.send(respMsg);
		  				if(DEBUG) console.log("Acknowledgment to login action has been sent to [" + extFrom + "] with: " + client.sessionId);
  					}
  				}
  				else{
  					if(DEBUG) console.log("Authentication failed: [" + extFrom + "] with secret [" + message.secret + "]");
  					client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, authentication failed !"));
  				}
	  			
	  		break;
	  		case ACTION_CALLOUT:
	  			
	  			// in this case the message has also the information about the exten to call
  				var extToCall = message.extToCall;
	  			if(DEBUG) console.log("received request for call_out_from_client: " + extFrom + " -> " + extToCall);		
  				
  				// check if the client is logged in
	  			if(clients[extFrom]==undefined){
	  				if(DEBUG) sys.debug("ERROR: client " + extFrom + " not logged in");
	  				client.send(new ResponseMessage(client.sessionId, 'error_call', 'Error in calling: client not logged in'));
	  				return;
  				}
	  			// security check of real authenticity of the user who originated the call
	  			else if(client.sessionId != clients[extFrom].sessionId){
	  				if(DEBUG) console.log("Security ERROR: attempt to fake the sender: session " + client.sessionId + " attempt to call with the fake exten " + extFrom + " !");
	  				client.send(new ResponseMessage(client.sessionId, 'error_call', 'Error in calling: attempt to call with the fake exten ' + extFrom));
	  				return;
	  			}
	  			/* this try catch is for profiler.testPermitActionUser
	  			 * If the user isn't present in configuration file, an exception is thrown */
	  			try{
	  				// check if the user has the permit of dial out
	  				if(profiler.testPermitActionUser(extFrom, "call_out")){
	  			
	  					if(DEBUG) console.log("[" + extFrom + "] enabled to calling out: execute calling...");
	  				
		  				// create call action for asterisk server
		  				var actionCall = {
							Action: 'Originate',
							Channel: 'SIP/' + extFrom,
							Exten: extToCall,
							Context: 'from-internal',
							Priority: 1,
							Callerid: 'CTI' + extToCall,
							Account: extToCall,
							Timeout: 30000
						};
						// send action to asterisk
						am.send(actionCall, function () {
							if(DEBUG) console.log("call action has been sent to asterisk: " + extFrom + " -> " + extToCall);
						});
		  			}
	  				else{
			  			if(DEBUG) console.log("ATTENTION: " + extFrom + " is not enabled to calling out !");
			  			client.send(new ResponseMessage(client.sessionId, 'error_call', "Sorry, but you don't have permission to call !"));
	  				}
		  		} catch(error){
		  			if(DEBUG) console.log(error);
		  		}
		  	break;
		  	case ACTION_HANGUP:
	  		
	  			if(DEBUG) console.log("received hangup request from exten [" + extFrom + "]");
	  			
	  			// retrieve the id of the client who has request the hangup
	  			var id;
	  			for(key in am.participants){
	  				if(am.participants[key].number==extFrom){
	  					id = key;
	  					break;
	  				}
	  			}
	  			
	  			// create hangup action for asterisk server
		  		var actionCall = {
					Action: 'Hangup',
					Channel: id
				};
				// send action to asterisk
				am.send(actionCall, function () {
					if(DEBUG) console.log("hangup action from " + extFrom + " [" + id + "] has been sent to asterisk: ");
				});
	  		break;
	  		case ACTION_LOGOUT:
	  			removeClient(client.sessionId);
		  		if(DEBUG) console.log("Client " + client.sessionId + " logged out");
		  		if(DEBUG) console.log("clients length = " + Object.keys(clients).length);
		  		client.send(new ResponseMessage(client.sessionId, "ack_logout", "logout has been succesfully"));
		  		if(DEBUG) console.log("acknowlwdge of logout has been sent to the client");
	  		break;
	  		case ACTION_REDIRECT:
	  			
	  			if(DEBUG) console.log("received redirect action from " + message.redirectFrom + " to " + message.redirectTo);
	  			
	  			// check if the user has the permit of dial out
	  			if(profiler.testPermitActionUser(extFrom, "redirect")){
	  			
	  				if(DEBUG) console.log("[" + extFrom + "] enabled to redirect: execute redirecting...");
	  				
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
						if(DEBUG) console.log("redirect action from " + message.redirectFrom + " to " + message.redirectTo + " has been sent to asterisk");
						client.send(new ResponseMessage(client.sessionId, 'ack_redirect'), 'Redirection has been taken');
					});
		  		}
	  			else{
			  		if(DEBUG) console.log("ATTENTION: " + extFrom + " is not enabled to redirect !");
			  		client.send(new ResponseMessage(client.sessionId, "error_redirect", "Sorry: you don't have permission to redirect !"));
	  			}
	  		break;
	  		case ACTION_SEARCH_CONTACT_PHONEBOOK:
		
	  			// check if the user has the permit to search contact in phonebook
	  			var res = dataCollector.testPermitUserSearchAddressPhonebook(extFrom);
	  			if(res){
	  				// execute query to search contact in phonebook
	  				var namex = message.namex;
	  				dataCollector.searchContactsPhonebook(extFrom, namex, function(results){
	  					
	  					var mess = new ResponseMessage(client.sessionId, "search_contacts_results", "received phonebook contacts");
	  					mess.results = results;
	  					client.send(mess);
	  					if(DEBUG) console.log("Results of searching contacts in phonebook has been sent to client");
	  				});
	  			}
	  			else{
	  				if(DEBUG) console.log("ATTENTION: " + extFrom + " is not enabled to search contacts in phonebook !");
  					client.send(new ResponseMessage(client.sessionId, "error_search_contacts", "Sorry: you don't have permission to search contacts in phonebook !"));
	  			}
	  		break;
	  		case ACTION_RECORD:
	  			
	  			if(DEBUG) console.log("received record request from " + extFrom);
	  			
	  			// check if the user has the permit of dial out
	  			if(profiler.testPermitActionUser(extFrom, "record")){
	  			
	  				var channel = '';
	  				for(key in am.participants){
	  					if(am.participants[key].number==extFrom){
	  						channel = key;
	  					}
	  				}
	  				
	  				var timestamp = new Date().getTime();
	  				var filename = 'from_' + message.callFromExt + '_to_' + message.callToExt + "_" + timestamp; 

	  			
	  				// create record action for asterisk server
			  		var actionRecord = {
						Action: 'Monitor',
						Channel: channel,
						File: filename,
						Mix: 1
					};
					// send action to asterisk
					am.send(actionRecord, function () {
						if(DEBUG) console.log("record action from " + extFrom + " has been sent to asterisk");
						var msgstr = 'Recording of call ' + filename + ' started...';
						client.send(new ResponseMessage(client.sessionId, 'ack_record', msgstr));
						if(DEBUG) console.log(msgstr);
					});
				}
				else{
			  		if(DEBUG) console.log("ATTENTION: " + extFrom + " is not enabled to record !");
			  		client.send(new ResponseMessage(client.sessionId, "error_record", "Sorry: you don't have permission to record call !"));
	  			}	
	  		break;
	  		case ACTION_STOP_RECORD:
	  		
	  			if(DEBUG) console.log("received stop record request from " + extFrom);
  			
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
					if(DEBUG) console.log("stop record action from " + extFrom + " has been sent to asterisk");
					var msgstr = 'Recording for ' + extFrom + ' stopped';
					client.send(new ResponseMessage(client.sessionId, 'ack_stoprecord', msgstr));
					if(DEBUG) console.log(msgstr);
				});
	  		break;
	  		default:
	  			if(DEBUG) console.log("ATTENTION: action '" + action + "'not provided");
	  		break;
	  		
	  	}
  	});

  	client.on('disconnect', function(){
  		removeClient(client.sessionId);
  		if(DEBUG) console.log("Client " + client.sessionId + " disconnected");
  		if(DEBUG) console.log("clients length = " + Object.keys(clients).length);
  	});
});

am.connect();


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
 * 
 */
createCustomerCardHTML = function(customerCard, from){

	var dynamicHtml = '';

	/* customerCard is undefined if the user that has do the request
  	 * hasn't the relative permission */
	if(customerCard!=undefined){

		dynamicHtml += '<div>';
		dynamicHtml = '<br/><h3>' + customerCard.name + '</h3><br/>';
		dynamicHtml += '<table>';
	    for(var key in customerCard){
		
			dynamicHtml += '<tr>';
		
	    	if(key=='workphone'){
		        var call = "callExt(" + customerCard[key] + ");";
		        dynamicHtml += '<td>' + key + ':</td>';
		        dynamicHtml += '<td><a href="#" onclick=' + call + '>' + customerCard[key] + '</a></td>';
	    	}
		    else{
			    dynamicHtml += '<td>' + key + ':</td>';
			    dynamicHtml += '<td>' + customerCard[key] + '</td>';
		    }
		    
		    dynamicHtml += '</tr>';
		}
	
		dynamicHtml += '</table>';
		dynamicHtml += '</div>';
	}
	else{
		dynamicHtml += '<div>';
		dynamicHtml += '<br/><h3>' + from + '</h3><br/>';
		dynamicHtml += '<p>Sorry, no data in the database</p>';
		dynamicHtml += '</div>';
	}

	
	return dynamicHtml;
}


process.on('uncaughtException', function(err){
	if(DEBUG) console.log('*********************************************');
	if(DEBUG) console.log('Caught not provided exception: ' + err);
	if(DEBUG) console.log('*********************************************');
});



