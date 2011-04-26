var fs = require("fs");
var inherits = require("sys").inherits;
var EventEmitter = require("events").EventEmitter;

fileToControl = {};
dirToControl = {};

exports.Controller = function(){
	EventEmitter.call(this);
	self = this;
	this.addFile = function(filename) { addFile(filename) };
	this.removeFile = function(filename) { removeFile(filename) };
	this.addDir = function(dir) { addDir(dir) };
} 

function addDir(dir){
	try{
		var stat = fs.lstatSync(dir);
		if(stat.isDirectory){
	                dirToControl[dir] = true;
			fs.watchFile(dir, { persistent: true, interval: 0 }, function(curr, prev){
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

function addFile(filename){
		fileToControl[filename] = true;
		fs.watchFile(filename, function(curr, prev){
			self.emit("change", filename);
			console.log(curr);
			console.log(prev);
		});	
}

function removeFile(filename){
	fileToControl[filename] = false;
	fs.unwatchFile(filename);
}
inherits(exports.Controller, EventEmitter);
