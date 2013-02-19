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
var fs        = require('fs');
var winston   = require('winston');
var iniparser = require('iniparser');

module.exports = function (options, imports, register) {
    try {
        /**
        * Configuration file path.
        *
        * @property path
        * @type {string}
        * @private
        * @final
        * @readOnly
        */
        var PATH = '/etc/nethcti/nethcti.ini';

        // check configuration file presence
        if (!fs.existsSync(PATH)) {
            throw new Error(PATH + ' not exists');
        }
        
        // parse the configuration file
        var ini = iniparser.parseSync(PATH);

        // check the correctness of the configuration file
        if (!ini.NETHCTI
            || !ini.NETHCTI.logfile
            || !ini.NETHCTI.loglevel) {

            throw new Error('wrong configuration file ' + PATH);
        }

        ini.NETHCTI.loglevel = ini.NETHCTI.loglevel.toLowerCase();

        /**
        * The logger to be used by other components.
        *
        * @property logger
        * @type {object}
        * @static
        */
        var log = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({ level: ini.NETHCTI.loglevel }),
                new (winston.transports.File)({
                    filename: ini.NETHCTI.logfile,
                    level: ini.NETHCTI.loglevel,
                    json: false
                })
            ]
        });

    } catch (err) {
        console.log(err.stack);
    }

    // public interface for other architect components
    register(null, { logger: log });
}
