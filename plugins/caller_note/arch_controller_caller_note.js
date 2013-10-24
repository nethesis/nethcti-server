/**
* The architect component that exposes _caller\_note_ module.
*
* @class arch_controller_caller_note
* @module caller_note
*/
var controllerCallerNote = require('./controller_caller_note');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_controller_caller_note]
*/
var IDLOG = '[arch_controller_caller_note]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        callerNote: {
            /**
            * It's the _newCallerNote_ method provided by _controller\_caller\_note_ module.
            *
            * @method newCallerNote
            */
            newCallerNote: controllerCallerNote.newCallerNote,

            /**
            * It's the _getCallerNote_ method provided by _controller\_caller\_note_ module.
            *
            * @method getCallerNote
            */
            getCallerNote: controllerCallerNote.getCallerNote,

            /**
            * It's the _modifyCallerNote_ method provided by _controller\_caller\_note_ module.
            *
            * @method modifyCallerNote
            */
            modifyCallerNote: controllerCallerNote.modifyCallerNote,

            /**
            * It's the _deleteCallerNote_ method provided by _controller\_caller\_note_ module.
            *
            * @method deleteCallerNote
            */
            deleteCallerNote: controllerCallerNote.deleteCallerNote,

            /**
            * It's the _getHistoryInterval_ method provided by _controller\_caller\_note_ module.
            *
            * @method getHistoryInterval
            */
            getHistoryInterval: controllerCallerNote.getHistoryInterval,

            /**
            * It's the _getAllUserHistoryInterval_ method provided by _controller\_caller\_note_ module.
            *
            * @method getAllUserHistoryInterval
            */
            getAllUserHistoryInterval: controllerCallerNote.getAllUserHistoryInterval,

            /**
            * It's the _getAllValidCallerNotesByNum_ method provided by _controller\_caller\_note_ module.
            *
            * @method getAllValidCallerNotesByNum
            */
            getAllValidCallerNotesByNum: controllerCallerNote.getAllValidCallerNotesByNum
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        var dbconn = imports.dbconn;

        controllerCallerNote.setLogger(logger);
        controllerCallerNote.setDbconn(dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
