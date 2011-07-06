var fs = require("fs");
var sys = require("sys");
var inherits = require("sys").inherits;
var EventEmitter = require("events").EventEmitter;
var log4js = require('./lib/log4js-node/lib/log4js')();
const INTERVAL_POLLING = 0;

/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF)
 */
var logger = log4js.getLogger('[Controller]');
fileToControl = {} // list of files to control
dirToControl = {} // list of directories to control
// Constructor
exports.Controller = function(){
	EventEmitter.call(this);
	self = this;
	this.addFile = function(filename) { addFile(filename) };
	this.addDir = function(dir) { addDir(dir) };
	this.addVMDir = function(dir) { addVMDir(dir) }
        this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[Controller]'); logger.setLevel(level); }
} 
function addVMDir(dir){
	try{
                var stat = fs.lstatSync(dir)
                if(stat.isDirectory){
                        dirToControl[dir] = true;
                        fs.watchFile(dir, { persistent: true, interval: INTERVAL_POLLING }, function(curr, prev){
                                if(curr.mtime.getTime()!=prev.mtime.getTime())
                                        self.emit("change_vm_dir", dir);
                        })
                }
        }
        catch(err){
                log("Error: " + dir + " is not directory")
                log(sys.inspect(err))
                return
        }
}
function log(msg){
	logger(msg);
}
// add directory to control and emit event when modified time changes
function addDir(dir){
	try{
		var stat = fs.lstatSync(dir);
		if(stat.isDirectory){
	                dirToControl[dir] = true;
			fs.watchFile(dir, { persistent: true, interval: INTERVAL_POLLING }, function(curr, prev){
				if(curr.mtime.getTime()!=prev.mtime.getTime()){
					self.emit("change_dir", dir);
				}
			});
	        }
	}
	catch(err){	
		log("Error: " + dir + " is not directory");
		log(sys.inspect(err));
		return;
	}
}
// add file to control and emit event when modified time changes
function addFile(filename){
	try{
                var stat = fs.lstatSync(filename);
                if(stat.isFile()){
                        fileToControl[filename] = true;
                        fs.watchFile(filename, { persistent: true, interval: INTERVAL_POLLING }, function(curr, prev){
                                if(curr.mtime.getTime()!=prev.mtime.getTime()){
                                        self.emit("change_file", filename);
                                }
                        });
                }
        }
        catch(err){
                log("Error: " + filename + " is not file");
                log(sys.inspect(err));
                return;
        }
}
inherits(exports.Controller, EventEmitter);
