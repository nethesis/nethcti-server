var fs = require("fs");
var sys = require("sys");
var path = require("path");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[voicemail]');
const DIR_PATH_VM = "/var/spool/asterisk/voicemail/default";
const OLD_DIR = "Old";
const NEW_DIR = "INBOX";
const PERSONAL_DIR = "Family";
/* contains the list of voicemail for each extension. The key is the extension (ex. 271)
 * and the value is an array of objects. Each object has keys and values for one recording */
var _voicemailList = {};
// Constructor 
exports.Voicemail = function(){
	_init();
	this.getVoicemailList = function(ext) { return _getVoicemailList(ext); }
}
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
	logger.debug('_voicemailList initialized: has ' + Object.keys(_voicemailList).length + " extension");
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
// initialize voicemail present into 'dir' directory of extension 'extension'
function _readVoicemailDir(dir,dirpath,extension){
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
