/**
* The architect component that exposes _postit_ module.
*
* @class arch_controller_postit
* @module postit
*/
var controllerStreaming = require('./controller_streaming');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_controller_streaming]
*/
var IDLOG = '[arch_controller_streaming]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        streaming: {
            /**
            * It's the _getAllSourcesJSON_ method provided by _controller\_streaming_ module.
            *
            * @method getAllSourcesJSON
            */
            getAllSourcesJSON: controllerStreaming.getAllSourcesJSON
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        controllerStreaming.setLogger(logger);
        controllerStreaming.config('/etc/nethcti/streaming.json');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
