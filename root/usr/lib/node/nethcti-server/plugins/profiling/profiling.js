/**
 * Provides the mail functions.
 *
 * @module profiling
 * @main arch_profiling
 */
var os = require('os');
var fs = require('fs');
var childProcess = require('child_process');

/**
 * Provides the profiling functionalities.
 *
 * @class profiling
 * @static
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [profiling]
 */
var IDLOG = '[profiling]';

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
 * The communication websocket component.
 *
 * @property compComNethctiWs
 * @type object
 * @private
 */
var compComNethctiWs;

/**
 * The communication tcp component.
 *
 * @property compComNethctiTcp
 * @type object
 * @private
 */
var compComNethctiTcp;

/**
 * The configured hostname.
 *
 * @property hostname
 * @type string
 * @private
 */
var hostname;

/**
 * Set the logger to be used.
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

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the communication websocket component to be used.
 *
 * @method setCompComNethctiWs
 * @param {object} comp The module to be set
 */
function setCompComNethctiWs(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong user object');
    }
    compComNethctiWs = comp;
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the communication tcp component to be used.
 *
 * @method setCompComNethctiTcp
 * @param {object} comp The module to be set
 */
function setCompComNethctiTcp(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong user object');
    }
    compComNethctiTcp = comp;
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Returns the memory quantity used by the process, in particular:
 *
 * * resident set size (rss): the portion of the process's memory held in RAM
 * * total heap size
 * * used heap size
 *
 * @method getProcMem
 * @return {object} The quantity of the memory used by the process: "rss", "heapTotal", "heapUsed" (in byte).
 */
function getProcMem() {
  try {
    return process.memoryUsage();
  } catch (err) {
    logger.log.error(err.stack);
    return {};
  }
}

/**
 * Read the server configurations:
 *
 * @method config
 */
function config () {
  try {
    // set hostname
    hostname = (JSON.parse(fs.readFileSync('/etc/nethcti/nethcti.json', 'utf8'))).hostname;
  } catch (err) {
    logger.log.error(err.stack);
  }
}

/**
 * Returns the hostname:
 *
 * @method getHostname
 * @return {string} The hostname of the server.
 */
function getHostname() {
  try {
    return hostname;
  } catch (err) {
    logger.log.error(err.stack);
    return "";
  }
}

/**
 * Returns the number of connected clients by websocket.
 *
 * @method getWsNumConnectedClients
 * @return {number} the total number of connected clients by websocket
 */
function getWsNumConnectedClients() {
  try {
    return compComNethctiWs.getNumConnectedClients();
  } catch (err) {
    logger.log.error(err.stack);
    return -1;
  }
}

/**
 * Returns the number of connected clientsi by tcp.
 *
 * @method getTcpNumConnectedClients
 * @return {number} the total number of connected clients by tcp.
 */
function getTcpNumConnectedClients() {
  try {
    return compComNethctiTcp.getNumConnectedClients();
  } catch (err) {
    logger.log.error(err.stack);
    return -1;
  }
}

/**
 * Returns the release number of the software packages.
 *
 * @method getCtiPackageRelease
 * @param {function} cb The callback function
 */
function getCtiPackageRelease(cb) {
  try {
    // check parameters
    if (typeof cb !== 'function') {
      throw new Error('wrong parameters');
    }

    logger.log.info(IDLOG, 'get the release package version of nethcti');
    childProcess.exec('rpm -q nethcti3 nethcti-server3 janus-gateway nethserver-nethvoice14', function (error, stdout, stderr) {
      try {
        if (error || stderr) { // some error
          logger.log.error(IDLOG, error + ' ' + stderr);
          cb(error);

        } else { // add the result
          var arr = stdout.split('\n');
          var result = {
            'nethcti3': arr[0],
            'nethcti-server3': arr[1],
            'janus-gateway': arr[2],
            'nethserver-nethvoice14': arr[3]
          };
          cb(null, result);
        }

      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        cb(err.stack);
      }
    });

  } catch (err) {
    logger.log.error(err.stack);
    cb(err.stack);
  }
}

/**
 * Returns the node version.
 *
 * @method getNodeVersion
 * @return {string} The node version.
 */
function getNodeVersion() {
  try {
    logger.log.info(IDLOG, 'get the node version');
    return process.version;
  } catch (err) {
    logger.log.error(err.stack);
  }
}

/**
 * Returns the process PID.
 *
 * @method getProcessPid
 * @return {number} The process PID.
 */
function getProcessPid() {
  try {
    logger.log.info(IDLOG, 'get the process PID');
    return process.pid;
  } catch (err) {
    logger.log.error(err.stack);
    return -1;
  }
}

// public interface
exports.config = config;
exports.setLogger = setLogger;
exports.getProcMem = getProcMem;
exports.getHostname = getHostname;
exports.getProcessPid = getProcessPid;
exports.getNodeVersion = getNodeVersion;
exports.setCompComNethctiWs = setCompComNethctiWs;
exports.setCompComNethctiTcp = setCompComNethctiTcp;
exports.getCtiPackageRelease = getCtiPackageRelease;
exports.getWsNumConnectedClients = getWsNumConnectedClients;
exports.getTcpNumConnectedClients = getTcpNumConnectedClients;
