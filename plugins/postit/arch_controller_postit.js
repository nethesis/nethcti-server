/**
* The architect component that exposes _postit_ module.
*
* @class arch_controller_postit
* @module postit
*/
var controllerPostit = require('./controller_postit');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_controller_postit]
*/
var IDLOG = '[arch_controller_postit]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        postit: {
            /**
            * It's the _newPostit_ method provided by _controller\_postit_ module.
            *
            * @method newPostit
            */
            newPostit: controllerPostit.newPostit,

            /**
            * It's the _getPostit_ method provided by _controller\_postit_ module.
            *
            * @method getPostit
            */
            getPostit: controllerPostit.getPostit,

            /**
            * It's the _getHistoryInterval_ method provided by _controller\_postit_ module.
            *
            * @method getHistoryInterval
            */
            getHistoryInterval: controllerPostit.getHistoryInterval,

            /**
            * It's the _getAllUserHistoryInterval_ method provided by _controller\_postit_ module.
            *
            * @method getAllUserHistoryInterval
            */
            getAllUserHistoryInterval: controllerPostit.getAllUserHistoryInterval
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        var dbconn = imports.dbconn;

        controllerPostit.setLogger(logger);
        controllerPostit.setDbconn(dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
