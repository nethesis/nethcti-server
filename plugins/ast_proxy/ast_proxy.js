var iniparser = require('iniparser');
var ast       = require('./node-asterisk/asterisk');

module.exports = function (options, imports, register) {
    start(options);
    register();
}

function start(options) {
    try {
        setInterval(function(){console.log("ale");}, 1000);

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
            user:       ini.ASTERISK.user,
            password:   ini.ASTERISK.pass
            //password:   'a'
        };
        var am = new ast.AsteriskManager(config);
        console.log('initialized asterisk manager');

        // add event listeners to asterisk manager
        am.addListener('servererror',       astServerError);
        am.addListener('serverconnect',     astServerConnect);
        console.log('added event listeners to asterisk manager');

        // js asterisk server error
        function astServerError(err) {
            console.log(err.stack);
        }

        // connection with asterisk has been made
        function astServerConnect() {
            console.log("asterisk connected");
            // do asterisk login
            am.login(function (resp) {
                console.log("login");
            });
        }

        // connect to asterisk
        try {
            am.connect();
        } catch (err) {
            console.log(err);
        }

    } catch (err) {
        console.log(err.stack);
    }
}
