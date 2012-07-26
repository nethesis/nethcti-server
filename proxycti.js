var ast = require('./asterisk');
var net = require('net');
var execreq = require('child_process').exec;
var dataReq = require("./dataCollector.js");
var proReq = require("./profiler.js");
var authReq = require("./authenticator.js");
var contrReq = require("./controller.js");
var routerReq = require("./router.js");
var nethCtiPhonebookReq = require('./nethCtiPhonebook.js');
var modopReq = require("./modop.js");
var voicemailReq = require("./voicemail.js");
var http = require('http');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var io = require('./lib/socket.io');
var sys = require(process.binding('natives').util ? 'util' : 'sys');
var pathreq = require('path');
var ejs = require('./lib/ejs/ejs.js');
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
var formidable = require('./lib/node-formidable');
var util = require('util');
const PROXY_CONFIG_FILENAME = "config/proxycti.ini";
const SMS_CONFIG_FILENAME = "config/sms.ini";
const FILE_LOGIN_LOG = './store/login.log';
const AST_CALL_AUDIO_DIR = "/var/spool/asterisk/monitor";
const SMS_DIR = "sms";
const CALL_PREFIX = "CTI->";
const SPY_PREFIX = "SPY-";
const REDIRECT_VM_PREFIX = "REDIR_VM-";
const START_AUDIO_FILE = "auto-";
const DIAL_FROM = 1;
const DIAL_TO = 0;
const N_AST_RECON = 3; // number of reconnection attempts to asterisk when fail connection
const DELAY_AST_RECON = 8000; // delay between two reconnection attempts to asterisk
const TIMEOUT_GET_VCARD_CC = 4000; // when GET_VCARD_CC request is not returned
var cc_templates = {}; // key is filename of the template and value is its content
var template_cc_dir = { // directories of all templates (customer card, vcard, ...)
	PROXY: './template',
	ESMITH: '/home/e-smith/proxycti/template'
};
var astrecon = false; // avoids more contemporary reconnection to asterisk server
var server; // http server
var counter_ast_recon = 0;
var extToReturnExtStatusForOp = '';
var clientToReturnExtStatusForOp = '';
/* The list of the logged clients. The key is the 'exten' and the value is the 
 * object relative to the client. When the client logs off, the corresponding key 
 * and value are removed */ 
var clients = {};
var chStat = {}; // object that contains the 'uniqueid' as a key
var server_conf = {}; // configuration content of the file config/proxycti.ini
var sms_conf = {}; // configuration content of the file config/sms.ini
// This object is the response that this server pass to the clients.
var ResponseMessage = function(clientSessionId, typeMessage, respMessage){
	this.clientSessionId = clientSessionId;
	this.typeMessage = typeMessage;
	this.respMessage = respMessage;
}
var currentCallInInfo = {}; // the info (callNotes, Customer Card...) for the current caller
var chatAssociation = {}; // association between extensions and their chat user

function readAllTemplate(){
	var files = {};
	var temp = [];
	var est = '';
	var filepath = '';
	var dirpath = '';
	for(var key in template_cc_dir){
		dirpath = template_cc_dir[key];
		temp = fs.readdirSync(dirpath);
		for(var x=0; x<temp.length; x++){
			est = temp[x].substring( temp[x].length-4,temp[x].length );
			if(est==='.ejs'){
				filepath = pathreq.join(dirpath,temp[x]);
				files[temp[x]] = filepath;
			}
		}
	}
	// order 
	var filesArr = Object.keys(files);
	filesArr.sort();
	var filename = '';
	var fpath = '';
	var content = '';
	for(var x=0; x<filesArr.length; x++){
		filename = filesArr[x];
		fpath = files[filename];
		// read file content
		content = fs.readFileSync(fpath,'UTF-8');
		cc_templates[filename] = content;
	}
}
readAllTemplate();

// initialize parameters for this server and for asterisk server
initServerAndAsteriskParameters();
function initSmsParameters(){
	if(!pathreq.existsSync(SMS_CONFIG_FILENAME)){
		logger.warn('configuration file \''+SMS_CONFIG_FILENAME+'\' not exists');
		sms_conf['SMS'] = {};
	} else {
		sms_conf = iniparser.parseSync(SMS_CONFIG_FILENAME);
	}
	if(sms_conf['SMS']===undefined){
		logger.warn('check \''+SMS_CONFIG_FILENAME+'\'');
		sms_conf['SMS'] = {};
	}
}
// Initialize some configuration parameters
function initServerAndAsteriskParameters(){
	if(!pathreq.existsSync(PROXY_CONFIG_FILENAME)){
		console.error('ERROR: configuration file \''+PROXY_CONFIG_FILENAME+'\' for server not exists');
		process.exit(0);
	}
	server_conf = iniparser.parseSync(PROXY_CONFIG_FILENAME);
	if(server_conf.ASTERISK===undefined || server_conf.SERVER_PROXY===undefined || 
		server_conf.ASTERISK.user===undefined || server_conf.ASTERISK.pass===undefined || server_conf.ASTERISK.host===undefined ||
		server_conf.SERVER_PROXY.hostname===undefined || server_conf.SERVER_PROXY.port===undefined || 
		server_conf.SERVER_PROXY.logfile===undefined || server_conf.SERVER_PROXY.loglevel===undefined || server_conf.SERVER_PROXY.prefix===undefined){
		console.error('ERROR in configuration file \''+PROXY_CONFIG_FILENAME+'\'');
		process.exit(0);
	}
	asterisk_user = server_conf.ASTERISK.user;
	asterisk_pass = server_conf.ASTERISK.pass;
	asterisk_host = server_conf.ASTERISK.host;
	hostname = server_conf.SERVER_PROXY.hostname;
	port = server_conf.SERVER_PROXY.port;
	logfile = server_conf.SERVER_PROXY.logfile;
	if(logfile == undefined) {
		logfile = "/var/log/proxycti.log";
	}
	loglevel = server_conf.SERVER_PROXY.loglevel;
	if(loglevel == undefined) {
		loglevel = "INFO";
	}
	if(server_conf.SERVER_CHAT===undefined || server_conf.SERVER_CHAT.url===undefined){
		console.log('WARNING: section [SERVER_CHAT] or its \'url\' not exists in configuration file \''+PROXY_CONFIG_FILENAME+'\'');
		server_conf.SERVER_CHAT = {};
		server_conf.SERVER_CHAT.url = '';
	}
}

/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
log4js.clearAppenders();
log4js.addAppender(log4js.fileAppender(logfile), '[ProxyCTI]');
var logger = log4js.getLogger('[ProxyCTI]');
logger.setLevel(loglevel);

// initialize login log file
log4js.addAppender(log4js.fileAppender(FILE_LOGIN_LOG),'login');
var login_logger = log4js.getLogger('login');
login_logger.setLevel('DEBUG');

// START
logger.warn("Starting server...");

initSmsParameters();

// Add object modules
var profiler = new proReq.Profiler();
profiler.setLogger(logfile,loglevel);
var dataCollector = new dataReq.DataCollector();
dataCollector.setLogger(logfile,loglevel);
var authenticator = new authReq.Authenticator();
authenticator.setLogger(logfile,loglevel);
var controller = new contrReq.Controller(); // check changing in audio directory
controller.setLogger(logfile,loglevel);


var voicemail = new voicemailReq.Voicemail();
voicemail.setLogger(logfile,loglevel);
voicemail.init();

var modop = new modopReq.Modop();
modop.setLogger(logfile,loglevel);
modop.addController(controller)

var nethCtiPhonebook = new nethCtiPhonebookReq.nethCtiPhonebook();
nethCtiPhonebook.setLogger(logfile,loglevel);
nethCtiPhonebook.setDataCollector(dataCollector);
nethCtiPhonebook.setModop(modop);
var router = new routerReq.Router(); // check changing in audio directory
router.setLogger(logfile,loglevel);
router.addModule('nethCtiPhonebook', nethCtiPhonebook);

logger.debug('added object modules: \'Profiler\', \'DataCollector\', \'Authenticator\', \'Modop\' and \'Controller\'')
controller.addDir(AST_CALL_AUDIO_DIR);
controller.addListener('change_dir', function(dir){
	logger.debug("EVENT 'chang_dir' by controller relative to directory '"+dir+"'");
	if(dir==AST_CALL_AUDIO_DIR){
		logger.debug("update audio file list");
		createAudioFileList();
	}
});
controller.addListener('change_vm_dir', function(dir){ // ex dir: '/var/spool/asterisk/voicemail/default/272/INBOX'
	logger.debug("event 'change_vm_dir'");
        var ext = dir.split('/')[6]
        var actionMailboxCount = {
		Action: 'MailboxCount',
		Mailbox: ext
        }
	try{
	        am.send(actionMailboxCount, function (resp) {
			/* resp = { response: 'Success',
	                actionid: '1308221582955',
	                message: 'Mailbox Message Count',
        	        mailbox: '272',
	                newmessages: '2',
	                oldmessages: '0' } */
	                var newMsgCount = resp.newmessages
		        modop.updateVMCountWithExt(ext,resp.newmessages)
                        var tyext = modop.getTypeExtFromExt(ext);
			updateAllClientsForOpWithTypeExt(tyext);
		});
	} catch(err) {
	        logger.warn("no connection to asterisk: "+err);
	}
	// send info of new voicemail to all clients
	voicemail.updateVoicemailList(dir); // update voicemail list of the extension obtained from dir
	var count = voicemail.getCountVoicemailNewx(ext);
	logger.debug("broadcast 'new_voicemail' info message for [" + ext + "] with " + count + " voicemail to all clients");
	var c = undefined;
	var response = undefined;
	for(key in clients){
                c = clients[key];
		response = new ResponseMessage(c.id, "new_voicemail", '');
        	response.extVoicemail = ext;
		response.countVoicemailNewx = count;
                c.emit('message',response);
                logger.debug("RESP 'new_voicemail' has been sent to client [" + key + "] id '" + c.id + "'");
        }
});
/*
controller.addListener('change_vm_personal_dir', function(dir){
	logger.debug("event 'change_vm_personal_dir'");
	voicemail.updateVoicemailList(dir);

});
controller.addListener('change_vm_old_dir', function(dir){
	logger.debug("event 'change_vm_old_dir'");
	voicemail.updateVoicemailList(dir);
});
*/

/* add 'controller' object to 'profiler' and to 'dataCollector'. They use it to 
 * manage changing in thier configuration file.
 */
profiler.addController(controller);
dataCollector.addController(controller);
logger.debug('add \'controller\' object to \'Profiler\' and \'DataCollector\'')




/* Audio file list of recorded call. This is an hash table that has the 'unique id' of the file
 * as the key and the 'filename' as value. (view 'createAudioFileList' function) */
var audioFileList = {};
createAudioFileList();
/* Create hash table of audio files. The key is the unique id of the file, and the value is set to filename.
 * The function attempt to recognize three format of audio file:
 * ex. of file name recorded by cti: 'auto-500-501-20110426-113833-1303810692.18-in.wav'
 * ex. of file name recorded by asterisk: 'OUT202-20110405-173946-1302017986.4016.wav' or 'IN202-20110405-173946-1302017986.4016.wav'
 * ex. of file name automatically recorder through user amp setting: '20110829-124622-1314614782.16.wav'
 * In this last case, the function attempt to find uniqueid field (third field of filename) in 'cdr' table of 'asteriskcdrdb' db.
 * This request is asynchronous. In the case of unknown  format of audio file, one warning log is added to log file */
function createAudioFileList(){
    try {
	logger.debug('start creation of audio file list present in ' + AST_CALL_AUDIO_DIR);
	audioFileList = {};
        var temp = fs.readdirSync(AST_CALL_AUDIO_DIR);
        var uid = undefined;
        var filename = undefined;
	var asyncReq = false;
	var countUnknown = 0;
	var listUniqueIdQuery = [];
	var tempAssocQueryUniqueId = {};
        for(var i=0; i<temp.length; i++){
	    try{
		asyncReq = false; // tell if the filename need an asynchronous request to db
                uid = undefined;
                filename = temp[i];
                if(filename.substring(0,5)===START_AUDIO_FILE){ // filename start with 'auto-' auto-273-271-20120402-152324-1333373001.34-out.wav or auto-273-271-20120402-152324-1333373001.34.wav
                        uid = filename.split("-")[5];
			if(uid!==undefined && uid.substring(uid.length-4,uid.length)==='.wav'){ // audio file mix is prensent so there is auto-273-271-20120402-152324-1333373001.34.wav without 'in' or 'out' tag
				uid = uid.substring(0,uid.length-4);
			}
                } else if(filename.substring(0,3)==="OUT" || filename.substring(0,2)==="IN"){ // filename start with 'OUT' or 'IN'
                        uid = filename.split("-")[3];
			if(uid!==undefined){
	                        uid = uid.split(".")[0] + "." + uid.split(".")[1];
			}
                } else if(uid===undefined) { // filename unknown: try to search in DB 'cdr'
			if(filename.split('-')[3]!==undefined && filename.split('-')[3].indexOf('.wav')!==-1){ // g203-20120306-080207-1331017327.24998.wav
				uid = filename.split("-")[3];
                                uid = uid.split(".")[0]+"."+uid.split(".")[1];
			} else if(filename.split('-')[2]!==undefined && filename.split('-')[2].indexOf('.wav')!==-1){ // 20110113-200833-1294945713.508.wav
				uid = filename.split("-")[2];
				uid = uid.split(".")[0]+"."+uid.split(".")[1];
			}
			if(uid!==undefined){
				listUniqueIdQuery.push(uid);
				tempAssocQueryUniqueId[uid] = filename;
				asyncReq = true; // set asyncReq to not consider uid below
			}
		}
                if(uid!==undefined && asyncReq===false) {
			//logger.debug("add know audio filename: uid \"" + uid + "\" of filename " + filename);
                        audioFileList[uid] = temp[i];
                } else if(asyncReq===false) {
			//logger.warn("format of audio filename unknown: \"" + filename + "\" in " + AST_CALL_AUDIO_DIR + " directory");
			countUnknown++;
		} else {
			//logger.debug("unknown format of audio filename \"" + filename + "\": attempt to find it in db 'cdr' with async request...");
		}
	    } catch(err){
		logger.error("cycle of createAudioFileList: " + err.stack);
    	    }
        }
	logger.debug("recognized audio file record: "  + Object.keys(audioFileList).length);
	logger.debug("unknown audio file record (discarded): "  + countUnknown);
	if(listUniqueIdQuery.length>0){
		logger.debug("uniqueid audio file record to test presence in DB: " + listUniqueIdQuery.length);
		dataCollector.checkListAudioUid(listUniqueIdQuery, function(res){ // res = [ { uniqueid: '1273513626.12' },{ uniqueid: '1273513834.18' },...]
			logger.debug("uniquid audio file record present in DB: " + res.length);
			var utemp = '';
			var ftemp = '';
			for(var i=0; i<res.length; i++){
				utemp = res[i].uniqueid;
				ftemp = tempAssocQueryUniqueId[utemp];
				audioFileList[utemp] = ftemp;
			}
		});
	}
	logger.debug("total audio file record checked from " + AST_CALL_AUDIO_DIR + ": " + i);
	setTimeout(function(){
		logger.debug('audio file record in memory: ' + Object.keys(audioFileList).length);
		logger.debug('end of creation audio file list');
	},5000);
    } catch(err) {
	logger.error(err.stack);
    }
}

// initialize chatAssociation global variable
dataCollector.getChatAssociation(function(results){
	var obj = undefined;
	for(var i=0; i<results.length; i++){
		obj = results[i];
		chatAssociation[obj.extension] = obj.bare_jid;
	}
	logger.debug("initialized chatAssociation from DB: chatAssociation = " + sys.inspect(chatAssociation));
});

/******************************************************
 * Section relative to asterisk interaction    
 */
am = new ast.AsteriskManager({user: asterisk_user, password: asterisk_pass, host: asterisk_host});
logger.debug('created asterisk manager');

am.addListener("serverlogin", function(){
	logger.debug("EVENT 'ServerLogin': asterisk logged in successfully");
	modop.addAsteriskManager(am); // Add asterisk manager to modop
	modop.initExtStatusForOp();
	counter_ast_recon=0;
});
am.addListener("serverloginfailed", function(){
	logger.error("EVENT 'ServerLoginFailed': asterisk login failed (check the config file)");
	process.exit(0);
});

am.addListener('serverconnect', function() {
	logger.debug("EVENT 'ServerConnect' to AST");
	am.login();
});

am.addListener('serverdisconnect', function(had_error) {
	logger.warn("EVENT 'ServerDisconnected': asterisk connection lost");
	recon_ast();
});

am.addListener('servererror', function(err) {
	logger.error("EVENT 'ServerError', connection attempt to asterisk server failed: (" + err + ")");
	recon_ast();
});

/* EVENT 'NewChannel': headers = { event: 'Newchannel',
  privilege: 'call,all',
  channel: 'SIP/270-000001bb',
  channelstate: '0',
  channelstatedesc: 'Down',
  calleridnum: '',
  calleridname: '',
  accountcode: '',
  uniqueid: '1308575856.547' }
*
* when call is to queue
EVENT 'NewChannel': headers = { event: 'Newchannel',
  privilege: 'call,all',
  channel: 'Local/270@from-internal-b7d5;1',
  channelstate: '0',
  channelstatedesc: 'Down',
  calleridnum: '',
  calleridname: '',
  accountcode: '',
  uniqueid: '1308652170.785' } 
*
* when redirect
EVENT 'NewChannel': headers = { event: 'Newchannel',
  privilege: 'call,all',
  channel: 'AsyncGoto/SIP/270-000002dc',
  channelstate: '6',
  channelstatedesc: 'Up',
  calleridnum: '',
  calleridname: '',
  accountcode: '',
  uniqueid: '1308662518.892' } 
  *
  * when callin through a trunk:
EVENT 'NewChannel': headers = { event: 'Newchannel',
  privilege: 'call,all',
  channel: 'IAX2/from-lab-6680',
  channelstate: '4',
  channelstatedesc: 'Ring',
  calleridnum: '305',
  calleridname: 'Andrea Curzi',
  accountcode: '',
  uniqueid: '1308726926.8996' } */
am.addListener('newchannel', function(headers){
	logger.debug("EVENT 'NewChannel': headers = " + sys.inspect(headers))
	logger.debug("key of chStat = " + Object.keys(chStat).length)
	chStat[headers.uniqueid] = {
		channel: headers.channel
	}
})

// Raised for example with unattended transfer call
/*
EVENT 'Transfer': headers = { event: 'Transfer',
  privilege: 'call,all',
  transfermethod: 'SIP',
  transfertype: 'Attended',
  channel: 'SIP/271-000001ac',
  uniqueid: '1339677719.547',
  sipcallid: '68c435bc48aae90a0386ccf32323134f@192.168.5.233',
  targetchannel: 'SIP/271-000001ad',
  targetuniqueid: '1339677724.548' }
*/
am.addListener('transfer', function (headers) {
    try {
	logger.debug("EVENT 'Transfer': headers = " + sys.inspect(headers));
        if (headers.transfertype === 'Attended') {
            var touid = headers.targetuniqueid;
            var tyextToUpdate = modop.transferAttended(headers, chStat[touid]);
            updateAllClientsArrTypeExt(tyextToUpdate);
        }
    } catch(err) {
        logger.error('Transfer event: ' + err.stack);
    }
});

// arr is an array contains type ext to be updated to all clients
function updateAllClientsArrTypeExt(arr) {
    try {
        var i;
        for (i in arr) {
            updateAllClientsForOpWithTypeExt(arr[i]);
        }
    } catch(err) {
        logger.error('updateAllClientsArrTypeExt: ' + err.stack);
    }
}

// Raised for example with unattended transfer call
/*
EVENT 'Masquerade': headers = { event: 'Masquerade',
  privilege: 'call,all',
  clone: 'SIP/272-000001ab',
  clonestate: 'Up',
  original: 'SIP/271-000001ad',
  originalstate: 'Up' }
am.addListener('masquerade', function (headers) {
	logger.debug("EVENT 'Masquerade': headers = " + sys.inspect(headers));
});
*/

// Raised for example with unattended transfer call
/*
EVENT 'Rename': headers = { event: 'Rename',
  privilege: 'call,all',
  channel: 'SIP/272-000001ab',
  newname: 'SIP/272-000001ab<MASQ>',
  uniqueid: '1339677718.546' }
*
EVENT 'Rename': headers = { event: 'Rename',
  privilege: 'call,all',
  channel: 'SIP/271-000001ad',
  newname: 'SIP/272-000001ab',
  uniqueid: '1339677724.548' }
*
EVENT 'Rename': headers = { event: 'Rename',
  privilege: 'call,all',
  channel: 'SIP/272-000001ab<MASQ>',
  newname: 'SIP/271-000001ad<ZOMBIE>',
  uniqueid: '1339677718.546' }
*/
am.addListener('rename', function (headers) {
    try {
        logger.debug("EVENT 'Rename': headers = " + sys.inspect(headers));
	var oldch = headers.channel;
	var newch = headers.newname;
        var huid = headers.uniqueid;

        if (oldch.substr(-6) !== '<MASQ>' && oldch.substr(-8) !== '<ZOMBIE>' &&
            oldch.substring(0, 10) !== 'AsyncGoto/' &&
            newch.substr(-6) !== '<MASQ>' && newch.substr(-8) !== '<ZOMBIE>') {

            var newuid = chStat[huid].otheruid;
            var newStateCaller, newUidCaller, uniq;
            for (uniq in chStat) {
                if (chStat[uniq].channel === newch) {
                    newStateCaller = chStat[uniq];
                    newUidCaller = uniq;
                }
            }
            chStat[newuid]['rec_uniqueid'] = headers.uniqueid;
            var tyextToUpdate = modop.renameTransfAttended(headers, newuid, chStat[newuid], chStat[huid], newStateCaller, newUidCaller);
            updateAllClientsArrTypeExt(tyextToUpdate);
            var extFrom = modop.getExtInternFromChannel(newch);
            updateCurrentCCCalledTypeExt(extFrom, chStat[newuid].calleridnum);
            var extTo = modop.getExtInternFromChannel(chStat[huid].destCh);
            updateCurrentCCCallerTypeExt(extTo, newStateCaller.calleridnum);
        }
    } catch(err) {
        logger.error('Rename event: ' + err.stack);
    }
});

function updateCurrentCCCallerTypeExt(ext, from) {
    try {
        if (clients.hasOwnProperty(ext)) {
            var client = clients[ext];
            var response = new ResponseMessage(client.id, "update_cc_from_attended", '');
            response.from = from;
            client.emit('message',response);
            logger.debug("RESP 'update_cc_from_attended' has been sent to client [" + key + "] id '" + client.id + "'");
        }
    } catch(err) {
        logger.error('updateCurrentCCCallerTypeExt: ' + err.stack);
    }
}

// update one extension with new call connected destination (after attended transfer)
function updateCurrentCCCalledTypeExt(ext, to) {
    try {
        if (clients.hasOwnProperty(ext)) {
            var client = clients[ext];
            var response = new ResponseMessage(client.id, "update_cc_dest_attended", '');
            response.to = to;
            client.emit('message',response);
            logger.debug("RESP 'update_cc_dest_attended' has been sent to client [" + key + "] id '" + client.id + "'");
        }
    } catch(err) {
        logger.error('updateCurrentCCCalledTypeExt: ' + err.stack);
    }
}

am.addListener('queuestatuscomplete',function(headers){
        logger.debug("EVENT 'QueueStatusComplete': headers = " + sys.inspect(headers));
	updateAllClientsWithQueueStatusForOp();
});

/* when call from the soft phone 
 EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'SIP/271-000001be',
  channelstate: '4',
  channelstatedesc: 'Ring',
  calleridnum: '271',
  calleridname: 'device',
  uniqueid: '1308576265.550' }' 
*
* call come from cti:
 EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'SIP/271-000001c4',
  channelstate: '5',
  channelstatedesc: 'Ringing',
  calleridnum: '',
  calleridname: 'CTI-271',
  uniqueid: '1308579754.556' }' 
  *
  * call out through a trunk
EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'SIP/UMTS-0000109c',
  channelstate: '6',
  channelstatedesc: 'Up',
  calleridnum: '3405567088',
  calleridname: '',
  uniqueid: '1308672180.8934' }' 
  *
  * or:
EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'IAX2/from-astr-10508',
  channelstate: '6',
  channelstatedesc: 'Up',
  calleridnum: '222',
  calleridname: 'Gregorio Scafa',
  uniqueid: '1308757311.11029' }'
  *
  * when call come from queue: (CASE C)
EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'Local/210@from-internal-005d;1',
  channelstate: '5',
  channelstatedesc: 'Ringing',
  calleridnum: '0266125547',
  calleridname: 'Microtronica',
  uniqueid: '1308736050.9841' }'
*
* when callin come from group (700 is the group):
EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'SIP/271-0000033b',
  channelstate: '5',
  channelstatedesc: 'Ringing',
  calleridnum: '700',
  calleridname: '',
  uniqueid: '1308745579.1057' }' */
am.addListener('newstate', function(headers){
        logger.debug("EVENT 'NewState': headers '" + sys.inspect(headers) +  "'")
	logger.debug("key of chStat = " + Object.keys(chStat).length)

	var tempUniqueid = '';
	for(uniqueid in chStat){ // get real uniqueid
		if(chStat[uniqueid].channel===headers.channel){
			tempUniqueid = uniqueid;
		}
	}

	/* check if the chStat contains the entry relative to this newstate event.
         * This is because this proxy server can be started after the asterisk server. So some calling can be in execution when this
         * proxy server starting and so it can receive some newState event relative to old call for which it haven't the relative channel in chStat. 
         * In this case it simply discard this newState event */
        if(chStat[tempUniqueid]===undefined){
                logger.debug("discard 'newState' event: it isn't present in chStat. The cause can be the start of this server during the asterisk functioning")
                return
        }

	chStat[tempUniqueid].status = headers.channelstatedesc.toLowerCase()
	/* chstat = { '1308672180.8933': 
	   { channel: 'SIP/272-0000109b',
	     status: 'ring',
	     calleridnum: '272',
	     calleridname: 'device' },
	  '1308672180.8934': { channel: 'SIP/UMTS-0000109c' } }
	*
	* when call come from queue:
	chStat = { '1308736049.9828': 
	   { channel: 'SIP/2004-00001282',
	     status: 'up',
	     calleridnum: '0266125547',
	     calleridname: 'Microtronica' },
	  '1308736049.9829': { channel: 'Local/202@from-internal-4196;1' },
	  '1308736049.9830': { channel: 'Local/202@from-internal-4196;2' },
	  '1308736049.9831': { channel: 'Local/204@from-internal-acce;1' },
	  '1308736049.9832': { channel: 'Local/204@from-internal-acce;2' },
	  '1308736049.9833': { channel: 'Local/205@from-internal-5df7;1' },
	  '1308736049.9834': { channel: 'Local/205@from-internal-5df7;2' },
	  '1308736050.9835': { channel: 'Local/207@from-internal-0f01;1' },
	  '1308736050.9836': { channel: 'Local/207@from-internal-0f01;2' },
	  '1308736050.9837': { channel: 'Local/333@from-internal-caf4;1' },
	  '1308736050.9838': { channel: 'Local/333@from-internal-caf4;2' },
	  '1308736050.9839': { channel: 'Local/209@from-internal-95c6;1' },
	  '1308736050.9840': { channel: 'Local/209@from-internal-95c6;2' },
	  '1308736050.9841': { channel: 'Local/210@from-internal-005d;1' },
	  '1308736050.9842': { channel: 'Local/210@from-internal-005d;2' },
	  '1308736050.9843': { channel: 'Local/211@from-internal-7a3d;1' },
	  '1308736050.9844': { channel: 'Local/211@from-internal-7a3d;2' },
	  '1308736050.9845': { channel: 'Local/212@from-internal-479d;1' },
	  '1308736050.9846': { channel: 'Local/212@from-internal-479d;2' },
	  '1308736051.9847': { channel: 'SIP/202-00001283' },
	  '1308736052.9848': { channel: 'SIP/205-00001284' },
	  '1308736052.9849': { channel: 'SIP/209-00001285' },
	  '1308736052.9850': 
	   { channel: 'SIP/210-00001286',
	     status: 'ringing',
	     calleridnum: '210',
	     calleridname: '' } }
	*
	* when callin come from group (700):
	chstat = { '1308745579.1055': 
	   { channel: 'SIP/272-00000339',
	     status: 'ring',
	     calleridnum: '272',
	     calleridname: 'device' },
	  '1308745579.1056': { channel: 'SIP/270-0000033a' },
	  '1308745579.1057': { channel: 'SIP/271-0000033b' } } */
	// calleridnum
	if(headers.calleridnum!='') // call come from soft phone
		chStat[tempUniqueid].calleridnum = headers.calleridnum
	else if(headers.calleridname.indexOf('CTI-')!=-1) // call come from cti
		chStat[tempUniqueid].calleridnum = headers.calleridname.split('-')[1]

	// calleridname
	chStat[tempUniqueid].calleridname = headers.calleridname

	// update for OP
	/* check if the newstate is relative to a call that come from queue. In this case (CASE C), 
 	 * discard this newState event */
	if( headers.channel.indexOf('Local/')!=-1 && headers.channel.indexOf('@from-internal-')!=-1 && ( headers.channel.indexOf(';1')!=-1 || headers.channel.indexOf(';2')!=-1 ) ){
		logger.debug("discard 'newState' event because it's relative to channel '" + headers.channel + "'");
		return;
	}
	var typeext = headers.channel.split('-')[0]
	if( modop.isChannelTrunk(headers.channel) ){ // newstate is relative to a trunk
		modop.updateTrunkStatusWithChannel(headers.channel, headers.channelstatedesc.toLowerCase())
	} else {
		modop.updateExtStatusForOpWithTypeExt(typeext, chStat[tempUniqueid].status)
		updateAllClientsForOpWithTypeExt(typeext)
	}
})
/* whe call come from soft phone
EVENT 'NewCallerid': headers '{ event: 'NewCallerid',
  privilege: 'call,all',
  channel: 'SIP/271-000001d6',
  calleridnum: '271',
  calleridname: 'Alessandrotest2',
  uniqueid: '1308581487.574',
  cidcallingpres: '0 (Presentation Allowed, Not Screened)' }' 
*
* when call come from cti
EVENT 'NewCallerid': headers '{ event: 'NewCallerid',
  privilege: 'call,all',
  channel: 'SIP/271-000001d8',
  calleridnum: '',
  calleridname: 'CTI-271',
  uniqueid: '1308581562.576',
  cidcallingpres: '0 (Presentation Allowed, Not Screened)' }' */
am.addListener('newcallerid', function(headers){
	logger.debug("EVENT 'NewCallerid': headers '" + sys.inspect(headers) +  "'")	
})

/*
{ event: 'UnParkedCall',
  privilege: 'call,all',
  exten: '71',
  channel: 'SIP/271-000000c6',
  from: 'SIP/270-000000c8',
  calleridnum: '271',
  calleridname: 'Alessandrotest2' }
*/
am.addListener('unparkedcalls', function(headers) {
	try {
		var t_ext;
		logger.debug("EVENT 'UnParkedCalls': headers " + sys.inspect(headers));
		t_ext = 'PARK' + headers.exten;
		modop.updateEndParkExtStatus(t_ext);
		updateAllClientsForOpWithTypeExt(t_ext);
	} catch (err) {
		logger.error('Error in UnParkedCalls event: ' + err.message);
		logger.error(err.stack);
	}
});

/* call come from soft phone
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'SIP/271-000001e6',
  destination: 'SIP/270-000001e7',
  calleridnum: '271',
  calleridname: 'Alessandrotest2',
  uniqueid: '1308582430.590',
  destuniqueid: '1308582431.591',
  dialstring: '270' }' 
  *
  * when call come from cti:
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'SIP/271-00000252',
  destination: 'SIP/270-00000253',
  calleridnum: '<unknown>',
  calleridname: 'CTI-271',
  uniqueid: '1308645191.698',
  destuniqueid: '1308645195.699',
  dialstring: '270' }'
  *
  * when call come from queue:
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'Local/270@from-internal-b7d5;2',
  destination: 'SIP/270-000002a5',
  calleridnum: '272',
  calleridname: 'Alessandrotest3',
  uniqueid: '1308652170.786',
  destuniqueid: '1308652171.789',
  dialstring: '270' }' 
*
* when redirect through soft phone when ringing (verified with twinkle)
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'SIP/270-00000f0e',
  destination: 'Local/272@from-internal-b9a8;1',
  calleridnum: '270',
  calleridname: 'AlessandroTest1',
  uniqueid: '1312790208.8011',
  destuniqueid: '1312790216.8013',
  dialstring: '272@from-internal' }'
*
* when redirect:
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'SIP/270-000002dc',
  destination: 'SIP/272-000002dd',
  calleridnum: '270',
  calleridname: 'Alessandrotest1',
  uniqueid: '1308662518.892',
  destuniqueid: '1308662519.893',
  dialstring: '272' }' 
*
* when callout through trunk
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'SIP/272-0000104d',
  destination: 'SIP/UMTS-0000104e',
  calleridnum: '272',
  calleridname: 'AlessandroTest3',
  uniqueid: '1308669778.8745',
  destuniqueid: '1308669778.8746',
  dialstring: 'UMTS/#31#3405567088' }' 
  *
  * when callin through a trunk:
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'IAX2/from-lab-6680',
  destination: 'SIP/224-000010d7',
  calleridnum: '305',
  calleridname: 'Andrea Curzi',
  uniqueid: '1308726926.8996',
  destuniqueid: '1308726926.8997',
  dialstring: '224' }' 
  *
  * here, 225 is remote intern that call through a trunk, but 225 is also a local intern (CASE H)
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'IAX2/from-astr-7929',
  destination: 'SIP/250-0000175e',
  calleridnum: '225',
  calleridname: 'Francesco Brecciaroli',
  uniqueid: '1308839796.12668',
  destuniqueid: '1308839796.12669',
  dialstring: '250' }'
  *
  * calleridname can be unknown:
  ...
  calleridname: '<unknown>'
  ...
  *
  *
 EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'SIP/2004-0000048c',
  destination: 'Local/3898031806@from-internal-989c;1',
  calleridnum: '3939727637',
  calleridname: 'Assistenza Cellulare',
  uniqueid: '1310744575.2395',
  destuniqueid: '1310744576.2396',
  dialstring: '3898031806@from-internal/n' }'
*
*
EVENT 'Dialing': headers '{ event: 'Dial', (CASE L)
  privilege: 'call,all',
  subevent: 'Begin',
  channel: 'Local/333@from-internal-4d3c;2',
  destination: 'SIP/2004-000006e2',
  calleridnum: '3356892540',
  calleridname: 'Antonio Morrocchesi',
  uniqueid: '1310993126.3394',
  destuniqueid: '1310993126.3403',
  dialstring: '2004/333' }'
*
*
  * when dial not execute correctly, for ex. for congestion:
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'End',
  channel: 'SIP/224-000011c8',
  uniqueid: '1308732470.9425',
  dialstatus: 'CONGESTION' }' */
am.addListener('dialing', function(headers) {
        logger.debug("EVENT 'Dialing': headers '" + sys.inspect(headers) + "'")

	/* chstat = { '1308646890.732': 
	   { channel: 'SIP/271-00000274',
	     status: 'ring',
	     calleridnum: '271',
	     calleridname: 'device' },
	  '1308646890.733': { channel: 'SIP/270-00000275' } }
	*
	* or when come from queue:
	chstat = { '1308652170.784': 
	   { channel: 'SIP/272-000002a4',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: 'Alessandrotest3' },
	  '1308652170.785': { channel: 'Local/270@from-internal-b7d5;1' },
	  '1308652170.786': { channel: 'Local/270@from-internal-b7d5;2' },
	  '1308652170.787': { channel: 'Local/271@from-internal-3193;1' },
	  '1308652170.788': { channel: 'Local/271@from-internal-3193;2' },
	  '1308652171.789': { channel: 'SIP/270-000002a5' } }
	*
	* during redirect:
	chstat = { '1308662518.892': { channel: 'AsyncGoto/SIP/270-000002dc' },
	  '1308662519.893': { channel: 'SIP/272-000002dd' } }
	*
	* when callout through a trunk:
	chstat = { '1308669778.8745': 
	   { channel: 'SIP/272-0000104d',
	     status: 'ring',
	     calleridnum: '272',
	     calleridname: 'device' },
	  '1308669778.8746': { channel: 'SIP/UMTS-0000104e' } }      (CASE A) 
	*
	* when callin through a trunk:  (CASE B)
	chstat = { '1308726926.8996': { channel: 'IAX2/from-lab-6680' },
	  '1308726926.8997': { channel: 'SIP/224-000010d7' } } */

	/* check if the current dialing event can't be completed for some reason.
	 * In this case there isn't headers.destuniqueid and there is headers.dialstatus 
	 * From documentation, dialstatus can be:
	 CHANUNAVAIL | CONGESTION | BUSY | NOANSWER | ANSWER | CANCEL | HANGUP */
	if( headers.destuniqueid==undefined && headers.dialstatus!=undefined ){
		logger.warn("discard 'dialing' event because dial status is '" + headers.dialstatus + "'");
		return;
	}
	// to
	// dialstring can be: ...dialstring: '272@from-internal' }'
	var to = headers.dialstring
	if(modop.isTypeExtFascio(headers.destination.split('-')[0])){ // the call is out through a trunk (CASE A) ex. ..destination: 'SIP/UMTS-0000104e'..
		var trunk = chStat[headers.destuniqueid].channel.split('-')[0].split('/')[1]
		if(to.indexOf(trunk)!=-1){
			to = to.split(trunk + '/')[1]
			if(to.indexOf('#31#')!=-1){
				to = to.split('#31#')[1]
			}
		}
		chStat[headers.destuniqueid].dialExt = to
	} else if(headers.destination.indexOf('Local/')!==-1 && headers.destination.indexOf('@from-internal')!==-1){ // destination: 'Local/272@from-internal-b9a8;1',
		to = to.split('@')[0];
	}

	// get true uniqueid, because in some case (for ex. in parking) cann't be the right uniqueid
	var trueUniqueid = '';
	var trueDestUniqueid = '';
	for(uniqueid in chStat){
		if(chStat[uniqueid].channel===headers.channel){
			trueUniqueid = uniqueid;
		} else if(chStat[uniqueid].channel===headers.destination){
			trueDestUniqueid = uniqueid;
		}
	}
	// from
	var from = undefined;
	if(chStat[trueUniqueid]!==undefined){
		from = chStat[trueUniqueid].calleridnum
	}
	// in this case the call come from queue
	if(from==undefined && headers.channel.indexOf('Local/')!=-1 && headers.channel.indexOf('@from-internal-')!=-1 )
		from = headers.calleridnum;
	else if( from==undefined && modop.isChannelTrunk(headers.channel) ) // callin through a trunk (CASE B)
		from = headers.calleridnum;
	else if(from==undefined && headers.channel.indexOf('AsyncGoto/SIP/')!=-1 ) // this case is the redirect
		from = headers.channel.split('-')[0].split('/')[2];
	else if(from==undefined && modop.isChannelIntern(headers.channel))
		from = headers.calleridnum;
	logger.debug("Dialing from '" + from + "' -> '" + to + "'");
	// advise client that receive the call
	if(to!==undefined && to!=='' && modop.isExtPresent(to) && modop.isExtInterno(to)){
		// check the permission of the user to receive the call
                if(!profiler.checkActionCallInPermit(to)){
                	logger.warn("check 'callIn' permission for [" + to + "] FAILED !");
                        return;
		}
		var c = clients[to];
		if(c!==undefined){
			var response = new ResponseMessage(c.id, "dialing", headers.calleridname);
		        response.from = from;
		        response.to = to;
		        var callNotesCalc = [];
		        if(currentCallInInfo[from]!==undefined){
		                callNotesCalc = currentCallInInfo[from].callNotes; // call notes calculated in 'UserEvent' event
		                response.reservation = currentCallInInfo[from].reservation; // add call reservation to the response
		        }
		        var result = [];
		        if(callNotesCalc===undefined){
				callNotesCalc = [];
		        }
		        // adds only call notes for which the user has permission (public or own)
		        for(var w=0, callnote; callnote=callNotesCalc[w]; w++){
		                if(callnote.public || callnote.extension===to){
		                        result.push(callnote);
		                }
		        }
		        response.callNotes = result; // add call notes to the response
			response.dialCh = headers.destination;
                        if (currentCallInInfo[from].ctiPrivate[to] !== undefined) {
                            response.info = currentCallInInfo[from].ctiPrivate[to];
                        } else if (currentCallInInfo[from].ctiPublic !== undefined) {
                            response.info = currentCallInInfo[from].ctiPublic;
                        } else if (currentCallInInfo[from].centralPhonebook !== undefined) {
                            response.info = currentCallInInfo[from].centralPhonebook;
                        }
			c.emit('message',response);
                        logger.debug("RESP 'dialing' has been sent to [" + to + "] id '" + c.id + "'");
                }
	}
	// add dialExtUniqueid for trunk and for queue ;2 (;2 means the call to client intern)
	if(from!=undefined && !modop.isChannelIntern(headers.channel) && headers.channel.indexOf(';1')==-1){
		chStat[headers.uniqueid].dialExtUniqueid = headers.trueDestUniqueid
		chStat[headers.uniqueid].dialDirection = DIAL_TO
		chStat[headers.uniqueid].dialCh = headers.destination;
		var trunkTypeext = modop.getTrunkTypeExtFromChannel(headers.channel)
		// add uniqueid of trunk 'headers.channel' to trunk itself, if it isn't already been added
		if(modop.isChannelTrunk(headers.channel)){
	                if(!modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeext, headers.uniqueid)){
				modop.addDialingUniqueidTrunkWithTypeExt(trunkTypeext, headers.uniqueid, chStat[headers.uniqueid])
	                        logger.debug("added dialingUniqueid '" + headers.uniqueid + "' to trunk '" + trunkTypeext + "'")
	                        updateAllClientsForOpWithTypeExt(trunkTypeext)
			}
			else
		                logger.debug("dialing uniqueid '" + headers.uniqueid + "' has already been added to trunk '" + trunkTypeext  + "'")
		}
	}
	if(to!=undefined && !modop.isChannelIntern(headers.destination) && headers.destination.indexOf(';1')==-1){
		chStat[trueDestUniqueid].dialExtUniqueid = trueUniqueid;
		chStat[trueDestUniqueid].dialDirection = DIAL_FROM;
		chStat[trueDestUniqueid].dialCh = headers.channel;
		var trunkTypeext = modop.getTrunkTypeExtFromChannel(headers.destination);
		// add uniqueid of trunk 'headers.destination' to trunk itself, if it isn't already been added
                if(!modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeext, trueDestUniqueid)){
                        modop.addDialingUniqueidTrunkWithTypeExt(trunkTypeext, trueDestUniqueid, chStat[trueDestUniqueid]);
                        logger.debug("added dialingUniqueid '" + trueDestUniqueid + "' to trunk '" + trunkTypeext + "'");
                        updateAllClientsForOpWithTypeExt(trunkTypeext);
                }
                else
                        logger.debug("dialing uniqueid '" + trueDestUniqueid + "' has already been added to trunk '" + trunkTypeext  + "'");
	}
	// update for OP
	if(from!=undefined && to!=undefined){
		// check if the call come from queue. In this case, the caller (272) has already been update in AgentCalled event
		if(headers.channel.indexOf('Local/')==-1 && headers.channel.indexOf('@from-internal-')==-1 && headers.channel.indexOf(';2')==-1){ 
			/* check also !modop.isChannelTrunk(headers.channel)  because (CASE H): 
			 * headers.calleridnum come from trunk, that is remote location but is equal to local intern (namesake) */
			if(modop.isExtPresent(from) && modop.isChannelIntern(headers.channel) && !modop.isChannelTrunk(headers.channel) ){
				chStat[trueUniqueid].dialExt = to; // set dial from identification in chStat (dialExt)
				chStat[trueUniqueid].dialDirection = DIAL_FROM;
				chStat[trueUniqueid].dialCh = headers.destination;
				var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel);
				modop.addDialingUniqueidInternWithTypeExt(internTypeExt, trueUniqueid, chStat[trueUniqueid]);
				logger.debug("added dialingUniqueid '" + trueUniqueid + "' to interTypeExt '" + internTypeExt + "'");
				updateAllClientsForOpWithTypeExt(internTypeExt);
			} else if( modop.isExtPresent(from) && modop.isChannelTrunk(headers.channel) )
				logger.warn("[" + from + "] is namesake: comes from remote location through trunk '" + headers.channel + "'");
		}
		if(modop.isExtPresent(to) && modop.isChannelIntern(headers.destination)){
			chStat[trueDestUniqueid].dialExt = from; // set dial to identification in chStat (dialExt)
			chStat[trueDestUniqueid].dialDirection = DIAL_TO;
			chStat[trueDestUniqueid].dialCh = headers.channel;
			var internTypeExt = modop.getInternTypeExtFromChannel(headers.destination);
			modop.addDialingUniqueidInternWithTypeExt(internTypeExt, trueDestUniqueid, chStat[trueDestUniqueid]);
			logger.debug("added dialingUniqueid '" + trueDestUniqueid + "' to interTypeExt '" + internTypeExt + "'");
		}	
	}
})

// set response with informations (customer card, call notes, ... ) of current caller
function setResponseWithCurrentCallInfoCC(c,from,to,response){
	if(currentCallInInfo[from]!==undefined){
		return setResponseWithInfoCCFor(c,from,to,response,'userevent');
	} else {
		response.from = from;
	        response.to = to;
		logger.warn('currentCallInInfo for number ' + from + ' is undefined');
	}
}
function setResponseWithInfoCCByGetVCardCC(c,from,to,response,containerInfo){
        response.from = from;
        response.to = to;
        var callNotes = [];
        if(containerInfo[from]!==undefined){
        	callNotes = containerInfo[from].callNotes;
                response.reservation = containerInfo[from].reservation;
        }
        var result = [];
	if(callNotes===undefined){
		callNotes = [];
	}
	// adds only call notes for which the user has permission (public or own)
        for(var w=0, callnote; callnote=callNotes[w]; w++){
        	if(callnote.public || callnote.extension===to){
                	result.push(callnote);
                }
       	}
        response.callNotes = result; // add call notes to the response
        var ccArr = {};
        if(containerInfo[from]!==undefined && containerInfo[from].cc!==undefined){
        	ccArr = containerInfo[from].cc; // customer card calculated for GET_VCARD_CC request
        }
        var typesCC = profiler.getTypesCustomerCardPermit(to); // customer card permission of the user
        logger.debug("[" + to + "] is able to view customer card of types: " + sys.inspect(typesCC));
        if(typesCC.length===0){ // hasn't the customer card permission
                logger.debug("check permission to view Customer Card for [" + to + "] FAILED !");
                response.customerCard = "";
                response.noPermission = '';
                return;
        }
	// construct all customer card for which the user has permission
        var str = '';
	var typesCCObj = {};
	for(var i=0; i<typesCC.length; i++){
		typesCCObj[typesCC[i]] = '';
	}
        if(Object.keys(ccArr).length>0){
		var tempTypeName = '';
		for(var key in cc_templates){
			tempTypeName = key.split('.')[0].split('_')[3];
			if(typesCCObj[tempTypeName]!==undefined){
				if(ccArr[tempTypeName]!==undefined){
					str += ccArr[tempTypeName];
				} else {
					str += '';
					logger.error('customer card for num ' + from + ' of type ' + tempTypeName + ' not exist in setResponseWithInfoCCByGetVCardCC');
				}
			}
		}
        }
	response.customerCard = str; // add customer card to the response
}


/* when call come from soft phone:
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/270-000001f1',
  uniqueid: '1308584583.601',
  calleridnum: '270',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' } 
  *
  * when call come from cti:
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/271-00000242',
  uniqueid: '1308643183.682',
  calleridnum: '<unknown>',
  calleridname: 'CTI-271',
  cause: '16',
  causetxt: 'Normal Clearing' } 
*
* when call come from queue
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'Local/270@from-internal-a7dd;1',
  uniqueid: '1308660251.812',
  calleridnum: '272',
  calleridname: 'Alessandrotest3',
  cause: '0',
  causetxt: 'Unknown' } 
  *
  * when redirect
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'AsyncGoto/SIP/270-000002dc<ZOMBIE>',
  uniqueid: '1308662508.891',
  calleridnum: '<unknown>',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' }
  *
  * or:
EVENT 'Hangup': headers = { event: 'Hangup', (CASE M)
  privilege: 'call,all',
  channel: 'SIP/204-00000401<ZOMBIE>',
  uniqueid: '1309879483.2177',
  calleridnum: '204',
  calleridname: 'Davide Marini',
  cause: '16',
  causetxt: 'Normal Clearing' } 
  *
  *
EVENT 'Hangup': headers = { event: 'Hangup', // when parking a call: 270 is parked
  privilege: 'call,all',
  channel: 'Parked/SIP/270-00000605<ZOMBIE>',
  uniqueid: '1311253326.3348',
  calleridnum: '<unknown>',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' }
*
* and
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/270-000002df',
  uniqueid: '1308664818.896',
  calleridnum: '270',
  calleridname: 'Alessandrotest1',
  cause: '16',
  causetxt: 'Normal Clearing' }
'hangup' chStat = {}
*
* when one endpoint is out through a trunk:
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/UMTS-000010c0',
  uniqueid: '1308673475.8970',
  calleridnum: '3405567088',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' }
  *
  * or:
EVENT 'Hangup': headers = { event: 'Hangup', (CASE F) 700 is a group
  privilege: 'call,all',
  channel: 'SIP/2004-000014b4',
  uniqueid: '1308813216.11162',
  calleridnum: '0721830152',
  calleridname: '<unknown>',
  cause: '0',
  causetxt: 'Unknown' }
  *
  * when callin come from group:
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/271-0000034a',
  uniqueid: '1308749652.1072',
  calleridnum: '700',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' } 
  *
  * 250 is already connected with external ext of remote location: calleridnum is not it (CASE I)
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/250-000018da',
  uniqueid: '1308905184.13346',
  calleridnum: '5250',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' } */
am.addListener('hangup', function(headers) {
        logger.debug("EVENT 'Hangup': headers = " + sys.inspect(headers))
	/* if the hangup event is relative to Local/270@from-internal-a7dd;1', means that this hangup is relative
	 * to the intermediate node created by asterisk that finish with ';1'. So it is ingored, because there will be
	 * other hangup event.
	 *
	chStat = { '1308660251.811': 
	   { channel: 'SIP/272-000002af',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: 'Alessandrotest3' },
	  '1308660251.812': 
	   { channel: 'Local/270@from-internal-a7dd;1',
	     status: 'ringing',
	     calleridnum: '272',
	     calleridname: 'Alessandrotest3' },
	  '1308660251.813': { channel: 'Local/270@from-internal-a7dd;2' },
	  '1308660251.814': 
	   { channel: 'Local/271@from-internal-e0e6;1',
	     status: 'ringing',
	     calleridnum: '272',
	     calleridname: 'Alessandrotest3' },
	  '1308660251.815': 
	   { channel: 'Local/271@from-internal-e0e6;2',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: 'Alessandrotest3' },
	  '1308660252.816': 
	   { channel: 'SIP/271-000002b0',
	     status: 'up',
	     calleridnum: '271',
	     calleridname: '' },
	  '1308660252.817': 
	   { channel: 'SIP/270-000002b1',
	     status: 'ringing',
	     calleridnum: '270',
	     calleridname: '' } } 
	*
	* when redirect:
	chStat = { '1308662507.890': 
	   { channel: 'SIP/271-000002db',
	     status: 'up',
	     calleridnum: '271',
	     calleridname: 'Alessandrotest2' },
	  '1308662508.891': 
	   { channel: 'SIP/270-000002dc',
	     status: 'up',
	     calleridnum: '270',
	     calleridname: '' },
	  '1308662518.892': { channel: 'AsyncGoto/SIP/270-000002dc' } } 
	* 
	* and
	chStat = { '1308664818.896': { channel: 'AsyncGoto/SIP/270-000002df' } } 
	*
	* when one endpoint is out through a trunk:
	chStat = { '1308673475.8969': 
	   { channel: 'SIP/272-000010bf',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: 'AlessandroTest3' },
	  '1308673475.8970': 
	   { channel: 'SIP/UMTS-000010c0',
	     status: 'up',
	     calleridnum: '3405567088',
	     calleridname: '' } } 
	*
	* or: (CASE F)
	chStat = { '1308813216.11162':
	   { channel: 'SIP/2004-000014b4',
	     status: 'up',
	     calleridnum: '0721830152',
	     calleridname: '' }, ...
	*
	* when callin come from group:
	chStat = { '1308749652.1070': 
	   { channel: 'SIP/272-00000348',
	     status: 'ring',
	     calleridnum: '272',
	     calleridname: 'device' },
	  '1308749652.1071': 
	   { channel: 'SIP/270-00000349',
	     status: 'up',
	     calleridnum: '700',
	     calleridname: '' },
	  '1308749652.1072': 
	   { channel: 'SIP/271-0000034a',
	     status: 'ringing',
	     calleridnum: '700',        (700 is a group)
	     calleridname: '' } } 
	*
	* 250 is already connected with ext of remote location: calleridnum not is it  (CASE I)
	chStat = { '1308905184.13345': { channel: 'IAX2/from-astr-2703' },
	  '1308905184.13346':
	   { channel: 'SIP/250-000018da',
	     status: 'ringing',
	     calleridnum: '5250',
	     calleridname: '' } } */
	/* check if the chStat contains the entry relative to this hangup event.
	 * This is because this proxy server can be started after the asterisk server. So some calling can be in execution when this
 	 * proxy server starting and so it can receive some hangup event relative to old call for which it haven't the relative channel in chStat. 
	 * In this case it simply discard this hangup event */
	var trueUniqueid = '';
	for(uniqueid in chStat){
		if(chStat[uniqueid].channel===headers.channel){
			trueUniqueid = uniqueid;
		}
	}
	var qtypeExt = modop.removeQueueCcCaller(headers.channel); // if it is present in queueCcCaller of one queue, remove it
	if(qtypeExt!==undefined){
		logger.debug("hangup call is relative to queue: remove ch '" + headers.channel + "' from queueCcCaller of [" + qtypeExt + "]");
		updateAllClientsForOpWithTypeExt(qtypeExt);
	}
	qtypeExt = modop.removeQueueWaitingCaller(headers.channel); // if it is present in queueWaitingCaller of one queue, remove it
	if(qtypeExt!==undefined){
		logger.debug("hangup call is relative to queue: remove ch '" + headers.channel + "' from queueWaitingCaller of [" + qtypeExt + "]");
		updateAllClientsForOpWithTypeExt(qtypeExt);
	}
	if(headers.channel.indexOf('<ZOMBIE>')===-1 && chStat[trueUniqueid]===undefined){
		logger.warn("discard 'hangup' event: it isn't present in chStat. The cause can be the start of this server during the asterisk functioning");
		return;
	}

	if(headers.channel.indexOf('Local/')!=-1 && headers.channel.indexOf('@from-internal-')!=-1 && (headers.channel.indexOf(';1')!=-1 || headers.channel.indexOf(';2')!=-1 ) ){
		logger.debug("discard 'hangup' event: relative to queue. Delete it from chStat");
		delete chStat[trueUniqueid];
		logger.debug("keys of chStat = " + Object.keys(chStat).length);
		return;
	}
	if(headers.channel.indexOf('Parked/SIP/')!==-1 && headers.channel.indexOf('<ZOMBIE>')!==-1){ // channel = Parked/SIP/271-000008ab<ZOMBIE>
		logger.debug("discard 'hangup' event: relative to call that has been parked");
		return;
	}
	if(headers.channel.indexOf('<ZOMBIE>')!=-1 && headers.channel.indexOf('AsyncGoto/SIP/')==-1){ // (CASE M)  channel: 'SIP/204-00000401<ZOMBIE>'
		var tempCh = headers.channel.split('<ZOMBIE>')[0];
		if(modop.isChannelIntern(tempCh)){
			var internTypeExt = modop.getInternTypeExtFromChannel(tempCh);
			var tempUniqueid = '';
			for(uniqueid in chStat){
				if(chStat[uniqueid].channel===tempCh)
					tempUniqueid = uniqueid;
			}
			if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid)){
	                        modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid);
	                        logger.debug("removed dialingUniqueid '" + tempUniqueid + "' from intern '" + internTypeExt + "'");
	                } else
	                        logger.debug("dialingUniqueid '" + tempUniqueid + "' has already not present into intern '" + internTypeExt + "'");
			if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid)){
	                        modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid);
	                        logger.debug("removed callConnectedUniqueid '" + tempUniqueid + "' from intern '" + internTypeExt + "'");
	                } else
	                        logger.debug("callConnected uniqueid '" + tempUniqueid + "' has already not present into intern '" + internTypeExt + "'");
			modop.updateExtStatusForOpWithTypeExt(internTypeExt,"hangup");
			modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, tempUniqueid); // add uniqueid of current hangup as 'lastHangupUniqueid'
	                updateAllClientsForOpWithTypeExt(internTypeExt);
			// remove channel from chStat
			delete chStat[tempUniqueid];
			logger.debug("keys of chStat = " + Object.keys(chStat).length);
			return;
		}
	}

	if( modop.isChannelTrunk(headers.channel) && headers.channel.indexOf('AsyncGoto/SIP/')===-1){ // the channel is a trunk
		var trunkTypeExt = modop.getTrunkTypeExtFromChannel(headers.channel);
		if( modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeExt, trueUniqueid) ){ // remove dialingUniqueid for current trunk
			modop.removeDialingUniqueidTrunkWithTypeExt(trunkTypeExt, trueUniqueid);
			logger.debug("removed dialingUniqueid '" + trueUniqueid + "' from trunk '" + trunkTypeExt + "'");
		} else
			logger.debug("dialing uniqueid '" + trueUniqueid + "' has already not present into trunk '" + trunkTypeExt + "'");
		if( modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeExt, trueUniqueid) ){ // remove callconnectedUniqueid for current trunk
			modop.removeCallConnectedUniqueidTrunkWithTypeExt(trunkTypeExt, trueUniqueid);
			logger.debug("removed callConnectedUniqueid '" + trueUniqueid + "' from trunk '" + trunkTypeExt + "'");
		} else
			logger.debug("callConnected uniqueid '" + trueUniqueid + "' has already not present into trunk '" + trunkTypeExt + "'");
		updateAllClientsForOpWithTypeExt(trunkTypeExt);
		delete chStat[trueUniqueid];
		deleteAllChOccurrenceFromChstat(headers.channel);
		delete currentCallInInfo[headers.calleridnum]; // delete info of the current call (callNotes, Customer Card,...)
		logger.debug("currentCallInInfo = " + sys.inspect(currentCallInInfo));
		return;
	}
	else if(modop.isChannelIntern(headers.channel) && headers.channel.indexOf('AsyncGoto/SIP/')===-1){ // headers.channel is an intern
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, trueUniqueid)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, trueUniqueid);
			logger.debug("removed dialingUniqueid '" + trueUniqueid + "' from intern '" + internTypeExt + "'");
		} else {
			logger.debug("dialingUniqueid '" + trueUniqueid + "' has already not present into intern '" + internTypeExt + "'");
		}
		if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, trueUniqueid)){
			modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, trueUniqueid);
			logger.debug("removed callConnectedUniqueid '" + trueUniqueid + "' from intern '" + internTypeExt + "'");
		} else {
			logger.debug("callConnected uniqueid '" + trueUniqueid + "' has already not present into intern '" + internTypeExt + "'");
		}
		modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, trueUniqueid); // add uniqueid of current hangup as 'lastHangupUniqueid'
		updateAllClientsForOpWithTypeExt(internTypeExt);
	}
	// headers.channel = 'AsyncGoto/SIP/270-000002dc<ZOMBIE>'
	else if(headers.channel.indexOf('AsyncGoto/SIP/')!=-1 && headers.channel.indexOf('<ZOMBIE>')!=-1){ // headers.channel is an intern that has redirect: remove callConnectedUniqueid
		var temp = headers.channel.split('/')[1]; // SIP
		var internTypeExt = temp + '/' + headers.channel.split('-')[0].split('/')[2]; // SIP/270
		var tempCh = temp + '/' + headers.channel.split('<ZOMBIE>')[0].split('/')[2]; // SIP/270-000002dc
		var tempUniqueid = '';
		for(uniqueid in chStat){
			if(chStat[uniqueid].channel===tempCh)
				tempUniqueid = uniqueid;
		}
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid);
			loggerd.debug("removed dialingUniqueid '" + tempUniqueid + "' from intern '" + internTypeExt + "'");
		} else
			logger.debug("dialingUniqueid '" + tempUniqueid + "' has already not present into intern '" + internTypeExt + "'");
		if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid)){
			modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid);
			logger.debug("removed callConnectedUniqueid '" + tempUniqueid + "' from intern '" + internTypeExt + "'");
		} else
			logger.debug("callConnected uniqueid '" + tempUniqueid + "' has already not present into intern '" + internTypeExt + "'");
		modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, tempUniqueid); // add uniqueid of current hangup as 'lastHangupUniqueid'
		updateAllClientsForOpWithTypeExt(internTypeExt);
		trueUniqueid = tempUniqueid;
		return;
        }
	// ext
	var ext;
	if( chStat[trueUniqueid].calleridnum!=='' && chStat[trueUniqueid].calleridnum!==undefined && !modop.isExtGroup(chStat[trueUniqueid].calleridnum) ){
		/* '1308643186.683': 
		   { channel: 'SIP/270-00000243',
		     calleridname: '',
		     calleridnum: '270',
		     status: 'up' } } */
		// because (CASE I) is not possibile to calculate ext with ( ext = chStat[headers.uniqueid].calleridnum ). So:
		ext = modop.getExtInternFromChannel(chStat[trueUniqueid].channel);
	} else {
		/* { '1308643183.682': 
		    { channel: 'SIP/271-00000242',
		      calleridname: 'CTI-271',
		      calleridnum: '',
		      status: 'up' }, */
		if(chStat[trueUniqueid].channel.indexOf('SIP/')!=-1 && chStat[trueUniqueid].channel.indexOf('AsyncGoto/')==-1 ) // not redirect
			ext = chStat[trueUniqueid].channel.split('-')[0].split('/')[1];
		// chStat = { '1308664818.896': { channel: 'AsyncGoto/SIP/270-000002df' } } 
		else if( chStat[headers.uniqueid].channel.indexOf('AsyncGoto/SIP/')!=-1 ) // is redirect
			ext = chStat[trueUniqueid].channel.split('-')[0].split('/')[2];
	}
	// advise client of hangup if this event is not relative to redirect operation
	if( headers.channel.indexOf('AsyncGoto/SIP/')===-1 && headers.channel.indexOf('<ZOMBIE>')===-1 ){
		var c = clients[ext]
		if(c!=undefined){
	                var msg = "Call has hung up. Reason: " + headers.causetxt + "  (Code: " + headers.cause + ")"
	                var resp = new ResponseMessage(c.id, "hangup", msg)
	                resp.code = headers.cause
                        resp.channel = headers.channel;
	                c.emit('message',resp);
	                logger.debug("RESP 'hangup' has been sent to [" + ext + "] id '" + c.id + "'")
	        }
		// update for OP
		if(modop.isExtPresent(ext) && modop.isExtInterno(ext)){
	                modop.updateExtStatusForOpWithExt(ext, 'hangup')
			var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel)
	                modop.updateLastDialExt(ext)
	                updateAllClientsForOpWithTypeExt(internTypeExt)
	        } else
			logger.debug('[' + ext + '] is not present in extStatusForOp: so not advise it')
	} else {
		logger.debug("discarded event 'hangup' because redirect");
	}
	logger.debug("delete '" + trueUniqueid + "' ["+chStat[trueUniqueid].channel+"] from chStat");
	delete chStat[trueUniqueid];
	deleteAllChOccurrenceFromChstat(headers.channel);
	logger.debug("keys of chStat = " + Object.keys(chStat).length);
});

/* EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/270-0000020d',
  channel2: 'SIP/271-0000020e',
  uniqueid1: '1308585805.629',
  uniqueid2: '1308585806.630',
  callerid1: '270',
  callerid2: '271' }' 
*
* when call is to queue:
EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'Local/271@from-internal-3193;2',
  channel2: 'SIP/271-000002a6',
  uniqueid1: '1308652170.788',
  uniqueid2: '1308652171.790',
  callerid1: '272',
  callerid2: '271' }'
*
* or when call come from an extern to queue: (CASE D)
EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/2004-000014b4',
  channel2: 'Local/207@from-internal-ef64;1',
  uniqueid1: '1308813216.11162',
  uniqueid2: '1308813217.11169',
  callerid1: '0721830152',
  callerid2: '0721830152' }' 
*
* or when call come from intern to queue: (CASE E)
EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/272-000002a4',
  channel2: 'Local/271@from-internal-3193;1',
  uniqueid1: '1308652170.784',
  uniqueid2: '1308652170.787',
  callerid1: '272',
  callerid2: '272' }' 
*
* when redirect:
EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/270-000002df',
  channel2: 'SIP/272-000002e0',
  uniqueid1: '1308664818.896',
  uniqueid2: '1308664819.897',
  callerid1: '270',
  callerid2: '272' }' 
*
* when one endpoint is out through a trunk (CASE F)
EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/272-000010bf',
  channel2: 'SIP/UMTS-000010c0',
  uniqueid1: '1308673475.8969',
  uniqueid2: '1308673475.8970',
  callerid1: '272',
  callerid2: '3405567088' }'
  *
  * when callin through a trunk to IAX2 fax: (CASE G)
EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/2004-00001702',
  channel2: 'IAX2/350-8199',
  uniqueid1: '1308834534.12481',
  uniqueid2: '1308834535.12482',
  callerid1: '0817598495',
  callerid2: '350' }' 
  *
  * 606 is a group
  EVENT 'CallConnected': headers = '{ event: 'Bridge',
  privilege: 'call,all',
  bridgestate: 'Link',
  bridgetype: 'core',
  channel1: 'SIP/2004-00000829',
  channel2: 'SIP/224-0000082c',
  uniqueid1: '1311060178.4056',
  uniqueid2: '1311060180.4059',
  callerid1: '714609850',
  callerid2: '606' }' */
am.addListener('callconnected', function(headers) {
        logger.debug("EVENT 'CallConnected': headers = '" + sys.inspect(headers) + "'")
	logger.debug("key of chStat = " + Object.keys(chStat).length)
	var tempUniqueid1 = '';
	var tempUniqueid2 = '';
	for(uniqueid in chStat){
		if(chStat[uniqueid].channel===headers.channel1){
			tempUniqueid1 = uniqueid;
		}
		else if(chStat[uniqueid].channel===headers.channel2){
			tempUniqueid2 = uniqueid;
		}
	}
	if(chStat[tempUniqueid1]===undefined || chStat[tempUniqueid2]===undefined){
		logger.info("discard 'callConnected' event: it isn't present in chStat. The cause can be the start of this server during the asterisk functioning")
		return
	}
	var d = new Date();
	chStat[tempUniqueid1].destCh = headers.channel2;
	chStat[tempUniqueid1].startDate = d;
	chStat[tempUniqueid1].otheruid = headers.uniqueid2;
	chStat[tempUniqueid2].destCh = headers.channel1;
	chStat[tempUniqueid2].startDate = d;
	chStat[tempUniqueid2].otheruid = headers.uniqueid1;
	/* when redirect:
	chStat = { '1308664818.896': { channel: 'AsyncGoto/SIP/270-000002df' },
	  '1308664819.897': 
	   { channel: 'SIP/272-000002e0',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: '' } }
	*
	* when one endpoint is out through a trunk
	chStat = { '1308673475.8969': 
	   { channel: 'SIP/272-000010bf',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: 'AlessandroTest3' },
	  '1308673475.8970': 
	   { channel: 'SIP/UMTS-000010c0',
	     status: 'up',
	     calleridnum: '3405567088',
	     calleridname: '' } } 
	*
	* or when call come from an extern to queue: (CASE D)
	chStat = { '1308813216.11162': 
	   { channel: 'SIP/2004-000014b4',
	     status: 'up',
	     calleridnum: '0721830152',
	     calleridname: '' },
	  '1308813217.11164': { channel: 'Local/202@from-internal-7a84;2' },
	  '1308813217.11166': { channel: 'Local/204@from-internal-550c;2' },
	  '1308813217.11168': { channel: 'Local/205@from-internal-e105;2' },
	  '1308813217.11169': 
	   { channel: 'Local/207@from-internal-ef64;1',
	     status: 'up',
	     calleridnum: '0721830152',
	     calleridname: '' },
	  '1308813217.11170': 
	   { channel: 'Local/207@from-internal-ef64;2',
	     status: 'up',
	     calleridnum: '0721830152',
	     calleridname: '' },
	  '1308813217.11172': { channel: 'Local/333@from-internal-3114;2' },
	  '1308813217.11176': { channel: 'Local/210@from-internal-3f5b;2' },
	  '1308813217.11178': { channel: 'Local/211@from-internal-9c54;2' },
	  '1308813220.11185': 
	   { channel: 'SIP/207-000014b9',
	     status: 'up',
	     calleridnum: '207',
	     calleridname: '' },
	  '1308813225.11190': 
	   { channel: 'SIP/222-000014be',
	     status: 'ring',
	     calleridnum: '222',
	     calleridname: 'device' },
	  '1308813225.11191': { channel: 'SIP/2001-000014bf' } } */
	// check if the callconnected is between internal and intermediate node created by asterisk when the call pass through a queue
	if( headers.callerid1==headers.callerid2 && headers.channel2.indexOf('Local/')!=-1 && headers.channel2.indexOf('@from-internal-')!=-1 && headers.channel2.indexOf(';1')!=-1  ){ // (CASE E)
		// add uniquedid
		if( modop.isChannelTrunk(headers.channel1) ){ // (CASE D)
			chStat[tempUniqueid1].dialDirection = DIAL_TO;
			var trunkTypeext = modop.getTrunkTypeExtFromChannel(headers.channel1);
			if(modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeext, tempUniqueid1)){
				modop.removeDialingUniqueidTrunkWithTypeExt(trunkTypeext, tempUniqueid1);
				logger.debug("removed dialingUniqueid '" + tempUniqueid1 + "' from trunkTypeExt '" + trunkTypeext + "'");
			} else {
				logger.debug("dialingUniqueid '" + tempUniqueid1 + "' has already not present into trunk '" + trunkTypeext  + "'");
			}
			// add uniqueid of trunk 'headers.channel1' to trunk itself, if it isn't already been added
			if( !modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeext, tempUniqueid1) ){
				modop.addCallConnectedUniqueidTrunkWithTypeExt(trunkTypeext, tempUniqueid1, chStat[tempUniqueid1]);
				logger.debug("added callConnectedUniqueid '" + tempUniqueid1 + "' to trunk '" + trunkTypeext + "'");
				updateAllClientsForOpWithTypeExt(trunkTypeext);
			} else {
				logger.debug("callConnected uniqueid '" + tempUniqueid1 + "' has already been added to trunk '" + trunkTypeext  + "'");
			}
		} else if(modop.isChannelIntern(headers.channel1)){  // channel 1 is intern
			var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel1);
			if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid1)){
				modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid1);
				logger.debug("removed dialingUniqueid '" + tempUniqueid1 + "' from internTypeExt '" + internTypeExt + "'");
			} else {
				logger.debug("dialingUniqueid '" + tempUniqueid1 + "' has already not present into intern '" + internTypeExt  + "'");
			}
			if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid1)){
				modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid1, chStat[tempUniqueid1]);
				logger.debug("added callConnectedUniqueid '" + tempUniqueid1 + "' into intern '" + internTypeExt + "'");
			} else {
				logger.debug("callConnectedUniqueid '" + tempUniqueid1 + "' has already present into intern '" + internTypeExt  + "'");
			}
			updateAllClientsForOpWithTypeExt(internTypeExt);
		}
		var extOperator = modop.getInternExtFromQueueChannel(headers.channel2);
		var qtypeExt = modop.addQueueCcCaller(headers.channel1,extOperator);
		if(qtypeExt!==undefined){
			logger.info("added call connected caller to queueCcCaller in extStatusForOp");
			updateAllClientsForOpWithTypeExt(qtypeExt);
		}
		logger.info("discarded event 'callconnected'");
		return;
	}

	// channel2 is a trunk, so add uniqueid of its channel to it
	if(modop.isChannelTrunk(headers.channel2) ){ // (CASE F)
		var trunkTypeext = modop.getTrunkTypeExtFromChannel(headers.channel2)
		if(modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeext, tempUniqueid2)){
	                modop.removeDialingUniqueidTrunkWithTypeExt(trunkTypeext, tempUniqueid2);
                        logger.debug("removed dialingUniqueid '" + tempUniqueid2 + "' from trunkTypeExt '" + trunkTypeext + "'");
                } else
        	        logger.debug("dialingUniqueid '" + tempUniqueid2 + "' has already not present into trunk '" + trunkTypeext  + "'");
		// add uniqueid of trunk 'headers.channel2' to trunk itself, if it isn't already been added
		if( !modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeext, tempUniqueid2) ){
			modop.addCallConnectedUniqueidTrunkWithTypeExt(trunkTypeext, tempUniqueid2, chStat[tempUniqueid2]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid2 + "' to trunk '" + trunkTypeext + "'");
			updateAllClientsForOpWithTypeExt(trunkTypeext);
		} else
			logger.debug("callConnected uniqueid '" + tempUniqueid2 + "' has already been added to trunk '" + trunkTypeext  + "'");

		// add uniqueid of intern 'headers.channel1' to intern itself, if it isn't already been added
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel1)

		// when an extension take a parked call with only the telephone, dialing event never fired. So
		// here add dialDirection and dialExt properties
		if (chStat[tempUniqueid1].dialDirection === undefined &&
			chStat[tempUniqueid1].dialExt === undefined &&
			headers.callerid2 !== undefined) {

			logger.debug('add caller info: probably take parked call through the phone');
			chStat[tempUniqueid1].dialDirection = 0; // incoming call for channel 2
			chStat[tempUniqueid1].dialExt = headers.callerid2;
		}
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid1)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid1);
			logger.debug("removed dialingUniqueid '" + tempUniqueid1 + "' from internTypeExt '" + internTypeExt + "'");
		} else
			logger.debug("dialingUniqueid '" + tempUniqueid1 + "' has already not present into intern '" + internTypeExt  + "'");
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid1)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid1, chStat[tempUniqueid1]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid1 + "' into intern '" + internTypeExt + "'");
		} else
			logger.debug("callConnectedUniqueid '" + tempUniqueid1 + "' has already present into intern '" + internTypeExt  + "'");

		updateAllClientsForOpWithTypeExt(internTypeExt);
	}

	// channel1 is a trunk and channel2 is an intern (CASE G)
	if( modop.isChannelTrunk(headers.channel1) && modop.isChannelIntern(headers.channel2) ){
		var trunkTypeExt = modop.getTrunkTypeExtFromChannel(headers.channel1)
		if(modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeExt, tempUniqueid1)){
                        modop.removeDialingUniqueidTrunkWithTypeExt(trunkTypeExt, tempUniqueid1);
                	logger.debug("removed dialingUniqueid '" + tempUniqueid1 + "' from trunkTypeExt '" + trunkTypeExt + "'");
        	} else
	                logger.debug("dialingUniqueid '" + tempUniqueid1 + "' has already not present into trunk '" + trunkTypeExt  + "'");
		// this check is for the case in which the call is entered throught a trunk and has been parked
		if(modop.hasTrunkDialingUniqueidWithTypeExt(trunkTypeExt, headers.uniqueid1)){
                        modop.removeDialingUniqueidTrunkWithTypeExt(trunkTypeExt, headers.uniqueid1);
                	logger.debug("removed dialingUniqueid '" + headers.uniqueid1 + "' from trunkTypeExt '" + trunkTypeExt + "'");
        	} else
	                logger.debug("dialingUniqueid '" + headers.uniqueid1 + "' has already not present into trunk '" + trunkTypeExt  + "'");
		// add uniqueid of trunk 'headers.channel1' to trunk itself, if it isn't already been added
		if( !modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeExt, tempUniqueid1) ){
			modop.addCallConnectedUniqueidTrunkWithTypeExt(trunkTypeExt, tempUniqueid1, chStat[tempUniqueid1]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid1 + "' to trunk '" + trunkTypeExt + "'");
			updateAllClientsForOpWithTypeExt(trunkTypeExt);
		} else
			logger.debug("callConnected uniqueid '" + tempUniqueid1 + "' has already been added to trunk '" + trunkTypeExt  + "'");
		updateAllClientsForOpWithTypeExt(trunkTypeExt);

		// add uniqueid of intern 'headers.channel2' to intern itself, if it isn't already been added
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel2)

		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid2)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid2);
			logger.debug("removed dialingUniqueid '" + tempUniqueid2 + "' from internTypeExt '" + internTypeExt + "'");
		} else
			logger.debug("dialingUniqueid '" + tempUniqueid2 + "' has already not present into intern '" + internTypeExt  + "'");
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid2)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid2, chStat[tempUniqueid2]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid2 + "' into intern '" + internTypeExt + "'");
		} else
			logger.debug("callConnectedUniqueid '" + tempUniqueid2 + "' has already present into intern '" + internTypeExt  + "'");

		updateAllClientsForOpWithTypeExt(internTypeExt);
	}

	// the call is for queue and this is the part from intermediate node ...;2 and the intern
	if( headers.channel1.indexOf('Local/')!=-1 && headers.channel1.indexOf('@from-internal-')!=-1 && headers.channel1.indexOf(';2')!=-1  ){
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel2)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid2)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid2);
			logger.debug("removed dialingUniqueid '" + tempUniqueid2 + "' from internTypeExt '" + internTypeExt + "'");
		} else
			logger.debug("dialingUniqueid '" + tempUniqueid2 + "' has already not present into intern '" + internTypeExt  + "'");
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid2)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid2, chStat[tempUniqueid2]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid2 + "' into intern '" + internTypeExt + "'");
		} else
			logger.debug("callConnectedUniqueid '" + tempUniqueid2 + "' has already present into intern '" + internTypeExt  + "'");
		updateAllClientsForOpWithTypeExt(internTypeExt);

		// add dialExtUniqueid for queue ;2 (;2 means the call to client intern)
		chStat[tempUniqueid1].dialExtUniqueid = tempUniqueid2;
	}

	// the call is between 2 intern
	if(modop.isChannelIntern(headers.channel1) && modop.isChannelIntern(headers.channel2)){
		// channel 1
		var internTypeExt1 = modop.getInternTypeExtFromChannel(headers.channel1);
		// when an extension take a parked call with only the telephone, dialing event never fired. So
                // here add dialDirection and dialExt properties
                if (chStat[tempUniqueid1].dialDirection === undefined &&
                        chStat[tempUniqueid1].dialExt === undefined &&
                        headers.callerid2 !== undefined) {

			logger.debug('add caller info: probably take parked call through the phone');
                        chStat[tempUniqueid1].dialDirection = 0; // incoming call for channel 2
                        chStat[tempUniqueid1].dialExt = headers.callerid2;
                }

		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt1, tempUniqueid1)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt1, tempUniqueid1);
			logger.debug("removed dialingUniqueid '" + tempUniqueid1 + "' from internTypeExt '" + internTypeExt1 + "'");
		} else
			logger.debug("dialingUniqueid '" + tempUniqueid1 + "' has already not present into intern '" + internTypeExt1  + "'");
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt1, tempUniqueid1)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt1, tempUniqueid1, chStat[tempUniqueid1]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid1 + "' into intern '" + internTypeExt1 + "'");
		} else
			logger.debug("callConnectedUniqueid '" + tempUniqueid1 + "' has already present into intern '" + internTypeExt1  + "'");
                updateAllClientsForOpWithTypeExt(internTypeExt1)
		// channel 2
		var internTypeExt2 = modop.getInternTypeExtFromChannel(headers.channel2)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt2, tempUniqueid2)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt2, tempUniqueid2);
			logger.debug("removed dialingUniqueid '" + tempUniqueid2 + "' from internTypeExt '" + internTypeExt2 + "'");
		} else
			logger.debug("dialingUniqueid '" + tempUniqueid2 + "' has already not present into intern '" + internTypeExt2  + "'");
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt2, tempUniqueid2)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt2, tempUniqueid2, chStat[tempUniqueid2]);
			logger.debug("added callConnectedUniqueid '" + tempUniqueid2 + "' into intern '" + internTypeExt2 + "'");
		} else
			logger.debug("callConnectedUniqueid '" + tempUniqueid2 + "' has already present into intern '" + internTypeExt2  + "'");
                updateAllClientsForOpWithTypeExt(internTypeExt2);
	}

	var from = undefined;
	var to = undefined;

	// the call has been redirect through two extensions
	if(modop.isChannelIntern(headers.channel1) && headers.channel2.indexOf('Local/')!==-1 && headers.channel2.indexOf('@from-internal-')!==-1 && headers.channel2.indexOf(';1')!==-1){
		var internTypeExt1 = modop.getInternTypeExtFromChannel(headers.channel1);
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt1, tempUniqueid1)){
                        modop.removeDialingUniqueidInternWithTypeExt(internTypeExt1, tempUniqueid1);
                        logger.debug("removed dialingUniqueid '" + tempUniqueid1 + "' from internTypeExt '" + internTypeExt1 + "'");
                } else
                        logger.debug("dialingUniqueid '" + tempUniqueid1 + "' has already not present into intern '" + internTypeExt1  + "'");
                if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt1, tempUniqueid1)){
                        modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt1, tempUniqueid1, chStat[tempUniqueid1]);
                        logger.debug("added callConnectedUniqueid '" + tempUniqueid1 + "' into intern '" + internTypeExt1 + "'");
                } else
                        logger.debug("callConnectedUniqueid '" + tempUniqueid1 + "' has already present into intern '" + internTypeExt1  + "'");
                updateAllClientsForOpWithTypeExt(internTypeExt1);
		to=headers.channel2.split('@')[0].split('/')[1];
	}

	// advise two clients of this call
	if(headers.callerid1==="" && modop.isChannelIntern(headers.channel1)){
		from = modop.getExtInternFromChannel(headers.channel1);
	} else {
		from = headers.callerid1;
	}
	if(to===undefined){
	        to = headers.callerid2;
	}
	if(clients[from]!==undefined){
		// check the permission of the user to receive the call
                if(!profiler.checkActionCallInPermit(from)){
                        logger.warn("check 'callIn' permission for [" + from + "] FAILED !");
                        return;
                }
                var c = clients[from]
                var msg = "Call from " + from + " to " + to + " CONNECTED"
                var response = new ResponseMessage(c.id, "callconnected", msg)
                response.from = from
                response.to = to
		response.destCh = headers.channel2;
                c.emit('message',response);
                logger.debug("RESP 'callconnected' has been sent to [" + from + "] id '" + c.id + "'")
        }
        if(clients[to]!==undefined){
		// check the permission of the user to receive the call
                if(!profiler.checkActionCallInPermit(to)){
                        logger.warn("check 'callIn' permission for [" + to + "] FAILED !");
                        return;
                }
                var c = clients[to]
                var msg = "Call from " + from + " to " + to + " CONNECTED"
                var response = new ResponseMessage(c.id, "callconnected", msg)
                response.from = from
                response.to = to
		response.destCh = headers.channel1;
		response.ch2 = headers.channel2;
                c.emit('message',response);
                logger.debug("RESP 'callconnected' has been sent to [" + to + "] id '" + c.id + "'")
        }	
})

/*EVENT 'AgentCalled': headers = { event: 'AgentCalled',
  privilege: 'agent,all',
  queue: '900',
  agentcalled: 'Local/270@from-internal/n',
  agentname: 'Local/270@from-internal/n',
  channelcalling: 'SIP/272-000002a4',
  destinationchannel: 'Local/270@from-internal-b7d5;1',
  calleridnum: '272',
  calleridname: 'Alessandrotest3',
  context: 'from-internal',
  extension: '900',
  priority: '10',
  uniqueid: '1308652170.784' }
  *
  * by default this event is not generated. Can be activated by amp
  *
  * if the queue hasn't the uniqueid in its 'listCall', then add calleridnum
  * to its listCall object as: ..uniqueid: calleridnum.. */
am.addListener('agentcalled', function(headers) {
	logger.debug("EVENT 'AgentCalled': headers = " + sys.inspect(headers))
	//var queueTypeExt = 'QUEUE/'+headers.queue;
	//modop.addQueueWaitingCaller(headers.channelcalling,headers.calleridnum,headers.calleridname,queueTypeExt);
	//updateAllClientsForOpWithTypeExt(queueTypeExt);
})

am.addListener('calldisconnected', function(from, to) {
	logger.debug("EVENT 'CallDisconnected': between '" + sys.inspect(from) + "' AND '" + sys.inspect(to) + "'");
});

am.addListener('hold', function(participant) {
	var other = am.getParticipant(participant['with']);
	logger.debug("EVENT 'Hold': " + participant.number + " (" + participant.name + ") has put " + other.number + " (" + other.name + ") on hold");
});

am.addListener('unhold', function(participant) {
	var other = am.getParticipant(participant['with']);
	logger.debug("EVENT 'Unhold': " + participant.number + " (" + participant.name + ") has taken " + other.number + " (" + other.name + ") off hold");
});	

am.addListener('callreport', function(report) {
	logger.debug("EVENT 'CallReport': " + sys.inspect(report));
});

/* { event: 'PeerStatus',
  privilege: 'system,all',
  channeltype: 'SIP',
  peer: 'SIP/504',
  peerstatus: 'Registered' } */
am.addListener('peerstatus', function(headers) {
	var statusEvent = headers.peerstatus.toLowerCase();
	var currStatus = modop.getExtStatusWithTypeExt(headers.peer).status;
	/* if the status of the event is 'registered' and current status of peer is different 
	 * from 'unregistered', then the event is ignored. In this way, when the calling is in progress, the arrive of
	 * this event with status 'registered' don't change the status of the extension. */
	if(statusEvent=='registered' && currStatus!='unregistered'){
		//logger.debug("EVENT 'PeerStatus' ignored. Status of [" + headers.peer + "] is already different from 'unregistered'");
		return;
	}
	logger.debug("EVENT 'PeerStatus': " + sys.inspect(headers));
	modop.updateExtStatusForOpWithTypeExt(headers.peer, headers.peerstatus.toLowerCase());
	updateAllClientsForOpWithTypeExt(headers.peer);
});

/* This event is generated, by the phone of the user and when the 
 * call coming from outside.
 * An example of UserEvent event is:
 *
{ event: 'UserEvent',
  privilege: 'user,all',
  serevent: 'ASTDB',
  channel: 'SIP/503-0000000d^Family',
  extra: 'Family: DND^Value: Attivo^' }
 *
 * when the call come from the outside:
{ event: 'UserEvent',
  privilege: 'user,all',
  userevent: 'CAllIN|Data; 3405567088' } 
  userevent: 'CAllIN,Data:3405567088' } 
  *
{ event: 'UserEvent',
  privilege: 'user,all',
  userevent: 'Agentlogin',
  agent: '202' } */
am.addListener('userevent', function(headers){
	logger.debug("EVENT 'UserEvent': headers = " + sys.inspect(headers))
	// Manage first case: the event is generated from the phone og the user
	if(headers.channel!==undefined && headers.extra!==undefined){
		// get ext, family and value
		var ext = headers.channel.split("/")[1]; // 503-0000000d^Family
		ext = ext.split("-")[0]; // 503
		var family = headers.extra.split("^")[0]; // Family: DND
		family = family.split(":")[1]; // DND
		var value = headers.extra.split("^")[1]; // Value: Attivo
		value = value.split(":")[1]; // Attivo or ' '
		// remove whitespace from 'family' and 'value'
		family = family.split(' ').join('');
		value = value.split(' ').join('');
		family = family.toLowerCase();
		value = value.toLowerCase();
		if(family==='dnd'){
			logger.debug("[" + ext + "] '" + family + " " + value + "'");
			/* in this case the client who has modified its DND value is connected to the cti
	 		 * and has modified its DND through his telephone. So he'll be advise of the changing
			 * to update its cti. */
			if(clients[ext]!=undefined){	
				var c = clients[ext]
				if(value==""){ // DND is disabled by the phone user
					logger.debug("[" + ext + "] '" + family + " OFF'")
					var msg = ext + " has disabled its " + family
	        		        var response = new ResponseMessage(c.id, "dnd_status_off", msg)
			                c.emit('message',response);
			                logger.debug("RESP 'dnd_status_off' has been sent to [" + ext + "] id '" + c.id + "'")
				}
				else if(value=="attivo"){ // DND is enable by the phone user
					logger.debug("[" + ext + "] '" + family + " ON'")
					var msg = ext + " has enabled its " + family
	                                var response = new ResponseMessage(c.id, "dnd_status_on", msg)
	                                c.emit('message',response);
	                                logger.debug("RESP 'dnd_status_on' has been sent to [" + ext + "] id '" + c.id + "'")
				}
			}
			if(value=="")
				modop.updateExtDNDStatusWithExt(ext, "off")
			else if(value=="attivo")
				modop.updateExtDNDStatusWithExt(ext, "on")
                        var tyext = modop.getTypeExtFromExt(ext);
	                updateAllClientsForOpWithTypeExt(tyext);
		}
		else if(family=='cf'){
			logger.info("[" + ext + "] '" + family + " " + value + "'");
			/* in this case the client who has modified his 'CF' value is connected to cti
	                 * and has modified his 'CF' through his telephone. So he'll be advise of changing
	                 * to update his cti */
	                if(clients[ext]!=undefined){
	                        var c = clients[ext];
	                        if(value==""){ // CF is disabled by the phone user
	                                logger.debug("[" + ext + "] '" + family + " OFF'");
	                                var msg = ext + " has disabled its " + family;
	                                var response = new ResponseMessage(c.id, "cf_status_off", msg);
	                                c.emit('message',response);
	                                logger.debug("RESP 'cf_status_off' has been sent to [" + ext + "] id '" + c.id + "'");
	                        }
	                        else { // CF is enable by the phone user
	                                logger.debug("[" + ext + "] '" + family + " ON' to [" + value + "]");
	                                var msg = ext + " has enabled its " + family + " to " + value;
	                                var response = new ResponseMessage(c.id, "cf_status_on", msg);
					response.extTo = value;
	                                c.emit('message',response);
	                                logger.debug("RESP 'cf_status_on' to [" + value + "] has been sent to [" + ext + "] id '" + c.id + "'");
	                        }
	                }
	                if(value=="")
	                        modop.updateExtCFStatusWithExt(ext, "off")
	                else 
	                        modop.updateExtCFStatusWithExt(ext, "on", value)
	                updateAllClientsForOpWithTypeExt(ext)
		}
	} // end of the first case
	// Manage second case: the event is generated from the arrive of an outside call
	var userevent = headers.userevent;
	if(userevent!==undefined && userevent.indexOf('CAllIN|Data;')!==-1){
		var callerFromOutside = userevent.split(';')[1];
		callerFromOutside = callerFromOutside.replace(/[" "]/g,"");
		if(callerFromOutside!=='' && callerFromOutside!==undefined && callerFromOutside!==null){
			fillCurrentCallInInfo(callerFromOutside);
		} else {
			logger.warn('Cannot fill currentCallInInfo for UserEvent: ' + sys.inspect(headers));
		}
	}
});

// It is called from 'UserEvent' event when the call come from outside to fill 'currentCallInInfo'
function fillCurrentCallInInfo(num){
    try {
	if(currentCallInInfo[num]===undefined){
		currentCallInInfo[num] = {};
		logger.debug("fill currentCallInInfo with call notes and call reservation for number " + num);
                dataCollector.getCallNotes(num,function(results){ // get call notes
                        logger.debug(results.length + " call notes for number " + num);
                        currentCallInInfo[num].callNotes = results; // add call notes to global variable
                        dataCollector.getExtCallReserved(num,function(results){ // get call reservation
                                logger.debug(results.length + " call reservation for number " + num);
                                if(results.length>0 && currentCallInInfo[num]!==undefined){
                                        currentCallInInfo[num].reservation = {value: true, results: results};
                                } else if(currentCallInInfo[num]!==undefined){
                                        currentCallInInfo[num].reservation = {value: false};
                                }
                                // query to add contact information
                                var numToSearch = num;
                                if (numToSearch.substring(0, 3) === '+39') {
                                    numToSearch = numToSearch.substring(3, numToSearch.length);
                                }
                                nethCtiPhonebook.getAllContactsByNum(num, numToSearch, function (results, num) {
                                    currentCallInInfo[num].ctiPrivate = {};
                                    currentCallInInfo[num].ctiPublic = undefined;
                                    currentCallInInfo[num].centralPhonebook = {};
                                    var i, el;
                                    for (i = 0; i < results.length; i++) {
                                        el = results[i];
                                        if (el.type === 'private' || el.type === 'speeddial') {
                                            currentCallInInfo[num].ctiPrivate[el.owner_id] = el;
                                        }
                                    }
                                    for (i = 0; i < results.length; i++) {
                                        el = results[i];
                                        if (el.type === 'public') {
                                            currentCallInInfo[num].ctiPublic = el;
                                            break;
                                        }
                                    }
                                    if (currentCallInInfo[num].ctiPublic !== undefined) {
                                        dataCollector.getAllContactsByNum(num, numToSearch, function (results, num) {
                                            currentCallInInfo[num].centralPhonebook = results[0];
                                        });
                                    }
                                });
                        });
                });
	} else {
		logger.warn('skip fillCurrentCallInInfo because currentCallInInfo['+num+'] != undefined');
	}
    } catch (err) {
        logger.error('fillCurrentCallInInfo num = ' + num + ': ' + err.stack);
    }
}



// Return customer card, call notes and call reservation to client.
// It is called from GET_VCARD_CC request
function returnCCToClient(num,client,extFrom,response){
	var ccToFill = {};
	ccToFill[num] = {}; // init current data info of the caller
	// do query for cc, call notes and call reservation 
	var allTypesCC = profiler.getAllTypesCustomerCard(); // array
	var customerCardResult = [];
	var idTimeoutGetVCardCC = setTimeout(function(){
		logger.error('timeout reached: get vcard cc by ' + extFrom + ' for num ' + num + ': ' + sys.inspect(Object.keys(ccToFill[num])));
		if(client!==undefined && extFrom!==undefined && response!==undefined){
                        setResponseWithInfoCCByGetVCardCC(client,num,extFrom,response,ccToFill);
                        client.emit('message',response);
                        logger.warn("RESP 'resp_get_vcard_cc' has been sent to [" + extFrom + "] id '" + client.id + "'");
                } else {
	                logger.error("something goes wrong on fill customer card info for number " + num +
       	                ": client or extFrom or response is undefined");
                }
	},TIMEOUT_GET_VCARD_CC);
	ccToFill[num].cc =  {};
	// get customer cards
	for(var i=0, type; type=allTypesCC[i]; i++){
	    (function(numPassed,typePassed,idTimeoutGetVCardCCPassed,clientPassed){ // closure
		dataCollector.getCustomerCard(numPassed, typePassed, function(cc, name) { // get one cc of specified type
		        if(cc!==undefined){ // insert also server address into query results
				var obj = {};
				for(var item in cc){
	                       		cc[item].server_address = "http://" + hostname + ":" + port;
	                        }
				obj[name] = cc;
				customerCardResult.push(obj);
				var ccHtml = createCustomerCardHTML(obj,name,numPassed);
				ccToFill[numPassed].cc[name] =  ccHtml;
			} else {
				customerCardResult.push(cc);
				ccToFill[numPassed].cc[name] = '';
				logger.error('some error in getCustomerCard of type ' + typePassed + ' for num ' + numPassed + ': cc is undefined');
			}
			if(customerCardResult.length===allTypesCC.length && ccToFill[numPassed]!==undefined){ // ex. customerCardResult = [ { default: [ [Object] ] }, { calls: [ [Object] ] } ]
				// get call notes
			    	dataCollector.getCallNotes(numPassed,function(results){
					logger.debug(results.length + " call notes for number " + numPassed);
					ccToFill[numPassed].callNotes = results; // add call notes to global variable
					// get call reservation
			    		dataCollector.getExtCallReserved(numPassed,function(resu){
						logger.debug(resu.length + " call reservation for number " + numPassed);
						// add call reservation to global variable
						if(resu.length>0 && ccToFill[numPassed]!==undefined){
							ccToFill[numPassed].reservation = {value: true, results: resu};
						} else if(ccToFill[numPassed]!==undefined){
							ccToFill[numPassed].reservation = {value: false};
						}
						// if request come from GET_VCARD_CC request return response to the client
						if(clientPassed!==undefined && extFrom!==undefined && response!==undefined){
							setResponseWithInfoCCByGetVCardCC(clientPassed,numPassed,extFrom,response,ccToFill);
		                                        clientPassed.emit('message',response);
							// remove security timeout for send response to the client
							clearTimeout(idTimeoutGetVCardCCPassed);
		                                        logger.debug("RESP 'resp_get_vcard_cc' has been sent to [" + extFrom + "] id '" + clientPassed.id + "'");
						} else {
							logger.error("something goes wrong on fill customer card info for number " + numPassed +
								": client or extFrom or response is undefined");
						}
					});
				});
	                }
		});
	    }(num,type,idTimeoutGetVCardCC,client)); // closure
	}
}

/* This event is necessary to add information to parked members of what extension is parked on it.
 * Example of 'ParkedCall' event is:
 * 
 { Event: ParkedCall
   Privilege: call,all
   Exten: 71
   Channel: SIP/500-0000013c
   From: SIP/502-0000013b
   Timeout: 15
   CallerIDNum: 500
   CallerIDName: <unknown>
   Uniqueid: 1305117424.486 }
 */
am.addListener('parkedcall', function(headers){
	logger.debug("EVENT 'ParkedCall': headers = " + sys.inspect(headers));
	var parking = 'PARK' + headers.exten;
	var extParked = headers.calleridnum;
	var parkFrom = headers.from.split("/")[1];
	parkFrom = parkFrom.split("-")[0];
	var trueUniq='';
	for(key in chStat){ // get uniqueid from chStat
		if(chStat[key].channel===headers.channel){
			trueUniq=key;
		}
	}
	modop.updateParkExtStatus(parking, trueUniq, extParked, parkFrom, headers.timeout);
        updateAllClientsForOpWithTypeExt(parking);
});


/* This event is necessary to update the end of parked call to status of park extensions.
 * Example of 'ParkeCallTimeOut' event is:
 * 
 { Event: ParkedCallTimeOut
   Privilege: call,all
   Exten: 71
   Channel: SIP/502-00000171
   CallerIDNum: 502
   CallerIDName: giovanni } */
am.addListener('parkedcalltimeout', function(headers){
        logger.debug("EVENT 'ParkedCallTimeOut': headers = " + sys.inspect(headers));
        var parking = 'PARK' + headers.exten;
        modop.updateEndParkExtStatus(parking);
        updateAllClientsForOpWithTypeExt(parking);
});

/* This event is trigger when the call parked has hangup
EVENT 'ParkedCallGiveUp': headers = { event: 'ParkedCallGiveUp',
  privilege: 'call,all',
  exten: '71',
  channel: 'SIP/271-000008e7',
  calleridnum: '271',
  calleridname: 'AlessandroTest2' } */
am.addListener('parkedcallgiveup', function(headers){
	logger.debug("EVENT 'ParkedCallGiveUp': headers = " + sys.inspect(headers));
	var parking = 'PARK' + headers.exten;
	modop.updateEndParkExtStatus(parking);
	updateAllClientsForOpWithTypeExt(parking);
	/* channel
	chStat = { '1312444622.4987':
		   { channel: 'SIP/271-000008e7',
		     status: 'up',
		     calleridnum: '271',
		     calleridname: 'AlessandroTest2',
		     dialExt: '270',
		     dialDirection: 1 },
		  '1312444632.4989': { channel: 'Parked/SIP/271-000008e7' } } */
	var trueUniqueid = '';
	for(uniqueid in chStat){
		if(chStat[uniqueid].channel===headers.channel){
			trueUniqueid = uniqueid;
		}
	}
	if(modop.isChannelIntern(headers.channel)){
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel);
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, trueUniqueid)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, trueUniqueid);
			logger.debug("removed dialingUniqueid '" + trueUniqueid + "' from intern '" + internTypeExt + "'");
		} else {
			logger.debug("dialingUniqueid '" + trueUniqueid + "' has already not present into intern '" + internTypeExt + "'");
		}
		if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, trueUniqueid)){
			modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, trueUniqueid);
                        logger.debug("removed callConnectedUniqueid '" + trueUniqueid + "' from intern '" + internTypeExt + "'");
		} else {
			logger.debug("callConnected uniqueid '" + trueUniqueid + "' has already not present into intern '" + internTypeExt + "'");
		}
		modop.updateExtStatusForOpWithTypeExt(internTypeExt,"hangup");
		modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, trueUniqueid); // add uniqueid of current hangup as 'lastHangupUniqueid'
		updateAllClientsForOpWithTypeExt(internTypeExt);
	}
	// chStat
	for(uniqueid in chStat){ // clean chStat
		if(chStat[uniqueid].channel.indexOf(headers.channel)!==-1){
			logger.debug("remove '" + chStat[uniqueid].channel + "' from chStat");
			delete chStat[uniqueid];
		}
	}
});


// This event is emitted at the end of the answers generated after 'ParkedCalls' action
am.addListener('parkedcallscomplete', function(){
	logger.debug("EVENT 'ParkedCallsComplete'");
	returnOperatorPanelToClient() // return operator panel to only the client who has made the request
})

/* This event is emitted by asterisk.js when a new voicemail is added
 * An example of the event is:
{ event: 'MessageWaiting',
  privilege: 'call,all',
  mailbox: '500@default',
  waiting: '1',
  new: '1',
  old: '0' } */
am.addListener('messagewaiting', function(headers){
    try {
	logger.debug("EVENT 'MessageWaiting': new voicemail for [" + headers.mailbox + "]; the number is: " + headers.new);
	var ext = headers.mailbox.split('@')[0];
	modop.updateVMCountWithExt(ext,headers.new);
        var tyext = modop.getTypeExtFromExt(ext);
	updateAllClientsForOpWithTypeExt(tyext);
    } catch (err) {
        logger.error(err.stack);
    }
});

logger.info("connection to asterisk server...");
am.connect();

function recon_ast(){
	if(!astrecon){
		astrecon=true;
		logger.warn("'recon_ast' function");
		if(counter_ast_recon<N_AST_RECON){
			counter_ast_recon++;
			setTimeout(function(){
				logger.warn("asterisk reconnection attempt #"+counter_ast_recon);
				am.connect();
				astrecon=false;
			}, DELAY_AST_RECON);
		}else{
			process.exit(0);
		}
	}else{
		logger.warn("there is already one attempt to reconnect to asterisk");
	}
}
/*
 * End of section relative to asterisk interaction
 *************************************************/

// delete all occurrence of channel from chStat
function deleteAllChOccurrenceFromChstat(ch){ 
	for(key in chStat){
		if(chStat[key].channel.indexOf(ch)!==-1){
			logger.debug("delete '" + key + "' ["+chStat[key].channel+"] from chStat");
			delete chStat[key];
		}
	}
}
function returnOperatorPanelToClient(){
	/* check if the user has the permission to view the operator panel.
         * First check if the user has the "OP_PLUS" permission. If he hasn't the permission, then
         * it check if he has the "OP_BASE" permission */
        if(profiler.checkActionOpPlusPermit(extToReturnExtStatusForOp)){
                var msgstr = "received extStatusForOp to create operator panel";
                var mess = new ResponseMessage(clientToReturnExtStatusForOp.id, "ack_get_peer_list_complete_op", msgstr);
                mess.extStatusForOp = modop.getExtStatusForOp()
                mess.tabOp = modop.getTabOp()
                mess.opPermit = 'plus'
		if(profiler.checkPrivacyPermit(clientToReturnExtStatusForOp.extension)){
			mess.priv = '1';
		} else {
			mess.priv = '0';
		}
                clientToReturnExtStatusForOp.emit('message', mess);
                logger.debug("RESP 'ack_get_peer_list_complete_op' has been sent to [" + extToReturnExtStatusForOp + "] id '" + clientToReturnExtStatusForOp.id + "'")
        } else {
                var msgstr = "received extStatusForOp to create operator panel"
                var mess = new ResponseMessage(clientToReturnExtStatusForOp.id, "ack_get_peer_list_complete_op", msgstr)
                mess.extStatusForOp = modop.getExtStatusForOp()
                mess.tabOp = modop.getTabOp()
                mess.opPermit = 'base'
		if(profiler.checkPrivacyPermit(clientToReturnExtStatusForOp.extension)){
                        mess.priv = '1';
                } else {
                        mess.priv = '0';
                }
                clientToReturnExtStatusForOp.emit('message',mess);
                logger.debug("RESP 'ack_get_peer_list_complete_op' has been sent to [" + extToReturnExtStatusForOp + "] id '" + clientToReturnExtStatusForOp.id + "'")
        }
}



/*******************************************************************************
 * Section relative to HTTP server
 */
server = http.createServer(function(req, res){
    if (req.method === 'POST') {
	logger.debug("HTTP POST request: path = " + url.parse(req.url).pathname);
        var body = "";
        req.setEncoding("utf8");
        req.on("data", function (data) {
            body += data;
        });
        req.on("end", function () {
            var path = url.parse(req.url).pathname;
            var params = querystring.parse(body);
            router.route(path, params, res);
        });
    } else {
	var parsed_url = url.parse(req.url,true);
	var path = parsed_url.pathname;
	var params = parsed_url.query;
	logger.debug("HTTP GET request: path = " + path + " params = " + sys.inspect(params));
	switch (path){
	    case '/uploadVmCustomMsg':
	    	var extFrom = params.extFrom;
		logger.debug('received http request of action /uploadVmCustomMsg from ' + extFrom);
		var namefile = params.name;
		var vm = params.vm;
		voicemail.deleteCustomMessageInactive(namefile+'.wav',extFrom); // if present delete inactive voicemail custom message
		var form = new formidable.IncomingForm();
		form.on('fileBegin',function(name,file){
			file.path = '/var/spool/asterisk/voicemail/default/'+vm+'/'+namefile+'.wav';
		});
		form.parse(req, function(err, fields, files) {
			if(err){
				logger.error('error in uploadVmCustomMsg err: ' + sys.inspect(err) + ' fields: ' + sys.inspect(fields));
				send404(res);
				var mess = new ResponseMessage(client.id, "error_custom_vm_msg_upload",'');
                                mess.name = namefile;
                                client.emit('message',mess);
                                logger.debug("RESP 'error_custom_vm_msg_upload' has been sent to [" + extFrom + "] IP: '" + ipAddrClient + "'");
			} else {
				res.writeHead(200, {'content-type': 'text/html'});
				res.write('received upload:\n\n');
				res.end();
				var client = clients[extFrom];
				if(client!==undefined){
		                        var ipAddrClient = client.handshake.address.address;
					logger.debug('file '+namefile+'.wav has been saved for extension ' + extFrom);
					var mess = new ResponseMessage(client.id, "ack_custom_vm_msg_upload",'');
                                        mess.name = namefile;
                                        client.emit('message',mess);
                                        logger.debug("RESP 'ack_custom_vm_msg_upload' has been sent to [" + extFrom + "] IP: '" + ipAddrClient + "'");
				} else {
					logger.error('error in uploadVmCustomMsg err: ' + sys.inspect(err) + ' fields: ' + sys.inspect(fields));
		                        send404(res);
				}
			}
		});
	    break;
	    case '/':
    		path = "/index.html";
	    	fs.readFile(__dirname + path, function(err, data){
			if (err) return send404(res);
		        res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data, 'utf8');
			res.end();
    	  	});
	    break;
	    case '/getStreamingFrameImageFile':
		var name = params.name;
		var urlToGet = params.url;
		var urlToGetParsed = url.parse(urlToGet);
		var portToGet = '80';
		if(urlToGetParsed.port!==undefined){
			portToGet = urlToGetParsed.port;
		}
		var options = {
			host: urlToGetParsed.hostname,
			port: portToGet,
			path: urlToGetParsed.pathname
		}
		http.get(options, function(response){
			res.writeHead(200, {'Content-type': 'application/octect-stream', 'Content-disposition': 'attachment; filename='+name+'.jpg'});
			response.on('data', function(data){
				res.write(data, 'utf8');
			}).on('end',function(){
				res.end();
			});
		}).on('error',function(err){
			logger.error('error on request screenshot of streaming frame: ' + urlToGet);
			logger.error(err.message);
		});
	    break;
	    case '/getCustomVoicemailMsg':
		var name = params.name;
		var active = params.active;
		var extFrom = params.extFrom;
		var vm = params.vm;
		var filename = name + '.wav';
		var filepath = voicemail.getFilepathCustomMessage(filename,vm);
		if(active==='false'){ // if the voicemail custom message is inactive, the end of it's name is '.inactive'
			filepath = filepath + '.inactive';
		}
		logger.debug(extFrom + " has request to listen custom voicemail message " + filepath);
		pathreq.exists(filepath, function(exists){
			if(exists){
				var typefile = 'audio/x-wav';
				fs.readFile(filepath, function(err, data){
					if(err){
                                                return send404(res);
                                        }
					res.writeHead(200, {'Content-Type': typefile, 'Content-disposition': 'attachment; filename='+filename});
                                        res.write(data, 'utf8');
                                        res.end();
				});
			} else {
				logger.error("requested custom voicemail message '" + filepath + "' not found");
				send404(res);
			}
		});
	    break;
	    case '/getVoicemailAudioFile':
		var filename = params.filename;
		var typevm = params.type;
		var extFrom = params.extFrom;
		var vm = params.vm;
		var filepath = voicemail.getFilepath(filename,typevm,vm);
	    	logger.debug(extFrom + " has request to listen voicemail " + filepath);
		pathreq.exists(filepath, function(exists){
			if(exists){
				var fileExt = pathreq.extname(filepath);
				var typefile = '';
				if(params.down==='0'){
					typefile = 'application/octect-stream'; // this is to force download of voicemail file
				} else if(fileExt.toLowerCase()==='.wav'){
					typefile = 'audio/x-wav';
				} else if(fileExt==='.mp3'){
					typefile = 'audio/mpeg';
				} else if(fileExt==='.ogg'){
					typefile = 'application/ogg';
				}
				fs.readFile(filepath, function(err, data){
					if(err){
						return send404(res);
					}
					res.writeHead(200, {'Content-Type': typefile, 'Content-disposition': 'attachment; filename='+(filename+fileExt)});
					res.write(data, 'utf8');
					res.end();
				});
			} else {
				logger.error("requested voicemail audio file '" + filepath + "' not found");
				send404(res);
			}
		});
	    break;
	    case '/getCallAudioFile':
		var filename = params.file;
		var extFrom = params.extFrom;
		// check if the requested file exists
                var tempPath = AST_CALL_AUDIO_DIR + "/" + filename;
                pathreq.exists(tempPath, function(exists){
                        if(exists){
                                // check the extension of the file
                                var fileExt = pathreq.extname(tempPath);
                                var type;
				if(params.down==0) type='application/octect-stream'; // this is to force download of audio file
                                else if(fileExt.toLowerCase()=='.wav') type = 'audio/x-wav';
                                else if(fileExt=='.mp3') type = 'audio/mpeg';
                                else if(fileExt=='.ogg') type = 'application/ogg';
                                fs.readFile(tempPath, function(err, data){
                                        if (err) return send404(res);
                                        res.writeHead(200, {'Content-Type': type, 'Content-disposition': 'attachment; filename='+(filename)});
                                        res.write(data, 'utf8');
                                        res.end();
                                });
                        }
                        else{
				logger.error("requested call audio file '" + filename + "' not found");
                                send404(res);
                        }
                });
	    break;
	    case '/call':
		logger.debug("received request of 'click2call' through HTTP request");
		var ext = params.ext;
		var to = params.to;
		callout(ext, to, res);
	    break;
	    default: 
    		// check if the requested file exists
    		var tempPath = __dirname + path;
    		pathreq.exists(tempPath, function(exists){
    			if(exists){
    				// check the extension of the file
    				var fileExt = pathreq.extname(tempPath);
    				var type;
    				if(fileExt=='.js') type = 'text/javascript';
    				else if(fileExt=='.html' || fileExt=='htm') type = 'text/html';
    				else if(fileExt=='.css') type = 'text/css';
    				fs.readFile(tempPath, function(err, data){
				        if (err) return send404(res);
				        res.writeHead(200, {'Content-Type': type});
				        res.write(data, 'utf8');
				        res.end();
				    });
    			} else {
		    		send404(res);
			}
    		});
  	}
    }
});	


send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(port);
logger.info("HTTP server listening on port: " + port);
/*
 * end of section relative to HTTP server
 ******************************************************************************/

function callout(extFrom, to, res){
	if(server_conf.SERVER_PROXY.prefix!=='' && !modop.isExtInterno(to)){
		to = server_conf.SERVER_PROXY.prefix + to;
	}
	if(profiler.checkActionCallOutPermit(extFrom)){ // check if the user has the permission of dial out
		logger.debug("check 'callOut' permission for [" + extFrom + "] OK: execute calling...");
                // create call action for asterisk server
                var tyext = modop.getTypeExtFromExt(extFrom);
                var actionCall = {
			Action: 'Originate',
                        Channel: tyext,
			Exten: to,
                        Context: 'from-internal',
                        Priority: 1,
                        Callerid: CALL_PREFIX + to + ' <' + extFrom + '>',
                        Account: to,
                        Timeout: 30000
                };
                /* update all clients that 'extFrom' has been started a call out, so they can update their OP.
                 * This is made because asterisk.js not generate 'newState' ringing event until the user
                 * has pickup his phone */
                sendAllClientAckCalloutFromCti(extFrom);
		try{
	                am.send(actionCall, function () { // send action to asterisk
				logger.debug('\'actionCall\' ' + sys.inspect(actionCall) + ' has been sent to AST');
				var client = clients[extFrom];
				if(client!==undefined){
					var msgTxt = "call action has been sent to asterisk: " + extFrom + " -> " + to;
		                        var respMsg = new ResponseMessage(client.id, "ack_callout", msgTxt);
					client.emit('message',respMsg);
		                        logger.debug("RESP 'ack_callout' has been sent to [" + extFrom + "] id '" + client.id + "'");
				} else {
					logger.debug("don't send ack_callout to client, because it isn't present: the call was originated from outside of the cti");
				}
	                });
		} catch(err){
			logger.warn("no connection to asterisk: "+err);
		}
		if(res!==undefined){
			res.writeHead(200, {"Content-Type":"text/plain"});
			res.end("ack_click2call");
		}
	} else{
		logger.warn("check 'callOut' permission for [" + extFrom + "] FAILED !");
		var client = clients[extFrom];
		if(client!==undefined){
	                client.emit('message',new ResponseMessage(client.id, 'error_call', "Sorry, but you don't have permission to call !"));
	                logger.debug("RESP 'error_call' has been sent to [" + extFrom + "] id '" + client.id + "'");
		} else{
			logger.debug("don't send error_call to client, because it isn't present: the call was originated from outside of the cti");
		}
		if(res!==undefined){
			res.writeHead(404,{"Content-type":"text/plain"});
			res.end("no_permission");
		}
	}
}


/*******************************************************************************
 * Section relative to WebSocket
 */ 
var io = io.listen(server);
// set with env NODE_ENV
io.configure('development', function(){
	io.set('log level', 3);
});
io.configure('', function(){
	io.set('log level', 1);
});
io.sockets.on('connection', function(client){
	// send acknowledgment of established connection 
	client.emit('message', new ResponseMessage(client.id, "connected", "[DEBUG] client " + client.id + " connected"));
	logger.debug("'ack' to connection has been sent to the client with id: " + client.id);

	client.on('message', function(message){
		// all received messages have the information 'extenFrom' and the information about the 'action' to execute
  		var extFrom = message.extFrom;
  		var action = message.action;
		// object that contains all actions that can be executed
		var actions = {
			LOGIN: 	'login',
			CALLOUT:'call_out_from_client',
			LOGOUT:	'logout',
			HANGUP:	'hangup',
			RECORD: 'record',
			PARK: 	'park',
			PARKCH: 'parkch',
			PICKUP: 'pickup',
			PICKUP_CH: 'pickup_ch',
			DND_ON: 'dnd_on',
                	DND_OFF:'dnd_off',
			CW_ON: 	'cw_on',
                	CW_OFF:	'cw_off',
			CF_ON: 	'cf_on',
			CF_OFF: 'cf_off',
			CFU_ON:	'cfu_on',
			CFU_OFF:	'cfu_off',
			CFB_ON: 	'cfb_on',
			CFB_OFF: 	'cfb_off',
			CFVM_ON: 	'cfvm_on',
			CFVM_OFF: 	'cfvm_off',
			CFUVM_ON: 	'cfuvm_on',
			CFUVM_OFF:	'cfuvm_off',
			CFBVM_ON:	'cfbvm_on',
			CFBVM_OFF:	'cfbvm_off',
			CHECK_DND_STATUS:	'check_dnd_status',
			CHECK_CW_STATUS:    	'check_cw_status',
			CHECK_CF_STATUS:	'check_cf_status',
			CHECK_CFU_STATUS:	'check_cfu_status',
			CHECK_CFB_STATUS:	'check_cfb_status',
			HANGUPCH:	'hangupch',
			REDIRECT:   	'redirect',
			SEND_SMS:	'send_sms',
			HANGUP_SPY: 	'hangup_spy',
			STOP_RECORD: 	'stoprecord',
			SPY_LISTEN:  	'spy_listen',
			CF_VM_PARKING: 	'cf_vm_parking',
			GET_VCARD_CC:  	'get_vcard_cc',
			PARKING_PICKUP: 'parking_pickup',
			GET_CALL_NOTES:	'get_call_notes',
			HANGUP_UNIQUEID:'hangup_uniqueid',
			START_RECORD_CHANNEL:	'start_record_channel',
			STOP_RECORD_CHANNEL:	'stop_record_channel',
			SPY_LISTEN_SPEAK:   	'spy_listen_speak',
			SAVE_NOTE_OF_CALL:	'save_note_of_call',
			DELETE_CALL_NOTE:	'delete_call_note',
			MODIFY_NOTE_OF_CALL:	'modify_note_of_call',
			GET_ALL_VM_STATUS:  	'get_all_vm_status',
			REDIRECT_VOICEMAIL: 	'redirect_voicemail',
			GET_DAY_HISTORY:  	'get_day_history',
			GET_DAY_SWITCHBOARD:  	'getDaySwitchboard',
			STORE_CHAT_ASSOC:	'store_chat_association',
			CHECK_CALL_AUDIO_FILE: 	'check_call_audio_file',
			CF_UNCOND_FROM_PARKING: 'cf_uncond_from_parking',
			GET_INTERVAL_HISTORY:	'get_interval_history',
			OPEN_CALL_STREAMING:	'open_call_streaming',
			GET_QUEUE_STATUS:	'get_queue_status',
			GET_VOICEMAIL_LIST: 	'get_voicemail_list',
			DELETE_VOICEMAIL: 	'del_voicemail',
			SPEAK_INTERCOM:		'speak_intercom',
			GET_ALL_NOTES_FOR_NUM:	'get_all_notes_for_num',
			ENABLE_VM_CUSTOM_MSG:	'enable_vm_custom_msg',
			DISABLE_VM_CUSTOM_MSG:	'disable_vm_custom_msg',
			DELETE_VM_CUSTOM_MSG:	'delete_vm_custom_msg',
			GET_VM_CUSTOM_MSG:	'get_vm_custom_msg',
			RECORD_VM_CUSTOM_MSG:	'record_vm_custom_msg',
			GET_PRIORITY_QUEUE_STATUS:	'get_priority_queue_status',
			SEARCH_CONTACT_PHONEBOOK:	'search_contact_phonebook',
			GET_PEER_LIST_COMPLETE_OP: 	'get_peer_list_complete_op',
			GET_CURRENT_WEEK_HISTORY:  	'get_current_week_history',
			GET_CURRENT_WEEK_SWITCHBOARD:  	'getCurrentWeekSwitchboard',
			GET_CURRENT_MONTH_HISTORY:	'get_current_month_history',
			GET_CURRENT_MONTH_SWITCHBOARD:	'getCurrentMonthSwitchboard',
			DELETE_AUDIO_RECORDING_CALL:	'delete_audio_recording_call'
		}
  		logger.debug("ACTION received: from id '" + client.id + "' message " + sys.inspect(message));	
  		switch(action){
			case actions.DELETE_VM_CUSTOM_MSG:
				var name = message.name;
				var vm = message.vm;
				var filename = name + '.wav';
                                var res = voicemail.deleteCustomMessage(filename,vm);
				if(res){
                                        var respMsg = new ResponseMessage(client.id, "ack_delete_vm_custom_msg", '');
                                        respMsg.name = name;
                                        client.emit('message',respMsg);
                                        logger.debug("RESP 'ack_delete_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                } else {
                                        var respMsg = new ResponseMessage(client.id, "error_delete_vm_custom_msg", '');
                                        respMsg.name = name;
                                        client.emit('message',respMsg);
                                        logger.warn("RESP 'error_delete_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                }
			break;
			case actions.DISABLE_VM_CUSTOM_MSG:
				var name = message.name;
				var vm = message.vm;
				var filename = name + '.wav';
				var res = voicemail.disactivateCustomMessage(filename,vm);
				if(res){
                                        var respMsg = new ResponseMessage(client.id, "ack_disable_vm_custom_msg", '');
					respMsg.name = name;
                                        client.emit('message',respMsg);
                                        logger.debug("RESP 'ack_disable_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                } else {
                                        var respMsg = new ResponseMessage(client.id, "error_disable_vm_custom_msg", '');
					respMsg.name = name;
                                        client.emit('message',respMsg);
                                        logger.debug("RESP 'error_disable_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                }
			break;
			case actions.ENABLE_VM_CUSTOM_MSG:
				var name = message.name;
				var vm = message.vm;
				var filename = name + '.wav';
				var res = voicemail.activateCustomMessage(filename,vm);
				if(res){
					var respMsg = new ResponseMessage(client.id, "ack_enable_vm_custom_msg", '');
					respMsg.name = name;
					client.emit('message',respMsg);
					logger.debug("RESP 'ack_enable_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
				} else {
                                	var respMsg = new ResponseMessage(client.id, "error_enable_vm_custom_msg", '');
					respMsg.name = name;
                                        client.emit('message',respMsg);
                                        logger.debug("RESP 'error_enable_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
				}
			break;
			case actions.RECORD_VM_CUSTOM_MSG:
				var name = message.name;
				var vm = message.vm;
				var filename = name + '.wav';
				var filepath = voicemail.getFilepathCustomMessage(filename,vm);
				voicemail.deleteCustomMessage(filename,vm);
                                var tyext = modop.getTypeExtFromExt(extFrom);
				if(profiler.checkActionVoicemailPermit(extFrom)){
					var action = {
						Action: 'Originate',
						Channel: tyext,
						Context: 'from-internal',
						Callerid: 'REC <'+extFrom+'>',
						Application: 'Record',
						Data: filepath+',,,k'
					};
					try {
						am.send(action,function(){
							logger.debug('\'action\' ' + sys.inspect(action) + ' has been sent to AST');
							var client = clients[extFrom];
							if(client!==undefined){
								var respMsg = new ResponseMessage(client.id, "ack_record_vm_custom_msg", '');
								respMsg.name = name;
                                                                client.emit('message',respMsg);
                                                                logger.debug("RESP 'ack_record_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
							} else {
                                                                logger.debug("don't send 'ack_record_vm_custom_msg' to client, because it isn't present: the call was originated from outside of the cti");
                                                        }
						});
					} catch(err){
						logger.error("doing recording of voicemail custom message: " + err.message);
					}
				} else {
					logger.warn('['+extFrom+'] hasn\'t the permission to recording custom voicemail message of type ' + name);
				}
			break;
			case actions.OPEN_CALL_STREAMING:
				var name = message.name;
				if(profiler.checkStreamingPermission(name,extFrom)){
					var cmd = message.cmd;
					var exten = message.exten;
                                        var tyext = modop.getTypeExtFromExt(exten);
					var actionOpen = {
			                        Action: 'Originate',
			                        Channel: tyext,
                        			Context: 'from-internal',
						Application: 'SendDTMF',
						Data: 'w'+cmd
			                };
                			try{
			                        am.send(actionOpen, function () {
			                                logger.debug('\'actionOpen\' ' + sys.inspect(actionOpen) + ' has been sent to AST');
			                                var client = clients[extFrom];
			                                if(client!==undefined){
                                        			var respMsg = new ResponseMessage(client.id, "ack_open_call_streaming", '');
			                                        client.emit('message',respMsg);
                        			                logger.debug("RESP 'ack_open_call_streaming' has been sent to [" + extFrom + "] id '" + client.id + "'");
			                                } else {
			                                        logger.debug("don't send ack_open_call_streaming to client, because it isn't present: the call was originated from outside of the cti");
			                                }
			                        });
			                } catch(err){
			                        logger.warn("no connection to asterisk: "+err);
			                }
				} else {
					logger.warn('['+extFrom+'] hasn\'t the permission for opening call "streaming - ' + name + '"');
					var respMsg = new ResponseMessage(client.id, "error_open_call_streaming", '');
					client.emit('message',respMsg);
                                        logger.debug("RESP 'error_open_call_streaming' has been sent to [" + extFrom + "] id '" + client.id + "'");
				}
			break;
			case actions.DELETE_VOICEMAIL:
				var resPermit = profiler.checkActionVoicemailPermit(extFrom);
				if(resPermit){
					var filename = message.filename;
					var type = message.type;
					var vm = message.vm;
					var res = voicemail.delVoicemail(filename,type,vm);
					if(res){
						var respMsg = new ResponseMessage(client.id, "ack_del_voicemail", '');
						respMsg.filename = filename;
						respMsg.type = type;
						client.emit('message',respMsg);
		                                logger.debug("RESP 'ack_del_voicemail' has been sent to [" + extFrom + "] id '" + client.id + "'");
					} else {
						var respMsg = new ResponseMessage(client.id, "error_del_voicemail", '');
	                                        client.emit('message',respMsg);
	                                        logger.debug("RESP 'error_del_voicemail' has been sent to [" + extFrom + "] id '" + client.id + "'");
					}
				} else {
					logger.warn("["+extFrom+"] hasn't the permission to delete voicemail");
				}
			break;
			case actions.GET_VOICEMAIL_LIST:
				var res = profiler.checkActionVoicemailPermit(extFrom);
				if(res){
					var vm = message.voicemail;
					var respMsg = new ResponseMessage(client.id, "ack_voicemail_list", '');
					respMsg.voicemailList = voicemail.getVoicemailList(vm);
					client.emit('message',respMsg);
					logger.debug("RESP 'ack_voicemail_list' has been sent to [" + extFrom + "] id '" + client.id + "'");
				} else {
					logger.warn("["+extFrom+"] hasn't the permission to request voicemail");
				}
			break;
			case actions.GET_PRIORITY_QUEUE_STATUS:
				modop.updatePriorityQueueStatus(message.interval);
			break;
			case actions.GET_QUEUE_STATUS:
				modop.updateQueueStatus(message.interval);
			break;
			case actions.DELETE_AUDIO_RECORDING_CALL:
				var uniqueid = message.uniqueid;
				fs.readdir(AST_CALL_AUDIO_DIR,function(err,files){
					if(err){
						logger.error('from ['+extFrom+'] - error deleting audio recording call with uniqueid ['+uniqueid+']: ' + err);
						var respMsg = new ResponseMessage(client.id, "error_delete_audio_recording_call", '');
						client.emit('message',respMsg);
						logger.debug("RESP 'error_delete_audio_recording_call' has been sent to [" + extFrom + "] id '" + client.id + "'");
						return;
					}
                			for(var i=0, filename; filename=files[i]; i++){
                        			if(filename.indexOf(uniqueid)!==-1){
							var filepath = pathreq.join(AST_CALL_AUDIO_DIR,filename);
							fs.unlinkSync(filepath);
							var res = pathreq.existsSync(filepath);
							if(!res){
								logger.debug('audio file ['+filepath+'] deleted');
								var respMsg = new ResponseMessage(client.id, "ack_delete_audio_recording_call", '');
								respMsg.uniqueid = uniqueid;
								client.emit('message',respMsg);
								logger.debug("RESP 'ack_delete_audio_recording_call' has been sent to [" + extFrom + "] id '" + client.id + "'");
							} else {
								logger.error('from ['+extFrom+'] - error deleting audio recording call ['+filepath+']');
								var respMsg = new ResponseMessage(client.id, "error_delete_audio_recording_call", '');
								respMsg.filepath = filepath;
								client.emit('message',respMsg);
								logger.debug("RESP 'error_delete_audio_recording_call' has been sent to [" + extFrom + "] id '" + client.id + "'");
								return;
							}
                        			}
                			}
				});
			break;
			case actions.GET_ALL_NOTES_FOR_NUM:
				dataCollector.getAllNotesForNum(extFrom,message.num,function(results){
					var respMsg = new ResponseMessage(client.id, "resp_get_all_notes_for_num", '');
					respMsg.allNotes = results;
					respMsg.num = message.num;
					client.emit('message',respMsg);
					logger.debug("RESP 'resp_get_all_notes_for_num' has been sent to [" + extFrom + "] id '" + client.id + "'");
				});
			break;
			case actions.GET_CALL_NOTES:
				dataCollector.getCallNotes(message.num,function(results){ // get call notes for the caller (from)
					var owner = '',
						pub = false,
						result = [];
					for(var i=0, entry; entry=results[i]; i++){
						pub = entry.public;
						if(pub || entry.extension===extFrom){ // add entry if it's public or the requester is the creator
							result.push(entry);
						}
					}
					var respMsg = new ResponseMessage(client.id, "resp_get_call_notes", '');
                                        respMsg.callNotes = result;
                                        client.emit('message',respMsg);
                                        logger.debug("RESP 'resp_get_call_notes' has been sent to [" + extFrom + "] id '" + client.id + "'");
				});
			break;
			case actions.GET_VCARD_CC: // return customer card for each num in nums array
				var nums = message.nums;
				var response = new ResponseMessage(client.id, "resp_get_vcard_cc", '');
				var typesCC = profiler.getTypesCustomerCardPermit(extFrom);
				logger.debug("[" + extFrom + "] is able to view customer card of types: " + sys.inspect(typesCC));
				if(typesCC.length===0){ // hasn't the customer card permission
					logger.debug("check permission to view Customer Card for [" + extFrom + "] FAILED !");
					response.customerCard = "";
					response.noPermission = 'true';
					client.emit('message',response);
					logger.debug("RESP 'resp_get_vcard_cc' has been sent to [" + extFrom + "] id '" + client.id + "'");
				} else {
					logger.debug("customer card permission for [" + extFrom + "] OK");
	                                var from = nums[0];
					if(from!==undefined){ // there is one number to search
						returnCCToClient(from,client,extFrom,response);
					} else { // no number to search
						var respMsg = new ResponseMessage(client.id, "error_get_vcard_cc", '');
						client.emit('message',respMsg);
						logger.warn("RESP 'error_get_vcard_cc' has been sent to [" + extFrom + "] id '" + client.id + "'");
					}
				}
			break;
			case actions.MODIFY_NOTE_OF_CALL:
				var note = message.note;
				var pub = message.pub;
				var expiration = message.expiration;
				var expFormatVal = message.expFormatVal;
				var entryId = message.entryId;
				var reservation = message.nextCallReservation;
				dataCollector.modifyCallNote(note,pub,expiration,expFormatVal,entryId,reservation,function(){
					logger.debug('call note from [' + extFrom + '] for number \'' + message.num + '\' has been modified into database');
					var respMsg = new ResponseMessage(client.id, 'ack_modify_callnote', '');
					respMsg.note = message.note;
					respMsg.pub = message.pub;
					respMsg.entryId = message.entryId;
					respMsg.reservation = message.nextCallReservation;
					var d = new Date();
					var newdate = new Date(d);
					if(message.expFormatVal==='DAY') {
						newdate.setDate(d.getDate() + parseInt(message.expiration));
					} else if(message.expFormatVal==='HOUR') {
						newdate.setHours(d.getHours() + parseInt(message.expiration));
					}
					var dd = newdate.getDate();
					var mm = newdate.getMonth()+1;
					var hh = newdate.getHours();
					var min = newdate.getMinutes();
					var sec = newdate.getSeconds();
					respMsg.expirationDate = (dd<10 ? ('0'+dd) : dd) + '/' + (mm<10 ? ('0'+mm) : mm) + '/' + newdate.getFullYear();
					respMsg.expirationTime = (hh<10 ? ('0'+hh) : hh) + ':' + (min<10 ? ('0'+min) : min) + ':' + (sec<10 ? ('0'+sec) : sec);
                                        client.emit('message',respMsg);
                                        logger.debug("RESP 'ack_modify_callnote' has been sent to [" + extFrom + "] id '" + client.id + "'");	
				});
			break;
			case actions.DELETE_CALL_NOTE:
				dataCollector.deleteCallNote(message.id,function(){
					logger.debug('call note [id=' + message.id + '] has been deleted from database');
					var respMsg = new ResponseMessage(client.id, 'ack_delete_callnote', '');
					respMsg.entryid = message.id;
					client.emit('message',respMsg);
					logger.debug("RESP 'ack_delete_callnote' has been sent to [" + extFrom + "] id '" + client.id + "'");
				});
			break;
			case actions.SAVE_NOTE_OF_CALL:
				var note = message.note;
				var pub = message.pub;
				var expiration = message.expiration;
				var expFormatVal = message.expFormatVal;
				var num = message.num;
				var reservation = message.nextCallReservation;
				if(note===undefined || pub===undefined || expiration===undefined || expFormatVal===undefined || num===undefined || reservation===undefined){
					logger.error('bad argument to save call note!');
					return;
				}
				dataCollector.saveCallNote(note,extFrom,pub,expiration,expFormatVal,num,reservation,function(){ // save call note
					logger.debug('call note from [' + extFrom + '] for number \'' + message.num + '\' has been saved into DB');
					var respMsg = new ResponseMessage(client.id, 'ack_save_callnote', '');
					client.emit('message',respMsg);
					logger.debug("RESP 'ack_save_callnote' has been sent to [" + extFrom + "] id '" + client.id + "'");
				});
			break;
			case actions.CF_VM_PARKING:
				var redirectTo = message.redirectToExt;
				var parking = message.parking;
				var uniq=modop.getParkedUniqueid(parking);
                                var ch = chStat[uniq].channel;
				// create action to spy channel
                                var actionCfVMParking = {
                                        Action: 'Redirect',
                                        Channel: ch,
                                        Context: 'ext-local',
                                        Exten: 'vmu' + redirectTo,
                                        Priority: 1
                                }
				try{
	                                am.send(actionCfVMParking, function(){
	                                        logger.debug("'actionCfVMParking' " + sys.inspect(actionCfVMParking) + " has been sent to AST");
	                                });
				} catch(err) {
					logger.warn("no connection to asterisk: "+err);
				}
			break;
			case actions.CF_UNCOND_FROM_PARKING:
				var redirectTo = message.redirectCallTo;
				var fromPark = message.parkingRedirectCallFrom;
				var uniq=modop.getParkedUniqueid(fromPark);
				var ch = chStat[uniq].channel;
				var actionRedirFromParking = {
                                       Action: 'Redirect',
                                       Channel: ch,
                                       Context: 'from-internal',
                                       Exten: redirectTo,
                                       Priority: 1
                                };
				try{
                	                am.send(actionRedirFromParking, function(){
        	                                logger.debug("'actionRedirFromParking' " + sys.inspect(actionRedirFromParking) + " has been sent to AST");
	                                });
				} catch(err) {
                                        logger.warn("no connection to asterisk: "+err);
                                }
			break;
			case actions.STORE_CHAT_ASSOC:
                            try {
				var userBareJid = message.userBareJid;
				modop.setUserBareJid(extFrom, userBareJid);
				storeChatAssociation(extFrom, userBareJid);
                            } catch (err) {
                                logger.error('extFrom = ' + extFrom + ', barejid = ' + message.userBareJid + ': ' + err.stack);
                            }
			break;
  			case actions.LOGIN:
	  			if(authenticator.authenticateUser(extFrom, message.secret)){  // the user is authenticated
  					// if the user is already logged in, a new session is created and the old is closed
  					if(testAlreadyLoggedExten(extFrom)){
						// close already present session
						var clientToClose = clients[extFrom];
						var respMsg = new ResponseMessage(clientToClose.id, 'new_access', 'New Access from another place');
						clientToClose.emit('message',respMsg);
						logger.debug("RESP 'new_access' has been sent to [" + extFrom + "] id '" + clientToClose.id + "'");
						removeClient(clientToClose.id);
						if(!testAlreadyLoggedSessionId(clientToClose.id)){
							logger.debug("new access [" + extFrom + "]: logged OUT sessiondId '" + clientToClose.id + "'");
						}
					}
					client.extension = extFrom;
					clients[extFrom] = client;
					var ipAddrClient = client.handshake.address.address;
					logger.info("logged IN: client [" + extFrom + "] IP '" + ipAddrClient + "' id '" + client.id + "'");
					logger.debug(Object.keys(clients).length + " logged in clients");
					printLoggedClients();
					var respMsg = new ResponseMessage(client.id, "ack_login", "Login succesfully");
					respMsg.ext = extFrom;
					respMsg.secret = message.secret;
                                        respMsg.tyext = modop.getTypeExtFromExt(extFrom);
					var keys = Object.keys(sms_conf.SMS);
					respMsg.permissions = profiler.getAllPermissions(extFrom);
					if(keys.length===0 || sms_conf.SMS.type===undefined || sms_conf.SMS.type===''){
						respMsg.permissions.sms = false
					}
					if(profiler.checkActionChatPermit(extFrom)){ // check user permission to use the chat
						var chaturl = server_conf.SERVER_CHAT.url; // url of the chat server
						if(chaturl==='' || chaturl===undefined){
							chaturl = 'http://'+server_conf.SERVER_PROXY.hostname+'/http-bind';
						}
						respMsg.chatUrl = chaturl;
					}
					var vm = message.voicemail;
					var vmPwd = message.voicemailSecret;
					if(vm!==undefined){
						var res = modop.vmExist(vm);
						var resVm = authenticator.authenticateVoicemail(vm,vmPwd);
						if(!resVm){
							logger.warn('authentication of voicemail ' + vm + ' failed');
						}
						if(res && !resVm){
							respMsg.authVoicemail = 'auth-vm-failed';
						}
						respMsg.existVoicemail = (res && resVm);
						if(respMsg.existVoicemail){
							var obj = voicemail.getCustomMessages(vm);
							respMsg.customVmMsg = obj;
						}
					}
					respMsg.streamingSettings = profiler.getStreamingSettings(extFrom);
					client.emit('message',respMsg);
					logger.debug("RESP 'ack_login' has been sent to [" + extFrom + "] id '" + client.id + "'");
					var ver = message.ver;
					ver===undefined ? ver = '<1.1' : '';
					login_logger.debug(extFrom + ' ' + ipAddrClient + ' ' + ver);
  				}
  				else{ // the user is not authenticated
  					logger.warn("login AUTH FAILED: [" + extFrom + "] with secret '" + message.secret + "'");
  					client.emit('message',new ResponseMessage(client.id, "error_login", "Sorry, authentication failed !"));
  					logger.debug("RESP 'error_login' has been sent to [" + extFrom + "] id '" + client.id + "'");
  				}
	  		break;
			case actions.GET_VM_CUSTOM_MSG:
				var respMsg = new ResponseMessage(client.id,"resp_get_vm_custom_msg","");
				var vm = message.vm;
				var obj = voicemail.getCustomMessages(vm);
				respMsg.customVmMsg = obj;
				client.emit('message',respMsg);
				logger.debug("RESP 'resp_get_vm_custom_msg' has been sent to [" + extFrom + "] id '" + client.id + "'");
			break;
	  		case actions.CHECK_DND_STATUS:
	  			var cmd = "database get DND " + extFrom;
			  	var actionCheckDNDStatus = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCheckDNDStatus, function (resp) {
						logger.debug("'actionCheckDNDStatus' " + sys.inspect(actionCheckDNDStatus) + " has been sent to AST");
						if(resp.value==undefined){
							var msgstr = "Don't disturb  status of [" + extFrom + "] is OFF";
							client.emit('message',new ResponseMessage(client.id, 'dnd_status_off', msgstr));
							logger.debug("RESP 'dnd_status_off' has been sent to [" + extFrom + "] id '" + client.id + "'");
						}
						else{
							var msgstr = "Don't disturb  status of [" + extFrom + "] is ON";
							client.emit('message',new ResponseMessage(client.id, 'dnd_status_on', msgstr));
							logger.debug("RESP 'dnd_status_on' has been sent to [" + extFrom + "] id '" + client.id + "'");
						}
					});
				} catch(err){
					logger.warn("no connection with asterisk: " + err);
				}
	  		break;
	  		case actions.CHECK_CW_STATUS:
	  			var cmd = "database get CW " + extFrom;
			  	var actionCheckCWStatus = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCheckCWStatus, function (resp) {
						logger.debug("'actionCheckCWStatus' " + sys.inspect(actionCheckCWStatus) + " has been sent to AST");
						if(resp.value==undefined){
							var msgstr = "Call waiting  status of [" + extFrom + "] is OFF";
							client.emit('message',new ResponseMessage(client.id, 'cw_status_off', msgstr));
							logger.debug("RESP 'cw_status_off' has been sent to [" + extFrom + "] id '" + client.id + "'");
						}
						else{
							var msgstr = "Call waiting  status of [" + extFrom + "] is ON";
							client.emit('message',new ResponseMessage(client.id, 'cw_status_on', msgstr));
							logger.debug("RESP 'cw_status_on' has been sent to [" + extFrom + "] id '" + client.id + "'");
						}
					});
				} catch(err){logger.warn("no connection with asterisk: " + err);}
	  		break;
			case actions.CHECK_CFU_STATUS:
                                var cmd = "database get CFU " + extFrom;
                                var actCheckCFU = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCheckCFU, function (resp) {
                                                logger.debug("'actCheckCFU' " + sys.inspect(actCheckCFU) + " has been sent to AST");
                                                if(resp.value==undefined){
                                                        var msgstr = "CFU  status of [" + extFrom + "] is OFF";
                                                        client.emit('message',new ResponseMessage(client.id, 'cfu_status_off', msgstr));
                                                        logger.debug("RESP 'cfu_status_off' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                                }
                                                else{
                                                        var extTo = resp.value.split('\n')[0];
                                                        var msgstr = "CFU  status of [" + extFrom + "] is ON to " + extTo;
                                                        var respMessage = new ResponseMessage(client.id, 'cfu_status_on', msgstr);
                                                        respMessage.extTo = extTo;
                                                        client.emit('message',respMessage);
                                                        logger.debug("RESP 'cfu_status_on' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                                }
                                        });
                                }catch(err){logger.warn("no connection with asterisk: "+err);}
                        break;
			case actions.CHECK_CFB_STATUS:
                                var cmd = "database get CFB " + extFrom;
                                var actCheckCFB = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCheckCFB, function (resp) {
                                                logger.debug("'actCheckCFB' " + sys.inspect(actCheckCFB) + " has been sent to AST");
                                                if(resp.value==undefined){
                                                        var msgstr = "CFB  status of [" + extFrom + "] is OFF";
                                                        client.emit('message',new ResponseMessage(client.id, 'cfb_status_off', msgstr));
                                                        logger.debug("RESP 'cfb_status_off' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                                }
                                                else{
                                                        var extTo = resp.value.split('\n')[0];
                                                        var msgstr = "CFB  status of [" + extFrom + "] is ON to " + extTo;
                                                        var respMessage = new ResponseMessage(client.id, 'cfb_status_on', msgstr);
                                                        respMessage.extTo = extTo;
                                                        client.emit('message',respMessage);
                                                        logger.debug("RESP 'cfb_status_on' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                                }
                                        });
                                }catch(err){logger.warn("no connection with asterisk: "+err);}
                        break;
	  		case actions.CHECK_CF_STATUS:
	  			var cmd = "database get CF " + extFrom;
			  	var actionCheckCFStatus = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCheckCFStatus, function (resp) {
						logger.debug("'actionCheckCFStatus' " + sys.inspect(actionCheckCFStatus) + " has been sent to AST");
						if(resp.value==undefined){
							var msgstr = "Call forwarding  status of [" + extFrom + "] is OFF";
							client.emit('message',new ResponseMessage(client.id, 'cf_status_off', msgstr));
							logger.debug("RESP 'cf_status_off' has been sent to [" + extFrom + "] id '" + client.id + "'");
						}
						else{
							var extTo = resp.value.split('\n')[0];
							var msgstr = "Call forwarding  status of [" + extFrom + "] is ON to " + extTo;
							var respMessage = new ResponseMessage(client.id, 'cf_status_on', msgstr);
							respMessage.extTo = extTo;
							client.emit('message',respMessage);
							logger.debug("RESP 'cf_status_on' has been sent to [" + extFrom + "] id '" + client.id + "'");
						}
					});
				}catch(err){logger.warn("no connection with asterisk: "+err);}
	  		break;
			case actions.GET_ALL_VM_STATUS:
				var list = modop.getAllVoicemailStatus();
				var respMessage = new ResponseMessage(client.id, 'ack_all_vm_status', '');
				respMessage.list = list;
				client.emit('message',respMessage);
                                logger.debug("RESP 'ack_all_vm_status' has been sent to [" + extFrom + "] id '" + client.id + "'");
			break;
			case actions.SPEAK_INTERCOM:
				var extToCall = message.exten;
				callout(extFrom,extToCall);
			break;
	  		case actions.CALLOUT:
	  			if(clients[extFrom]===undefined){ // check if the client is logged in
	  				logger.warn("ATTENTION: client [" + extFrom + "] not logged in");
	  				client.emit('message',new ResponseMessage(client.id, 'error_call', 'Error in calling: client not logged in'));
	  				logger.debug("RESP 'error_call' has been sent to [" + extFrom + "] id '" + client.id + "'");
	  				return;
  				}
	  			else if(client.id!==clients[extFrom].id){ // security check of real authenticity of the user who originated the call
	  				logger.warn("SECURITY WARNING: attempt to fake the sender: session '" + client.id + "' attempt to call with the fake exten [" + extFrom + "] !");
	  				client.emit('message',new ResponseMessage(client.id, 'error_call', 'Error in calling: attempt to call with the fake exten ' + extFrom));
	  				logger.debug("RESP 'error_call' has been sent to [" + extFrom + "] id '" + client.id + "'");
	  				return;
	  			}
				var extToCall = message.extToCall;
				callout(extFrom, extToCall);
		  	break;
			case actions.HANGUP_UNIQUEID:
				var ch=chStat[message.uniqueid].channel;
				var actionHangupUniqueid = { Action: 'Hangup', Channel: ch };
				try{
					am.send(actionHangupUniqueid, function () {
	                                        logger.debug("'actionHangupiUniqueid' " + sys.inspect(actionHangupUniqueid) + " has been sent to AST");
	                                })
				}catch(err){logger.warn("no connection to asterisk: "+err);}
			break;
			case actions.HANGUPCH:
				var hangupch=message.hangupch;
				var act_hangup={
					Action: "Hangup",
					Channel: hangupch
				};
				try{
					am.send(act_hangup, function(){
						logger.debug("'act_hangup' " + sys.inspect(act_hangup) + " has been sent to AST");
					});
				}catch(err){logger.warn("no connection to asterisk: "+err);}
			break;
		  	case actions.HANGUP:
				/* example chStat when call come from soft phone:
				 { '1308640687.636': 
				   { channel: 'SIP/270-00000214',
				     status: 'up',
				     calleridname: 'Alessandrotest1',
				     calleridnum: '270' },
				  '1308640688.637': 
				   { channel: 'SIP/271-00000215',
				     calleridname: '',
				     calleridnum: '271',
				     status: 'up' } } */
				logger.debug("key of chStat = " + Object.keys(chStat).length)
				var extToHangup = message.extToHangup
				var callDialExtHangup = message.callDialExtHangup
				var ch
				for(key in chStat){
					var tempChannel = chStat[key].channel
					if(modop.isChannelIntern(tempChannel)){
						var tempExt = modop.getExtInternFromChannel(tempChannel)
						if(tempExt==extToHangup && chStat[key].dialExt!=undefined && chStat[key].dialExt==callDialExtHangup){
							ch = chStat[key].channel
							break
						}
					}
				}
                                var actionHangup = {
                                        Action: 'Hangup',
                                        Channel: ch
                                }
				try{
	                                am.send(actionHangup, function () {
	                                        logger.debug("'actionHangup' " + sys.inspect(actionHangup) + " has been sent to AST");
	                                });
				}catch(err){logger.warn("no connection to asterisk: "+err);}
	  		break;
			case actions.HANGUP_SPY:
				logger.debug("key of chStat = " + Object.keys(chStat).length)
				/* { channel: 'SIP/271-0000023a',
				     status: 'up',
				     calleridname: 'SPY-270' } */
				var extToHangup = message.extToHangup
				var spyExt = message.spyExt
				var ch
				for(key in chStat){
					if(chStat[key].calleridname==('SPY-'+spyExt)){
						var tempChannel = chStat[key].channel
						if(modop.isChannelIntern(tempChannel)){
							var tempExt = modop.getExtInternFromChannel(tempChannel)
							if(tempExt==extToHangup){
								ch = tempChannel
							} 
						}
					}
				}
				// create hangup action for asterisk server
                                var actionHangupSpy = {
                                        Action: 'Hangup', 
                                        Channel: ch
                                }
				try{
	                                am.send(actionHangupSpy, function () {
	                                        logger.debug("'actionHangupSpy' " + sys.inspect(actionHangupSpy) + " has been sent to AST");
	                                });
				}catch(err){logger.warn("no connection to asterisk: "+err);}
			break
	  		case actions.LOGOUT:
	  			removeClient(client.id);
	  			if(!testAlreadyLoggedSessionId(client.id)){
			  		logger.info("logged OUT [" + extFrom + "] sessiondId '" + client.id + "'");
			  		client.emit('message',new ResponseMessage(client.id, "ack_logout", "logout has been succesfully"));
			  		logger.debug("RESP 'ack_logout' has been sent to [" + extFrom + "] id '" + client.id + "'");
			  	}
		  		logger.info(Object.keys(clients).length + " logged in clients");
	  		break;
	  		case actions.REDIRECT:
				logger.debug("key of chStat = " + Object.keys(chStat).length)
				/* chStat = { '1308661886.872': 
				   { channel: 'SIP/271-000002cb',
				     status: 'up',
				     calleridnum: '271',
				     calleridname: 'Alessandrotest2' },
				  '1308661887.873': 
				   { channel: 'SIP/270-000002cc',
				     status: 'up',
				     calleridnum: '270',
				     calleridname: '' } } */
	  			// check if the user has the permission of dial out
				if(profiler.checkActionRedirectPermit(extFrom)){
	  				logger.debug("check 'redirect' permission for [" + extFrom + "] OK: execute redirect...");	
					var ch = message.chToRedirect;
					var redirectToExt = message.redirectToExt;
		  			var actionRedirect = {
						Action: 'Redirect',
						Channel: ch,
						Context: 'from-internal',
						Exten: redirectToExt,
						Priority: 1
					};
					try{
						am.send(actionRedirect, function () {
							logger.debug("'actionRedirect' " + sys.inspect(actionRedirect) + " has been sent to AST");
							client.emit('message',new ResponseMessage(client.id, 'ack_redirect'), '');
							logger.debug("RESP 'ack_redirect' has been sent to [" + extFrom + "] id '" + client.id + "'");
						});
					}catch(err){logger.warn("no connection to asterisk: "+err);}
		  		}
	  			else{
					logger.debug("check 'redirect' permission for [" + extFrom + "] FAILED !");
			  		client.emit('message',new ResponseMessage(client.id, "error_redirect", "Sorry: you don't have permission to redirect !"));
			  		logger.debug("RESP 'error_redirect' has been sent to [" + extFrom + "] id '" + client.id + "'");
	  			}
	  		break;
	  		case actions.SEARCH_CONTACT_PHONEBOOK:
                            try {
	  			// check if the user has the permission to search contact in phonebook
	  			if(profiler.checkActionPhonebookPermit(extFrom)){
					logger.debug("check 'searchContactPhonebook' permission for [" + extFrom + "] OK: search...");
	  				// execute query to search contact in phonebook
	  				var namex = message.namex;
					dataCollector.getContactsPhonebook(namex, function(results){
                                            try {
                                                nethCtiPhonebook.searchContacts(namex, extFrom, function (res) {
                                                    try {
                                                        if (results !== undefined && res !== undefined) {
                                                            var i;
                                                            for (i = 0; i < res.length; i++) {
                                                                res[i]['db_source'] = 'cti_phonebook';
                                                                results.push(res[i]);
                                                            }
       		  					    var mess = new ResponseMessage(client.id, "search_contacts_results", "received phonebook contacts");
                                                            mess.results = results;
                                                            mess.extFrom = extFrom;
    		  					    client.emit('message',mess);
    		  					    logger.debug("RESP 'search_contacts_results' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                                        }
                                                    } catch (err) {
                                                        logger.error("search in central phonebook: " + err.stack);
                                                        client.emit('message',new ResponseMessage(client.id, "exception_search_contacts", ""));
                                                        logger.debug("RESP 'exception_search_contacts' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                                    }
                                                });
                                            } catch (err) {
                                                logger.error("search in central phonebook: " + err.stack);
                                                client.emit('message',new ResponseMessage(client.id, "exception_search_contacts", ""));
                                                logger.debug("RESP 'exception_search_contacts' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                            }
	  				});
	  			}
	  			else{
					logger.debug("check 'searchContactPhonebook' permission for [" + extFrom + "] FAILED !");
  					client.emit('message',new ResponseMessage(client.id, "error_search_contacts", ""));
  					logger.debug("RESP 'error_search_contacts' has been sent to [" + extFrom + "] id '" + client.id + "'");
	  			}
                            } catch (err) {
                                logger.error("SEARCH_CONTACT_PHONEBOOK: " + err.stack);
                            }
	  		break;
			case actions.START_RECORD_CHANNEL:
				try {
					if(profiler.checkActionRecordPermit(extFrom)){
						logger.debug("check 'record' permission for [" + extFrom + "] OK: record...");
						var callFromExt = message.callFromExt;
						var callToExt = message.callToExt;
						var fromuid = message.fromuid;
						var destuid = message.destuid;
						var uidForFilename = message.uidForFilename;
						// create filename
	                                        var d = new Date();
	                                        var yyyy = d.getFullYear();
	                                        var mm = (d.getUTCMonth()+1); if(mm<10) mm = '0' + mm;
	                                        var dd = d.getUTCDate();      if(dd<10) dd = '0' + dd;
	                                        var yyyyMMdd = yyyy + "" + mm + "" + dd;
	                                        var hh = d.getHours(); if(hh<10) hh = '0' + hh;
	                                        var mm = d.getMinutes(); if(mm<10) mm = '0' + mm;
						var ss = d.getSeconds(); if(ss<10) ss = '0' + ss;
	                                        var hhmmss = hh + "" + mm + "" + ss;
	                                        var filename = START_AUDIO_FILE + callFromExt + "-" + callToExt + "-" + yyyyMMdd + "-" + hhmmss + "-" + uidForFilename;
	                                        // create record action for asterisk server - 2 file: in and out
						var ch = message.chToRecord;
	                                        var actionRecord = {
	                                                Action: 'Monitor',
	                                                Channel: ch,
	                                                File: filename,
	                                                Mix: 1
	                                        };
                                                var callFromTypeExt = modop.getTypeExtFromExt(callFromExt);
                                                var callToTypeExt = modop.getTypeExtFromExt(callToExt);
						try{
	                                                am.send(actionRecord, function () {
								try{
		                                                        logger.debug("'actionRecord' " + sys.inspect(actionRecord) + " has been sent to AST");
		                                                        var msg = new ResponseMessage(client.id,'ack_record','');
		                                                        msg.extRecord = callFromExt;
		                                                        client.emit('message',msg);
		                                                        logger.debug("RESP 'ack_record' has been sent to [" + extFrom + "] id '" + client.id + "'");
									// update info
									if(fromuid!='' && chStat[fromuid]!==undefined){
			                                                        chStat[fromuid].record = 1;
			                                                        if(modop.isTypeExtPresent(callFromTypeExt)){
			                                                                if(modop.hasInternCallConnectedUniqueidWithTypeExt(callFromTypeExt,fromuid)){
			                                                                        modop.updateCallConnectedUniqueidInternWithTypeExt(callFromTypeExt,fromuid,chStat[fromuid]);
			                                                                }
			                                                                if(modop.hasInternDialingUniqueidWithTypeExt(callFromTypeExt,fromuid)){
			                                                                        modop.updateDialingUniqueidInternWithTypeExt(callFromTypeExt,fromuid,chStat[fromuid]);
			                                                                }
			                                                                updateAllClientsForOpWithTypeExt(callFromTypeExt);
			                                                        }
									}
									if(destuid!=='' && chStat[destuid]!==undefined){
			                                                        chStat[destuid].record = 1;
			                                                        if(modop.isTypeExtPresent(callToTypeExt)){
			                                                                if(modop.hasInternCallConnectedUniqueidWithTypeExt(callToTypeExt,destuid)){
			                                                                        modop.updateCallConnectedUniqueidInternWithTypeExt(callToTypeExt,destuid,chStat[destuid]);
			                                                                }
			                                                                if(modop.hasInternDialingUniqueidWithTypeExt(callToTypeExt,destuid)){
			                                                                        modop.updateDialingUniqueidInternWithTypeExt(callToTypeExt,destuid,chStat[destuid]);
			                                                                }
			                                                                updateAllClientsForOpWithTypeExt(callToTypeExt);
			                                                        }
									}
								} catch(err){
									logger.error("callback of action record: " + err.stack);
								}
							});
						} catch(err) {
                	                                logger.error("no connection to asterisk in start record channel request: " + err.stack);
        	                                }
					} else {
	                                        logger.debug("check 'record' permission for [" + extFrom + "] FAILED !");
	                                        client.emit('message',new ResponseMessage(client.id, "error_record", ""));
	                                        logger.debug("RESP 'error_record' has been sent to [" + extFrom + "] id '" + client.id + "'");
	                                }
				} catch(err) {
					logger.error("in start record channel: " + err.stack);
				}
			break;
	  		case actions.RECORD:
	  			// check if the user has the permission of dial out
				if(profiler.checkActionRecordPermit(extFrom)){
					logger.debug("check 'record' permission for [" + extFrom + "] OK: record...");
	  				var channel = '';
	  				var destChannel = ''
					var uniqueid = '';
					var destUniqueid = ''
					var callFromExt = message.callFromExt
					var callToExt = message.callToExt
					// get channel to record. It is always the caller (callFromExt)
					if(modop.isExtInterno(callFromExt) && !modop.isExtInterno(callToExt)){ // the caller is an intern
						for(key in chStat){
							var tempCh = chStat[key].channel
							// get caller channel and uniqueid
							if(modop.isChannelIntern(tempCh)){
								var tempExt = modop.getExtInternFromChannel(tempCh)
								if(tempExt==callFromExt && chStat[key].dialExt==callToExt){
									channel = chStat[key].channel
									uniqueid = key
								}
							} else if(modop.isChannelTrunk(tempCh)){ // get destination channel and uniqueid
								/* { channel: 'SIP/2004-0000017a',
								     status: 'up',
								     calleridnum: '187',
								     calleridname: '',
								     dialConnectedUniqueid: '1309855888.777' } */
								var dialExtUniqueid = chStat[key].dialExtUniqueid
								if(dialExtUniqueid!=undefined){
									var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
									if(chStat[key].calleridnum==callToExt && tempExt==callFromExt){
										destChannel = chStat[key].channel
										destUniqueid = key
									}
								}
							}
						}
					} else if(!modop.isExtInterno(callFromExt) && modop.isExtInterno(callToExt)){ // the caller is a trunk or an intermediate node for queue
						for(key in chStat){
							var tempCh = chStat[key].channel
							if(modop.isChannelTrunk(tempCh) && chStat[key].dialExtUniqueid!=undefined){ // caller: trunk
								var dialExtUniqueid = chStat[key].dialExtUniqueid
								var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
								if(chStat[key].calleridnum==callFromExt && tempExt==callToExt && chStat[dialExtUniqueid].dialExt==callFromExt){
									channel = tempCh
									uniqueid = key
								}
							} else if(tempCh.indexOf('Local/')!=-1 && tempCh.indexOf('@from-internal-')!=-1 && tempCh.indexOf(';2')!=-1){
								var tempExt = modop.getExtFromQueueChannel(tempCh)
								var dialExtUniqueid = chStat[key].dialExtUniqueid
								if(tempExt==callToExt && chStat[dialExtUniqueid]!=undefined && chStat[dialExtUniqueid].dialExt==callFromExt){
									channel = tempCh
									uniqueid = key
								}
							} else if(modop.isChannelIntern(tempCh)){ // called
								var tempExt = modop.getExtInternFromChannel(tempCh)
								if(tempExt==callToExt && chStat[key].dialExt==callFromExt){
									destChannel = tempCh
									destUniqueid = key
								}
							}
						}
					} else if(modop.isExtInterno(callFromExt) && modop.isExtInterno(callToExt)){ // both are intern
						for(key in chStat){
							var tempCh = chStat[key].channel
							if(modop.isChannelIntern(tempCh)){
								var tempExt = modop.getExtInternFromChannel(tempCh)
								if(tempExt==callFromExt && chStat[key].dialExt==callToExt){
									channel = chStat[key].channel
	                                                                uniqueid = key
								} else if(tempExt==callToExt && chStat[key].dialExt==callFromExt){
									destChannel = chStat[key].channel
                                                                        destUniqueid = key
								}
							}
						}
					} else
						logger.warn("unknow state for ACTION_RECORD: callFromExt = " + callFromExt + " callToExt = " + callToExt)
	  				// create filename	
					var d = new Date();
					var yyyy = d.getFullYear();
					var mm = (d.getUTCMonth()+1); if(mm<10) mm = '0' + mm;
					var dd = d.getUTCDate();      if(dd<10) dd = '0' + dd;
					var yyyyMMdd = yyyy + "" + mm + "" + dd;
					var hh = d.getHours(); if(hh<10) hh = '0' + hh; 
					var mm = d.getMinutes(); if(mm<10) mm = '0' + mm;
					var ss = d.getSeconds(); if(ss<10) ss = '0' + ss;
					var hhmmss = hh + "" + mm + "" + ss;
	  				var filename = START_AUDIO_FILE + message.callFromExt + "-" + message.callToExt + "-" + yyyyMMdd + "-" + hhmmss + "-" + uniqueid; 
	  				// create record action for asterisk server
					// 2 file: in and out
			  		var actionRecord = {
						Action: 'Monitor',
						Channel: channel,
						File: filename,
						Mix: 1
					};
					var callFromInternTypeExt = modop.getInternTypeExtFromChannel(channel)
					var callToInternTypeExt = modop.getInternTypeExtFromChannel(destChannel)
					try{
						am.send(actionRecord, function () {
							logger.debug("'actionRecord' " + sys.inspect(actionRecord) + " has been sent to AST");
							var msgstr = 'Recording of call ' + filename + ' started...';
							var msg = new ResponseMessage(client.id, 'ack_record', msgstr);
							msg.extRecord = callFromExt;
							client.emit('message',msg);
							logger.debug("RESP 'ack_record' has been sent to [" + extFrom + "] id '" + client.id + "'");
							logger.debug(msgstr);
							// update info
							chStat[uniqueid].record = 1
							chStat[destUniqueid].record = 1
							if(modop.isTypeExtPresent(callFromInternTypeExt)){
								if(modop.hasInternCallConnectedUniqueidWithTypeExt(callFromInternTypeExt,uniqueid)){
									modop.updateCallConnectedUniqueidInternWithTypeExt(callFromInternTypeExt, uniqueid, chStat[uniqueid]);
								}
								if(modop.hasInternDialingUniqueidWithTypeExt(callFromInternTypeExt,uniqueid)){
									modop.updateDialingUniqueidInternWithTypeExt(callFromInternTypeExt,uniqueid,chStat[uniqueid]);
								}
								updateAllClientsForOpWithTypeExt(callFromInternTypeExt);
							}
							if(modop.isTypeExtPresent(callToInternTypeExt)){
								if(modop.hasInternCallConnectedUniqueidWithTypeExt(callToInternTypeExt,destUniqueid)){
									modop.updateCallConnectedUniqueidInternWithTypeExt(callToInternTypeExt, destUniqueid, chStat[destUniqueid]);
								}
								if(modop.hasInternDialingUniqueidWithTypeExt(callToInternTypeExt,destUniqueid)){
									modop.updateDialingUniqueidInternWithTypeExt(callToInternTypeExt,destUniqueid,chStat[destUniqueid]);
								}
								updateAllClientsForOpWithTypeExt(callToInternTypeExt);
							}
						});
					} catch(err) {
	                                       	logger.warn("no connection to asterisk: " + err);
        	                        }	
				}
				else{
					logger.debug("check 'record' permission for [" + extFrom + "] FAILED !");
			  		client.emit('message',new ResponseMessage(client.id, "error_record", ""));
			  		logger.debug("RESP 'error_record' has been sent to [" + extFrom + "] id '" + client.id + "'");
	  			}	
	  		break;
			case actions.STOP_RECORD_CHANNEL:
				try{
					var chToStopRecord = message.chToStopRecord;
					var actionStopRecord = {
	                                        Action: 'StopMonitor',
	                                        Channel: chToStopRecord
	                                };
					var fromuid = message.fromuid;
					var destuid = message.destuid;
					var callFromTypeExt = modop.getTypeExtFromExt(message.callFromExt);
					var callToTypeExt = modop.getTypeExtFromExt(message.callToExt);
					try {	
						am.send(actionStopRecord, function () {
							try {
								logger.debug("'actionStopRecord' " + sys.inspect(actionStopRecord) + " has been sent to AST");
								var msg = new ResponseMessage(client.id, 'ack_stoprecord', '');
		                                                client.emit('message',msg,'');
		                                                logger.debug("RESP 'ack_stoprecord' has been sent to [" + extFrom + "] id " + client.id);
								// update info
								if(fromuid!=='' && chStat[fromuid]!==undefined){
			                                                chStat[fromuid].record = 0;
			                                                if(modop.isTypeExtPresent(callFromTypeExt)){
			                                                        if(modop.hasInternCallConnectedUniqueidWithTypeExt(callFromTypeExt,fromuid)){
			                                                                modop.updateCallConnectedUniqueidInternWithTypeExt(callFromTypeExt, fromuid, chStat[fromuid]);
			                                                        }
			                                                        if(modop.hasInternDialingUniqueidWithTypeExt(callFromTypeExt,fromuid)){
			                                                                modop.updateDialingUniqueidInternWithTypeExt(callFromTypeExt,fromuid,chStat[fromuid]);
			                                                        }
			                                                        updateAllClientsForOpWithTypeExt(callFromTypeExt);
		        	                                        }
								}
								if(destuid!=='' && chStat[destuid]!==undefined){
				                                        chStat[destuid].record = 0;
			                                                if(modop.isTypeExtPresent(callToTypeExt)){
			                                                        if(modop.hasInternCallConnectedUniqueidWithTypeExt(callToTypeExt,destuid)){
			                                                                modop.updateCallConnectedUniqueidInternWithTypeExt(callToTypeExt, destuid, chStat[destuid]);
			                                                        }
			                                                        if(modop.hasInternDialingUniqueidWithTypeExt(callToTypeExt,destuid)){
			                                                                modop.updateDialingUniqueidInternWithTypeExt(callToTypeExt,destuid,chStat[destuid]);
			                                                        }
			                                                        updateAllClientsForOpWithTypeExt(callToTypeExt);
			                                                }
								}
							} catch(err) {
								logger.error("in callback of stop record action: " + err.stack);
							}
						});
					} catch(err) {
	                                        logger.error("no connection to asterisk in stop record request: " + err.stack);
	                        	}
				} catch(err) {
					logger.error('in stop record channel request: ' + err.stack);
				}
			break;
	  		case actions.STOP_RECORD:
  				// get channel
  				var channel = ''
				var destChannel = ''
				var uniqueid = ''
				var destUniqueid = ''
				var callFromExt = message.callFromExt
				var callToExt = message.callToExt
				// get channel to record. It is always the caller (callFromExt)
                                if(modop.isExtInterno(callFromExt) && !modop.isExtInterno(callToExt)){ // the caller is an intern
                                	for(key in chStat){
                                        	var tempCh = chStat[key].channel
                                                // get caller channel and uniqueid
                                                if(modop.isChannelIntern(tempCh)){
                                                	var tempExt = modop.getExtInternFromChannel(tempCh)
                                                        if(tempExt==callFromExt && chStat[key].dialExt==callToExt){
                                                        	channel = chStat[key].channel
                                                                uniqueid = key
                                                        }
                                               	} else if(modop.isChannelTrunk(tempCh)){ // get destination channel and uniqueid
							/* '1309858231.1105':
							   { channel: 'SIP/2004-000001fb',
							     status: 'up',
							     calleridnum: '187',
							     calleridname: '',
							     dialConnectedUniqueid: '1309858231.1104',
							     record: 1 } } */
                                                	var dialExtUniqueid = chStat[key].dialExtUniqueid
                                                     	if(dialExtUniqueid!=undefined){
                                                        	var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
	                                                        if(chStat[key].calleridnum==callToExt && tempExt==callFromExt){
	                                                        	destChannel = chStat[key].channel
        	                                                        destUniqueid = key
                	                                        }
                        	                        }
                                	        }
                                	}
                              	} else if(!modop.isExtInterno(callFromExt) && modop.isExtInterno(callToExt)){ // the caller is a trunk or an intermediate node for queue
                                        for(key in chStat){
                                        	var tempCh = chStat[key].channel
                                                if(modop.isChannelTrunk(tempCh)  && chStat[key].dialExtUniqueid!=undefined){ // caller: trunk
                                                        var dialExtUniqueid = chStat[key].dialExtUniqueid
                                                        var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
                                                        if(chStat[key].calleridnum==callFromExt && tempExt==callToExt && chStat[dialExtUniqueid].dialExt==callFromExt){
                                                        	channel = tempCh
                                                                uniqueid = key
                                                        }
                                               	} else if(tempCh.indexOf('Local/')!=-1 && tempCh.indexOf('@from-internal-')!=-1 && tempCh.indexOf(';2')!=-1){
                                                        var tempExt = modop.getExtFromQueueChannel(tempCh)
                                                        var dialExtUniqueid = chStat[key].dialExtUniqueid
                                                        if(tempExt==callToExt && chStat[dialExtUniqueid]!=undefined && chStat[dialExtUniqueid].dialExt==callFromExt){
                                                        	channel = tempCh
                                                                uniqueid = key
                                                        }
                                               	} else if(modop.isChannelIntern(tempCh)){ // called
                                                        var tempExt = modop.getExtInternFromChannel(tempCh)
                                                        if(tempExt==callToExt && chStat[key].dialExt==callFromExt){
                                                        	destChannel = tempCh
                                                                destUniqueid = key
                                                        }
                                                }
                                        }
                             	} else if(modop.isExtInterno(callFromExt) && modop.isExtInterno(callToExt)){ // both are intern
                                	for(key in chStat){
                                        	var tempCh = chStat[key].channel
                                                if(modop.isChannelIntern(tempCh)){
                                                	var tempExt = modop.getExtInternFromChannel(tempCh)
                                                        if(tempExt==callFromExt && chStat[key].dialExt==callToExt){
                                                        	channel = chStat[key].channel
                                                                uniqueid = key
                                                        } else if(tempExt==callToExt && chStat[key].dialExt==callFromExt){
                                        	                destChannel = chStat[key].channel
                                                                destUniqueid = key
                                                        }
                                                }
                                        }
                                } else
                                	logger.warn("unknow state for ACTION_RECORD: callFromExt = " + callFromExt + " callToExt = " + callToExt)
			  	var actionStopRecord = {
					Action: 'StopMonitor',
					Channel: channel
				};
				var callFromInternTypeExt = modop.getInternTypeExtFromChannel(channel)
                                var callToInternTypeExt = modop.getInternTypeExtFromChannel(destChannel)
				try{
					am.send(actionStopRecord, function () {
						var msgstr = 'Recording for ' + extFrom + ' stopped';
						client.emit('message',new ResponseMessage(client.id, 'ack_stoprecord', msgstr));
						logger.debug("'actionStopRecord' " + sys.inspect(actionStopRecord) + " has been sent to AST\nRESP 'ack_stoprecord' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
						// update info
						chStat[uniqueid].record = 0
						chStat[destUniqueid].record = 0
						if(modop.isTypeExtPresent(callFromInternTypeExt)){
							if(modop.hasInternCallConnectedUniqueidWithTypeExt(callFromInternTypeExt,uniqueid)){
	                                                	modop.updateCallConnectedUniqueidInternWithTypeExt(callFromInternTypeExt, uniqueid, chStat[uniqueid])
							}
							if(modop.hasInternDialingUniqueidWithTypeExt(callFromInternTypeExt,uniqueid)){
								modop.updateDialingUniqueidInternWithTypeExt(callFromInternTypeExt,uniqueid,chStat[uniqueid]);
							}
	                                        	updateAllClientsForOpWithTypeExt(callFromInternTypeExt);
	                                        }
	                                       	if(modop.isTypeExtPresent(callToInternTypeExt)){
	                                                if(modop.hasInternCallConnectedUniqueidWithTypeExt(callToInternTypeExt,destUniqueid)){
								modop.updateCallConnectedUniqueidInternWithTypeExt(callToInternTypeExt, destUniqueid, chStat[destUniqueid])
							}
							if(modop.hasInternDialingUniqueidWithTypeExt(callToInternTypeExt,destUniqueid)){
								modop.updateDialingUniqueidInternWithTypeExt(callToInternTypeExt,destUniqueid,chStat[destUniqueid]);
							}
	                                        	updateAllClientsForOpWithTypeExt(callToInternTypeExt);
	                                        }
					});
				} catch(err) {
                                        logger.warn("no connection to asterisk: "+err);
                                }
	  		break;
	  		case actions.DND_ON:
	  			var cmd = "database put DND " + extFrom + " 1";
			  	var actionDNDon = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionDNDon, function () {
						var msgstr = "[" + extFrom + "] DND ON";
						client.emit('message',new ResponseMessage(client.id, 'ack_dnd_on', msgstr));
						logger.debug("'actionDNDon' " + sys.inspect(actionDNDon) + " has been sent to AST\nRESP 'ack_dnd_on' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
						modop.updateExtDNDStatusWithExt(extFrom, 'on');
                                                var tyext = modop.getTypeExtFromExt(extFrom);
						updateAllClientsForOpWithTypeExt(tyext);
					});
				} catch(err) {
                                        logger.warn("no connection to asterisk: "+err);
                                }
	  		break;
	  		case actions.DND_OFF:
	  			var cmd = "database del DND " + extFrom;
			  	var actionDNDoff = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionDNDoff, function () {
						var msgstr = "[" + extFrom + "] DND OFF";
						client.emit('message',new ResponseMessage(client.id, 'ack_dnd_off', msgstr));
						logger.debug("'actionDNDoff' " + sys.inspect(actionDNDoff) + " has been sent to AST\nRESP 'ack_dnd_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
	                                        modop.updateExtDNDStatusWithExt(extFrom, 'off');
                                                var tyext = modop.getTypeExtFromExt(extFrom);
	                                        updateAllClientsForOpWithTypeExt(tyext);
					});
				} catch(err) {
                                        logger.warn("no connection to asterisk: "+err);
                                }
	  		break;
	  		case actions.CW_ON:
	  			var cmd = "database put CW " + extFrom + " 1";
			  	var actionCWon = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCWon, function () {
						var msgstr = "[" + extFrom + "] CW ON";
						client.emit('message',new ResponseMessage(client.id, 'ack_cw_on', msgstr));
						logger.debug("'actionCWon' " + sys.inspect(actionCWon) + " has been sent to AST\nRESP 'ack_cw_on' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
					});
				} catch(err) {
                                        logger.warn("no connection to asterisk: "+err);
                                }
	  		break;
	  		case actions.CW_OFF:
	  			var cmd = "database del CW " + extFrom;
			  	var actionCWoff = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCWoff, function () {
						var msgstr = "[" + extFrom + "] CW OFF";
						client.emit('message',new ResponseMessage(client.id, 'ack_cw_off', msgstr));
						logger.debug("'actionCWoff' " + sys.inspect(actionCWoff) + " has been sent to AST\nRESP 'ack_cw_off' has been sent to [" + extFrom + "] id '" + client.id + "'"+msgstr);
					});
				} catch(err) {
                                        logger.warn("no connection to asterisk: " + err);
                                }
	  		break;
			case actions.CFVM_ON:
				var cmd = "database put CF " + extFrom + " vmu" + message.vmext;
				var actCFVMOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                	am.send(actCFVMOn, function () {
                                        	var msgstr = "[" + extFrom + "] CFVM ON";
                                                var response = new ResponseMessage(client.id, 'ack_cfvm_on', msgstr);
						var vmext = "vmu"+message.vmext;
						response.vmext = vmext;
                                                client.emit('message',response);
                                                logger.debug("'actCFVMOn' " + sys.inspect(actCFVMOn) + " has been sent to AST\nRESP 'ack_cfvm_on' has been sent to [" + extFrom + "] id '" + client.id + "'"+msgstr);
						modop.updateExtCFVMStatusWithExt(extFrom, 'on', vmext);
                                                var tyext = modop.getTypeExtFromExt(extFrom);
                                                updateAllClientsForOpWithTypeExt(tyext);
                                        });
                                } catch(err) {logger.warn("no connection to asterisk: " + err);}	
			break;
			case actions.CFUVM_ON:
				var cmd = "database put CFU " + extFrom + " vmu" + message.vmext;
                                var actCFUVMOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCFUVMOn, function () {
                                                var msgstr = "[" + extFrom + "] CFUVM ON";
                                                var response = new ResponseMessage(client.id, 'ack_cfuvm_on', msgstr);
						response.vmext = 'vmu'+message.vmext;
                                                client.emit('message',response);
                                                logger.debug("'actCFUVMOn' " + sys.inspect(actCFUVMOn) + " has been sent to AST\nRESP 'ack_cfuvm_on' has been sent to [" + extFrom + "] id '" + client.id + "'"+msgstr);
                                        });
                                } catch(err) {logger.warn("no connection to asterisk: " + err);}
			break;
			case actions.CFBVM_ON:
				var cmd = "database put CFB " + extFrom + " vmb" + message.vmext;
                                var actCFBVMOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCFBVMOn, function () {
                                                var msgstr = "[" + extFrom + "] CFBVM ON";
                                                var response = new ResponseMessage(client.id, 'ack_cfbvm_on', msgstr);
						response.vmext = 'vmb'+message.vmext;
                                                client.emit('message',response);
                                                logger.debug("'actCFBVMOn' " + sys.inspect(actCFBVMOn) + " has been sent to AST\nRESP 'ack_cfbvm_on' has been sent to [" + extFrom + "] id '" + client.id + "'"+msgstr);
                                        });
                                } catch(err) {logger.warn("no connection to asterisk: " + err);}
			break;
			case actions.CFVM_OFF:
				var cmd = "database del CF " + extFrom;
                                var actCFVMOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCFVMOff, function () {
                                                var msgstr = "[" + extFrom + "] CFVM OFF";
                                                client.emit('message',new ResponseMessage(client.id, 'ack_cfvm_off', msgstr));
                                                logger.debug("'actCFVMOff' " + sys.inspect(actCFVMOff) + " has been sent to AST\nRESP 'ack_cfvm_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
						modop.updateExtCFVMStatusWithExt(extFrom, 'off');
                                                var tyext = modop.getTypeExtFromExt(extFrom);
                                                updateAllClientsForOpWithTypeExt(tyext);
                                        });
                                } catch(err) {logger.warn("no connection to asterisk: " +err);}
			break;
			case actions.CFUVM_OFF:
				var cmd = "database del CFU " + extFrom;
                                var actCFUVMOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCFUVMOff, function () {
                                                var msgstr = "[" + extFrom + "] CFUVM OFF";
                                                client.emit('message',new ResponseMessage(client.id, 'ack_cfuvm_off', msgstr));
                                                logger.debug("'actCFUVMOff' " + sys.inspect(actCFUVMOff) + " has been sent to AST\nRESP 'ack_cfuvm_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
                                        });
                                } catch(err) {logger.warn("no connection to asterisk: " +err);}
			break;
			case actions.CFBVM_OFF:
				var cmd = "database del CFB " + extFrom;
                                var actCFBVMOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                try{
                                        am.send(actCFBVMOff, function () {
                                                var msgstr = "[" + extFrom + "] CFBVM OFF";
                                                client.emit('message',new ResponseMessage(client.id, 'ack_cfbvm_off', msgstr));
                                                logger.debug("'actCFBVMOff' " + sys.inspect(actCFBVMOff) + " has been sent to AST\nRESP 'ack_cfbvm_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
                                        });
                                } catch(err) {logger.warn("no connection to asterisk: " +err);}
			break;



	  		case actions.CF_ON:
	  			var extTo = message.extTo;
	  			var cmd = "database put CF " + extFrom + " " + extTo;
			  	var actionCFon = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCFon, function () {
						var msgstr = "[" + extFrom + "] CF ON to [" + extTo + "]"
						var response = new ResponseMessage(client.id, 'ack_cf_on', msgstr)
						response.extTo = extTo
						client.emit('message',response)
						logger.debug("'actionCFon' " + sys.inspect(actionCFon) + " has been sent to AST\nRESP 'ack_cf_on' has been sent to [" + extFrom + "] id '" + client.id + "'"+msgstr);
	                                        modop.updateExtCFStatusWithExt(extFrom, 'on', extTo);
                                                var tyext = modop.getTypeExtFromExt(extFrom);
	                                        updateAllClientsForOpWithTypeExt(tyext);
					});
				} catch(err) {logger.warn("no connection to asterisk: " + err);}
	  		break;
			case actions.CFU_ON:
                                var extTo = message.extTo;
                                var cmd = "database put CFU " + extFrom + " " + extTo;
                                var actCFUOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
				try{
	                                am.send(actCFUOn, function () {
	                                        var msgstr = "[" + extFrom + "] CFU ON to [" + extTo + "]"
	                                        var response = new ResponseMessage(client.id, 'ack_cfu_on', msgstr)
	                                        response.extTo = extTo
	                                        client.emit('message',response)
	                                        logger.debug("'actCFUOn' " + sys.inspect(actCFUOn) + " has been sent to AST\nRESP 'ack_cfu_on' has been sent to [" + extFrom + "] id '" + client.id + "'"+msgstr);
        	                        });
				} catch(err) {logger.warn("no connection to asterisk: "+err);}
                        break;
			case actions.CFB_ON:
                                var extTo = message.extTo;
                                var cmd = "database put CFB " + extFrom + " " + extTo;
                                var actCFBOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
				try{
	                                am.send(actCFBOn, function () {
	                                        var msgstr = "[" + extFrom + "] CFB ON to [" + extTo + "]"
	                                        var response = new ResponseMessage(client.id, 'ack_cfb_on', msgstr)
	                                        response.extTo = extTo
	                                        client.emit('message',response)
	                                        logger.debug("'actCFBOn' " + sys.inspect(actCFBOn) + " has been sent to AST\nRESP 'ack_cfb_on' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
        	                        });
				} catch(err) {logger.warn("no connection to asterisk: "+err);}
                        break;
	  		case actions.CF_OFF:
	  			var cmd = "database del CF " + extFrom;
			  	var actionCFoff = {
					Action: 'command',
					Command: cmd
				};
				try{
					am.send(actionCFoff, function () {
						var msgstr = "[" + extFrom + "] CF OFF";
						client.emit('message',new ResponseMessage(client.id, 'ack_cf_off', msgstr));
						logger.debug("'actionCFoff' " + sys.inspect(actionCFoff) + " has been sent to AST\nRESP 'ack_cf_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
	                                        modop.updateExtCFStatusWithExt(extFrom, 'off');
                                                var tyext = modop.getTypeExtFromExt(extFrom);
	                                        updateAllClientsForOpWithTypeExt(tyext);
					});
				} catch(err) {logger.warn("no connection to asterisk: " +err);}
	  		break;
			case actions.CFU_OFF:
                                var cmd = "database del CFU " + extFrom;
                                var actCFUOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
				try{
	                                am.send(actCFUOff, function () {
	                                        var msgstr = "[" + extFrom + "] CFU OFF";
	                                        client.emit('message',new ResponseMessage(client.id, 'ack_cfu_off', msgstr));
	                                        logger.debug("'actCFUOff' " + sys.inspect(actCFUOff) + " has been sent to AST\nRESP 'ack_cfu_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
        	                        });
				} catch(err) {logger.warn("no connection to asterisk: " +err);}
                        break;
			case actions.CFB_OFF:
                                var cmd = "database del CFB " + extFrom;
                                var actCFBOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
				try{
	                                am.send(actCFBOff, function () {
	                                        logger.debug("'actCFBOff' " + sys.inspect(actCFBOff) + " has been sent to AST");
	                                        var msgstr = "[" + extFrom + "] CFB OFF";
	                                        client.emit('message',new ResponseMessage(client.id, 'ack_cfb_off', msgstr));
	                                        logger.debug("RESP 'ack_cfb_off' has been sent to [" + extFrom + "] id '" + client.id + "'\n"+msgstr);
	                                });
				} catch(err) {logger.warn("no connection to asterisk: " +err);}
                        break;
                        case actions.GET_DAY_SWITCHBOARD:
                            try {
                                var auth = profiler.checkActionSwitchboardHistoryPermit(extFrom);
                                if (auth === true) {
                                    logger.debug("check 'daySwitchboard' permission for [" + extFrom + "] OK: get day switchboard ...");
                                    var dateFormat = formatDate(message.date);
                                    var num = message.num;
                                    if (num === '') {
                                        num = '%'; // match any field
                                    }
                                    dataCollector.getDaySwitchboardCall(extFrom, dateFormat, num, function (callResults) {
                                        dataCollector.getDaySwitchboardSms(extFrom, dateFormat, num, function (smsResults) {
                                            dataCollector.getDaySwitchboardCallNotes(extFrom, dateFormat, num, function (callNotesResults) {
                                                var mess = new ResponseMessage(client.id, 'day_switchboard', '');
                                                mess.callResults = createHistoryCallResponse(callResults);
                                                mess.smsResults = smsResults;
                                                mess.callNotesResults = callNotesResults;
                                                client.emit('message', mess);
                                                logger.debug("RESP 'day_switchboard' (call [" + callResults.length + "] - sms [" + smsResults.length +"] entries) has been sent to [" + extFrom + "] id '" + client.id + "'");
                                            });
                                        });
                                    });
                                } else {
                                        logger.info("check 'switchboard_history' permission for [" + extFrom + "] FAILED !");
                                        client.emit('message', new ResponseMessage(client.id, "error_day_switchboard", ""));
                                        logger.debug("RESP 'error_day_switchboard' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                }
                            } catch (err) {
                                logger.error('message = ' + sys.inspect(message) + ': ' + err.stack);
                            }
                        break;
			case actions.GET_DAY_HISTORY:
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){ // ok, the user has the permit
					logger.debug("check 'dayHistory' permission for [" + extFrom + "] OK: get day history ...");
					// format date for query sql
					var dateFormat = formatDate(message.date);					
					var num = message.num;
					if(num===''){
						num = '%'; // match any field
					}
                                        dataCollector.getDayHistoryCall(extFrom,dateFormat,num,function(callResults){ // get day history call
						dataCollector.getDayHistorySms(extFrom, dateFormat, num, function(smsResults){ // get day history sms
							dataCollector.getDayHistoryCallNotes(extFrom, dateFormat, num, function(callNotesResults){
	                                                	var mess = new ResponseMessage(client.id, "day_history", "received day history");
		                                                mess.callResults = createHistoryCallResponse(callResults);
								mess.smsResults = smsResults;
								mess.callNotesResults = callNotesResults;
		                                                client.emit('message',mess);
		                                                logger.debug("RESP 'day_history' (call [" + callResults.length + "] - sms [" + smsResults.length +"] entries) has been sent to [" + extFrom + "] id '" + client.id + "'");
							});
						});
                                        });
                                } else{ // permit are deny
					logger.info("check 'dayHistory' permission for [" + extFrom + "] FAILED !");
                                        client.emit('message',new ResponseMessage(client.id, "error_day_history", ""));
                                        logger.debug("RESP 'error_day_history' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                }
                        break;
			case actions.GET_CURRENT_WEEK_HISTORY:
                                // check if the user has the permission to get history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
					logger.debug("check 'currentWeekHistory' permission for [" + extFrom + "] OK: get current week history ...");
                                        // execute query to search contact in phonebook
					var num = message.num;
					if(num===''){
						num = '%'; // match any field
					}
                                        dataCollector.getCurrentWeekHistoryCall(extFrom, num, function(callResults){
						dataCollector.getCurrentWeekHistorySms(extFrom, num, function(smsResults){
							dataCollector.getCurrentWeekHistoryCallNotes(extFrom, num, function(callNotesResults){
	                                                	var mess = new ResponseMessage(client.id, "current_week_history", "received current week history");
								mess.callResults = createHistoryCallResponse(callResults);
								mess.smsResults = smsResults;
								mess.callNotesResults = callNotesResults;
		                                                client.emit('message',mess);
		                                                logger.debug("RESP 'current_week_history' (call [" + callResults.length + "] - sms ["+smsResults.length+"] entries) has been sent to [" + extFrom + "] id '" + client.id + "'");
							});
						});
                                        });
                                } else{
					logger.info("check 'currentWeekHistory' permission for [" + extFrom + "] FAILED !");
                                        client.emit('message',new ResponseMessage(client.id, "error_current_week_history", ""));
                                        logger.debug("RESP 'error_current_week_history' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                }
                        break;
			case actions.GET_CURRENT_MONTH_HISTORY:
                                // check if the user has the permission to get history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
					logger.info("check 'currentMonthHistory' permission for [" + extFrom + "] OK: get current month history...");
                                        // execute query to search contact in phonebook
					var num = message.num;
					if(num===''){
						num = '%'; // match any field
					}
                                        dataCollector.getCurrentMonthHistoryCall(extFrom, num, function(callResults){
						dataCollector.getCurrentMonthHistorySms(extFrom, num, function(smsResults){
							dataCollector.getCurrentMonthHistoryCallNotes(extFrom, num, function(callNotesResults){
		                                                var mess = new ResponseMessage(client.id, "current_month_history", "received current month history");
								mess.callResults = createHistoryCallResponse(callResults);
								mess.smsResults = smsResults;
								mess.callNotesResults = callNotesResults;
		                                                client.emit('message',mess);
		                                                logger.debug("RESP 'current_month_history' (call [" + callResults.length + "] - sms ["+smsResults.length+"] entries) has been sent to [" + extFrom + "] id '" + client.id + "'");
							});
						});
                                        });
                                } else{
					logger.info("check 'currentMonthHistory' permission for [" + extFrom + "] FAILED !");
                                        client.emit('message',new ResponseMessage(client.id, "error_current_month_history", ""));
                                        logger.debug("RESP 'error_current_month_history' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                }
                        break;
			case actions.GET_INTERVAL_HISTORY:
				var res = profiler.checkActionHistoryCallPermit(extFrom);
				if(res){
					logger.info("check 'History' permission for [" + extFrom + "] OK: get interval history...");
					var dateFrom = fromMMddYYYYtoYYYYmmDD(message.dateFrom);
					var dateTo = fromMMddYYYYtoYYYYmmDD(message.dateTo);
					var num = message.num;
					if(num===''){
						num = '%'; // match any field
					}
					dataCollector.getIntervalHistoryCall(extFrom,dateFrom,dateTo,num,function(callResults){
						dataCollector.getIntervalHistorySms(extFrom,dateFrom,dateTo,num,function(smsResults){
							dataCollector.getIntervalHistoryCallNotes(extFrom,dateFrom,dateTo,num,function(callNotesResults){
								var mess = new ResponseMessage(client.id, "interval_history", '');
								mess.callResults = createHistoryCallResponse(callResults);
								mess.smsResults = smsResults;
								mess.callNotesResults = callNotesResults;
								client.emit('message',mess);
								logger.debug("RESP 'interval_history' (call [" + callResults.length + "] - sms ["+smsResults.length+"] entries) has been sent to [" + extFrom + "] id '" + client.id + "'");
							});
						});
					});
				} else {
					logger.info("check 'History' permission for [" + extFrom + "] FAILED !");
					client.emit('message',new ResponseMessage(client.id, "error_interval_history", ""));
					logger.debug("RESP 'error_interval_history' has been sent to [" + extFrom + "] id '" + client.id + "'");
				}
			break;
			case actions.CHECK_CALL_AUDIO_FILE:
				try{
					// check if there are some audio file with particular uniqueid
					var uniqueid = message.uniqueid;
					if(audioFileList[uniqueid]!==undefined){
						var filename = audioFileList[uniqueid];
						var dir = filename.split('-');
	                                        dir = dir[dir.length-1];
						var name = filename.substring(0,filename.length-dir.length-1);
						var filepathIn = pathreq.join(AST_CALL_AUDIO_DIR, name + "-in.wav");
						var filepathOut = pathreq.join(AST_CALL_AUDIO_DIR, name + "-out.wav");
						if(pathreq.existsSync(filepathIn) && pathreq.existsSync(filepathOut)){
							var filenamemix = name + '.wav';
	                                                var filepathmix = pathreq.join(AST_CALL_AUDIO_DIR,filenamemix);
	                                                var tool = 'soxmix';
	                                                var cmd = tool + " " + filepathIn + " " + filepathOut + " " + filepathmix;
	                                                logger.debug("try to create audio file mix " + filepathmix);
	                                                var childcmd = execreq(cmd,function(err,stdout,stderr){
	  	                                              if(err){
	        	                                              logger.error("create audio file mix with command " + tool + ": " + err.stack);
	                                                      }
	                                                });
							(function(pMix,fMix,pIn,pOut,cl,child,ext){
	                                                	child.on('exit',function(){
		                                                	if(pathreq.existsSync(pMix)){ // check existance of created audio file mix
		        	                                                logger.debug("audio file mix created succesfully: " + pMix);
										// delete 'in' and 'out' file
										try{
											fs.unlinkSync(pIn);
											fs.unlinkSync(pOut);
                                                                                        audioFileList[uniqueid] = filenamemix;
											logger.debug("deleted audio file " + pIn + " and " + pOut + " during creation of audio mix file");
										} catch(err) {
											logger.error("deleting audio file " + pIn + " or " + pOut + " during creation of audio mix file: " + err.stack);
										}
		                                                                var audioFiles = [];
		                                                                audioFiles.push(fMix);
		                                                                var mess = new ResponseMessage(cl.id, "audio_file_call_list", "received list of audio file of call");
		                                                                mess.results = audioFiles;
		                                                                cl.emit('message',mess);
		                                                                logger.debug("RESP 'audio_file_call_list' (" + audioFiles.length + " files) has been sent to [" + ext + "] id '" + cl.id + "'");
		                                                        } else {
			                                                        logger.error("audio file mix " + pMix + " doesn't exist after its creation attempt");
		                                                        }
		                                                });
							}(filepathmix,filenamemix,filepathIn,filepathOut,client,childcmd,extFrom));
	                                        } else {
							var audioFiles = [];
	                                                audioFiles.push(filename);
							var mess = new ResponseMessage(client.id, "audio_file_call_list", "received list of audio file of call");
							mess.results = audioFiles;
							client.emit('message',mess);
							logger.debug("RESP 'audio_file_call_list' (" + audioFiles.length + " files) has been sent to [" + extFrom + "] id '" + client.id + "'");
		                                }
					} else {
						logger.error("received check call audio file for uniqueid " + uniqueid + " not present in audioFileList");
					}
				} catch(err){
					logger.error("in check_call_audio_file: " + err.stack);	
				}
	                break;
			case actions.GET_PEER_LIST_COMPLETE_OP:
				/* Set the global variables 'extToReturnExtStatusForOp' and 'clientToReturnExtStatusForOp' because 
				 * 'extStatusForOp' is returned to the client when the event 'ParkedCallsComplete' is emitted */
				extToReturnExtStatusForOp = extFrom;
				clientToReturnExtStatusForOp = client;
				/* send 'ParkedCalls' action to asterisk to update timeout information of parked calls in 'extStatusForOp'.
				 * When 'ParkedCallsComplete' event is emitted, the server return 'extStatusForOp' to the client */
                                var actParkedCalls = {Action: 'ParkedCalls'};
				try{
	                                am.send(actParkedCalls, function (resp) {
	                                        logger.debug("'actParkedCalls' " + sys.inspect(actParkedCalls) + " has been sent to AST to update timeout of the parked calls");
	                                });
				} catch(err) { logger.warn("no connection to asterisk: " + err);}
                        break;
			case actions.PARKCH:
				var ch_to_park = message.ch_to_park;
				var ch_ringing_to = message.ch_ringing_to;
				var act_parkch={
					Action: "Park",
					Channel: ch_to_park,
					Channel2: ch_ringing_to
				};
				try{
					am.send(act_parkch, function(resp){
						logger.debug("'act_parkch' " + sys.inspect(act_parkch) + " has been sent to asterisk");
						var msg = new ResponseMessage(client.id, "ack_parkch", "");
						client.emit('message',msg);
						logger.debug("RESP 'act_parkch' has been sent to [" + extFrom + "] id '" + client.id + "'");
					});
				} catch(err) {logger.warn("no connection to asterisk: " +err);}
			break;
			case actions.PARK:
				var callToPark = message.callToPark; // ext to be parked
				var callFrom = message.callFrom;     // ext from which the call is started
				var callTo = message.callTo;         // ext destination of the call
				var correspondingExt = '';
				if(callFrom===callToPark){
					correspondingExt = callTo;
				} else {
					correspondingExt = callFrom;
				}
				var chToPark = ''; // channel to be parked
				var correspondingCh = ''; // corresponding channel
				var uniqToPark = '';
				for(uniqueid in chStat){
					if(chStat[uniqueid].calleridnum===callToPark){
						chToPark = chStat[uniqueid].channel;
						uniqToPark = uniqueid;
					}
					if(chStat[uniqueid].calleridnum!==undefined && chStat[uniqueid].calleridnum.indexOf(correspondingExt)!==-1){
						correspondingCh=chStat[uniqueid].channel;
					}
				}
                                var actionPark = {
                                        Action: 'Park',
					Channel: chToPark,
					Channel2: correspondingCh
                                };
				try{
	                                am.send(actionPark, function (resp) {
						logger.debug("'actionPark' " + sys.inspect(actionPark) + " has been sent to AST");
		                                var msgstr = "received acknowledgment for parking the call";
		                                var mess = new ResponseMessage(client.id, "ack_park", msgstr);
		                                client.emit('message',mess);
		                                logger.debug("RESP 'ack_park' has been sent to [" + extFrom + "] id '" + client.id + "'");
	                                });
				} catch(err) {logger.warn("no connection to asterisk: "+err);}
			break;
			case actions.SPY_LISTEN:
				var extToSpy = message.extToSpy
				var callDialExtToSpy = message.callDialExtToSpy
                                var channelToSpy = ''
				for(var key in chStat){
					var tempChannel = chStat[key].channel
					if(modop.isChannelIntern(tempChannel)){
						var tempExt = modop.getExtInternFromChannel(tempChannel)
						if(extToSpy==tempExt && chStat[key].dialExt!=undefined && chStat[key].dialExt==callDialExtToSpy)
							channelToSpy = tempChannel
					}
				}
				// create action to spy channel
                                var tyext = modop.getTypeExtFromExt(extFrom);
				var actionSpyListen = {
					Action: 'Originate',
					Channel: tyext,
					Application: 'ChanSpy',
					Data: channelToSpy,
					Callerid: SPY_PREFIX + extToSpy
				};
				try{
					am.send(actionSpyListen, function(){
						logger.debug("'actionSpyListen' " + sys.inspect(actionSpyListen) + " has been sent to AST");
					});
				} catch(err) {logger.warn("no connection to asterisk: "+err);}
			break;
			case actions.PARKING_PICKUP:
				var extFrom = message.extFrom;
				var uniqueid = message.uniqueid;
				var ch='';
				ch = chStat[uniqueid].channel;
                                var actionPickup = {
                                       Action: 'Redirect',
                                       Channel: ch,
                                       Context: 'from-internal',
                                       Exten: extFrom,
                                       Priority: 1
                                };
				try{
	                                am.send(actionPickup, function(){
	                                        logger.debug("'actionPickup' " + sys.inspect(actionPickup) + " has been sent to AST");
	                                });
				} catch(err) {logger.warn("no connection to asterisk: " +err);}
			break;
			case actions.PICKUP_CH:
				var chToPickup = message.chToPickup;
				var actionPickup = {
					Action: 'Redirect',
					Channel: chToPickup,
					Context: 'from-internal',
					Exten: extFrom,
					Priority: 1
				};
				try{
					am.send(actionPickup,function(){
						logger.debug("'actionPickup' " + sys.inspect(actionPickup) + " has been sent to AST");
					});
				} catch(err){
					logger.warn('no connection to asterisk: ' + sys.inspect(err));
				}
			break;
			case actions.SPY_LISTEN_SPEAK:
				var extToSpy = message.extToSpy
                                var callDialExtToSpy = message.callDialExtToSpy
                                var channelToSpy = ''
                                for(var key in chStat){
                                        var tempChannel = chStat[key].channel
                                        if(modop.isChannelIntern(tempChannel)){
                                                var tempExt = modop.getExtInternFromChannel(tempChannel)
                                                if(extToSpy==tempExt && chStat[key].dialExt!=undefined && chStat[key].dialExt==callDialExtToSpy)
                                                        channelToSpy = tempChannel
                                        }
                                }
                                // create action to spy channel
                                var tyext = modop.getTypeExtFromExt(extFrom);
                                var actionSpyListenSpeak = {
                                        Action: 'Originate',
                                        Channel: tyext,
                                        Application: 'ChanSpy',
                                        Data: channelToSpy + ',w',
                                        Callerid: SPY_PREFIX + extToSpy
                                };
				try{
	                                am.send(actionSpyListenSpeak, function(){
						logger.debug("'actionSpyListenSpeak' " + sys.inspect(actionSpyListenSpeak) + " has been sent to AST");
	                                });
				} catch(err) {logger.warn("no connection to asterisk: "+err);}
                        break;
			case actions.REDIRECT_VOICEMAIL:
                                var extTo = message.extTo;
				var callFromExt = message.callFromExt;
				var ch = message.destCh;
				var vm = message.vm;
				var actRedirVoicemail = { 
					Action: 'Redirect',
					Channel: ch,
					Context: 'ext-local',
					Exten: 'vmu' + vm,
					Priority: 1
				}
				try{
	                                am.send(actRedirVoicemail, function(){
						logger.debug("'actRedirVoicemail' " + sys.inspect(actRedirVoicemail) + " has been sent to AST");
	                                });
				} catch(err) {logger.warn("no connection to asterisk: "+err);}
                        break;
			case actions.SEND_SMS:
				if(profiler.checkActionSmsPermit(extFrom)){
					const SMSHOSTING_URL = 'smshosting';
					var destNum = message.destNum;
					var text = message.text;
					var prefix = sms_conf['SMS'].prefix;
					if(prefix===undefined){
						logger.warn('send sms: \'prefix\' not exists in configuration file: set to empty');
						prefix = '';
					}
					if(prefix!=="" && destNum.length<=10 && destNum.substring(0,1)==='3'){
						destNum = prefix + destNum;
					}
					if(sms_conf["SMS"].type==="web"){ // WEB
						if(sms_conf['SMS'].method===undefined){
							logger.error('send sms: \'method\' not exists in configuration file');
							return;
						}
						var meth = sms_conf['SMS'].method.toUpperCase();
						if(meth!=='GET' && meth!=='POST'){
							logger.error('wrong method "'+meth+'" to send sms: check configuration');
							return;
						}
						if(meth==='GET'){
							var user = sms_conf['SMS'].user;
							var pwd = sms_conf['SMS'].password;
							var userEscape = _urlEscape(user);
							var pwdEscape = _urlEscape(pwd);
							var destNumEscape = _urlEscape(destNum);
							var textEscape = _urlEscape(text);
							if(sms_conf['SMS'].url===undefined){
								logger.error('send sms: \'url\' not exists in configuration file');
								return;
							}
							var httpurl = sms_conf['SMS'].url.replace("$USER",userEscape).replace("$PASSWORD",pwdEscape).replace("$NUMBER",destNumEscape).replace("$TEXT",textEscape);
							var parsed_url = url.parse(httpurl, true);
							var porturl = 80;
							if(parsed_url.port!==undefined){
								porturl = parsed_url.port;
							}
							var options = {
								host: parsed_url.hostname,
								port: porturl,
								path: parsed_url.pathname+parsed_url.search,
								method: meth
							};	
							logger.debug("send GET sms with options = " + sys.inspect(options));
							var request = http.request(options, function(res){ // http request
								if(res.statusCode===200){ // HTTP answer is ok, but check also respCode
									res.setEncoding('utf8');
									var respCode = '';
									res.on("data", function(chunk){ // get response code
										var temp = chunk.split("<CODICE>");
										for(var i=0, el; el=temp[i]; i++){
											if(el.indexOf("</CODICE>")!==-1){
												respCode = el.split("</CODICE>")[0];
											}
										}
										if(respCode==="HTTP_00" || parsed_url.hostname.indexOf(SMSHOSTING_URL)===-1){ // all ok, the sms was sent
											logger.debug("sms was sent: " + extFrom + " -> " + destNum);
											// add entry in DB
											dataCollector.registerSmsSuccess(extFrom, destNum, text, function(res){
				                                                        	// send ack to client
					                                                        var mess = new ResponseMessage(client.id, "ack_send_web_sms", '');
					                                                        client.emit('message',mess);
												logger.debug("add entry success into sms database");
				                                                        	logger.debug("RESP 'ack_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
											});
										} else { // there was an error
											logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. respCode = " + respCode);
											// add entry in DB
											dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
												// send error to client
			                                        	                	var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
												mess.respCode = respCode;
				        	                                                client.emit('message',mess);
												logger.debug("add entry of fail into sms database");
				                	                                        logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
											});
										}
									});
								} else { // error in HTTP answer
									logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. statusCode = " + res.statusCode);
									var statusCode = res.statusCode;
									// add entry in DB
			                                                dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
				                                        	// send error to client
		        			                             	var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
		                        	                                mess.statusCode = statusCode;
		                                	                        client.emit('message',mess);
		                                                        	logger.debug("add entry of fail into sms database");
			                                                        logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
			                                                });	
								}
							});
							request.on("error", function(e){ // there was an error
								logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. Error: " + e.message);
								// add entry in DB
								dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
									// send error to client
	                	                                       	var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
	                        	                        	client.emit('message',mess);
									logger.debug("add entry of fail into sms database");
		                        			        logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
								});
							});
							request.end(); // send request
						} else if(meth==='POST'){
							var user = sms_conf['SMS'].user;
	        	                                var pwd = sms_conf['SMS'].password;
							var userEscape = _urlEscape(user);
							var pwdEscape = _urlEscape(pwd);
							var destNumEscape = _urlEscape(destNum);
							var textEscape = _urlEscape(text);
	                	                        var httpurl = sms_conf['SMS'].url.replace("$USER",userEscape).replace("$PASSWORD",pwdEscape).replace("$NUMBER",destNumEscape).replace("$TEXT",textEscape);
                                	        	var parsed_url = url.parse(httpurl, true);
	                                	        var porturl = 80;
	                                        	if(parsed_url.port!==undefined){
		                                                porturl = parsed_url.port;
		                                        }
							post_data = querystring.stringify(parsed_url.query);
							var options = {
		                                                host: parsed_url.hostname,
		                                                port: porturl,
	        	                                        path: parsed_url.pathname,
	                	                                method: meth,
								headers: {  
									'Content-Type': 'application/x-www-form-urlencoded',  
								        'Content-Length': post_data.length  
								} 
		                                        };
							logger.debug("send sms with options = " + sys.inspect(options) + " and post_data = " + post_data);
							var request = http.request(options, function(res){ // http request
								res.setEncoding('utf8');
								if(res.statusCode===200){
									var respCode = '';
									res.on('data', function (chunk) {
										var temp = chunk.split("<CODICE>");
										// code of the response
										for(var i=0, el; el=temp[i]; i++){
											if(el.indexOf("</CODICE>")!==-1){
												respCode = el.split("</CODICE>")[0];
											}
										}
										if(respCode==="HTTP_00" || parsed_url.hostname.indexOf(SMSHOSTING_URL)===-1){ // all ok, the sms was sent
											logger.debug("sms was sent: " + extFrom + " -> " + destNum);
		                                	                                // add entry in DB
		                                        	                        dataCollector.registerSmsSuccess(extFrom, destNum, text, function(res){
		                                                	                	// send ack to client
		                                                        	                var mess = new ResponseMessage(client.id, "ack_send_web_sms", '');
		                                                                	        client.emit('message',mess);
			                                                                        logger.debug("add entry success into sms database");
			                                                                        logger.debug("RESP 'ack_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
			                                                                });
										} else { // there was an error
											// add entry in DB
											dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
												// send error to client
												var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
												mess.respCode = respCode;
												client.emit('message',mess);
												logger.debug("add entry of fail into sms database");
											});
										}
									});
								} else { // error in HTTP answer
									logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. statusCode = " + res.statusCode);
	                                	                        var statusCode = res.statusCode;
	                                        	                // add entry in DB
	                                                	        dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
	                                                        	        // send error to client
	                                                                	var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
		                                                                mess.statusCode = statusCode;
        		                                                        client.emit('message',mess);
                		                                                logger.debug("add entry of fail into sms database");
                        		                                        logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                		                        });
								}
							});
							request.write(post_data);
							request.end();
						}
						logger.debug("HTTP [" + meth + "] request for sending SMS from " + extFrom + " -> " + destNum + " was sent to: " + parsed_url.host);
					} else if(sms_conf["SMS"].type==="portech"){ // PORTECH
						var pathori = SMS_DIR+'/'+extFrom+'-'+destNum;
						var smsFilepath = SMS_DIR+'/'+extFrom+'-'+destNum;
						var res = true;
						var index = 1;
						while(res){ // check if the file already exist: if exist it modify file name
							try{
								fs.statSync(smsFilepath);
								smsFilepath = pathori+'-'+index;
								index++;
							} catch(e){
								res=false;
							}
						}
						fs.writeFile(smsFilepath, text, function(err){
							if(err){
								logger.error(err + ': there was a problem in creation of sms file "' + smsFilepath + '"');
								// send error to client
		                                        	var mess = new ResponseMessage(client.id, "error_send_sms", '');
		                                        	client.emit('message',mess);
		                                        	logger.debug("RESP 'error_send_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
							} else{
								logger.debug('created sms file "' + smsFilepath + '"');
								// send ack to client
		                                        	var mess = new ResponseMessage(client.id, "ack_send_sms", '');
		                                        	client.emit('message',mess);
	        	                                	logger.debug("RESP 'ack_send_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
							}
						});
					} else {
						logger.error("sms type in server configuration is: " + sms_conf["SMS"].type);
					}
				} else { // the user hasn't the permission to send sms
					logger.warn("[" + extFrom + "] doesn't have permission to send SMS!");
				}
			break;
	  		default:
	  			logger.warn("ATTENTION: received unknown ACTION '" + action + "': not supported");
	  		break;
	  	}
  	});

  	client.on('disconnect', function(){
  		logger.info("EVENT 'Disconnected': WebSocket client '" + client.id + "' disconnected with IP = " + client.handshake.address.address);
  		removeClient(client.id);
  		if(!testAlreadyLoggedSessionId(client.id))
  			logger.debug("removed client id '" + client.id + "' from clients");
	  	logger.debug(Object.keys(clients).length + ' logged in clients');
		printLoggedClients();
  	});
});

/*
 * end of section relative to WebSocket
 ************************************************************************************************/







/************************************************************************************************
 * Section relative to functions
 */
function _urlEscape(url){
	url = escape(url);
	return url.replace(/[*]/g, "%2A").replace(/[@]/g, "%40").replace(/[-]/g, "%2D").replace(/[_]/g, "%5F").replace(/[+]/g, "%2B").replace(/[.]/g, "%2E").replace(/[/]/g, "%2F");
}
// Update chat assocation in 'chatAssociation' and in DB and then return 'chatAssociation' to all clients
function storeChatAssociation(extFrom, bareJid){
	// if the 'extFrom=bareJid' is already present in chatAssociation, then it don't do anything
	if(chatAssociation[extFrom]!==undefined && chatAssociation[extFrom]===bareJid){
		logger.debug("chat association '"+extFrom+"="+bareJid+"' is already present: don't do anything");
	} else { // else delete all entry from DB that contains 'extFrom' or 'bareJid' and then insert new entry extFrom=bareJid and update chatAssociation in the same way
		//  update chatAssociation (delete and insert)
		for(var key in chatAssociation){
			if(key===extFrom || chatAssociation[key]===bareJid){
				delete chatAssociation[key];
			}
		}
		chatAssociation[extFrom] = bareJid;
		// update DB
		dataCollector.insertAndUpdateChatAssociation(extFrom,bareJid,function(){
			logger.debug("insert and update chat association '"+extFrom+"="+bareJid+"' in DB");
		});
	}
	updateAllClientsForChatAssociation();
	logger.debug("chatAssociation = " + sys.inspect(chatAssociation));
}
// write a file with a content
function writeChatAssociationFile(file, content){
	fs.writeFile(file, content, function(err){
        	if(err){
                	logger.error(err + ": error in write file " + file);
                }
        });	
}

function updateAllClientsWithQueueStatusForOp(){
	var queueStatus = modop.getQueueStatus();
	for(key in clients){
		var c = clients[key];
		var response = new ResponseMessage(c.id, "update_queue_status", '');
		response.queueStatus = queueStatus;
		if(profiler.checkPrivacyPermit(c.extension)){
                        response.priv = '1';
                } else {
                        response.priv = '0';
                }
		c.emit('message',response);
		logger.debug("RESP 'update_queue_status' has been sent to client [" + key + "] id '" + c.id + "'");
	}
}

/* This function update all clients with the new state of the extension, givin typeext. 
 * This sent is used by the clients to update operator panel.
 * Example of 'typeext' is: SIP/500 */ 
function updateAllClientsForOpWithTypeExt(typeext){
	// get new state of the extension typeext
	logger.debug('updateAllClientsForOpWithTypeExt('+typeext+')');
	var newState = modop.getExtStatusWithTypeExt(typeext);	
	// send update to all clients with the new state of the typeext for op (operator panel)
	logger.debug('update all clients (with typeext)...');
        for(key in clients){
                var c = clients[key];
                var msg = "state of " + newState.Label + " has changed: update ext new state";
                var response = new ResponseMessage(c.id, "update_ext_new_state_op", msg);
                response.extNewState = newState;
		response.typeExt = typeext;
		if(profiler.checkPrivacyPermit(c.extension)){
	                response.priv = '1';
	        } else {
			response.priv = '0';
		}
                c.emit('message',response);
                logger.debug("RESP 'update_ext_new_state_op' has been sent to client [" + key + "] id '" + c.id + "'");
        }
}
// Update all clients with modified chat association between extensions and its chat identifier jid
function updateAllClientsForChatAssociation(){
	for(key in clients){
                var c = clients[key];
                var response = new ResponseMessage(c.id, "update_chat_assoc", "");
                response.chatAssoc = chatAssociation;
                c.emit('message',response);
                logger.debug("RESP 'update_chat_assoc' has been sent to client [" + key + "] id '" + c.id + "'");
        }
}

/* This function update all clients with the new state of 'ext'. 
 * So the clients can update their operator panel.
 * 'ext' must be in the form: '500' */
function updateAllClientsForOpWithExt(ext){
        // get new state of the extension ext
        logger.debug('FUNCTION \'updateAllClientsForOpWithExt(ext)\': \'modop.getExtStatusWithExt(ext)\' with ext = \'' + ext + '\'');
        var newState = modop.getExtStatusWithExt(ext);
        logger.debug('obtained newState: ' + sys.inspect(newState));
        // send update to all clients with the new state
        logger.debug('update all clients (with ext)...');
        for(key in clients){
                var c = clients[key];
                var msg = "state of " + newState.Label + " has changed: update ext new state";
                var response = new ResponseMessage(c.id, "update_ext_new_state_op", msg);
                response.extNewState = newState;
		if(profiler.checkPrivacyPermit(c.extension)){
			response.priv = '1';	
		} else {
			response.priv = '0';
		}
                c.emit('message',response);
                logger.debug("RESP 'update_ext_new_state_op' has been sent to [" + key + "] id '" + c.id + "'");
        }
}

/* Tells all clients that extFrom has started a call out from his CTI. So all clients can update
 * their OP with ringing icon. This is because asterisk.js don't generate 'newState' ringing event until
 * the user has pickup his phone */
function sendAllClientAckCalloutFromCti(extFrom){
	logger.debug('FUNCTION \'sendAllClientAckCalloutFromCti(extFrom)\' for extFrom [' + extFrom + '] to update ringin ball on OP')
	for(key in clients){
                var c = clients[key]
                var msg = "[" + extFrom + "] has started a callout from CTI"
                var response = new ResponseMessage(c.id, "ack_callout_from_cti", msg)
		response.extFrom = extFrom
                c.emit('message',response);
                logger.debug("RESP 'ack_callout_from_cti' has been sent to [" + key + "] id '" + c.id + "'")
        }
}

/* This function create the response for the client with the history call
 * that the client has been requested */
function createHistoryCallResponse(results){
	var res = [];

/* An example of result obtained by the database of history call
[ { calldate: Tue, 26 Apr 2011 11:38:12 GMT,
    clid: 'CTI500',
    src: '',
    dst: '501',
    dcontext: 'from-internal',
    channel: 'SIP/500-00000012',
    dstchannel: 'SIP/501-00000013',
    lastapp: 'Dial',
    lastdata: 'SIP/501,"",tr',
    duration: 35,
    billsec: 16,
    disposition: 'ANSWERED',
    amaflags: 3,
    accountcode: '501',
    uniqueid: '1303810692.18',
    userfield: '' },
    ...] */
	for(var i=0; i<results.length; i++){
		var currRes = results[i];
		var temp = {};
		for(var key in currRes){
			temp[key] = currRes[key];
		}
		if(audioFileList[currRes.uniqueid]!==undefined){
			temp.recording = true;
		} else {
			temp.recording = false;
		}
		res.push(temp);
	}
	return res;
}
// Format date from mm/dd/yyyy to yyyy-mm-dd
function fromMMddYYYYtoYYYYmmDD(datestr){
	var ar = datestr.split('/');
	return ar[2]+'-'+ar[0]+'-'+ar[1];
}
// Format date from dd/mm/yyyy to yyyy-mm-dd
function formatDate(date){
	var ar = date.split('/');	
	var result = ar[2] + "-";
	result += ar[1] + "-";
	result += ar[0];
	return result;
}

// Remove client with specified id
removeClient = function(id){
	for(client in clients){
		if( (clients[client].id)==id )
			delete clients[client];
	}
}

// Check if the user exten already present in memory. 
testAlreadyLoggedExten = function(exten){
	if(clients[exten]!=undefined) return true;
	return false;
}


// Check if the user id already present in memory.
testAlreadyLoggedSessionId = function(id){
	for(client in clients){
		if(clients[client].id==id)
			return true;
	}
	return false;
}

getCCTemplate = function(type){
	var typeFilename = ''; // ex. decorator_cc_00_default.ejs
	for(key in cc_templates){
		typeFilename = key.split('.')[0].split('_')[3];
		if(typeFilename===type){
			return cc_templates[key]; // return ejs template
		}
	}
}

/* Create html code to return to the client after when he receive calling. This code is 
 * the customer card of the calling user */
createCustomerCardHTML = function(cc,type,from){ // ex. cc = { default: [ [Object] ] } or { calls: [ [Object] ] }
	if(type==='calls'){
		var arr = cc.calls;
                var tyext;
		for(var i=0, call; call=arr[i]; i++){
                        tyext = modop.getTypeExtFromExt(call.dst);
			res = modop.getNameIntern(tyext);
			if(res!==undefined){
				cc.calls[i].dst = res;
			}
		}
	}
	var typeFromFilename = '';
	var htmlResult = '';
	var obj = {};
	var localsObj = {};
	for(filenameEjs in cc_templates){
		typeFromFilename = filenameEjs.split('.')[0].split('_')[3];
		if(typeFromFilename===type){
			obj = {};
			localsObj = {};
			obj.results = cc[type];
			localsObj.locals = obj;
			htmlResult += ejs.render(cc_templates[filenameEjs],localsObj);
		}
	}
	return htmlResult;
}

function printLoggedClients(){
	logger.debug("logged in clients:");
	for(key in clients)
		logger.debug("\t[" + key + "] - IP '" + clients[key].handshake.address.address + "' - id '" + clients[key].id + "'");
}

/*
 * end of section relative to functions
 *************************************************************************************/

// capture any uncaught exceptions
process.on('uncaughtException', function(err){
	logger.error('*********************************************');
	logger.error('Uncaught EXCEPTION: ');
	logger.error(sys.inspect(err));
	logger.error("STACK:");
	logger.error(err.stack);
	logger.error('*********************************************');
});
