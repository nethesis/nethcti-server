/**
* The architect component that exposes _ast\_proxy_ module.
*
* @class arch_ast_proxy
*/
var astProxy = require('./ast_proxy');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_ast_proxy]
*/
var IDLOG = '[arch_ast_proxy]';

module.exports = function (options, imports, register) {

    var logger = console;
    if (imports.logger) { logger = imports.logger; }
    
    // public interface for other architect components
    register(null, {
        astProxy: {
            /**
            * It's the _on_ method provided by _ast\_proxy_ module.
            *
            * @method on
            * @param {string} type The name of the event
            * @param {function} cb The callback to execute in response to the event
            * @return {object} A subscription handle capable of detaching that subscription
            */
            on: astProxy.on,

            /**
            * It's the _doCmd_ method provided by _ast\_proxy_ module.
            *
            * @method doCmd
            * @param {object} obj The object with the command name to execute and optional parameters
            *   @param {string} obj.command The command name to execute. A plugin command file with the
            *   same name must be present into the appropriate directory
            *   @param [obj.parameters] 0..n The parameters that can be used into the command plugin
            * @param {function} cb The callback
            */
            doCmd: astProxy.doCmd,

            /**
            * It's the _getExtensions_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getExtensions
            * @return {object} The extension list.
            */
            getExtensions: astProxy.proxyLogic.getExtensions,

            /**
            * It's the _hangupConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method hangupConversation
            */
            hangupConversation: astProxy.proxyLogic.hangupConversation,

            /**
            * It's the _recordConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method recordConversation
            */
            recordConversation: astProxy.proxyLogic.recordConversation,

            /**
            * It's the _stopRecordConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method stopRecordConversation
            */
            stopRecordConversation: astProxy.proxyLogic.stopRecordConversation,

            /**
            * It's the _parkConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method parkConversation
            */
            parkConversation: astProxy.proxyLogic.parkConversation,

            /**
            * It's the _redirectConversation_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method redirectConversation
            */
            redirectConversation: astProxy.proxyLogic.redirectConversation,

            /**
            * It's the _call_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method call
            */
            call: astProxy.proxyLogic.call,

            /**
            * It's the _getJSONExtensions_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONExtensions
            */
            getJSONExtensions: astProxy.proxyLogic.getJSONExtensions,

            /**
            * It's the _getJSONQueues_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONQueues
            */
            getJSONQueues: astProxy.proxyLogic.getJSONQueues,

            /**
            * It's the _getJSONParkings_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method getJSONParkings
            */
            getJSONParkings: astProxy.proxyLogic.getJSONParkings,

            /**
            * It's the _newQueueWaitingCaller_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method newQueueWaitingCaller
            */
            newQueueWaitingCaller: astProxy.proxyLogic.newQueueWaitingCaller,

            /**
            * It's the _removeQueueWaitingCaller_ method provided by _ast\_proxy.proxyLogic_.
            *
            * @method removeQueueWaitingCaller
            */
            removeQueueWaitingCaller: astProxy.proxyLogic.removeQueueWaitingCaller
        }
    });

    try {
        astProxy.setLogger(logger);
        astProxy.config('/etc/nethcti/asterisk.ini');
        astProxy.start();
    } catch (err) {
        logger.error(err.stack);
    }
}
