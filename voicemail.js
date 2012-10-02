var fs = require("fs");
var pathreq = require('path');
var sys = require("sys");
var path = require("path");
var nethesis_io = require('./nethesis_io');
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
var child_process = require('child_process');
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[Voicemail]');
const DIR_PATH_VM = "/var/spool/asterisk/voicemail/default";
const OLD_DIR = "Old";
const NEW_DIR = "INBOX";
const PERSONAL_DIR = "Family";
const DEFAULT_AUDIO_EXT = "wav";
const INACTIVE_EXT = 'inactive';
/* contains the list of voicemail for each extension. The key is the extension (ex. 271)
 * and the value is an array of objects. Each object has keys and values for one recording */
var _voicemailList = {};
// Constructor 
exports.Voicemail = function(){
	this.init = function(){ _init(); }
	this.getVoicemailList = function(ext) { return _getVoicemailList(ext); }
	this.getFilepath = function(filename,type,ext){ return _getFilepath(filename,type,ext); }
	this.getFilepathCustomMessage = function(filename,ext){ return _getFilepathCustomMessage(filename,ext); }
	this.delVoicemail = function(filename,type,ext){ return _delVoicemail(filename,type,ext); }
	this.updateVoicemailList = function(dirpath){ _updateVoicemailList(dirpath); }
	this.getCountVoicemailNewx = function(ext){ return _getCountVoicemailNewx(ext); }
	this.getCustomMessages = function(ext){ return _getCustomMessages(ext); }
	this.activateCustomMessage = function(filename,ext){ return _activateCustomMessage(filename,ext); }
	this.disactivateCustomMessage = function(filename,ext){ return _disactivateCustomMessage(filename,ext); }
	this.deleteCustomMessage = function(filename,ext){ return _deleteCustomMessage(filename,ext); }
	this.deleteCustomMessageInactive = function(filename,ext){ return _deleteCustomMessageInactive(filename,ext); }
	//this.copyCustomVmMsgAsWAV = function(ext,filename,cb){ _copyCustomVmMsgAsWAV(ext,filename,cb); }
	this.setLogger = function(logfile,level){
		log4js.addAppender(log4js.fileAppender(logfile), '[Voicemail]');
		logger.setLevel(level);
		_setLibLogger(logfile,level); // set also the library logger
	}
}
/*
function _copyCustomVmMsgAsWAV(ext,filename,cb){
	var filepath1 = DIR_PATH_VM + '/' + ext + '/' + filename + '.wav';
	var filepath2 = DIR_PATH_VM + '/' + ext + '/' + filename + '.WAV';
	var res = child_process.spawn('cp',[filepath1,filepath2]);
	res.on('exit',function(code){
		cb(code);
	});
}
*/
// Delete inactive custom message (NAME.wav.inactive)
function _deleteCustomMessageInactive(filename,ext){
	var filepath = DIR_PATH_VM + '/' + ext + '/' + filename + '.' + INACTIVE_EXT;
	if(path.existsSync(filepath)){
		fs.unlinkSync(filepath);
		logger.debug('deleted inactive custom message: ' + filepath);
		return true;
	}
	logger.warn('inactive custom message not exists: ' + filepath);
	return false;
}
// Delete file wav and WAV, active and inactive
function _deleteCustomMessage(filename,ext){
	var name = path.basename(filename,'.wav');
	var filename2 = name + '.WAV';
	var filepath1 = DIR_PATH_VM + '/' + ext + '/' + filename;
	var filepath2 = DIR_PATH_VM + '/' + ext + '/' + filename2;
	if(!path.existsSync(filepath1)){
		filepath1 += '.' + INACTIVE_EXT;
	}
	if(!path.existsSync(filepath2)){
		filepath2 += '.' + INACTIVE_EXT;
	}
	try{
		if(path.existsSync(filepath1)){
			fs.unlinkSync(filepath1);
		}
		if(path.existsSync(filepath2)){
			fs.unlinkSync(filepath2);
		}
		logger.debug('deleted voicemail custom message '+filename+' for vm ' + ext);
		return true;
	} catch(err){
		logger.error('deleting custom voicemail message ' + filename + ' for vm ' + ext + ' fail: ' + err.message);
		return false;
	}
}
function _disactivateCustomMessage(filename,ext){
        var name = path.basename(filename,'.wav');
        var filepath1 = DIR_PATH_VM + '/' + ext + '/' + filename;
        var newFilepath1 = DIR_PATH_VM + '/' + ext + '/' + filename + '.'+ INACTIVE_EXT;
        var filename2 = name + '.WAV';
        var filepath2 = DIR_PATH_VM + '/' + ext + '/' + filename2;
        try{
                fs.renameSync(filepath1,newFilepath1);
		if(path.existsSync(filepath2)){
			fs.unlinkSync(filepath2);
			logger.debug('removed ' + filepath2);
		}
                logger.debug('disactivated voicemail custom message: ' + filename + ' for extension ' + ext);
                return true;
        } catch(err){
                logger.error('disactivating voicemail custom message ' + filename + ' for extension ' + ext + ' fail: ' + err.message);
                return false;
        }
}
function _activateCustomMessage(filename,ext){
	var filepath1 = DIR_PATH_VM + '/' + ext + '/' + filename + '.'+INACTIVE_EXT;
	var newFilepath1 = DIR_PATH_VM + '/' + ext + '/' + filename;
	try{
		fs.renameSync(filepath1,newFilepath1);
		logger.debug('activated voicemail custom message: ' + filename + ' for extension ' + ext);
		return true;
	} catch(err){
		logger.error('activating voicemail custom message ' + filename + ' for extension ' + ext + ' fail: ' + err.message);
		return false;
	}
}
// Return an object containing voicemail custom message properties
// Key is the type of message (ex. busy) and value is the properties
function _getCustomMessages(ext){
	const DEFAULT_PATH = '/var/spool/asterisk/voicemail/default/';
        var obj = {};
        var path = DEFAULT_PATH+ext;
        if(pathreq.existsSync(path)){
                path = path + '/';
                // temp
                var pathFile1 = path + 'temp.wav';
                //var pathFile2 = path + 'temp.WAV';
                var pathFile3 = path + 'temp.wav.'+INACTIVE_EXT;
                //var pathFile4 = path + 'temp.WAV.'+INACTIVE_EXT;
                var present = false;
                var active = false;
                if(pathreq.existsSync(pathFile1)){
                        present = true;
                        active = true;
                } else if(pathreq.existsSync(pathFile3)){
                        present = true;
                }
                obj['temp'] = {};
                obj['temp'].isPresent = present;
                obj['temp'].isActive = active;
                // unavailable
                pathFile1 = path + 'unavail.wav';
                //pathFile2 = path + 'unavail.WAV';
                pathFile3 = path + 'unavail.wav.'+INACTIVE_EXT;
                //pathFile4 = path + 'unavail.WAV.'+INACTIVE_EXT;
                present = false;
                active = false;
                if(pathreq.existsSync(pathFile1)){
                        present = true;
                        active = true;
                } else if(pathreq.existsSync(pathFile3)){
                        present = true;
                }
                obj['unavail'] = {};
		obj['unavail'].isPresent = present;
                obj['unavail'].isActive = active;
                // busy
                pathFile1 = path + 'busy.wav';
                //pathFile2 = path + 'busy.WAV';
                pathFile3 = path + 'busy.wav.'+INACTIVE_EXT;
                //pathFile4 = path + 'busy.WAV.'+INACTIVE_EXT;
                present = false;
                active = false;
                if(pathreq.existsSync(pathFile1)){
                        present = true;
                        active = true;
                } else if(pathreq.existsSync(pathFile3)){
                        present = true;
                }
                obj['busy'] = {};
                obj['busy'].isPresent = present;
                obj['busy'].isActive = active;
                // greetings
                pathFile1 = path + 'greet.wav';
                //pathFile2 = path + 'greet.WAV';
                pathFile3 = path + 'greet.wav.'+INACTIVE_EXT;
                //pathFile4 = path + 'greet.WAV.'+INACTIVE_EXT;
                present = false;
                active = false;
                if(pathreq.existsSync(pathFile1)){
                        present = true;
                        active = true;
                } else if(pathreq.existsSync(pathFile3)){
                        present = true;
                }
                obj['greet'] = {};
                obj['greet'].isPresent = present;
                obj['greet'].isActive = active;
        } else {
		logger.warn(path + " not exists (getCustomMessages)");
	}
        return obj;
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
// Return path of the custom message
function _getFilepathCustomMessage(filename,ext){
	return DIR_PATH_VM + '/' + ext + '/' + filename; 
}
// return path of voicemail file
function _getFilepath(filename,type,ext){
	var dirpathType = _getDirpathType(type,ext);
	return path.join(dirpathType,filename) + "." + DEFAULT_AUDIO_EXT;
}
// Return the voicemail list of one extension
function _getVoicemailList(ext){
	if(_voicemailList[ext]===undefined){ // when /var/spool/asterisk/voicemail/default directory not exists
		logger.debug('voicemail list of ext ' + ext + ' is undefined');
		return { newx: [], old: [], personal: [] };
	}
	return _voicemailList[ext];
}
// initialize _voicemailList
function _init(){
	if(path.existsSync(DIR_PATH_VM)){
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
	} else {
		logger.warn(DIR_PATH_VM + ' not exists');
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
    try {
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
    } catch (err) {
        logger.error(err.stack);
    }
}
