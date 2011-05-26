var fs = require("fs");
var sys = require("sys");
var inherits = require("sys").inherits;
var EventEmitter = require("events").EventEmitter;
const DEBUG = true;
const INTERVAL_POLLING = 0;
// list of files to control
fileToControl = {};
// list of directories to control
dirToControl = {};
// Constructor
exports.Controller = function(){
	EventEmitter.call(this);
	self = this;
	this.addFile = function(filename) { addFile(filename) };
	this.addDir = function(dir) { addDir(dir) };
} 
function log(msg){
	if(DEBUG) console.log(new Date().toString() + " - [controller.js]: " + msg);
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
