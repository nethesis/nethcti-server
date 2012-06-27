var sys = require('sys');
var log4js = require('./lib/log4js-node/lib/log4js')();

var logger = log4js.getLogger('[Router]');
var _modules = {};

exports.Router = function () {
    this.setLogger = function (logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[Router]'); logger.setLevel(level); }
    this.route = function (path, params, res) { _route(path, params, res); }
    this.addModule = function (name, module) { _addModule(name, module); }
}

function _addModule(name, module) {
    try {
        if (_modules[name] === undefined) {
            _modules[name] = module;
            logger.debug('module "' + name + '" added');
        } else {
            logger.error('try to add "' + name + '" module already present');
        }
    } catch(err) {
        logger.error(err.stack);
    }
}

function _route(path, params, res) {
    try {
        var pathname = '';
        var cmd = '';
        var arr = path.split('/');
        if (arr[0] !== undefined) {
            pathname = path.split('/')[1];
        }
        if (arr[1] !== undefined) {
            cmd = path.split('/')[2];
        }
        if (_modules[pathname] !== undefined && (typeof _modules[pathname].handle === 'function')) {
            logger.debug('route for pathname "' + pathname + '" and command "' + cmd + '"');
            _modules[pathname].handle(cmd, params, res);
        } else {
            logger.warn('no module or handle function for "' + pathname + '"');
        }
    } catch(err) {
        logger.error(err.stack);
    }
}
