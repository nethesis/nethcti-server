/**
* ................................
* 
* @module ast_proxy
* @submodule plugins_command_11
*/
var Extension = require('../extension').Extension;

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [peerstatus]
*/
var IDLOG = '[peerstatus]';

(function() {
    try {
        /**
        * The logger. It must have at least three methods: _info, warn and error._
        *
        * @property logger
        * @type object
        * @private
        * @default console
        */
        var logger = console;

        /**
        * Command plugin to get the asterisk version.............
        *
        * @class peerstatus
        * @static
        */
        var peerstatus = {
            /**
            * It's called from _ast_proxy_ component for each data received
            * from asterisk and relative to this command
            *
            * @method data
            * @param {object} data The asterisk data for the current command
            * @static
            */
            data: function (data, astProxy) {
                try {
                    console.log(data);
                    var exten = data.peer.split('/')[1];
                    astProxy.doCmd({ command: 'sipDetails', exten: exten }, sipDetails);

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            },

            /**
            * Set the logger to be used.
            *
            * @method setLogger
            * @param {object} log The logger object. It must have at least
            * three methods: _info, warn and error_
            * @static
            */
            setLogger: function (log) {
                try {
                    if (typeof log === 'object'
                        && typeof log.info  === 'function'
                        && typeof log.warn  === 'function'
                        && typeof log.error === 'function') {

                        logger = log;
                    } else {
                        throw new Error('wrong logger object');
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                }
            }
        };

        // public interface
        exports.data      = peerstatus.data;
        exports.setLogger = peerstatus.setLogger;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

function sipDetails(data) {
    try {
        console.log("data = ");
        console.log(data);
        


    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
};
