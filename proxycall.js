//var sys = require('sys'), 
var ast = require('./asterisk'),
    net = require('net');

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('./lib/socket.io')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;

var clients = [];
var am;
var asterisk_user = 'vtiger';
var asterisk_pass = 'vtiger';
var asterisk_host = 'amaduzzi';


var ResponseMessage = function(clientSessionId, respMessage){
	this.clientSessionId = clientSessionId;
	this.respMessage = respMessage;
}

var dataReq = require("./dataCollector.js");
var proReq = require("./profiler.js");
var authReq = require("./authenticator.js");

var profiler = new proReq.Profiler();
console.log("Profiler object created");

var dataCollector = new dataReq.DataCollector();
console.log("DataCollector object created");

var authenticator = new authReq.Authenticator();
console.log("Authenticator object created");




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
	console.log("\n\n");
	console.log("from");
	console.log(from);
	console.log("\n\n");
	console.log("to");
	console.log(to);
	console.log("\n\n");
	sys.debug("Dial: " + sys.inspect(from) + " -> "+ sys.inspect(to));
	/* from=
	{ 	name: 'SIP/501',
  		number: '501',
  		with: '1298027889.93' 
  	}
  		
  		to = { name: '', number: '500', with: '1298027890.94' 
  	}
  */
  
  	//console.log(clients);
	//server.notify(to.number,from.number);
	if(to!=undefined){
	    clients.forEach(function(c) {
	    	console.log("\n");
	    	console.log(c.extension);
	    	console.log("\n");
	        sys.debug(to.number + " vs " + c.extension);
	        if(c.extension == to.number)
	        {
	            var msg = "Call from " + from.number + " to " + to.number;
	            c.send(new ResponseMessage(c.sessionId, msg));
	            console.log("Notify of calling has been sent to " + to.number);
	        }
	   	});
	}
});

am.addListener('callconnected', function(from, to) {
	//sys.puts("CLIENT: Connected call between " + from.number + " (" + from.name + ") and " + to.number + " (" + to.name + ")");
});

am.addListener('calldisconnected', function(from, to) {
	//sys.puts("CLIENT: Disconnected call between " + from.number + " (" + from.name + ") and " + to.number + " (" + to.name + ")");
});

am.addListener('hold', function(participant) {
	//var other = am.getParticipant(participant['with']);
	//sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has put " + other.number + " (" + other.name + ") on hold");
});

am.addListener('unhold', function(participant) {
	//var other = am.getParticipant(participant['with']);
	//sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has taken " + other.number + " (" + other.name + ") off hold");
});

am.addListener('hangup', function(participant, code, text) {
	var other = am.getParticipant(participant['with']);
	sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has hung up. Reason: " + code + " (" + text + ")");

	console.log("participant");
	console.log(participant);
	console.log("code");
	console.log(code);
	console.log("text");
	console.log(text);
	
});

am.addListener('callreport', function(report) {
	//sys.puts("CLIENT: Call report: " + sys.inspect(report));
});




server = http.createServer(function(req, res){
  
  var path = url.parse(req.url).pathname;
  sys.debug(path);
  
  switch (path){
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

    case '/indexcall.html':
    case '/':
      path = "/indexcall.html";
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data, 'utf8');
        res.end();
      });
    break;
   
    default: send404(res);
  }
}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8080);

sys.debug("Listening on port 8080");

var io = io.listen(server)
  , buffer = [];

io.on('connection', function(client){

	// send acknowledgment of established connection 
	client.send(new ResponseMessage(client.sessionId, "connected"));
	console.log("aknowledgment to connection has been sent");

	//
	client.on('message', function(message){

  		var extFrom = message.extFrom;
  		var action = message.action;
  		
  		// manage call_out_from_client
  		if(action=="call_out_from_client"){
  			
  			var extToCall = message.extToCall;
  			console.log("received request for call_out_from_client: " + extFrom + " -> " + extToCall);		
  			
  			// check if the user has permit of dial out
  			if(profiler.testPermitActionUser(extFrom, "call_out")){
  			
  				console.log("[" + extFrom + "] enabled to calling out: execute calling...");
  				
  				// create call action for asterisk server
  				var actionCall = {
					action: 'originate',
					channel: 'SIP/' + extFrom,
					exten: extToCall,
					context: 'from-internal',
					priority: 1,
					callerid: 'CTI' + extToCall,
					account: extToCall,
					timeout: 30000
				};
				// send action to asterisk
				am.send(actionCall, function () {
					console.log("call action has been sent to asterisk: " + extFrom + " -> " + extToCall);
				});
  			}
  			else{
	  			console.log("ATTENTION: " + extFrom + " is not enabled to calling out !");
	  			client.send(new ResponseMessage(client.sessionId, "Sorry: you don't have permission to call !"));
  			}
  		}
  		// manage request of new client connection
  		else if(action=="login"){
  		
  			console.log("received login request from exten [" + extFrom + "] with secret [" + message.secret + "]");
  	
  			
  			if(authenticator.authenticateUser(extFrom, message.secret)){
  			
  				// check if the user is already logged in
	  			if(!testAlreadyLoggedUser(extFrom)){
	  			
	  				clients.push(client);
		  			console.log("client [" + extFrom + "] logged in");
		  			console.log("clients length  = " + clients.length);
	  			
	  				client.extension = extFrom;
	  				client.send(new ResponseMessage(client.sessionId, "login succesfully"));
	  				console.log("Acknowledgment to login action has been sent to [" + extFrom + "]");
			    }
			    else{
			    	console.log("Client [" + extFrom + "] already logged in !");
			    	console.log("clients length = " + clients.length);
			    	client.send(new ResponseMessage(client.sessionId, "Sorry, but client [" + extFrom + "] is 	already logged in"));
		    	}
  			}
  			else{
  				console.log("Authentication failed: [" + extFrom + "] with secret [" + message.secret + "]");
  				client.send(new ResponseMessage(client.sessionId, "Sorry, authentication failed !"));
  			}

  			
  			
  		}
  		
		
	    
    	
  	});

  	client.on('disconnect', function(){
  		removeClient(client.sessionId);
  		console.log("Client " + client.sessionId + " disconnected");
  		console.log("clients length = " + clients.length);
  	});
  	
  
});

am.connect();


/*
 * Remove client with specified sessionId
 */ 
removeClient = function(sessionId){
	for(i=0; i<clients.length; i++){
		if(clients[i].sessionId==sessionId){
			console.log("Removed client " + sessionId + " from registered client list");
			clients.splice(i, 1);
			return;
		}
	}
}


testAlreadyLoggedUser = function(exten){
	for(i=0; i<clients.length; i++){
		var currClient = clients[i];
		if(currClient.extension==exten)
			return true;
	}
	return false;
}
