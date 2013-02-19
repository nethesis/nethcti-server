// It's the architect component. It configures the asterisk proxy and
// starts it.
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
            on: astProxy.on,
            get: astProxy.get
        }
    });
}
