// It is the asterisk proxy
var ast          = require('asterisk-ami');
var action       = require('./action');
var pluginsCmd   = require('jsplugs')().require('./plugins/ast_proxy/plugins_command_11');
var iniparser    = require('iniparser');
var EventEmitter = require('events').EventEmitter;

var am;       // asterisk manage
var map = {}; // key: ActionID, value: cb
var emitter = new EventEmitter();

function start(options) {
    try {

        // read configuration file
        try {
            // check arguments
            if (!options.iniPath) {
                options.iniPath = '/etc/nethcti/asterisk.ini';
                console.log('set default ini path to ' + options.iniPath);
            }
            var ini = iniparser.parseSync(options.iniPath);
        } catch (err) {
            console.log(err.stack);
            return;
        }

        // initialize asterisk manager
        var config = {
            host:       ini.ASTERISK.host,
            port:       ini.ASTERISK.port,
            username:   ini.ASTERISK.user,
            password:   ini.ASTERISK.pass
        };
        am = new ast(config);
        console.log('initialized asterisk manager');

        // add event listeners to asterisk manager
        am.on('ami_data', onData);
        console.log('added event listeners to asterisk manager');

        // connect to asterisk
        try {
            am.connect(function () {
                console.log('asterisk connected');
            });
        } catch (err) {
            console.log(err);
        }

    } catch (err) {
        console.log(err.stack);
    }
}

// receive response or event from asterisk
function onData(data) {
    try {
        // get ActionId and action name
        var actionid = data.actionid;
        var cmd = action.getActionName(actionid); // may be undefined

        // check command plugin presence
        if (pluginsCmd[cmd]) {
            pluginsCmd[cmd].data(data);
        }

    } catch (err) {
        console.log(err.stack);
    }
}

// register new event listener
function on(event, listener) {
    try { emitter.on(event, listener); }
    catch (err) { console.log(err.stack); }
}

// request data from asterisk
function get(obj, cb) {
    try {
        if (pluginsCmd[obj.command]) {
            pluginsCmd[obj.command].execute(am, obj, cb);
        } else {
            console.log('no plugin for command ' + obj.command);
        }
    } catch (err) {
        console.log(err.stack);
    }
}

// exports methods
exports.on = on;
exports.start = start;
exports.get = get;
