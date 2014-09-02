/**
* Provides logger functions.
*
* @module logger
*/

/**
* The architect module that offers the logger.
*
* @class arch_logger
*/
var fs      = require('fs');
var moment  = require('moment');
var winston = require('winston');

module.exports = function (options, imports, register) {
    try {
        /**
        * The path of the JSON configuration file.
        *
        * @property PATH
        * @type {string}
        * @private
        * @final
        * @readOnly
        * @default "/etc/nethcti/nethcti.json"
        */
        var PATH = '/etc/nethcti/nethcti.json';

        /**
        * The number of the warning log entries.
        *
        * @property warnCounter
        * @type {number}
        * @private
        * @default 0
        */
        var warnCounter = 0;

        /**
        * The number of the error log entries.
        *
        * @property errorCounter
        * @type {number}
        * @private
        * @default 0
        */
        var errorCounter = 0;

        /**
        * Returns the number of the warning log entries.
        *
        * @method getWarnCounter
        * @return {number} The number of the warning log entries.
        */
        function getWarnCounter() {
            try {
                return warnCounter;
            } catch (err1) {
                console.log(err1.stack);
                return -1;
            }
        }

        /**
        * Returns the number of the error log entries.
        *
        * @method getErrorCounter
        * @return {number} The number of the error log entries.
        */
        function getErrorCounter() {
            try {
                return errorCounter;
            } catch (err1) {
                console.log(err1.stack);
                return -1;
            }
        }

        // check configuration file presence
        if (!fs.existsSync(PATH)) {
            throw new Error(PATH + ' doesn\'t exist');
        }
        
        // parse the configuration file
        var json = require(PATH);

        // check for the correctness of the JSON configuration file
        if (   typeof json          !== 'object'
            || typeof json.logfile  !== 'string'
            || typeof json.loglevel !== 'string') {

            throw new Error('wrong configuration file ' + PATH);
        }

        /**
        * The logger to be used by other components.
        *
        * @property logger
        * @type {object}
        * @static
        */
        var log = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    json:      false,
                    level:     json.loglevel,
                    filename:  json.logfile,
                    timestamp: getTimestamp
                })
            ]
        });

        // add the functions to retrieve the counters
        log.getWarnCounter  = getWarnCounter;
        log.getErrorCounter = getErrorCounter;

        // a log event will be raised each time a transport successfully logs a message
        log.on('logging', function (transport, level, msg, meta) {
            try {
                if      (level === 'warn')  { warnCounter  += 1; }
                else if (level === 'error') { errorCounter += 1; }
            } catch (err1) {
                console.log(err1.stack);
            }
        });
    } catch (err) {
        console.log(err.stack);
    }

    // public interface for other architect components
    register(null, { logger: log });
}

/**
* Return a string representation of the date and time.
*
* @method getTimestamp
* @return {string} A date and time.
*/
function getTimestamp() {
    return moment().format();
}
