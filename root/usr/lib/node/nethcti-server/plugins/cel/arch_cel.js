/**
* The architect component that exposes _cel_ module.
*
* @class arch_cel
* @module cel
*/
var cel = require('./cel');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_cel]
*/
var IDLOG = '[arch_cel]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        cel: {
            /**
            * It's the _getCallTrace_ method provided by _cel_ module.
            *
            * @method getCallTrace
            */
            getCallTrace: cel.getCallTrace,
            
            /**
            * It's the _getCallInfo_ method provided by _cel_ module.
            *
            * @method getCallInfo
            */
            getCallInfo: cel.getCallInfo
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        imports.dbconn.on(imports.dbconn.EVT_READY, function () {
            cel.setLogger(logger.ctilog);
            cel.setCompDbconn(imports.dbconn);
        });
    } catch (err) {
        logger.log.error(IDLOG, err.stack);
    }
}
