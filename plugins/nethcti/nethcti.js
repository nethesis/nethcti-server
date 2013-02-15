module.exports = function (options, imports, register) {
    register();

    var astProxy = imports.astProxy;
    astProxy.get({ command: 'astVersion' }, function (res) {
        console.log("---------");
        console.log(res);   
    });
}
