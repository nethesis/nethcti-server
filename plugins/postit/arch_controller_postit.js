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
            * It's the _on_ method provided by _controller\_postit_ module.
            *
            * @method on
            */
            on: controllerPostit.on,

            /**
            * It's the _newPostit_ method provided by _controller\_postit_ module.
            *
            * @method newPostit
            */
            newPostit: controllerPostit.newPostit,

            /**
            * It's the _getNewPostit_ method provided by _controller\_postit_ module.
            *
            * @method getNewPostit
            */
            getNewPostit: controllerPostit.getNewPostit,

            /**
            * It's the _getPostit_ method provided by _controller\_postit_ module.
            *
            * @method getPostit
            */
            getPostit: controllerPostit.getPostit,

            /**
            * It's the _readPostit_ method provided by _controller\_postit_ module.
            *
            * @method readPostit
            */
            readPostit: controllerPostit.readPostit,

            /**
            * It's the _deletePostit_ method provided by _controller\_postit_ module.
            *
            * @method deletePostit
            */
            deletePostit: controllerPostit.deletePostit,

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
            getAllUserHistoryInterval: controllerPostit.getAllUserHistoryInterval,

            /**
            * It's the _EVT\_UPDATE\_NEW\_POSTIT_ method provided by _controller\_postit_ module.
            *
            * @method EVT_UPDATE_NEW_POSTIT
            */
            EVT_UPDATE_NEW_POSTIT: controllerPostit.EVT_UPDATE_NEW_POSTIT,

            /**
            * It's the _EVT\_NEW\_POSTIT_ method provided by _controller\_postit_ module.
            *
            * @method EVT_NEW_POSTIT
            */
            EVT_NEW_POSTIT: controllerPostit.EVT_NEW_POSTIT
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        var dbconn = imports.dbconn;

        controllerPostit.setLogger(logger);
        controllerPostit.setDbconn(dbconn);
        controllerPostit.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
