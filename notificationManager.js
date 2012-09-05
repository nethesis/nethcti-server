var fs = require("fs")
var path = require('path');
var sys = require("sys")
var iniparser = require("./lib/node-iniparser/lib/node-iniparser")
var log4js = require('./lib/log4js-node/lib/log4js')()
var logger = log4js.getLogger('[NotificationManager]');
var _dataCollector;
var _unreadNotifications;
var _defaultEmptyNotifications = { unreadPostit: [] };

// Constructor
exports.NotificationManager = function(){
    this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[NotificationManager]'); logger.setLevel(level); }
    this.setDataCollector = function (dc) { _setDataCollector(dc); }
    this.updateUnreadNotificationsList = function () { _updateUnreadNotificationsList(); }
    this.getNotificationsByExt = function (ext) { return _getNotificationsByExt(ext); }
    this.updateUnreadNotificationsListForExt = function (ext, cb) { _updateUnreadNotificationsListForExt(ext, cb); }
    this.storeNotificationCellphoneAndEmail = function (ext, cellphone, email, cb) { _storeNotificationCellphoneAndEmail(ext, cellphone, email, cb); }
}

function _storeNotificationCellphoneAndEmail(ext, cellphone, email, cb) {
    try {
        if (cellphone === undefined) {
            cellphone = '';
        }
        if (email === undefined) {
            email = '';
        }
       _dataCollector.storeNotificationCellphoneAndEmail(ext, cellphone, email, cb);
    } catch (err) {
       logger.error('ext = ' + ext + ', cellphone = ' + cellphone + ', email = ' + email + ': ' + err.stack);
    }
}

function _getNotificationsByExt(ext) {
    try {
        if (_unreadNotifications[ext] === undefined) {
            return _defaultEmptyNotifications;
        }
        return _unreadNotifications[ext];
    } catch (err) {
        logger.error('ext = ' + ext + ': ' + err.stack);
    }
}



function _updateUnreadNotificationsList() {
    _initUnreadNotificationsList();
}

// It can be optimized to update only part for ext extension
function _updateUnreadNotificationsListForExt(ext, cb) {
    try {
        _unreadNotifications = {};
        _dataCollector.getAllUnreadPostit(function (res) {
            try {
                var i, assigned;
                for (i = 0; i < res.length; i++) {
                    assigned = res[i].assigned;
                    if (_unreadNotifications[assigned] === undefined) {
                        _unreadNotifications[assigned] = { unreadPostit: [] };
                    }
                    _unreadNotifications[assigned].unreadPostit.push(res[i]);
                }
                logger.debug('notification list initialized: ' + res.length + ' unread postit elements');
                var not = _unreadNotifications[ext];
                if (not === undefined) {
                    not = _defaultEmptyNotifications;
                }
                cb(not);
            } catch (err) {
                logger.error(err.stack);
            }
        });
    } catch (err) {
        logger.error(err.stack);
    }
}

function _initUnreadNotificationsList() {
    try {
        _unreadNotifications = {};
        _dataCollector.getAllUnreadPostit(function (res) {
            try {
                var i, assigned;
                for (i = 0; i < res.length; i++) {
                    assigned = res[i].assigned;
                    if (_unreadNotifications[assigned] === undefined) {
                        _unreadNotifications[assigned] = { unreadPostit: [] };
                    }
                    _unreadNotifications[assigned].unreadPostit.push(res[i]);
                }
                logger.debug('notification list initialized: ' + res.length + ' unread postit elements');        
            } catch (err) {
                logger.error(err.stack);
            }
        });
    } catch (err) {
        logger.error(err.stack);
    }
}


function _setDataCollector(dc) {
    _dataCollector = dc;
    logger.debug("dataCollector added");
    _initUnreadNotificationsList();
}
