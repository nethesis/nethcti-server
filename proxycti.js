var ast = require('./asterisk'),
    net = require('net');
var normal = require("./lib/normal-template/lib/normal-template");
var dataReq = require("./dataCollector.js");
var proReq = require("./profiler.js");
var authReq = require("./authenticator.js");
var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('./lib/socket.io')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;
var pathreq = require('path');

/* The list of the logged clients. The key is the exten and the value is the 
 * object relative to the client. When the client logs off, the corresponding key 
 * and value are removed.
 */
var clients = {};
var am;
var asterisk_user = 'vtiger';
var asterisk_pass = 'vtiger';
var asterisk_host = 'amaduzzi';
var pathOfPhonebookHTML = "phonebook.html";


// The response that this server pass to the clients.
var ResponseMessage = function(clientSessionId, typeMessage, respMessage){
	this.clientSessionId = clientSessionId;
	this.typeMessage = typeMessage;
	this.respMessage = respMessage;
}



// Profiler object
var profiler = new proReq.Profiler();
console.log("Profiler object created");

// Data collector object for execute queries
var dataCollector = new dataReq.DataCollector();
console.log("DataCollector object created");

// Authenticator object
var authenticator = new authReq.Authenticator();
console.log("Authenticator object created");


/******************************************************
 * This is the section relative to asterisk interaction    
 */
am = new ast.AsteriskManager({user: asterisk_user, password: asterisk_pass, host: asterisk_host});

am.addListener('serverconnect', function() {
	am.login(function () {
		sys.debug("Logged in to Asterisk Manager.");
	});
});

am.addListener('serverdisconnect', function(had_error) {
	sys.puts("CLIENT: Disconnected! had_error == " + (had_error ? "true" : "false"));
});

am.addListener('servererror', function(err) {
	sys.puts("CLIENT: Error: " + err);
});

am.addListener('dialing', function(from, to) {

    buffer = [];
	sys.debug("Dial: " + sys.inspect(from) + " -> "+ sys.inspect(to));
	
	/* ex. 	from = {name: 'SIP/501', number: '501', with: '1298027889.93'}
  			to = { name: '', number: '500', with: '1298027890.94' } */

	if(to!=undefined && clients[to.number]!=undefined){
		
		var msg = "Call from " + from.number + " to " + to.number;
		var c = clients[to.number];
		/* in this response the html is not passed, because the chrome desktop 
         * notification of the client accept only one absolute or relative url. */
		var response = new ResponseMessage(c.sessionId, "dialing", msg);
		response.from = from.number;
		response.to = to.number;
		c.send(response);
		console.log("Notify of calling has been sent to " + to.number);
	}
});

am.addListener('callconnected', function(from, to) {
	sys.puts("CLIENT: Connected call between " + from.number + " (" + from.name + ") and " + to.number + " (" + to.name + ")");
	
	
	//new
	
	if(clients[from.number]!=undefined){
		var c = clients[from.number];
		var msg = "Call from " + from.number + " to " + to.number + " CONNECTED";
		var response = new ResponseMessage(c.sessionId, "callconnected", msg);
		response.from = from.number;
		response.to = to.number;
		c.send(response);
		console.log("Notify of connected calling has been sent to " + from.number);
	}
	if(clients[to.number]!=undefined){
		var c = clients[to.number];
		var msg = "Call from " + from.number + " to " + to.number + " CONNECTED";
		var response = new ResponseMessage(c.sessionId, "callconnected", msg);
		response.from = from.number;
		response.to = to.number;
		c.send(response);
		console.log("Notify of connected calling has been sent to " + to.number);
	}
	
	
	//new
	
});

am.addListener('calldisconnected', function(from, to) {
	
	sys.puts("CLIENT: Disconnected call between " + from.number + " (" + from.name + ") and " + to.number + " (" + to.name + ")");
});

am.addListener('hold', function(participant) {
	var other = am.getParticipant(participant['with']);
	sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has put " + other.number + " (" + other.name + ") on hold");
});

am.addListener('unhold', function(participant) {
	var other = am.getParticipant(participant['with']);
	sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has taken " + other.number + " (" + other.name + ") off hold");
});

am.addListener('hangup', function(participant, code, text) {
	var other = am.getParticipant(participant['with']);
	sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has hung up. Reason: " + code + "  ( Code: " + text + ")");
	
	var ext = participant.number;
	if(clients[ext]!=undefined){
		var c = clients[ext];
		var msg = "Call has hung up. Reason: " + text + "  (Code: " + code + ")";
		var response = new ResponseMessage(c.sessionId, "hangup", msg);
		c.send(response);
		console.log("Notify of hangup has been sent to " + ext);
	}
	
	
	
	// it is needed for manage hangup
	delete am.participants[participant['with']];
});

am.addListener('callreport', function(report) {
	sys.puts("CLIENT: Call report: " + sys.inspect(report));
});



/*
 * End of section relative to asterisk interaction
 *************************************************/





/*******************************************************************************
 * HTTP REQUEST
 *******************************************************************************/

//
server = http.createServer(function(req, res){
  
//	var path = url.parse(req.url).pathname;
  	var parsed_url = url.parse(req.url,true);
	var path = parsed_url.pathname;
	var params = parsed_url.query;
	
  switch (path){
  	
  	case '/getPhonebook.html':

  		console.log("received from [" + params.extenApplicant + "] phonebook request for exten [" + params.extenPhonebook + "]");
      
  		dataCollector.getPhonebook(params.extenApplicant, params.extenPhonebook, function(phonebook){
  	/*
  			console.log(",,,,,,,,,,,,,,,,,,;;");
  			console.log(phonebook);
  			console.log(",,,,,,,,,,,,,,,,,,;;");
  			*/
  	
	  		/* result is undefined if the user that has do the request
  		 	 * hasn't the relative permission */
			if(phonebook!=undefined){
				phonebook[0].exten = params.extenPhonebook;
		  		// phonebook = [ { name: 'giacomo', exten: '501' } ]
				var htmlPage = createPhonebookHTMLPage(phonebook);
	      		res.writeHead(200, {'Contet-Type': 'text/html'});
		      	res.write(htmlPage, 'utf8');
		      	res.end();
			}
			else{
				send404(res);
			}
  		});
  		break;
    case '/json.js':
    case '/lib/socket.io-client/socket.io.js':
      fs.readFile(__dirname + path, function(err, data){
        sys.debug(data.extension);
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': 'text/javascript'})
        res.write(data, 'utf8');
        res.end();
      });
     break;
    case '/index.html':
    case '/':
      path = "/index.html";
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data, 'utf8');
        res.end();
      });
    break;
    case '/getNotificationCalling.html':
    	/* The notification of the calling is personalized: if the user has
    	 * the authorization of view customer card, then he will receive the 
    	 * notification with the possibility of view customer card (for example
    	 * through a button or a link), otherwise he will receive only a simple
    	 * notification of the calling.
    	 */
    	var from = params.from;
    	var to = params.to;
    	
    	if(dataCollector.testUserPermitPhonebook(to)){
    		// the user has the authorization of view customer card
    		console.log("The user " + to + " has the permit of view customer card");
    		
    		path = "/templateNotificationCallingPhonebook.html";
    		
	      	fs.readFile(__dirname + path, function(err, data){
	        	if (err) return send404(res);
		        res.writeHead(200, {'Content-Type': 'text/html'});
		        res.write(data, 'utf8');
		        res.end();
		    });
    	}
    	else{
	    	// the user hasn't the authorization of view customer card
	    	console.log("The user " + to + " hasn't the permit of view customer card");
	    	path = "/templateNotificationCalling.html";
	      	fs.readFile(__dirname + path, function(err, data){
	        	if (err) return send404(res);
		        res.writeHead(200, {'Content-Type': 'text/html'});
		        res.write(data, 'utf8');
		        res.end();
		    });
    	}
    
	    //console.log(req.socket.remoteAddress+ " - ["+new Date().toString()+"] - \""+req.method+" "+req.url+" HTTP/"+req.httpVersion+"\" - \""+req.headers["user-agent"]+"\""); 
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
    	
  }
});



send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8080);
sys.debug("Listening on port 8080");


var io = io.listen(server)
  , buffer = [];


/*******************************************************************************
 * MESSAGES
 *******************************************************************************/
io.on('connection', function(client){

	// send acknowledgment of established connection 
	client.send(new ResponseMessage(client.sessionId, "connection", "connected"));
	console.log("aknowledgment to connection has been sent");


	client.on('message', function(message){

		// all received message have the information of exten from and the information about the action
  		var extFrom = message.extFrom;
  		var action = message.action;
  		
  		var actionLogin = "login";
  		var actionCallOut = "call_out_from_client";
  		var actionLogout = "logout";
  		var actionHangup = "hangup";
  		
  		// manage request of calling
  		if(action==actionCallOut){
  			
  			// in this case the message has also the information about the exten to call
  			var extToCall = message.extToCall;
  			console.log("received request for call_out_from_client: " + extFrom + " -> " + extToCall);		
  			
  			// check if the client is logged in
  			if(clients[extFrom]==undefined){
  				sys.debug("ERROR: client " + extFrom + " not logged in");
  				return;
  			}
  			// security check of real authenticity of the user who originated the call
  			else if(client.sessionId != clients[extFrom].sessionId){
  				console.log("Security ERROR: attempt to fake the sender: session " + client.sessionId + " attempt to call with the fake exten " + extFrom + " !");
  				return;
  			}
  			/* this try catch is for profiler.testPermitActionUser
  			 * If the user isn't present in configuration file, an exception is thrown */
  			try{
  				// check if the user has the permit of dial out
  				if(profiler.testPermitActionUser(extFrom, "call_out")){
  			
  					console.log("[" + extFrom + "] enabled to calling out: execute calling...");
  				
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
						console.log("call action has been sent to asterisk: " + extFrom + " -> " + extToCall);
					});
	  			}
  				else{
		  			console.log("ATTENTION: " + extFrom + " is not enabled to calling out !");
		  			client.send(new ResponseMessage(client.sessionId, actionCallOut, "Sorry: you don't have 	permission to call !"));
  				}
	  		} catch(error){
	  			console.log(error);
	  		}
  		}
  		// manage request of login
  		else if(action==actionLogin){
  		
  			console.log("received login request from exten [" + extFrom + "] with secret [" + message.secret + "]");
  	
  			if(authenticator.authenticateUser(extFrom, message.secret)){
  			
  				// check if the user sessionId is already logged in
  				if(testAlreadyLoggedSessionId(client.sessionId)){
  					console.log("client with sessionId = " + client.sessionId + " is already logged in");
  					console.log("clients length = " + Object.keys(clients).length);
			    	client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, but you are already logged in !"));
  					return;
  				}
  				// check if the user extFrom is already logged in
  				if(testAlreadyLoggedExten(extFrom)){
  					console.log("Client [" + extFrom + "] already logged in !");
			    	console.log("clients length = " + Object.keys(clients).length);
			    	client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, but the client [" + extFrom + "] is already logged in"));
  				}
  				// authenticate the user
  				else{
	  				client.extension = extFrom;
	  				clients[extFrom] = client;  
		  			console.log("client [" + extFrom + "] logged in");
		  			console.log("clients length  = " + Object.keys(clients).length);
	  				client.send(new ResponseMessage(client.sessionId, "ack_login", "login succesfully"));
	  				console.log("Acknowledgment to login action has been sent to [" + extFrom + "]");
  				}
  			}
  			else{
  				console.log("Authentication failed: [" + extFrom + "] with secret [" + message.secret + "]");
  				client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, authentication failed !"));
  			}
  		}
  		// manage disconnection from the user
  		else if(action==actionLogout){
  			removeClient(client.sessionId);
	  		console.log("Client " + client.sessionId + " disconnected");
	  		console.log("clients length = " + Object.keys(clients).length);
  		}
  		// manage request of hangup
  		else if(action==actionHangup){
  			console.log("received hangup request from exten [" + extFrom + "]");
  			
  			
  			/*
  			{ '1299146283.135': { name: '', number: '500', with: '1299146283.135' },
  '1299146287.136': { name: '', number: '501', with: '1299146287.136' } }
  			*/
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
				console.log("hangup action from " + extFrom + " [" + id + "] has been sent to asterisk: ");
			});
  			
  		}
  	});

  	client.on('disconnect', function(){
  		removeClient(client.sessionId);
  		console.log("Client " + client.sessionId + " disconnected");
  		console.log("clients length = " + Object.keys(clients).length);
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
 * Create the HTML page of customer card. This is created from template.
 * The parameter represents the response query executed in database.
 */
createPhonebookHTMLPage = function(phonebook){
	
	var content = fs.readFileSync(pathOfPhonebookHTML, 'utf8');
	template = normal.compile(content);


	var dynamicHtml = '';
	var other = '';
	for(var key in phonebook[0]){
		dynamicHtml += key + ': <a href="">' + phonebook[0][key] + '</a><br/>';
		other += key + ':  ' + phonebook[0][key] + '\n';
	}
	

	
	var data = {
		exten: phonebook[0].exten,
		name: phonebook[0].name,
		generateData: dynamicHtml,
		otherTest: other
	};
	
	var html = template(data);
	return html;
}


process.on('uncaughtException', function(err){
	console.log('*********************************************');
	console.log('Caught not provided exception: ' + err);
	console.log('*********************************************');
});



