/**
* The architect component that starts the asterisk proxy.
*
* @class arch_ast_proxy
*/
var astProxy = require('./ast_proxy');

module.exports = function (options, imports, register) {
    
    var logger = imports.logger;

    try {
        astProxy.setLogger(logger);
        astProxy.config('/etc/nethcti/asterisk.ini');
        astProxy.start();
    } catch (err) {
        console.log(err.stack);
    }

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
            * It's the _get_ method provided by _ast\_proxy_ module.
            *
            * @method get
            * @param {object} obj The object with the command name to execute and optional parameters
            *   @param {string} obj.command The command name to execute. A plugin command file with the
            *   same name must be present into the appropriate directory
            *   @param [obj.parameters] 0..n The parameters that can be used into the command plugin
            * @param {function} cb The callback
            */
            get: astProxy.get
        }
    });
}
