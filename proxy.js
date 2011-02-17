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
var asterisk_host = 'nethservice.nethesis.it';


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
    //server.notify(to.number,from.number);
    clients.forEach(function(c) {
        sys.debug(to.number+" vs "+c.extension);
        if(c.extension == to.number)
        {
            var message = "Call from "+to.number+" to "+from.number;
            var msg = { message: [c.sessionId, message] };
            buffer.push(msg);
            if (buffer.length > 15) buffer.shift();
            sys.debug("Dial: notify "+c.sessionId);
            c.broadcast(msg);
        }
   });

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
	//var other = am.getParticipant(participant['with']);
	//sys.puts("CLIENT: " + participant.number + " (" + participant.name + ") has hung up. Reason: " + code + " (" + text + ")");
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
  clients.push(client);
  //client.send({ buffer: buffer });
  //client.broadcast({ announcement: client.sessionId + ' connected' });

  client.on('message', function(message){
    var msg = { message: [client.sessionId, message] };
    buffer.push(msg);
    if (buffer.length > 15) buffer.shift();
    sys.debug(msg.message[1]);
    client.extension = msg.message[1];
    client.broadcast(msg);
  });

  client.on('disconnect', function(){
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});


am.connect();
