var fs = require("fs");
var sys = require("sys");
var path = require("path");
var nethesis_io = require('./nethesis_io');
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[voicemail]');
const DIR_PATH_VM = "/var/spool/asterisk/voicemail/default";
const OLD_DIR = "Old";
const NEW_DIR = "INBOX";
const PERSONAL_DIR = "Family";
const DEFAULT_AUDIO_EXT = "wav";
/* contains the list of voicemail for each extension. The key is the extension (ex. 271)
 * and the value is an array of objects. Each object has keys and values for one recording */
var _voicemailList = {};
// Constructor 
exports.Voicemail = function(){
	_init();
	this.getVoicemailList = function(ext) { return _getVoicemailList(ext); }
	this.getFilepath = function(filename,type,ext){ return _getFilepath(filename,type,ext); }
	this.delVoicemail = function(filename,type,ext){ return _delVoicemail(filename,type,ext); }
	this.updateVoicemailList = function(dirpath){ _updateVoicemailList(dirpath); }
	this.getCountVoicemailNewx = function(ext){ return _getCountVoicemailNewx(ext); }
	this.setLogger = function(logfile,level){
		log4js.addAppender(log4js.fileAppender(logfile), '[voicemail]');
		logger.setLevel(level);
		_setLibLogger(logfile,level); // set also the library logger
	}
}
function _getCountVoicemailNewx(ext){
	return _voicemailList[ext].newx.length;
}
function _updateVoicemailList(dirpath){
	var arrpath = dirpath.split('/');
	var dirtype = arrpath[arrpath.length-1];
	var ext = arrpath[arrpath.length-2];
	_readVoicemailDir(dirtype,dirpath,ext);
	logger.debug("updated voicemail list of [" + ext + "] of type '"+dirtype+"'");
}
// set loggers of all libraries
function _setLibLogger(logfile,level){
	nethesis_io.setLogger(logfile,level); // set also the library logger
}
// delete voicemail file
function _delVoicemail(filename,type,ext){
	var filepath = _getFilepath(filename,type,ext);
	var dirpathType = _getDirpathType(type,ext);
	var res = nethesis_io.deleteAllFiles(dirpathType,filename);
	return res;
}
// return directory path of one type of voicemail: new, old, ...
function _getDirpathType(type,ext){
	var typedir = '';
	switch(type){
		case 'new':
                        typedir = NEW_DIR;
                break;
                case 'old':
                        typedir = OLD_DIR;
                break;
                case 'personal':
                        typedir = PERSONAL_DIR;
                break;
	}
	return path.join(DIR_PATH_VM,ext,typedir);
}
// return path of voicemail file
function _getFilepath(filename,type,ext){
	var dirpathType = _getDirpathType(type,ext);
	return path.join(dirpathType,filename) + "." + DEFAULT_AUDIO_EXT;
}
// return the voicemail list of one extension
function _getVoicemailList(ext){
	return _voicemailList[ext];
}
// initialize _voicemailList
function _init(){
	var files = fs.readdirSync(DIR_PATH_VM);
	var filepath = '';
	var sta = undefined;
	for(var i=0; i<files.length; i++){
		filepath = path.join(DIR_PATH_VM, files[i]);
		sta = fs.statSync(filepath);
		if(sta.isDirectory()){
			_readVoicemailExtension(filepath,files[i]); // read directory of one extension
		}
	}
}
// initialize all types of voicemail of one extension
function _readVoicemailExtension(dirpath,ext){
	_voicemailList[ext] = {}; // init _voicemailList of one extension
	_voicemailList[ext].old = [];
	_voicemailList[ext].newx = [];
	_voicemailList[ext].personal = [];
	var files = fs.readdirSync(dirpath);
	var filepath = '';
	var filename = '';
	var sta = undefined;
	for(var i=0; i<files.length; i++){
		filename = files[i];
		filepath = path.join(dirpath, filename);
		sta = fs.statSync(filepath);
		if(sta.isDirectory() && (filename===OLD_DIR || filename===NEW_DIR || filename===PERSONAL_DIR)){
			_readVoicemailDir(filename,filepath,ext); // read voicemail of one directory of one extension
		}
	}
}
// empty voicemail list of a type (new,old...) of an extension
function _resetVoicemailList(type,extension){
	switch(type){
		case OLD_DIR:
			_voicemailList[extension].old = [];
		break;
		case NEW_DIR:
			_voicemailList[extension].newx = [];
		break;
		case PERSONAL_DIR:
			_voicemailList[extension].personal = [];
		break;
	}
}
// initialize voicemail present into 'dir' directory of extension 'extension'
function _readVoicemailDir(dir,dirpath,extension){
	_resetVoicemailList(dir,extension); // reset voicemail list before update it
	var files = fs.readdirSync(dirpath);
	var filename = '';
	var filepath = '';
	var name = '';
	var extfile = '';
	var content = '';
	for(var i=0; i<files.length; i++){
		filename = files[i];
		name = filename.split('.')[0];
		extfile = filename.split('.')[1].toLowerCase();
		if(extfile==='txt'){ // txt file report voicemail information
			filepath = path.join(dirpath,filename);
			content = iniparser.parseSync(filepath); // the txt file has ini structure with one "[message]" section
			content.message.filename = name; // add filename
			switch(dir){ // store voicemail into appropriate array of extension in _voicemailList object
				case OLD_DIR:
					_voicemailList[extension].old.push(content.message);
				break;
				case NEW_DIR:
					_voicemailList[extension].newx.push(content.message);
				break;
				case PERSONAL_DIR:
					_voicemailList[extension].personal.push(content.message);
				break;
			}
		}
	}
}
