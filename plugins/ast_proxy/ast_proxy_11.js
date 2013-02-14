var ast          = require('asterisk-ami');
var action       = require('./action_11');
var iniparser    = require('iniparser');
var EventEmitter = require('events').EventEmitter;

var am;       // asterisk manage
var map = {}; // key: ActionID, value: cb
var emitter = new EventEmitter();

exports.on = on;
exports.start = start;
exports.astVersion = astVersion;
exports.listSipPeers = listSipPeers;

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
        var actionid = data.actionid;
        var act = action.getActionName(actionid);

        // check callback presence
        if (map[actionid] && typeof map[actionid] === 'function' ) {
            
            // check action type
            if (act === action.actionName.astVersion) {
                map[actionid](data.asteriskversion);

            } else {
                map[actionid](data);
            }
        }

        // remove map association ActionId-callback
        if (map[actionid]) {
            delete map[actionid];
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

// add map association ActionId-callback
function addMapAssoc(id, cb) {
    try {
        if (cb && typeof cb === 'function') { map[id] = cb; }
    } catch (err) {
        console.log(err.stack);
    }
}

// send action to know asterisk version
function astVersion(cb) {
    try {
        var act = action.astVersion();
        addMapAssoc(act.ActionId, cb);
        am.send(act);
    } catch (err) {
        console.log(err.stack);
    }
}

// send action to get all sip peers
function listSipPeers(cb) {
    try {
        var act = action.listSipPeers();
        addMapAssoc(act.ActionId, cb);
        am.send(act);
    } catch (err) {
        console.log(err.stack);
    }
}
