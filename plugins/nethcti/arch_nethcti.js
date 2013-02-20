/**
* nethcti architect component that starts nethcti module.
*
* @class arch_nethcti
* @module nethcti
*/
var nethcti = require('./nethcti');

module.exports = function (options, imports, register) {
    
    register();

    var logger = imports.logger;
    var astProxy = imports.astProxy;
    nethcti.setLogger(logger);
    nethcti.setAstProxy(astProxy);
    nethcti.start();
}
