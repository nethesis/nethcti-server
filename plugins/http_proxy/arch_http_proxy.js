/**
* The architect component that starts _http\_proxy_ module.
*
* @class arch_http_proxy
* @module http_proxy
*/
var httpProxy = require('./http_proxy.js');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_http_proxy]
*/
var IDLOG = '[arch_http_proxy]';

module.exports = function (options, imports, register) {

    register();

    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    try {
        httpProxy.setLogger(logger);
        httpProxy.config('/etc/nethcti/services.json');
        httpProxy.setCompAuthentication(imports.authentication);
        httpProxy.start();
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}
