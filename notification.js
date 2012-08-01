var fs = require("fs")
var path = require('path');
var sys = require("sys")
var iniparser = require("./lib/node-iniparser/lib/node-iniparser")
var log4js = require('./lib/log4js-node/lib/log4js')()
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[Profiler]')
// Constructor
exports.Notification = function(){
    this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[Notification]'); logger.setLevel(level); }
}
