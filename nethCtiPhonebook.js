var sys = require('sys');
var path = require('path');
var fs = require('fs');
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
    this.searchContacts = function (name, extFrom, cb) { _searchContacts(name, extFrom, cb); }
    this.searchContactsStartsWith = function (name, extFrom, cb) { _searchContactsStartsWith(name, extFrom, cb); }
    this.getAllContactsByNum = function (num, numToSearch, cb) { _getAllContactsByNum(num, numToSearch, cb); }
}

var _functs = {
    'getNethCTIContact': _getNethCTIContact,
    'newNethCTIContact': _newNethCTIContact,
    'modifyNethCTIContact': _modifyNethCTIContact,
    'deleteNethCTIContact': _deleteNethCTIContact,
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

            // add info about the avatar image presence
            var i, path_img, id;
            for (i = 0; i < result.length; i++) {
                id = result[i].id;
                path_img = path.join('/avatar', result[i].id + '.png');
                if (path.existsSync(path_img) === true) {
                    result[i].avatar = true;
                } else {
                    result[i].avatar = false;
                }
            }

            // send results
            logger.debug('send speed dial contacts');
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(JSON.stringify(result));
            res.end();
        });
    } catch(err) {
        logger.error(err.stack);
    }
}

function _getNethCTIContact(params, res) {
    try {
        var id = params.id;
        var query = 'SELECT * FROM ' + DB_NAME + ' WHERE id="' + id + '"';
        dataCollector.query(DB_NAME, query, function (result) {
            try {
                if (result !== undefined) {
                    logger.debug('cti phonebook contact [id = ' + id + '] has been retrieved');
                    res.writeHead(200, {'Content-type': 'text/html'});
                    res.write(JSON.stringify(result));
                    res.end();
                } else {
                    logger.error('no result searching cti phonebook contact [id = ' + id + ']');
                    var resp = {
                        'id': id,
                        'success': false
                    };
                    res.writeHead(200, {'Content-type': 'text/html'});
                    res.write(JSON.stringify(resp));
                    res.end();
                }
            } catch (err) {
                logger.error(err.stack);
            }
        });
    } catch(err) {
        logger.error(err.stack);
    }
}

function _deleteNethCTIContact(params, res) {
    try {
        var id = params.id;
        var query = 'DELETE FROM ' + DB_NAME + ' WHERE id="' + id + '"';
        dataCollector.query(DB_NAME, query, function (result) {
            try {
                if (result !== undefined && result.affectedRows === 1) {
                    logger.debug('cti phonebook contact [id = ' + id + '] has been deleted');
                    var resp = {
                        'num': '1',
                        'id': id,
                        'success': true
                    };
                    res.writeHead(200, {'Content-type': 'text/html'});
                    res.write(JSON.stringify(resp));
                    res.end();
                } else {
                    logger.error('deleting cti phonebook contact [id = ' + id + ']');
                    var resp = {
                        'num': '0',
                        'id': id,
                        'success': false
                    };
                    res.writeHead(200, {'Content-type': 'text/html'});
                    res.write(JSON.stringify(resp));
                    res.end();
                }
            } catch (err) {
                logger.error(err.stack);
            }
        });
    } catch(err) {
        logger.error(err.stack);
    }
}

function _modifyNethCTIContact(params, res) {
    try {
        var id = params.id;
        delete params.id;
        var fields_values = '';
        var key;
        for (key in params) {
            fields_values += key + '="' + params[key] + '", ';
        }
        fields_values = fields_values.substring(0, fields_values.length - 2); // remove final comma
        var query = 'UPDATE ' + DB_NAME + ' SET ' + fields_values + ' WHERE id="' + id + '"';
        dataCollector.query(DB_NAME, query, function (result) {
            if (result !== undefined && result.affectedRows === 1) {
                logger.debug('cti phonebook contact (contact name: ' + params.name + ') has been modified with success');
                var resp = { 'success': true };
                res.writeHead(200, {'content-type': 'text/html'});
                res.write(JSON.stringify(resp));
                res.end();
            } else {
                logger.error('adding new cti phonebook contact (contact name: ' + params.name + ')');
                var resp = { 'success': false };
                res.writeHead(404);
                res.write(JSON.stringify(resp));
                res.end();
            }
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

function _searchContactsStartsWith(name, extFrom, cb) {
    try {
        var query = 'SELECT * FROM ' + DB_NAME + ' WHERE (owner_id="' + extFrom + '" OR type="public") AND (name LIKE "' + name + '%" OR company LIKE "' + name + '%") ORDER BY NAME ASC, company ASC';
        dataCollector.query(DB_NAME, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('name = ' + name + ' extFrom = ' + extFrom + ': ' + err.stack);
    }
}

function _searchContacts(name, extFrom, cb) {
    var query = 'SELECT * FROM ' + DB_NAME + ' WHERE (owner_id="' + extFrom + '" OR type="public") AND (name LIKE "%' + name + '%" OR company LIKE "%' + name + '%" OR workphone LIKE "%' + name + '%" OR homephone LIKE "%' + name + '%" OR cellphone LIKE "%' + name + '%") ORDER BY NAME ASC, company ASC';
    dataCollector.query(DB_NAME, query, function (result) {
        cb(result);
    });
}

function _getAllContactsByNum(num, numToSearch, cb) {
    try {
        var query = 'SELECT * FROM ' + DB_NAME + ' WHERE (homephone="' + numToSearch + '" OR workphone="' + numToSearch + '" OR cellphone="' + numToSearch + '")';
        dataCollector.query(DB_NAME, query, function (result) {
            cb(result, num);
        });
    } catch (err) {
        logger.error('num = ' + num + ', numToSearch = ' + numToSearch + ': ' + err.stack);
    }
}
