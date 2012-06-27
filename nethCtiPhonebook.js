var sys = require('sys');
var path = require('path');
var log4js = require('./lib/log4js-node/lib/log4js')();

const DB_NAME = 'cti_phonebook';
var logger = log4js.getLogger('[NethCtiPhonebook]');
var dataCollector;

exports.nethCtiPhonebook = function () {
    this.setLogger = function (logfile, level) { log4js.addAppender(log4js.fileAppender(logfile), '[NethCtiPhonebook]'); logger.setLevel(level); }
    this.handle = function (cmd, params, res) { _handle(cmd, params, res); }
    this.setDataCollector = function (dc) { _setDataCollector(dc); }
}

var _functs = {
    'newNethCTIContact': _newNethCTIContact
}

function _handle(cmd, params, res) {
    try {
        if (typeof _functs[cmd] === 'function') {
            _functs[cmd](params, res);
        } else {
            logger.warn('no handle for "' + cmd + '" command');
        }
    } catch(err) {
        logger.error(err.stack);
    }
}

function _setDataCollector(dc) {
    dataCollector = dc;
    logger.debug("dataCollector added");
}

function _newNethCTIContact(params, res) {
    try {
        var query = 'INSERT INTO ' + DB_NAME + ' (owner_id, name, type, cellphone, workstreet, workemail) VALUES ("' + params.owner_id + '", ' +
            '"' + params.name + '", ' +
            '"' + params.type + '", ' +
            '"' + params.cellphone + '", ' +
            '"' + params.workstreet + '", ' +
            '"' + params.workemail + '"' +    
        ')';
        dataCollector.query(DB_NAME, query, function (result) {
            if (result !== undefined && result.affectedRows === 1) {
                logger.debug('new contact has been added to cti phonebook (contact name: ' + params.name + ')');
                res.writeHead(200, {'content-type': 'text/html'});
                res.write('1');
                res.end();
            } else {
                logger.error('adding new cti phonebook contact (contact name: ' + params.name + ')');
                res.writeHead(404);
                res.write('404');
                res.end();
            }
        });
    } catch(err) {
       logger.error(err.stack);
    }
}
