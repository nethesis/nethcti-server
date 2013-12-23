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
                new (winston.transports.Console)({ level: json.loglevel }),
                new (winston.transports.File)({
                    filename: json.logfile,
                    level:    json.loglevel,
                    json:     false
                })
            ]
        });

        log.warn('Starting...');

    } catch (err) {
        console.log(err.stack);
    }

    // public interface for other architect components
    register(null, { logger: log });
}
