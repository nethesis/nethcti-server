/**
* The architect component that starts _server\_com\_upload\_http_ module.
*
* @class arch_com_upload_http
* @module com_upload_http
*/
var serverRest = require('./server_com_upload_http.js');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_upload_http]
*/
var IDLOG = '[arch_com_upload_http]';

module.exports = function (options, imports, register) {

    register(null, {
        uploadHttp: {
            /**
            * It's the _getUploadRootPath_ method provided by _server\_com\_upload\_http_ module.
            *
            * @method getUploadRootPath
            */
            getUploadRootPath: serverRest.getUploadRootPath
        }
    });

    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    try {
        serverRest.setLogger(logger);
        serverRest.config('/etc/nethcti/services.json');
        serverRest.setCompUtil(imports.util);
        serverRest.start();
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}