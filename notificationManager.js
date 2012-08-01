var fs = require("fs")
var path = require('path');
var sys = require("sys")
var iniparser = require("./lib/node-iniparser/lib/node-iniparser")
var log4js = require('./lib/log4js-node/lib/log4js')()
var logger = log4js.getLogger('[NotificationManager]');
var _dataCollector;
var _unreadNotifications;

// Constructor
exports.NotificationManager = function(){
    this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[NotificationManager]'); logger.setLevel(level); }
    this.setDataCollector = function (dc) { _setDataCollector(dc); }
    this.updateUnreadNotificationsList = function () { _updateUnreadNotificationsList(); }
    this.getNotificationsByExt = function (ext) { return _getNotificationsByExt(ext); }
}

function _getNotificationsByExt(ext) {
    try {
        return _unreadNotifications[ext];
    } catch (err) {
        logger.error('ext = ' + ext + ': ' + err.stack);
    }
}

function _updateUnreadNotificationsList() {
    _initUnreadNotificationsList();
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
