var astProxy11 = require('./ast_proxy_11');

module.exports = function (options, imports, register) {

    astProxy11.start(options);

    register(null, {
        astProxy: {
            on: astProxy11.on,
            astVersion: astProxy11.astVersion,
            listSipPeers: astProxy11.listSipPeers
        }
    });
}
