/**
* The architect component that starts _server\_com\_mobile\_rest_ module.
*
* @class arch_com_mobile_rest
* @module com_mobile_rest
*/
var serverRest = require('./server_com_mobile_rest.js');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_mobile_rest]
*/
var IDLOG = '[arch_com_mobile_rest]';

module.exports = function (options, imports, register) {

    register();

    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    try {
        serverRest.setLogger(logger);
        serverRest.config('/etc/nethcti/services.json');
        serverRest.setCompUtil(imports.util);
        serverRest.setCompMobile(imports.mobile);
        serverRest.start();
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
};