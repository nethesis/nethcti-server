/**
 * The asterisk proxy module provides a standard interface to use with
 * different version of asterisk server. It provides functions to execute
 * actions and to receive events information.
 *
 * @module astproxy
 */

/**
 * Asterisk proxy with standard interface to use.
 *
 * @class astproxy
 * @static
 */
var fs = require('fs');
var ast = require('asterisk-ami');
var action = require('./action');
var pluginsCmd = require('jsplugs')().require('./plugins/astproxy/plugins_command_13');
var proxyLogic = require('./proxy_logic_13/proxy_logic_13');
var pluginsEvent = require('jsplugs')().require('./plugins/astproxy/plugins_event_13');
var EventEmitter = require('events').EventEmitter;

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [astproxy]
 */
var IDLOG = '[astproxy]';

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
 * The asterisk connection parameters.
 *
 * @property astConf
 * @type object
 * @private
 */
var astConf;

/**
 * The asterisk configuration file path.
 *
 * @property AST_CONF_FILEPATH
 * @type string
 * @private
 */
var AST_CONF_FILEPATH;

/**
 * The configuration file path of the asterisk objects.
 *
 * @property AST_OBJECTS_FILEPATH
 * @type string
 * @private
 */
var AST_OBJECTS_FILEPATH;

/**
 * The configuration file path of the users.
 *
 * @property USERS_CONF_FILEPATH
 * @type string
 * @private
 */
var USERS_CONF_FILEPATH;

/**
 * The sip WebRCT configuration.
 *
 * @property sipWebrtcConf
 * @type object
 * @private
 */
var sipWebrtcConf;

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
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}());

/**
 * Set the configuration to be use to establish the telnet asterisk connection.
 * It also reads the queues and trunks list.
 *
 * @method config
 * @param {string} path The file path of the asterisk JSON configuration file
 */
function config(path) {
  try {
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter: ' + path);
    }
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }
    AST_CONF_FILEPATH = path;

    // initialize asterisk configuration
    var json = JSON.parse(fs.readFileSync(AST_CONF_FILEPATH, 'utf8'));
    if (typeof json.user !== 'string' ||
      typeof json.auto_c2c !== 'string' ||
      typeof json.null_call_period !== 'string' ||
      typeof json.pass !== 'string' || typeof json.prefix !== 'string' ||
      typeof json.host !== 'string' || typeof json.port !== 'string') {

      throw new Error(AST_CONF_FILEPATH + ' wrong file format');
    }
    astConf = {
      port: json.port,
      host: json.host,
      username: json.user,
      password: json.pass,
      reconnect: true, // do you want the ami to reconnect if the connection is dropped, default: false
      reconnect_after: 3000 // how long to wait to reconnect, in miliseconds, default: 3000
    };
    proxyLogic.setQMAlarmsNotificationsStatus(json.qm_alarms_notifications);
    proxyLogic.setPrefix(json.prefix);
    proxyLogic.setAutoC2CStatus(json.auto_c2c);
    proxyLogic.setNullCallPeriod(parseInt(json.null_call_period));
    if (json.trunks_events === 'disabled') {
      proxyLogic.disableTrunksEvents();
    }
    logger.log.info(IDLOG, 'configuration done by ' + AST_CONF_FILEPATH);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reads the extension names and mac.
 *
 * @method configExtens
 * @param {string} path The file path of the users JSON file
 */
function configExtens(path) {
  try {
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter: ' + path);
    }
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }
    USERS_CONF_FILEPATH = path;

    var json = JSON.parse(fs.readFileSync(USERS_CONF_FILEPATH, 'utf8'));
    if (typeof json !== 'object') {
      throw new Error(USERS_CONF_FILEPATH + ' wrong file format');
    }

    var u, e, i, allextens;
    var obj = {
      names: {},
      mainExtens: {}, // keys are main extensions and the values are array containing list of secondary associated extensions
      secondExtens: {} // keys are the secondary extensions and the value are the corresponding main extensions
    };
    let macByMac = {}; // keys are mac addresses and the values are the corresponding extension identifiers
    let macByExt = {}; // keys are extension identifiers and the values are the corresponding mac addresses
    for (u in json) {
      for (e in json[u].endpoints.mainextension) {
        obj.names[e] = json[u].name;

        // construct array of secondary extensions
        obj.mainExtens[e] = [];
        allextens = Object.keys(json[u].endpoints.extension);
        for (i = 0; i < allextens.length; i++) {
          if (allextens[i] !== e) {
            obj.mainExtens[e].push(allextens[i]);
          }
        }
      }
      for (e in json[u].endpoints.extension) {
        obj.names[e] = json[u].name;
        if (obj.mainExtens[e] === undefined) {
          obj.secondExtens[e] = Object.keys(json[u].endpoints.mainextension)[0];
        }
        if (json[u].endpoints.extension[e].mac) {
          macByMac[json[u].endpoints.extension[e].mac] = e;
          macByExt[e] = json[u].endpoints.extension[e].mac;
        }
      }
    }
    proxyLogic.setStaticDataExtens(obj);
    proxyLogic.setMacDataByMac(macByMac);
    proxyLogic.setMacDataByExt(macByExt);
    logger.log.info(IDLOG, 'extension names configuration done by ' + USERS_CONF_FILEPATH);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reads the asterisk objects.
 *
 * @method configAstObjects
 * @param {string} path The file path of the asterisk JSON file
 */
function configAstObjects(path) {
  try {
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter: ' + path);
    }
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }
    AST_OBJECTS_FILEPATH = path;

    var json = JSON.parse(fs.readFileSync(AST_OBJECTS_FILEPATH, 'utf8'));
    if (typeof json.trunks !== 'object' || typeof json.queues !== 'object') {
      throw new Error(AST_OBJECTS_FILEPATH + ' wrong file format');
    }
    proxyLogic.setStaticDataTrunks(json.trunks);
    proxyLogic.setStaticDataQueues(json.queues);
    proxyLogic.setFeatureCodes(json.feature_codes);
    proxyLogic.setBlindTransferContext(json.transfer_context);
    logger.log.info(IDLOG, 'asterisk objects configuration done by ' + AST_OBJECTS_FILEPATH);

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the remote sites to have remote sites prefixes.
 *
 * @method configRemoteSitePrefixes
 * @param {string} path The file path of the JSON configuration file that contains the remote sites
 */
function configRemoteSitesPrefixes(path) {
  try {
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check the file presence
    if (!fs.existsSync(path)) {
      logger.log.warn(IDLOG, path + ' does not exist');
      return;
    }

    // read the configuration file
    var json = JSON.parse(fs.readFileSync(path, 'utf8'));

    // check the configuration file content
    if (typeof json !== 'object') {
      throw new Error('wrong configuration file ' + path);
    }

    var site;
    var prefixes = {};
    for (site in json) {
      prefixes[json[site].prefix] = site;
    }
    proxyLogic.setRemoteSitesPrefixes(prefixes);
    logger.log.info(IDLOG, 'remote sites prefixes successfully configured');

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the configuration to be used by sip WebRTC.
 *
 * @method configSipWebrtc
 * @param {string} path The file path of the JSON configuration file
 */
function configSipWebrtc(path) {
  try {
    if (typeof path !== 'string') {
      throw new TypeError('wrong parameter');
    }

    // check the file presence
    if (!fs.existsSync(path)) {
      throw new Error(path + ' does not exist');
    }

    // read the configuration file
    var json = JSON.parse(fs.readFileSync(path, 'utf8'));

    // check the configuration file content
    if (typeof json !== 'object' ||
      typeof json.stun_server_address !== 'string' ||
      typeof json.enabled !== 'string' ||
      (json.enabled !== 'true' && json.enabled !== 'false')) {

      throw new Error('wrong configuration file ' + path);
    }

    sipWebrtcConf = {
      enabled: json.enabled,
      stun_server_address: json.stun_server_address
    };

    logger.log.info(IDLOG, 'sip webrtc successfully configured');

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Start the telnet connection with the asterisk server and listen
 * to any events.
 *
 * @method start
 */
function start() {
  try {
    am = new ast(astConf);
    addAstListeners();
    logger.log.info(IDLOG, 'asterisk manager initialized');
    logger.log.info(IDLOG, 'connecting to asterisk...');
    am.connect();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reload the component.
 *
 * @method reload
 */
function reload() {
  try {
    proxyLogic.setReloading(true);
    reset();
    config(AST_CONF_FILEPATH);
    configAstObjects(AST_OBJECTS_FILEPATH);
    configExtens(USERS_CONF_FILEPATH);
    start();
    logger.log.warn(IDLOG, 'reloaded');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Add asterisk event listeners.
 *
 * @method addAstListeners
 */
function addAstListeners() {
  try {
    am.on('data', onData);
    am.on('login', onLogin);
    am.on('connection-end', amiSocketEnd);
    am.on('connection-error', amiSocketError);
    am.on('connection-close', amiSocketClose);
    am.on('connection-connect', amiSocketConnected);
    am.on('connection-timeout', amiSocketTimeout);
    am.on('connection-unwritable', amiSocketUnwritable);
    logger.log.info(IDLOG, 'added event listeners to asterisk manager');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Reset the component.
 *
 * @method reset
 */
function reset() {
  try {
    proxyLogic.reset();
    am.removeAllListeners();
    am.disconnect();
    am = null;
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
  logger.log.warn(IDLOG, 'asterisk socket disconnected');
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
  logger.log.warn(IDLOG, 'asterisk socket timeout');
}

/**
 * Handler for the _ami\_socket\_connect_ event emitted once the socket
 * is connected.
 *
 * @method amiSocketConnected
 * @private
 */
function amiSocketConnected() {
  logger.log.warn(IDLOG, 'asterisk connected');
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
  logger.log.warn(IDLOG, 'asterisk socket close - had_error: ' + had_error);
}

/**
 * Handler for the _ami\_socket\_unwritable_ event emitted when the socket
 * isn't writable.
 *
 * @method amiSocketUnwritable
 * @private
 */
function amiSocketUnwritable() {
  logger.log.error(IDLOG, 'asterisk socket unwritable');
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
  try {
    logger.log.error(IDLOG, err.stack);
  } catch (error) {
    logger.log.error(IDLOG, error.stack);
  }
}

/**
 * Handler for the received logged in event from asterisk.
 *
 * @method onLogin
 * @param {object} err The error object
 * @param {object} resp The event response data
 * @private
 */
function onLogin(err, resp) {
  try {
    if (err && resp && resp.message) {
      logger.log.error(IDLOG, 'logging-in into asterisk: ' + resp.message);
      return;
    } else if (err) {
      logger.log.error(IDLOG, 'logging-in into asterisk: ' + err.stack);
      return;
    }
    logger.log.info(IDLOG, 'logged-in into asterisk');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Handler for the received data from asterisk. It calls the _execute_ method of the
 * command plugin with the name that corresponds to the ActionID value contained in
 * the _data_ object. Plugins must reside in the appropriate directory.
 *
 * e.g. If data contains _astVersion\_12345_ ActionID key, the _astVersion.js_ plugin must be present.
 *
 * @method onData
 * @param {object} data The data received from asterisk
 * @private
 */
function onData(data) {
  try {
    // get ActionId and action name
    var actionid = data.actionid;
    var cmd = action.getActionName(actionid);

    // check the command plugin presence. This event is generated in
    // response to a command request. It passes the event handler to
    // the appropriate command plugin.
    if (pluginsCmd[cmd] && typeof pluginsCmd[cmd].data === 'function') {
      pluginsCmd[cmd].data(data);
    }
    // this is a particular case: 'listParkings' command plugin cause
    // an event 'Parkinglot' without the relative 'ActionID' key. So
    // it passes the event to the 'listParking' command plugin, because
    // it is not possible to associate the event with the correct command
    // plugin, without the 'ActionID'
    else if (data.event === 'Parkinglot' &&
      pluginsCmd.listParkings &&
      typeof pluginsCmd.listParkings.data === 'function') {

      pluginsCmd.listParkings.data(data);

    } else if (data.event) { // check if data is an event
      var ev = data.event.toLowerCase();
      // check the event plugin presence. This event is an asterisk
      // event generated in response to some action. It passes the
      // event handler to the appropriate event plugin.
      if (pluginsEvent[ev] && typeof pluginsEvent[ev].data === 'function') {
        pluginsEvent[ev].data(data);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Executes specified command and return result in the callback. It calls the _execute_
 * method of the command plugin that has the same name of the specified command. The plugin
 * is contained into the file that resides in the appropriate directory and must have a file
 * name equal to specified command parameter.
 *
 * e.g. If the command name is _astVersion_, the _astVersion.js_ plugin must be present.
 *
 * @method doCmd
 * @param {object} obj The object with the command name to be executed and the optional parameters
 *   @param {string} obj.command The command name to be executed
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
    if (pluginsCmd[obj.command] && typeof pluginsCmd[obj.command].execute === 'function') {
      logger.log.info(IDLOG, 'execute ' + obj.command + '.execute');
      pluginsCmd[obj.command].execute(am, obj, cb);
    } else {
      logger.log.warn(IDLOG, 'no plugin for command ' + obj.command);
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    if (typeof log === 'object' &&
      typeof log.log.info === 'function' &&
      typeof log.log.warn === 'function' &&
      typeof log.log.error === 'function') {

      logger = log;
      logger.log.info(IDLOG, 'new logger has been set');

      // set the logger for the proxy logic
      proxyLogic.setLogger(log);

      // set the logger for all plugins
      setAllPluginsCmdLogger(log);
      setAllPluginsEventLogger(log);

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.error(IDLOG, err.stack);
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
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Subscribe a callback function to a custom event fired by this object.
 * It's the same of nodejs _events.EventEmitter.on_ method.
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
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Emit an event. It's the same of nodejs _events.EventEmitter.emit_ method.
 *
 * @method emit
 * @param {string} ev The name of the event
 * @param {object} data The object to be emitted
 */
function emit(ev, data) {
  try {
    emitter.emit(ev, data);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Returns the sip WebRTC configuration.
 *
 * @method getSipWebrtcConf
 * @return {object} The sip WebRTC configuration.
 */
function getSipWebrtcConf() {
  try {
    return sipWebrtcConf;
  } catch (e) {
    logger.log.error(IDLOG, e.stack);
  }
}

// public interface
exports.on = on;
exports.emit = emit;
exports.reset = reset;
exports.doCmd = doCmd;
exports.start = start;
exports.reload = reload;
exports.config = config;
exports.setLogger = setLogger;
exports.proxyLogic = proxyLogic;
exports.configSipWebrtc = configSipWebrtc;
exports.getSipWebrtcConf = getSipWebrtcConf;
exports.configAstObjects = configAstObjects;
exports.configExtens = configExtens;
exports.configRemoteSitesPrefixes = configRemoteSitesPrefixes;
