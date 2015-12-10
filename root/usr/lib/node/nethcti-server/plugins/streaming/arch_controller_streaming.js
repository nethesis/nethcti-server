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
            getAllSourcesJSON: controllerStreaming.getAllSourcesJSON,

            /**
            * It's the _open_ method provided by _controller\_streaming_ module.
            *
            * @method open
            */
            open: controllerStreaming.open,

            /**
            * It's the _isExtenStreamingSource_ method provided by _controller\_streaming_ module.
            *
            * @method isExtenStreamingSource
            */
            isExtenStreamingSource: controllerStreaming.isExtenStreamingSource,

            /**
            * It's the _getSourceJSONByExten_ method provided by _controller\_streaming_ module.
            *
            * @method getSourceJSONByExten
            */
            getSourceJSONByExten: controllerStreaming.getSourceJSONByExten
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        controllerStreaming.setLogger(logger);
        controllerStreaming.config('/etc/nethcti/streaming.json');
        controllerStreaming.setCompAstProxy(imports.astProxy);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
