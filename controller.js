var fs = require("fs");
var inherits = require("sys").inherits;
var EventEmitter = require("events").EventEmitter;

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
		console.log("Error: " + dir + " is not directory");
		console.log(err);
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
                console.log("Error: " + filename + " is not file");
                console.log(err);
                return;
        }
}

inherits(exports.Controller, EventEmitter);
