var astProxy = require('./ast_proxy');

module.exports = function (options, imports, register) {

    astProxy.start(options);

    register(null, {
        astProxy: {
            on: astProxy.on,
            get: astProxy.get
        }
    });
}
