/**
* The asterisk proxy module provides a standard interface to use with
* different version of asterisk server. It provides functions to execute
* actions and to receive events informations.
*
* @module ast_proxy
*/

/**
* Asterisk proxy with standard interface to use.
*
* @class ast_proxy
* @static
*/
var fs                = require('fs');
var ast               = require('asterisk-ami');
var action            = require('./action');
var iniparser         = require('iniparser');
var pluginsCmd        = require('jsplugs')().require('./plugins/ast_proxy/plugins_command_11');
var proxyLogic        = require('./proxy_logic_11');
var pluginsEvent      = require('jsplugs')().require('./plugins/ast_proxy/plugins_event_11');
var EventEmitter      = require('events').EventEmitter;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [ast_proxy]
*/
var IDLOG = '[ast_proxy]';

/**
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* It's this module.
*
* @property self
* @type {object}
* @private
*/
var self = this;

/**
* The asterisk manager.
*
* @property am
* @type {object}
* @private
*/
var am;

/**
* The event emitter.
*
* @property emitter
* @type object
* @private
*/
var emitter = new EventEmitter();

/**
* The asterisk connection parameters
*
* @property astConf
* @type object
* @private
*/
var astConf = {};

/**
* Sets the component's visitors.
*
* @method accept
* @private
*/
(function accept() {
    try {
        // set the visitor for proxy logic component passing
        // itself as a parameter
        proxyLogic.visit(self);

        // set the visitor for all event plugins
        var ev;
        for (ev in pluginsEvent) {
            if (typeof pluginsEvent[ev].visit === 'function') {
                pluginsEvent[ev].visit(self);
            }
        }
        logger.info(IDLOG, 'set the asterisk proxy visitors');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}());

/**
* Set configuration to use by telnet asterisk connection.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string|object} config The configuration to be used
* for the telnet asterisk connection
*   @param {string} config.path Path of the ini configuration file.
*   The file must contain host, port, user and password key-value pairs
*   into a single section called ASTERISK
*   @param {object} config.object The object with host, port user and password keys
*     @param {string} [config.object.host=localhost] The address of the asterisk server
*     @param {string|number} [config.object.port=5038] The port of the asterisk server
*     @param {string} config.object.user The username
*     @param {string} config.object.pass The password
*/
function config(config) {
    if (typeof config === 'string') {
        if (!fs.existsSync(config)) { throw new Error(config + ' not exists'); }
        var ini = iniparser.parseSync(config);
        astConf = {
            host:     ini.ASTERISK.host,
            port:     ini.ASTERISK.port,
            username: ini.ASTERISK.user,
            password: ini.ASTERISK.pass
        };

    } else if (typeof config === 'object'
               && config.user
               && config.pass) {

        if (!config.port) { config.port = '5038'; }
        if (!config.host) { config.host = 'localhost'; }

        astConf = {
            host:     config.host,
            port:     config.port,
            username: config.user,
            password: config.pass
        };

    } else {
        throw new TypeError('wrong parameters');
    }
    logger.info(IDLOG, 'successfully configured');
}

/**
* Start the telnet connection with the asterisk server and listen
* to any events.
*
* @method start
*/
function start() {
    try {
        // initialize the asterisk manager
        am = new ast(astConf);
        logger.info(IDLOG, 'initialized asterisk manager');

        // add event listeners to asterisk manager
        am.on('ami_data',              onData);
        am.on('ami_socket_end',        amiSocketEnd);
        am.on('ami_socket_error',      amiSocketError);
        am.on('ami_socket_close',      amiSocketClose);
        am.on('ami_socket_timeout',    amiSocketTimeout);
        am.on('ami_socket_unwritable', amiSocketUnwritable);
        logger.info(IDLOG, 'added event listeners to asterisk manager');

        // connect to asterisk
        try {
            am.connect(function () {
                logger.info(IDLOG, 'asterisk connected');
            });
        } catch (err) {
            logger.error(IDLOG, err.stack);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Handler for the _ami\_socket\_end_ event emitted when the other end
* of the socket sends a FIN packet.
*
* @method amiSocketEnd
* @private
*/
function amiSocketEnd() {
    logger.warn(IDLOG, 'asterisk socket disconnected');
}

/**
* Handler for the _ami\_socket\_timeout_ event emitted when the socket times out
* from inactivity. This is only to notify that the socket has been idle. The user
* must manually close the connection.
*
* @method amiSocketTimeout
* @private
*/
function amiSocketTimeout() {
    logger.warn(IDLOG, 'asterisk socket timeout');
}

/**
* Handler for the _ami\_socket\_close_ event emitted once the socket
* is fully closed. The argument had_error is a boolean which says if
* the socket was closed due to a transmission error
*
* @method amiSocketClose
* @private
* @param {boolean} had_error It says if the socket was closed due to a
* transmission error
*/
function amiSocketClose(had_error) {
    logger.warn(IDLOG, 'asterisk socket close - had_error: ' + had_error);
}

/**
* Handler for the _ami\_socket\_unwritable_ event emitted when the socket
* isn't writable.
*
* @method amiSocketUnwritable
* @private
*/
function amiSocketUnwritable() {
    logger.error(IDLOG, 'asterisk socket unwritable');
}

/**
* Handler for the _ami\_socket\_error_ event emitted when an error occurs,
* e.g. when lost the connection. The 'close' event will be calledd directly
* following this event.
*
* @method amiSocketError
* @private
* @param {object} err The error object
*/
function amiSocketError(err) {
    try { logger.error(IDLOG, err.stack); }
    catch (err) { logger.error(IDLOG, err.stack); }
}

/**
* Handler for the received data from asterisk. It calls the _execute_ method of the
* command plugin with the name that corresponds to the ActionID value contained in
* the _data_ object. Plugins must reside in the appropriate directory.
*
* e.g. If the
* data contains _astVersion\_12345_ ActionID key, the _astVersion.js_ plugin must be present.
*
* @method onData
* @private
* @param {object} data The data received from asterisk
*/
function onData(data) {
    try {
        // get ActionId and action name
        var actionid = data.actionid;
        var cmd = action.getActionName(actionid);

        // check the command plugin presence. This event is generated in
        // response to a command request. It passes the event handler to
        // the appropriate command plugin.
        if (pluginsCmd[cmd]
            && typeof pluginsCmd[cmd].data === 'function') {

            pluginsCmd[cmd].data(data);

        } else if (data.event) { // check if data is an event

            var ev = data.event.toLowerCase();
            // check the event plugin presence. This event is an asterisk
            // event generated in response to some action. It passes the
            // event handler to the appropriate event plugin.
            if (pluginsEvent[ev]
                && typeof pluginsEvent[ev].data === 'function') {

                pluginsEvent[ev].data(data);

            } else if (ev === 'fullybooted') { // the asterisk connection is ready
                logger.info(IDLOG, 'ast_proxy is ready');
                console.log("proxyLogic");
                console.log(proxyLogic);
                proxyLogic.start();
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Executes specified command and return result in the callback. It calls the _execute_
* method of the command plugin that has the same name of the specified command. The plugin
* is contained into the file that resides in the appropriate directory and must have a file
* name equal to specified command parameter.
*
* e.g. If the command name is _astVersion_, the
* _astVersion.js_ plugin must be present.
*
*
* @method doCmd
* @param {object} obj The object with the command name to execute and optional parameters
*   @param {string} obj.command The command name to execute. A plugin command file with the
*   same name must be present into the appropriate directory
*   @param [obj.parameters] 0..n The parameters that can be used into the command plugin
* @param {function} cb The callback
*
*     @example
*
*     doCmd({ command: 'astVersion' }, function (res) {
*         console.log(res);
*     });
*
*     doCmd({ command: 'dndGet', exten: '214' }, function (res) {
*         console.log(res);
*     });
*/
function doCmd(obj, cb) {
    try {
        if (pluginsCmd[obj.command]
            && typeof pluginsCmd[obj.command].execute === 'function') {

            logger.info(IDLOG, 'execute ' + obj.command + '.execute');
            pluginsCmd[obj.command].execute(am, obj, cb);

        } else {
            logger.warn(IDLOG, 'no plugin for command ' + obj.command);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the logger to be used.
*
* @method setLogger
* @param {object} log The logger object. It must have at least
* three methods: _info, warn and error_ as console object.
* @static
*/
function setLogger(log) {
    try {
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

            // set the logger for all plugins
            setAllPluginsCmdLogger(log);
            setAllPluginsEventLogger(log);

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Call _setLogger_ function for all event plugins.
*
* @method setAllPluginsEventLogger
* @private
* @param log The logger object.
* @type {object}
*/
function setAllPluginsEventLogger(log) {
    try {
        var key;
        for (key in pluginsEvent) {

            if (typeof pluginsEvent[key].setLogger === 'function') {
                pluginsEvent[key].setLogger(log);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Call _setLogger_ function for all command plugins.
*
* @method setAllPluginsCmdLogger
* @private
* @param log The logger object.
* @type {object}
*/
function setAllPluginsCmdLogger(log) {
    try {
        var key;
        for (key in pluginsCmd) {

            if (typeof pluginsCmd[key].setLogger === 'function') {
                pluginsCmd[key].setLogger(log);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Subscribe a callback function to a custom event fired by this object.
* It's the same of nodejs _events.EventEmitter.on._
*
* @method on
* @param {string} type The name of the event
* @param {function} cb The callback to execute in response to the event
* @return {object} A subscription handle capable of detaching that subscription.
*/
function on(type, cb) {
    try {
        return emitter.on(type, cb);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.on        = on;
exports.doCmd     = doCmd;
exports.start     = start;
exports.config    = config;
exports.setLogger = setLogger;
