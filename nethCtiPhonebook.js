var sys = require('sys');
var path = require('path');
var log4js = require('./lib/log4js-node/lib/log4js')();

const DB_NAME = 'cti_phonebook';
var logger = log4js.getLogger('[NethCtiPhonebook]');
var dataCollector;
var _modop;

exports.nethCtiPhonebook = function () {
    this.setLogger = function (logfile, level) { log4js.addAppender(log4js.fileAppender(logfile), '[NethCtiPhonebook]'); logger.setLevel(level); }
    this.handle = function (cmd, params, res) { _handle(cmd, params, res); }
    this.setDataCollector = function (dc) { _setDataCollector(dc); }
    this.setModop = function (md) { _setModop(md); }
}

var _functs = {
    'newNethCTIContact': _newNethCTIContact,
    'getSpeeddialContacts': _getSpeeddialContacts,
    'getAllExtensionsContacts': _getAllExtensionsContacts
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

function _setModop(modop) {
    _modop = modop;
}

function _getAllExtensionsContacts(params, res) {
    try {
        var tyext;
        var result = _modop.getAllExtPhoneName();
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(JSON.stringify(result));
        res.end();
    } catch(err) {
        logger.error(err.stack);
    }
}

function _getSpeeddialContacts(params, res) {
    try {
        var ext = params.ext;
        var query = 'SELECT * FROM ' + DB_NAME + ' WHERE type="speeddial" AND owner_id="' + ext + '"';
        dataCollector.query(DB_NAME, query, function (result) {
            logger.debug('send speed dial contacts');
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(JSON.stringify(result));
            res.end();
        });
    } catch(err) {
        logger.error(err.stack);
    }
}

function _newNethCTIContact(params, res) {
    try {
        var fields_name = '';
        var values = '';
        var key;
        for (key in params) {
            fields_name += key + ', ';
            values += '"' + params[key]  + '", ';
        }
        fields_name = fields_name.substring(0, fields_name.length - 2);
        values = values.substring(0, values.length - 2);
        var query = 'INSERT INTO ' + DB_NAME + ' (' + fields_name + ') VALUES (' + values + ')';
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
