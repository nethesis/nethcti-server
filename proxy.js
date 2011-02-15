var sys = require('sys'), 
    ast = require('./asterisk'),
    net = require('net');

var server;
var clients = [];
var am;

am = new ast.AsteriskManager({user: 'vtiger', password: 'vtiger', host: 'nethservice.nethesis.it'});

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
	sys.debug("Dial: " + sys.inspect(from) + " -> "+ sys.inspect(to));
    server.notify(to.number,from.number);
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



// ========== Server implementation =========
Array.prototype.remove = function(e) {
  for (var i = 0; i < this.length; i++) {
    if (e == this[i]) { return this.splice(i, 1); }
  }
};

function Client(stream) {
  this.extension = null;
  this.stream = stream;
}


server = net.createServer(function (stream) {
  var client = new Client(stream);
  clients.push(client);

  stream.setTimeout(0);
  stream.setEncoding("utf8");

  stream.addListener("connect", function () {
    stream.write("Extension: ");
  });

  stream.addListener("data", function (data) {
    if (client.extension == null) {
      client.extension = data.match(/\S+/);
      sys.debug("Extension "+client.extension+" registerd");
      return;
    }

    //var command = data.match(/^\/(.*)/);
    //if (command) {
    //  if (command[1] == 'users') {
    //    clients.forEach(function(c) {
    //      stream.write("- " + c.name + "\n");
    //    });
    //  }
    //  else if (command[1] == 'quit') {
    //    stream.end();
    //  }
    //  return;
    //}

    //clients.forEach(function(c) {
    //  if (c != client) {
    //    c.stream.write(client.name + ": " + data);
    //  }
    //});
  });

  stream.addListener("end", function() {
    clients.remove(client);
    sys.debug(client.extension + " has left.\n");
    stream.end();
  });

    this.notify = function(ext,caller) {
        sys.debug("Requested notify for "+ext+" from "+caller);
        clients.forEach(function(c) {
            if (ext == c.extension) {
                c.stream.write("Call from: " + caller);
            }
        });
    };

});

server.listen(8124, "0.0.0.0");
sys.debug("Listening on port 8124");

am.connect();
