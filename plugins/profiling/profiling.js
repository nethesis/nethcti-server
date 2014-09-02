/**
* Provides the mail functions.
*
* @module profiling
* @main arch_profiling
*/
var os           = require('os');
var childProcess = require('child_process');

/**
* Provides the mail functionalities.
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
* Set the logger to be used.
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

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
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
        if (typeof comp !== 'object') { throw new Error('wrong user object'); }
        compComNethctiWs = comp;
    } catch (err) {
        logger.error(IDLOG, err.stack);
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
        if (typeof comp !== 'object') { throw new Error('wrong user object'); }
        compComNethctiTcp = comp;
    } catch (err) {
        logger.error(IDLOG, err.stack);
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
        logger.error(err.stack);
        return {};
    }
}

/**
* Returns the data about the system cpus.
*
* @method getSysCpus
* @return {array} an array of objects containing information about each CPU/core installed: model, speed (in MHz),
*                 and times (an object containing the number of milliseconds the CPU/core spent in: user, nice, sys, idle, and irq).
*/
function getSysCpus() {
    try {
        return os.cpus();

    } catch (err) {
        logger.error(err.stack);
        return {};
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
        logger.error(err.stack);
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
        logger.error(err.stack);
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
        if (typeof cb !== 'function') { throw new Error('wrong parameters'); }

        logger.info(IDLOG, 'get the release package version of nethcti');
        childProcess.exec('rpm -q nethcti nethcti-server', function (error, stdout, stderr) {
            try {
                if (error || stderr) { // some error
                    logger.error(IDLOG, error + ' ' + stderr);
                    cb(error);

                } else { // add the result
                    var arr = stdout.split('\n');
                    var result = { 'nethcti': arr[0], 'nethcti-server': arr[1] };
                    cb(null, result);
                }

            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err.stack);
            }
        });

    } catch (err) {
        logger.error(err.stack);
        cb(err.stack);
    }
}

/**
* Returns the information about the system.
*
* @method getSystemInfo
* @param {function} cb The callback function
*/
function getSystemInfo(cb) {
    try {
        // check parameters
        if (typeof cb !== 'function') { throw new Error('wrong parameters'); }

        logger.info(IDLOG, 'get the system data');
        childProcess.exec('cat /etc/redhat-release', function (error, stdout, stderr) {
            try {
                if (error || stderr) { // some error
                    logger.error(IDLOG, error + ' ' + stderr);
                    cb(error);

                } else { // add the result
                    var arr = stdout.split('\n');
                    var result = {
                        cpus:     getSysCpus(),
                        arch:     os.arch(),
                        kernel:   os.release,
                        distro:   arr[0],
                        totmem:   os.totalmem(),
                        freemem:  os.freemem(),
                        hostname: os.hostname(),
                    };
                    cb(null, result);
                }
            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err.stack);
            }
        });
    } catch (err) {
        logger.error(err.stack);
        cb(err.stack);
    }
}

/**
* Returns the process PID.
*
* @method getProcessPid
* @return {number} pid The process PID.
*/
function getProcessPid() {
    try {
        logger.info(IDLOG, 'get the process PID');
        return process.pid;
    } catch (err) {
        logger.error(err.stack);
        return -1;
    }
}

// public interface
exports.setLogger                 = setLogger;
exports.getProcMem                = getProcMem;
exports.getSysCpus                = getSysCpus;
exports.getSystemInfo             = getSystemInfo;
exports.getProcessPid             = getProcessPid;
exports.setCompComNethctiWs       = setCompComNethctiWs;
exports.setCompComNethctiTcp      = setCompComNethctiTcp;
exports.getCtiPackageRelease      = getCtiPackageRelease;
exports.getWsNumConnectedClients  = getWsNumConnectedClients;
exports.getTcpNumConnectedClients = getTcpNumConnectedClients;
