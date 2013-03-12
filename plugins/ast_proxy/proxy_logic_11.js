/**
* This is the asterisk proxy logic linked to version 11
* of the asterisk server.
*
* @class proxy_logic_11
* @static
*/
var Channel           = require('./channel').Channel;
var Extension         = require('./extension').Extension;
var EXTEN_STATUS_ENUM = require('./extension').EXTEN_STATUS_ENUM;

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
var IDLOG = '[proxy_logic_11]';

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
* The asterisk proxy.
*
* @property astProxy
* @type object
* @private
*/
var astProxy;

/**
* All extensions. The key is the extension number and the value
* is the _Extension_ object.
*
* @property extensions
* @type object
* @private
*/
var extensions = {};

/**
* Extension status provided by asterisk.
*
* @property AST_EXTEN_STATUS
* @type {object}
* @readOnly
* @private
*/
var AST_EXTEN_STATUS = {
    LAGGED:       'lagged',
    UNKNOWN:      'unknown',
    REACHABLE:    'reachable',
    REGISTERED:   'registered',
    UNMONITORED:  'unmonitored',
    UNREACHABLE:  'unreachable',
    UNREGISTERED: 'unregistered'
};

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

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        console.log("\n\n\n");
        logger.error(IDLOG, err.stack);
    }
}

/**
* Store the asterisk proxy to visit.
*
* @method visit
* @param {object} ap The asterisk proxy module.
*/
function visit(ap) {
    try {
        // check parameter
        if (!ap || typeof ap !== 'object') {
            throw new Error('wrong parameter');
        }
        astProxy = ap;
        logger.info(IDLOG, 'set the asterisk proxy to visit');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It's called when the asterisk connection is fully booted.
*
* @method start
* @static
*/
function start() {
    try {
        console.log("start: doCmd listSipPeers");
        astProxy.doCmd({ command: 'listSipPeers' }, listSipPeers);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

function listSipPeers(list) {
    try {
        var i, exten;
        for (i = 0; i < list.length; i++) {
            var exten = new Extension(list[i].ext, list[i].chanType);
            extensions[exten.getExten()] = exten;
            console.log('creato nuovo exten e messo in memoria ' + exten.getExten());

            console.log("doCmd sipDetails of created exten = " + exten.getExten());
            astProxy.doCmd({ command: 'sipDetails', exten: exten.getExten() }, sipDetails);
        }

        console.log("request listChannels");
        astProxy.doCmd({ command: 'listChannels' }, listChannels);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

function listChannels(list) {
    try {
        console.log("listChannels list=");
        console.log(list);

        var ext, channels;
        for (ext in list) {
            ch = new Channel(list[ext]);
            console.log(ch);
        }



    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

function sipDetails(data) {
    try {
        console.log("sipDetails data=");
        console.log(data);
        if (data.result === true) {

            // adapt received data to set the extension informations
            var data = extenAdapter(data.exten);

            // set the extension informations
            extensions[data.exten].setIp(data.ip);
            extensions[data.exten].setPort(data.port);
            extensions[data.exten].setName(data.name);
            extensions[data.exten].setSipUserAgent(data.sipuseragent);
            extensions[data.exten].setIp(data.ip);
            extensions[data.exten].setStatus(data.status);

        } else {
            console.log("some error could happened");
            if (data.message) { console.log(data.message); }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Adapts the data received from the asterisk event to
* a format suitable to create an _Extension_ object.
*
* @method extenAdapter
* @param {object} data The data object to be adapted.
* @return {object} The adapted data object.
*/
function extenAdapter(data) {
    try {
        // check the parameter
        if (!data || !data.status) {
            throw new Error('wrong parameter');
        }

        // change the status key
        if (data.status    === AST_EXTEN_STATUS.LAGGED
            || data.status === AST_EXTEN_STATUS.REACHABLE
            || data.status === AST_EXTEN_STATUS.REGISTERED) {

            data.status = EXTEN_STATUS_ENUM.ONLINE;

        } else {
            data.status = EXTEN_STATUS_ENUM.OFFLINE;
        }
        return data;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start     = start;
exports.visit     = visit;
exports.setLogger = setLogger;
