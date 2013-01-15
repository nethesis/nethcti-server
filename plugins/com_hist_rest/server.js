// require restify and bodyParser to read Backbone.js syncs
var util = require('util');
var restify = require('restify');
var server = restify.createServer();
var plugin_dir = './plugins/com_hist_rest/plugins';
var plugins = require('jsplugs')().require(plugin_dir);
var api = { 'get': [], 'post': [], 'head' : []};
var PORT = 9002;

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// load plugins
for (var p in plugins) {
    var root = plugins[p].api['root'];
    var get = plugins[p].api['get'];
    var post = plugins[p].api['post'];
    var k;
    for (k in get) {
	console.log('Binding GET: /' + root + '/' + get[k]);
	server.get('/' + root + '/' + get[k], execute);
    }
    for (k in post) {
	console.log('Binding POST: /' + root + '/' + post[k]);
	server.post('/' + root + '/' + post[k], execute);
    }
}

function execute(req, res, next) {
    var tmp = req.url.split('/');
    var p = tmp[1];
    var name = tmp[2]; 
    console.log('Execute: %s.%s(%s)', p , name, util.inspect(req.params, true));
    plugins[p][name].apply( plugins[p], [req, res, next]);
    return next();
}

server.listen(PORT, function () {
    console.log('%s listening at %s', server.name, server.url);
});
