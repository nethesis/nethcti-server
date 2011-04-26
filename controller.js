var fs = require("fs");
var inherits = require("sys").inherits;
var EventEmitter = require("events").EventEmitter;

fileToControl = {};

exports.Controller = function(){
	EventEmitter.call(this);
	self = this;
	this.addFile = function(filename) { addFile(filename) };
} 


function addFile(filename){
	if(fileToControl[filename]==undefined){
		fs.watchFile(filename, function(curr, prev){
			self.emit("change", filename);
		});	
	}
}

inherits(exports.Controller, EventEmitter);
