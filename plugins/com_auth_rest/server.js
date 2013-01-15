// require restify and bodyParser to read Backbone.js syncs
var util = require('util');
var restify = require('restify'); 

console.log("APRTO");

var server = restify.createServer();
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

function errorLogger(req, res, next) {
  var send = res.send;
  res.send = function(body){
    res.send = send;
    res.send(body);
    if (body instanceof Error) {
      console.log('SENT ERROR: ')
      console.dir(body.toString());
    }
  };

  next();
};

server.use(errorLogger);

//var plugin_dir = './plugins';
var plugin_dir = './plugins/com_auth_rest/plugins';
var plugins = require('jsplugs')().require(plugin_dir);
var routes = { 'get': [], 'post': [], 'head' : []};

/*
function generateToken() {
    require('crypto').randomBytes(48, function(ex, buf) {
          var token = buf.toString('hex');
          console.log("token = " + token);
    });
}
*/

// load plugin
for (var p in plugins) {
    console.log("p");
    console.log(p);
    console.log("plugins[p]");
    console.log(plugins[p]);
    var root = plugins[p].routes['root'];
    var get = plugins[p].routes['get'];
    var post = plugins[p].routes['post'];
    for (var k in get)
    {
       console.log("Binding GET: /"+root+"/"+get[k]);
       server.get("/"+root+"/"+get[k], execute);
    }
    for (var k in post)
    {
       console.log("Binding POST: /"+root+"/"+post[k]);
       server.post("/"+root+"/"+post[k], execute);
    }
}

function execute ( req, res, next ) {
    var tmp = req.url.split('/');
    var p = tmp[1];
    var name = tmp[2]; 
    console.log("Execute: %s.%s(%s)",p,name,util.inspect(req.params,true));
    // res.send(plugins[p][name].call( null, req.params ));
    plugins[p][name].apply( plugins[p], [req, res, next]);
    //res.send(plugins[p].search(req.params));
    return next();
}

server.listen(9001, function() {
  console.log('%s listening at %s', server.name, server.url);
});
