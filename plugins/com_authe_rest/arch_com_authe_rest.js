/**
* The architect component that starts _server\_com\_authe\_rest_ module.
*
* @class arch_com_authe_rest
* @module com_authe_rest
*/
var serverRest = require('./server_com_authe_rest.js');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_authe_rest]
*/
var IDLOG = '[arch_com_authe_rest]';

module.exports = function (options, imports, register) {

    register();

    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    try {
        serverRest.setLogger(logger);
        serverRest.start(imports.authe);
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}
