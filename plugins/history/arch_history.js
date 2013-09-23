/**
* The architect component that exposes _history_ module.
*
* @class arch_history
* @module history
*/
var history = require('./history');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_history]
*/
var IDLOG = '[arch_history]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        history: {
            /**
            * It's the _getHistoryCallInterval_ method provided by _history_ module.
            *
            * @method getHistoryCallInterval
            */
            getHistoryCallInterval: history.getHistoryCallInterval,

            /**
            * It's the _getHistorySwitchCallInterval_ method provided by _history_ module.
            *
            * @method getHistorySwitchCallInterval
            */
            getHistorySwitchCallInterval: history.getHistorySwitchCallInterval,

            /**
            * It's the _isAtLeastExtenInCallRecording_ method provided by _history_ module.
            *
            * @method isAtLeastExtenInCallRecording
            */
            isAtLeastExtenInCallRecording: history.isAtLeastExtenInCallRecording,

            /**
            * It's the _getCallRecordingContent_ method provided by _history_ module.
            *
            * @method getCallRecordingContent
            */
            getCallRecordingContent: history.getCallRecordingContent,

            /**
            * It's the _deleteCallRecording_ method provided by _history_ module.
            *
            * @method deleteCallRecording
            */
            deleteCallRecording: history.deleteCallRecording,

            /**
            * It's the _getCallRecordingFileData_ method provided by _history_ module.
            *
            * @method getCallRecordingFileData
            */
            getCallRecordingFileData: history.getCallRecordingFileData
        }
    });

    try {
        history.setLogger(logger);
        history.setDbconn(imports.dbconn);
        history.setCompAstProxy(imports.astProxy);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
