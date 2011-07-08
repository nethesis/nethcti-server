var ast = require('./asterisk');
var net = require('net');
var dataReq = require("./dataCollector.js");
var proReq = require("./profiler.js");
var authReq = require("./authenticator.js");
var contrReq = require("./controller.js");
var modopReq = require("./modop.js");
var http = require('http');
var url = require('url');
var fs = require('fs');
var io = require('./lib/socket.io');
var sys = require(process.binding('natives').util ? 'util' : 'sys');
var pathreq = require('path');
var normal = require("./lib/normal-template/lib/normal-template");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
//
const PROXY_CONFIG_FILENAME = "config/proxycti.ini";
const TEMPLATE_DECORATOR_VCARD_FILENAME = "./template/decorator_vcard.html";
const TEMPLATE_DECORATOR_CUSTOMERCARD_FILENAME = "./template/decorator_customerCard.html";
const TEMPLATE_DECORATOR_HISTORY_CALL_FILENAME = "./template/decorator_historyCall.html";
const AST_CALL_AUDIO_DIR = "/var/spool/asterisk/monitor";
const CALL_PREFIX = "CTI-";
const SPY_PREFIX = "SPY-";
const REDIRECT_VM_PREFIX = "REDIR_VM-";
const START_TAG_FILENAME = "auto-";
const DIAL_FROM = 1
const DIAL_TO = 0
// asterisk manager
var am;
// the server
var server;
/* The list of the logged clients. The key is the 'exten' and the value is the 
 * object relative to the client. When the client logs off, the corresponding key 
 * and value are removed.
 */ 
var clients = {};



// This object is the response that this server pass to the clients.
var ResponseMessage = function(clientSessionId, typeMessage, respMessage){
	this.clientSessionId = clientSessionId;
	this.typeMessage = typeMessage;
	this.respMessage = respMessage;
}




// initialize parameters for this server and for asterisk server
initServerAndAsteriskParameters();
/* Initialize some configuration parameters.
 *
server_conf = 
{ ASTERISK: { user: 'vtiger', pass: 'vtiger', host: 'localhost' },
  SERVER_PROXY: { hostname: 'amaduzzi', port: '8080', version: '0.2' } }
*/
function initServerAndAsteriskParameters(){
	var server_conf = iniparser.parseSync(PROXY_CONFIG_FILENAME);
	version = server_conf.SERVER_PROXY.version;
	asterisk_user = server_conf.ASTERISK.user;
	asterisk_pass = server_conf.ASTERISK.pass;
	asterisk_host = server_conf.ASTERISK.host;
	hostname = server_conf.SERVER_PROXY.hostname;
	port = server_conf.SERVER_PROXY.port;
	logfile = server_conf.SERVER_PROXY.logfile;
	if(logfile == undefined) logfile = "/var/log/proxycti.log";
	loglevel = server_conf.SERVER_PROXY.loglevel;
	if(loglevel == undefined) loglevel = "INFO";
}


/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF)
 */
log4js.clearAppenders();
log4js.addAppender(log4js.fileAppender(logfile), '[ProxyCTI]');
var logger = log4js.getLogger('[ProxyCTI]');
logger.setLevel(loglevel);



// START
logger.info("-------------------------------------------------------------");
logger.info("------------------- START Server v. " + version + " -------------------");




/* Audio file list of recorded call. This is an hash table that has the 'unique id' of the file
 * as the key and the 'filename' as value.
 * (view 'createAudioFileList' function).
 */
var audioFileList = {};
// create the list of audio files of recorded call
createAudioFileList();
/* This function create hash table of audio file. The key is the unique id of the file, 
 * and the value is set to filename.
 */
function createAudioFileList(){
	var temp = fs.readdirSync(AST_CALL_AUDIO_DIR);
	for(i=0; i<temp.length; i++){
		var u = getUniqueIdFromFilename(temp[i]);
		audioFileList[u] = temp[i];
	}
	logger.debug("audio file list of calls has been created");
}
/* This function return the 'unique id' of the filename. The uniqueid field is different for
 * those files that has been recorded from cti. 
 * ex. of file name recorded by cti: 'auto-500-501-20110426-113833-1303810692.18-in.wav'
 * ex. of file name recorded by asterisk: 'OUT202-20110405-173946-1302017986.4016.wav'
 * The unique id field is the last field of filename before extension and before "in" indication
 * in the case of cti recorded call.
 */
function getUniqueIdFromFilename(filename){
	if(filename.indexOf(START_TAG_FILENAME)!=-1)
		return filename.split("-")[5];
	else{
		var x = filename.split("-")[3];
		return x.split(".")[0] + "." + x.split(".")[1];
	}
}








// Add object modules
var profiler = new proReq.Profiler();
profiler.setLogger(logfile,loglevel);
var dataCollector = new dataReq.DataCollector();
dataCollector.setLogger(logfile,loglevel);
var authenticator = new authReq.Authenticator();
authenticator.setLogger(logfile,loglevel);
var controller = new contrReq.Controller(); // check changing in audio directory
controller.setLogger(logfile,loglevel);
var modop = new modopReq.Modop();
modop.setLogger(logfile,loglevel);

modop.addController(controller)
logger.debug('added object modules: \'Profiler\', \'DataCollector\', \'Authenticator\', \'Modop\' and \'Controller\'')
controller.addDir(AST_CALL_AUDIO_DIR);
controller.addListener("change_dir", function(dir){
	if(dir==AST_CALL_AUDIO_DIR){
		logger.info("update audio file list");
		createAudioFileList();
	}
})
controller.addListener('change_vm_dir', function(dir){
	// ex dir: '/var/spool/asterisk/voicemail/default/272/INBOX'
        var ext = dir.split('/')[6]
        var actionMailboxCount = {
		Action: 'MailboxCount',
		Mailbox: ext
        }
        am.send(actionMailboxCount, function (resp) {
		/* resp = { response: 'Success',
                actionid: '1308221582955',
                message: 'Mailbox Message Count',
                mailbox: '272',
                newmessages: '2',
                oldmessages: '0' } */
                var newMsgCount = resp.newmessages
		// update voicemail count of the extension
	        modop.updateVMCountWithExt(ext,resp.newmessages)
	        // update all clients with the new state of extension, for update operator panel
	        updateAllClientsForOpWithExt(ext)
	})
})

/* add 'controller' object to 'profiler' and to 'dataCollector'. They use it to 
 * manage changing in thier configuration file.
 */
profiler.addController(controller);
dataCollector.addController(controller);
logger.debug('add \'controller\' object to \'Profiler\' and \'DataCollector\'')




/******************************************************
 * Section relative to asterisk interaction    
 */
am = new ast.AsteriskManager({user: asterisk_user, password: asterisk_pass, host: asterisk_host});
logger.debug('created asterisk manager');

am.addListener('serverconnect', function() {
	logger.info("EVENT 'ServerConnect' to AST");
	am.login(function () {
		logger.info("logged into AST");
		// Add asterisk manager to modop
		modop.addAsteriskManager(am);
	});
});

am.addListener('serverdisconnect', function(had_error) {
	logger.warn("EVENT 'ServerDisconnected': had_error == " + (had_error ? "true" : "false"));
});

am.addListener('servererror', function(err) {
	logger.error("EVENT 'ServerError': error '" + err + "'");
});

// chStatus is the object that contains the 'uniqueid' as a key
chStat = {}
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
	logger.info("EVENT 'NewChannel': headers = " + sys.inspect(headers))
	chStat[headers.uniqueid] = {
		channel: headers.channel
	}
	logger.info("'newChannel' chStat = " + sys.inspect(chStat))
})

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
        logger.info("EVENT 'NewState': headers '" + sys.inspect(headers) +  "'")

	/* check if the chStat contains the entry relative to this newstate event.
         * This is because this proxy server can be started after the asterisk server. So some calling can be in execution when this
         * proxy server starting and so it can receive some newState event relative to old call for which it haven't the relative channel in chStat. 
         * In this case it simply discard this newState event */
        if(chStat[headers.uniqueid]==undefined){
                logger.warn("discard 'newState' event: it isn't present in chStat. The cause can be the start of this server during the asterisk functioning")
                return
        }

	chStat[headers.uniqueid].status = headers.channelstatedesc.toLowerCase()
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
		chStat[headers.uniqueid].calleridnum = headers.calleridnum
	else if(headers.calleridname.indexOf('CTI-')!=-1) // call come from cti
		chStat[headers.uniqueid].calleridnum = headers.calleridname.split('-')[1]

	// calleridname
	chStat[headers.uniqueid].calleridname = headers.calleridname

	// update for OP
	/* check if the newstate is relative to a call that come from queue. In this case (CASE C), 
 	 * discard this newState event */
	if( chStat[headers.uniqueid].channel.indexOf('Local/')!=-1 && chStat[headers.uniqueid].channel.indexOf('@from-internal-')!=-1 && ( chStat[headers.uniqueid].channel.indexOf(';1')!=-1 || chStat[headers.uniqueid].channel.indexOf(';2')!=-1 ) ){
		logger.warn("discard 'newState' event: is relative to '" + chStat[headers.uniqueid].channel + "'")
		return
	}
	var typeext = chStat[headers.uniqueid].channel.split('-')[0]
	if( modop.isChannelTrunk(chStat[headers.uniqueid].channel) ){ // newstate is relative to a trunk
		modop.updateTrunkStatusWithChannel(chStat[headers.uniqueid].channel, headers.channelstatedesc.toLowerCase())
	} else {
		modop.updateExtStatusForOpWithTypeExt(typeext, chStat[headers.uniqueid].status)
		updateAllClientsForOpWithTypeExt(typeext)
	}
	
	logger.info("'newState' chStat = " + sys.inspect(chStat))
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
	logger.info("EVENT 'NewCallerid': headers '" + sys.inspect(headers) +  "'")	
})


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
  * when dial not execute correctly, for ex. for congestion:
EVENT 'Dialing': headers '{ event: 'Dial',
  privilege: 'call,all',
  subevent: 'End',
  channel: 'SIP/224-000011c8',
  uniqueid: '1308732470.9425',
  dialstatus: 'CONGESTION' }' */
am.addListener('dialing', function(headers) {
        logger.info("EVENT 'Dialing': headers '" + sys.inspect(headers) + "'")
	logger.info("'dialing' chstat = " + sys.inspect(chStat))
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
		logger.warn("discard 'dialing' event: headers.destuniqueid = " + headers.destuniqueid + " and headers.dialstatus = " + headers.dialstatus)
		return
	}
	// to
	var to = headers.dialstring
	if(modop.isTypeExtFascio(chStat[headers.destuniqueid].channel.split('-')[0])){ // the call is out through a trunk (CASE A)
		var trunk = chStat[headers.destuniqueid].channel.split('-')[0].split('/')[1]
		if(to.indexOf(trunk)!=-1){
			to = to.split(trunk + '/')[1]
			if(to.indexOf('#31#')!=-1){
				to = to.split('#31#')[1]
			}
		}
	}
	// from
	var from = chStat[headers.uniqueid].calleridnum
	// in this case the call come from queue
	if(from==undefined && chStat[headers.uniqueid].channel.indexOf('Local/')!=-1 && chStat[headers.uniqueid].channel.indexOf('@from-internal-')!=-1 )
		from = headers.calleridnum
	else if( from==undefined && modop.isChannelTrunk(chStat[headers.uniqueid].channel) ) // callin through a trunk (CASE B)
		from = headers.calleridnum
	else if(from==undefined && chStat[headers.uniqueid].channel.indexOf('AsyncGoto/SIP/')!=-1 ) // this case is the redirect
		from = chStat[headers.uniqueid].channel.split('-')[0].split('/')[2]
	else if(from==undefined && modop.isChannelIntern(chStat[headers.uniqueid].channel))
		from = headers.calleridnum
	logger.info("Dialing from '" + from + "' -> '" + to + "'")

	// advise the client that receive the call
	if(to!=undefined && to!='' && modop.isExtPresent(to) && modop.isExtInterno(to)){
		// check the permission of the user to receive the call
                if(!profiler.checkActionCallInPermit(to)){
                	logger.info("check 'callIn' permission for [" + to + "] FAILED !")
                        return
		}
		var c = clients[to]
		if(c!=undefined){
                        /* in this response the html is not passed, because the chrome desktop 
                         * notification of the client accept only one absolute or relative url */
                        var response = new ResponseMessage(c.sessionId, "dialing", headers.calleridname)
                        response.from = from
                        response.to = to
                        var typesCC = profiler.getTypesCustomerCardPermit(to)
                        logger.debug("[" + to + "] is able to view customer card of types: " + sys.inspect(typesCC))
                        if(typesCC.length==0){
                                // the user hasn't the authorization of view customer card, then the length is 0
                                logger.debug("check permission to view Customer Card for [" + to + "] FAILED !")
                                response.customerCard = ""
                                response.noPermission = ''
                                c.send(response)
                                logger.debug("RESP 'dialing' has been sent to [" + to + "] sessionId '" + c.sessionId + "'")
                                return
                        }
		        var customerCardResult = []
       			for(i=0; i<typesCC.length; i++){
                		var name = typesCC[i];
                		dataCollector.getCustomerCard(from, typesCC[i], function(cc, name) {
                        		if(cc!=undefined){
                                		var obj = {};
                                		for(var item in cc)
                                       		 	cc[item].server_address = "http://" + hostname + ":" + port;
                               			obj[name] = cc;
                                		var custCardHTML = createCustomerCardHTML(obj, from)
                                		customerCardResult.push(custCardHTML)
                        		} else{
                        	       	 	customerCardResult.push(cc)
                        		}
                        		if(customerCardResult.length==typesCC.length){
                                		response.customerCard = customerCardResult
                                		c.send(response)
                                		logger.debug("RESP 'dialing' has been sent to [" + to + "] sessionId '" + c.sessionId + "' with relative customer card")
                        		}
                		})
        		}
                }
	}
	// add dialExtUniqueid for trunk and for queue ;2 (;2 means the call to client intern)
	if(from!=undefined && !modop.isChannelIntern(headers.channel) && headers.channel.indexOf(';1')==-1)
		chStat[headers.uniqueid].dialExtUniqueid = headers.destuniqueid
	if(to!=undefined && !modop.isChannelIntern(headers.destination) && headers.destination.indexOf(';1')==-1)
		chStat[headers.destuniqueid].dialExtUniqueid = headers.uniqueid
	// update for OP
	if(from!=undefined && to!=undefined){
		// check if the call come from queue. In this case, the caller (272) has already been update in AgentCalled event
		if(headers.channel.indexOf('Local/')==-1 && headers.channel.indexOf('@from-internal-')==-1 && headers.channel.indexOf(';2')==-1){ 
			/* check also !modop.isChannelTrunk(headers.channel)  because (CASE H): 
			 * headers.calleridnum come from trunk, that is remote location but is equal to local intern (namesake) */
			if(modop.isExtPresent(from) && modop.isChannelIntern(headers.channel) && !modop.isChannelTrunk(headers.channel) ){
				chStat[headers.uniqueid].dialExt = to // set dial from identification in chStat (dialExt)
				chStat[headers.uniqueid].dialDirection = DIAL_FROM
				var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel)
				modop.addDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid, chStat[headers.uniqueid])
				logger.info("added dialingUniqueid '" + headers.uniqueid + "' to interTypeExt '" + internTypeExt + "'")
		        	updateAllClientsForOpWithExt(from)
			} else if( modop.isExtPresent(from) && modop.isChannelTrunk(headers.channel) )
				logger.warn("[" + from + "] is namesake: comes from remote location through trunk '" + headers.channel + "'")
		}
		if(modop.isExtPresent(to) && modop.isChannelIntern(headers.destination)){
			chStat[headers.destuniqueid].dialExt = from // set dial to identification in chStat (dialExt)
			chStat[headers.destuniqueid].dialDirection = DIAL_TO
			var internTypeExt = modop.getInternTypeExtFromChannel(headers.destination)
			modop.addDialingUniqueidInternWithTypeExt(internTypeExt, headers.destuniqueid, chStat[headers.destuniqueid])
			logger.info("added dialingUniqueid '" + headers.destuniqueid + "' to interTypeExt '" + internTypeExt + "'")
	        	//updateAllClientsForOpWithExt(to) 
			// commented because send newState to all clients with the status set to 'up'. However there
			// will be a newState event with the status ringing and with the right dialExt 
		}	
	}
})


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
        logger.info("EVENT 'Hangup': headers = " + sys.inspect(headers))

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
	if(headers.channel.indexOf('<ZOMBIE>')==-1 && chStat[headers.uniqueid]==undefined){
		logger.warn("discard 'hangup' event: it isn't present in chStat. The cause can be the start of this server during the asterisk functioning")
		return
	}

	if(chStat[headers.uniqueid].channel.indexOf('Local/')!=-1 && chStat[headers.uniqueid].channel.indexOf('@from-internal-')!=-1 && (chStat[headers.uniqueid].channel.indexOf(';1')!=-1 || chStat[headers.uniqueid].channel.indexOf(';2')!=-1 ) ){
		logger.warn("discard 'hangup' event: relative to queue. Delete it from chStat")
		return
	}

	if(headers.channel.indexOf('<ZOMBIE>')!=-1 && headers.channel.indexOf('AsyncGoto/SIP/')==-1){ // (CASE M)  channel: 'SIP/204-00000401<ZOMBIE>'
		var tempCh = headers.channel.split('<ZOMBIE>')[0]
		var internTypeExt = modop.getInternTypeExtFromChannel(tempCh)
		var tempUniqueid
		for(key in chStat){
			if(chStat[key].channel==tempCh)
				tempUniqueid = key
		}
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, tempUniqueid)){
                        modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, tempUniqueid)
                        logger.info("removed dialingUniqueid '" + tempUniqueid + "' from intern '" + internTypeExt + "'")
                } else
                        logger.warn("dialingUniqueid '" + tempUniqueid + "' has already not present into intern '" + internTypeExt + "'")
		if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, tempUniqueid)){
                        modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, tempUniqueid)
                        logger.info("removed callConnectedUniqueid '" + tempUniqueid + "' from intern '" + internTypeExt + "'")
                } else
                        logger.warn("callConnected uniqueid '" + tempUniqueid + "' has already not present into intern '" + internTypeExt + "'")
		modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, tempUniqueid) // add uniqueid of current hangup as 'lastHangupUniqueid'
                updateAllClientsForOpWithTypeExt(internTypeExt)
		return
	}

	if( modop.isChannelTrunk(chStat[headers.uniqueid].channel) ){ // the channel is a trunk
		var trunkTypeExt = modop.getTrunkTypeExtFromChannel(chStat[headers.uniqueid].channel)
		if( modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeExt, headers.uniqueid) ){ // remove callconnectedUniqueid for current trunk
			modop.removeCallConnectedUniqueidTrunkWithTypeExt(trunkTypeExt, headers.uniqueid)
			logger.info("removed callConnectedUniqueid '" + headers.uniqueid + "' from trunk '" + trunkTypeExt + "'")
			updateAllClientsForOpWithTypeExt(trunkTypeExt)
		} else
			logger.warn("callConnected uniqueid '" + headers.uniqueid + "' has already not present into trunk '" + trunkTypeExt + "'")
	}
	else if(modop.isChannelIntern(headers.channel)){ // headers.channel is an intern
		var internTypeExt = modop.getInternTypeExtFromChannel(chStat[headers.uniqueid].channel)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, headers.uniqueid)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid)
			logger.info("removed dialingUniqueid '" + headers.uniqueid + "' from intern '" + internTypeExt + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid + "' has already not present into intern '" + internTypeExt + "'")
		if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, headers.uniqueid)){
			modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid)
			logger.info("removed callConnectedUniqueid '" + headers.uniqueid + "' from intern '" + internTypeExt + "'")
		} else
			logger.warn("callConnected uniqueid '" + headers.uniqueid + "' has already not present into intern '" + internTypeExt + "'")
		modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid) // add uniqueid of current hangup as 'lastHangupUniqueid'
		updateAllClientsForOpWithTypeExt(internTypeExt)
	}
	// headers.channel = 'AsyncGoto/SIP/270-000002dc<ZOMBIE>'
	else if(headers.channel.indexOf('AsyncGoto/SIP/')!=-1 && headers.channel.indexOf('<ZOMBIE>')!=-1){ // headers.channel is an intern that has redirect: remove callConnectedUniqueid
		var temp = headers.channel.split('/')[1] // SIP
		var internTypeExt = temp + '/' + headers.channel.split('-')[0].split('/')[2]
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, headers.uniqueid)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid)
			logger.info("removed dialingUniqueid '" + headers.uniqueid + "' from intern '" + internTypeExt + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid + "' has already not present into intern '" + internTypeExt + "'")
		if(modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, headers.uniqueid)){
			modop.removeCallConnectedUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid)
			logger.info("removed callConnectedUniqueid '" + headers.uniqueid + "' from intern '" + internTypeExt + "'")
		} else
			logger.warn("callConnected uniqueid '" + headers.uniqueid + "' has already not present into intern '" + internTypeExt + "'")
		modop.updateHangupUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid) // add uniqueid of current hangup as 'lastHangupUniqueid'
		updateAllClientsForOpWithTypeExt(internTypeExt)
        }
	// ext
	var ext
	if( chStat[headers.uniqueid].calleridnum!='' && chStat[headers.uniqueid].calleridnum!=undefined && !modop.isExtGroup(chStat[headers.uniqueid].calleridnum) ){
		/* '1308643186.683': 
		   { channel: 'SIP/270-00000243',
		     calleridname: '',
		     calleridnum: '270',
		     status: 'up' } } */
		// because (CASE I) is not possibile to calculate ext with ( ext = chStat[headers.uniqueid].calleridnum ). So:
		ext = modop.getExtInternFromChannel(chStat[headers.uniqueid].channel)
	} else {
		/* { '1308643183.682': 
		    { channel: 'SIP/271-00000242',
		      calleridname: 'CTI-271',
		      calleridnum: '',
		      status: 'up' }, */
		if(chStat[headers.uniqueid].channel.indexOf('SIP/')!=-1 && chStat[headers.uniqueid].channel.indexOf('AsyncGoto/')==-1 ) // not redirect
			ext = chStat[headers.uniqueid].channel.split('-')[0].split('/')[1]
		// chStat = { '1308664818.896': { channel: 'AsyncGoto/SIP/270-000002df' } } 
		else if( chStat[headers.uniqueid].channel.indexOf('AsyncGoto/SIP/')!=-1 ) // is redirect
			ext = chStat[headers.uniqueid].channel.split('-')[0].split('/')[2]
	}
	// advise client of hangup if this event is not relative to redirect operation
	if( headers.channel.indexOf('AsyncGoto/SIP/')==-1 && headers.channel.indexOf('<ZOMBIE>')==-1 ){
		var c = clients[ext]
		if(c!=undefined){
	                var msg = "Call has hung up. Reason: " + headers.causetxt + "  (Code: " + headers.cause + ")"
	                var resp = new ResponseMessage(c.sessionId, "hangup", msg)
	                resp.code = headers.cause
	                c.send(resp)
	                logger.info("RESP 'hangup' has been sent to [" + ext + "] sessionId '" + c.sessionId + "'")
	        }
		// update for OP
		if(modop.isExtPresent(ext) && modop.isExtInterno(ext)){
	                modop.updateExtStatusForOpWithExt(ext, 'hangup')
			var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel)
	                modop.updateLastDialExt(ext)
	                updateAllClientsForOpWithTypeExt(internTypeExt)
	        } else
			logger.warn('[' + ext + '] is not present in extStatusForOp: so not advise it')
	} else
		logger.info("discarded event 'hangup' because redirect")

	delete chStat[headers.uniqueid]
	logger.info("delete '" + headers.uniqueid + "' from chStat: so it is = " + sys.inspect(chStat))
	// TO eliminate data structure of asterisk.js
	//delete am.participants[headers.uniqueid]
        //logger.info('removed \'' + headers.uniqueid  + '\' from am.participants: ' + sys.inspect(am.participants))
})



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
  callerid2: '350' }' */
am.addListener('callconnected', function(headers) {
        logger.info("EVENT 'CallConnected': headers = '" + sys.inspect(headers) + "'")
	logger.info("'callconnected' chStat = " + sys.inspect(chStat))
	if(chStat[headers.uniqueid1]==undefined || chStat[headers.uniqueid2]==undefined){
		logger.warn("discard 'callConnected' event: it isn't present in chStat. The cause can be the start of this server during the asterisk functioning")
		return
	}
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
			var trunkTypeext = modop.getTrunkTypeExtFromChannel(headers.channel1)
			// add uniqueid of trunk 'headers.channel1' to trunk itself, if it isn't already been added
			if( !modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeext, headers.uniqueid1) ){
				modop.addCallConnectedUniqueidTrunkWithTypeExt(trunkTypeext, headers.uniqueid1, chStat[headers.uniqueid1])
				logger.info("added callConnectedUniqueid '" + headers.uniqueid1 + "' to trunk '" + trunkTypeext + "'")
				updateAllClientsForOpWithTypeExt(trunkTypeext)
			} else
				logger.warn("callConnected uniqueid '" + headers.uniqueid1 + "' has already been added to trunk '" + trunkTypeext  + "'")
		} else if(modop.isChannelIntern(headers.channel1)){  // channel 1 is intern
			var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel1)
			if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, headers.uniqueid1)){
				modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid1)
				logger.info("removed dialingUniqueid '" + headers.uniqueid1 + "' from internTypeExt '" + internTypeExt + "'")
			} else
				logger.warn("dialingUniqueid '" + headers.uniqueid1 + "' has already not present into intern '" + internTypeExt  + "'")
			if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, headers.uniqueid1)){
				modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid1, chStat[headers.uniqueid1])
				logger.info("added callConnectedUniqueid '" + headers.uniqueid1 + "' into intern '" + internTypeExt + "'")
			} else
				logger.warn("callConnectedUniqueid '" + headers.uniqueid1 + "' has already present into intern '" + internTypeExt  + "'")
			updateAllClientsForOpWithTypeExt(internTypeExt)
		}
		logger.warn("discarded event 'callconnected'")
		return
	}

	// channel2 is a trunk, so add uniqueid of its channel to it
	if(modop.isChannelTrunk(headers.channel2) ){ // (CASE F)
		var trunkTypeext = modop.getTrunkTypeExtFromChannel(headers.channel2)
		// add uniqueid of trunk 'headers.channel2' to trunk itself, if it isn't already been added
		if( !modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeext, headers.uniqueid2) ){
			modop.addCallConnectedUniqueidTrunkWithTypeExt(trunkTypeext, headers.uniqueid2, chStat[headers.uniqueid2])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid2 + "' to trunk '" + trunkTypeext + "'")
			updateAllClientsForOpWithTypeExt(trunkTypeext)
		} else
			logger.warn("callConnected uniqueid '" + headers.uniqueid2 + "' has already been added to trunk '" + trunkTypeext  + "'")

		// add uniqueid of intern 'headers.channel1' to intern itself, if it isn't already been added
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel1)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, headers.uniqueid1)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid1)
			logger.info("removed dialingUniqueid '" + headers.uniqueid1 + "' from internTypeExt '" + internTypeExt + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid1 + "' has already not present into intern '" + internTypeExt  + "'")
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, headers.uniqueid1)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid1, chStat[headers.uniqueid1])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid1 + "' into intern '" + internTypeExt + "'")
		} else
			logger.warn("callConnectedUniqueid '" + headers.uniqueid1 + "' has already present into intern '" + internTypeExt  + "'")
		updateAllClientsForOpWithTypeExt(internTypeExt)
	}

	// channel1 is a trunk and channel2 is an intern (CASE G)
	if( modop.isChannelTrunk(headers.channel1) && modop.isChannelIntern(headers.channel2) ){
		var trunkTypeExt = modop.getTrunkTypeExtFromChannel(headers.channel1)
		// add uniqueid of trunk 'headers.channel1' to trunk itself, if it isn't already been added
		if( !modop.hasTrunkCallConnectedUniqueidWithTypeExt(trunkTypeExt, headers.uniqueid1) ){
			modop.addCallConnectedUniqueidTrunkWithTypeExt(trunkTypeExt, headers.uniqueid1, chStat[headers.uniqueid1])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid1 + "' to trunk '" + trunkTypeExt + "'")
			updateAllClientsForOpWithTypeExt(trunkTypeExt)
		} else
			logger.warn("callConnected uniqueid '" + headers.uniqueid1 + "' has already been added to trunk '" + trunkTypeExt  + "'")

		// add uniqueid of intern 'headers.channel2' to intern itself, if it isn't already been added
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel2)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, headers.uniqueid2)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid2)
			logger.info("removed dialingUniqueid '" + headers.uniqueid2 + "' from internTypeExt '" + internTypeExt + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid2 + "' has already not present into intern '" + internTypeExt  + "'")
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, headers.uniqueid2)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid2, chStat[headers.uniqueid2])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid2 + "' into intern '" + internTypeExt + "'")
		} else
			logger.warn("callConnectedUniqueid '" + headers.uniqueid2 + "' has already present into intern '" + internTypeExt  + "'")
		updateAllClientsForOpWithTypeExt(internTypeExt)
	}

	// the call is for queue and this is the part from intermediate node ...;2 and the intern
	if( headers.channel1.indexOf('Local/')!=-1 && headers.channel1.indexOf('@from-internal-')!=-1 && headers.channel1.indexOf(';2')!=-1  ){
		var internTypeExt = modop.getInternTypeExtFromChannel(headers.channel2)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt, headers.uniqueid2)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid2)
			logger.info("removed dialingUniqueid '" + headers.uniqueid2 + "' from internTypeExt '" + internTypeExt + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid2 + "' has already not present into intern '" + internTypeExt  + "'")
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt, headers.uniqueid2)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt, headers.uniqueid2, chStat[headers.uniqueid2])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid2 + "' into intern '" + internTypeExt + "'")
		} else
			logger.warn("callConnectedUniqueid '" + headers.uniqueid2 + "' has already present into intern '" + internTypeExt  + "'")
		updateAllClientsForOpWithTypeExt(internTypeExt)

		// add dialExtUniqueid for queue ;2 (;2 means the call to client intern)
		chStat[headers.uniqueid1].dialExtUniqueid = headers.uniqueid2
	}

	// the call is between 2 intern
	if(modop.isChannelIntern(headers.channel1) && modop.isChannelIntern(headers.channel2)){
		// channel 1
		var internTypeExt1 = modop.getInternTypeExtFromChannel(headers.channel1)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt1, headers.uniqueid1)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt1, headers.uniqueid1)
			logger.info("removed dialingUniqueid '" + headers.uniqueid1 + "' from internTypeExt '" + internTypeExt1 + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid1 + "' has already not present into intern '" + internTypeExt1  + "'")
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt1, headers.uniqueid1)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt1, headers.uniqueid1, chStat[headers.uniqueid1])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid1 + "' into intern '" + internTypeExt1 + "'")
		} else
			logger.warn("callConnectedUniqueid '" + headers.uniqueid1 + "' has already present into intern '" + internTypeExt1  + "'")
                updateAllClientsForOpWithTypeExt(internTypeExt1)
		// channel 2
		var internTypeExt2 = modop.getInternTypeExtFromChannel(headers.channel2)
		if(modop.hasInternDialingUniqueidWithTypeExt(internTypeExt2, headers.uniqueid2)){
			modop.removeDialingUniqueidInternWithTypeExt(internTypeExt2, headers.uniqueid2)
			logger.info("removed dialingUniqueid '" + headers.uniqueid2 + "' from internTypeExt '" + internTypeExt2 + "'")
		} else
			logger.warn("dialingUniqueid '" + headers.uniqueid2 + "' has already not present into intern '" + internTypeExt2  + "'")
		if(!modop.hasInternCallConnectedUniqueidWithTypeExt(internTypeExt2, headers.uniqueid2)){
			modop.addCallConnectedUniqueidInternWithTypeExt(internTypeExt2, headers.uniqueid2, chStat[headers.uniqueid2])
			logger.info("added callConnectedUniqueid '" + headers.uniqueid2 + "' into intern '" + internTypeExt2 + "'")
		} else
			logger.warn("callConnectedUniqueid '" + headers.uniqueid2 + "' has already present into intern '" + internTypeExt2  + "'")
                updateAllClientsForOpWithTypeExt(internTypeExt2)
	}

	// advise two clients of call
	var from = headers.callerid1
        var to = headers.callerid2
	if(clients[from]!=undefined){
                var c = clients[from]
                var msg = "Call from " + from + " to " + to + " CONNECTED"
                var response = new ResponseMessage(c.sessionId, "callconnected", msg)
                response.from = from
                response.to = to
                c.send(response)
                logger.info("RESP 'callconnected' has been sent to [" + from + "] sessionId '" + c.sessionId + "'")
        }
        if(clients[to]!=undefined){
                var c = clients[to]
                var msg = "Call from " + from + " to " + to + " CONNECTED"
                var response = new ResponseMessage(c.sessionId, "callconnected", msg)
                response.from = from
                response.to = to
                c.send(response)
                logger.info("RESP 'callconnected' has been sent to [" + to + "] sessionId '" + c.sessionId + "'")
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
  uniqueid: '1308652170.784' } */
am.addListener('agentcalled', function(headers) {
	logger.info("EVENT 'AgentCalled': headers = " + sys.inspect(headers))
	var from = chStat[headers.uniqueid].calleridnum
	if(modop.isExtPresent(from) && modop.isChannelIntern(headers.channelcalling)){
		chStat[headers.uniqueid].dialDirection = DIAL_FROM
		chStat[headers.uniqueid].dialExt = headers.queue
	}
})































am.addListener('calldisconnected', function(from, to) {
	logger.info("EVENT 'CallDisconnected': between '" + sys.inspect(from) + "' AND '" + sys.inspect(to) + "'");
});

am.addListener('hold', function(participant) {
	var other = am.getParticipant(participant['with']);
	logger.info("EVENT 'Hold': " + participant.number + " (" + participant.name + ") has put " + other.number + " (" + other.name + ") on hold");
});

am.addListener('unhold', function(participant) {
	var other = am.getParticipant(participant['with']);
	logger.info("EVENT 'Unhold': " + participant.number + " (" + participant.name + ") has taken " + other.number + " (" + other.name + ") off hold");
});

	

am.addListener('callreport', function(report) {
	logger.info("EVENT 'CallReport': " + sys.inspect(report));
});

/*{ event: 'PeerStatus',
  privilege: 'system,all',
  channeltype: 'SIP',
  peer: 'SIP/504',
  peerstatus: 'Registered' }
*/
am.addListener('peerstatus', function(headers) {
	var statusEvent = headers.peerstatus.toLowerCase();
	var currStatus = modop.getExtStatusWithTypeExt(headers.peer).status;
	/* if the status of the event is 'registered' and current status of peer is different 
	 * from 'unregistered', then the event is ignored. In this way, when the calling is in progress, the arrive of
	 * this event with status 'registered' don't change the status of the extension. */
	if(statusEvent=='registered' && currStatus!='unregistered'){
		logger.debug("EVENT 'PeerStatus' ignored. Status of [" + headers.peer + "] is already different from 'unregistered'");
		return;
	}
	logger.info("EVENT 'PeerStatus': " + sys.inspect(headers));
	// update ext status for op
	modop.updateExtStatusForOpWithTypeExt(headers.peer, headers.peerstatus.toLowerCase());
	// update all clients with the new state of extension, for update operator panel
	updateAllClientsForOpWithTypeExt(headers.peer);
});




/* This event is generated only by the phone of the user.
 * An example of UserEvent event is:
 *
{ event: 'UserEvent',
  privilege: 'user,all',
  serevent: 'ASTDB',
  channel: 'SIP/503-0000000d^Family',
  extra: 'Family: DND^Value: Attivo^' }
 */
am.addListener('userevent', function(headers){
	logger.info("EVENT 'UserEvent'");
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

	if(family=='dnd'){
		logger.info("[" + ext + "] '" + family + " " + value + "'");
		/* in this case the client who has modified its DND value is connected to the cti
 		 * and has modified its DND through his telephone. So he'll be advise of the changing
		 * to update its cti. */
		if(clients[ext]!=undefined){	
			var c = clients[ext];
			if(value==""){ // DND is disabled by the phone user
				logger.info("[" + ext + "] '" + family + " OFF'");
				var msg = ext + " has disabled its " + family;
        		        var response = new ResponseMessage(c.sessionId, "dnd_status_off", msg);
		                c.send(response);
		                logger.info("RESP 'dnd_status_off' has been sent to [" + ext + "] sessionId '" + c.sessionId + "'");
			}	
			else if(value=="attivo"){ // DND is enable by the phone user
				logger.info("[" + ext + "] '" + family + " ON'");
				var msg = ext + " has enabled its " + family;
                                var response = new ResponseMessage(c.sessionId, "dnd_status_on", msg);
                                c.send(response);
                                logger.info("RESP 'dnd_status_on' has been sent to [" + ext + "] sessionId '" + c.sessionId + "'");
			}
		}
		if(value=="")
			modop.updateExtDNDStatusWithExt(ext, "off");
		else if(value=="attivo")
			modop.updateExtDNDStatusWithExt(ext, "on");
                updateAllClientsForOpWithExt(ext);
	}
	else if(family=='cf'){
		logger.info("[" + ext + "] '" + family + " " + value + "'");
		/* in this case the client who has modified his 'CF' value is connected to cti
                 * and has modified his 'CF' through his telephone. So he'll be advise of changing
                 * to update his cti */
                if(clients[ext]!=undefined){
                        var c = clients[ext];
                        if(value==""){ // CF is disabled by the phone user
                                logger.info("[" + ext + "] '" + family + " OFF'");
                                var msg = ext + " has disabled its " + family;
                                var response = new ResponseMessage(c.sessionId, "cf_status_off", msg);
                                c.send(response);
                                log("RESP 'cf_status_off' has been sent to [" + ext + "] sessionId '" + c.sessionId + "'");
                        }
                        else { // CF is enable by the phone user
                                logger.info("[" + ext + "] '" + family + " ON' to [" + value + "]");
                                var msg = ext + " has enabled its " + family + " to " + value;
                                var response = new ResponseMessage(c.sessionId, "cf_status_on", msg);
				response.extTo = value;
                                c.send(response);
                                logger.info("RESP 'cf_status_on' to [" + value + "] has been sent to [" + ext + "] sessionId '" + c.sessionId + "'");
                        }
                }
                if(value=="")
                        modop.updateExtCFStatusWithExt(ext, "off");
                else 
                        modop.updateExtCFStatusWithExt(ext, "on", value);
                updateAllClientsForOpWithTypeExt(ext);
	}
});


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
	logger.info("EVENT 'ParkedCall'");
	var parking = 'PARK' + headers.exten;
	var extParked = headers.channel.split("/")[1];
	extParked = extParked.split("-")[0];
	var parkFrom = headers.from.split("/")[1];
	parkFrom = parkFrom.split("-")[0];
	// update status of park ext
	modop.updateParkExtStatus(parking, extParked, parkFrom, headers.timeout);
	// update all clients with the new state of extension, for update operator panel
        updateAllClientsForOpWithExt(parking);
});


/* This event is necessary to update the end of parked call to status of park extensions.
 * Example of 'ParkeCallTimeOut' event is:
 * 
 { Event: ParkedCallTimeOut
   Privilege: call,all
   Exten: 71
   Channel: SIP/502-00000171
   CallerIDNum: 502
   CallerIDName: giovanni }
 */
am.addListener('parkedcalltimeout', function(headers){
        logger.info("EVENT 'ParkedCallTimeOut'");
        var parking = 'PARK' + headers.exten;
        // update status of park ext
        modop.updateEndParkExtStatus(parking);
        updateAllClientsForOpWithExt(parking);
});


// This event is emitted at the end of the answers generated after 'ParkedCalls' action
extToReturnExtStatusForOp = '';
clientToReturnExtStatusForOp = '';
am.addListener('parkedcallscomplete', function(){
	logger.info("EVENT 'ParkedCallsComplete'");
	/* check if the user has the permission to view the operator panel.
         * First check if the user has the "OP_PLUS" permission. If he hasn't the permission, then
         * it check if he has the "OP_BASE" permission. */
        if(profiler.checkActionOpPlusPermit(extToReturnExtStatusForOp)){
        	// create message
                var msgstr = "received extStatusForOp to create operator panel";
                var mess = new ResponseMessage(clientToReturnExtStatusForOp.sessionId, "ack_get_peer_list_complete_op", msgstr);
                mess.extStatusForOp = modop.getExtStatusForOp();
                mess.tabOp = modop.getTabOp();
                mess.opPermit = 'plus';
                clientToReturnExtStatusForOp.send(mess);
               	logger.info("RESP 'ack_get_peer_list_complete_op' has been sent to [" + extToReturnExtStatusForOp + "] sessionId '" + clientToReturnExtStatusForOp.sessionId + "'");
        }
        else if(profiler.checkActionOpBasePermit(extToReturnExtStatusForOp)) {
        	// create message
                var msgstr = "received extStatusForOp to create operator panel";
                var mess = new ResponseMessage(clientToReturnExtStatusForOp.sessionId, "ack_get_peer_list_complete_op", msgstr);
                mess.extStatusForOp = modop.getExtStatusForOp();
                mess.tabOp = modop.getTabOp();
                mess.opPermit = 'base';
                clientToReturnExtStatusForOp.send(mess);
                logger.info("RESP 'ack_get_peer_list_complete_op' has been sent to [" + extToReturnExtStatusForOp + "] sessionId '" + clientToReturnExtStatusForOp.sessionId + "'");
        }
        else{
        	// create message
                var msgstr = "Sorry but you haven't the permission of view the operator panel";
                var mess = new ResponseMessage(clientToReturnExtStatusForOp.sessionId, "error_get_peer_list_complete_op", msgstr);
                clientToReturnExtStatusForOp.send(mess);
                logger.info("RESP 'error_get_peer_list_complete_op' has been sent to [" + extToReturnExtStatusForOp + "] sessionId '" + clientToReturnExtStatusForOp.sessionId + "'");
       	}
});

/* This event is emitted by asterisk.js when a new voicemail is added
 * An example of the event is:
 *
{ event: 'MessageWaiting',
  privilege: 'call,all',
  mailbox: '500@default',
  waiting: '1',
  new: '1',
  old: '0' }
 */
am.addListener('messagewaiting', function(headers){
	logger.info("EVENT 'MessageWaiting': new voicemail for [" + headers.mailbox + "]; the number is: " + headers.new);
	var ext = headers.mailbox.split('@')[0];
	// update voicemail count of the extension
	modop.updateVMCountWithExt(ext,headers.new);
	// update all clients with the new state of extension, for update operator panel
	updateAllClientsForOpWithExt(ext);
});

/*
 * End of section relative to asterisk interaction
 *************************************************/



/*******************************************************************************
 * Section relative to HTTP server
 */
server = http.createServer(function(req, res){
  	
  	var parsed_url = url.parse(req.url,true);
	var path = parsed_url.pathname;
	var params = parsed_url.query;

	switch (path){
	    case '/':
    		path = "/index.html";
		    fs.readFile(__dirname + path, function(err, data){
    	    	if (err) return send404(res);
		        res.writeHead(200, {'Content-Type': 'text/html'});
    		    res.write(data, 'utf8');
    		    res.end();
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
                                        res.writeHead(200, {'Content-Type': type});
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
    			}
    			else
		    		send404(res);
    		});
  	}	//switch
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



/*******************************************************************************
 * Section relative to WebSocket
 */ 
var io = io.listen(server);
 
io.on('connection', function(client){
	// send acknowledgment of established connection 
	client.send(new ResponseMessage(client.sessionId, "connected", "[DEBUG] client " + client.sessionId + " connected"));
	logger.info("'ack' to connection has been sent to the client with sessionId: " + client.sessionId);

	client.on('message', function(message){
		// all received messages have the information 'extenFrom' and the information about the 'action' to execute
  		var extFrom = message.extFrom;
  		var action = message.action;
		// object that contains all actions that can be executed
		var actions = {
			ACTION_LOGIN: 	'login',
			ACTION_CALLOUT: 'call_out_from_client',
			ACTION_LOGOUT: 	'logout',
			ACTION_HANGUP:	'hangup',
			ACTION_REDIRECT:'redirect',
			ACTION_RECORD: 	'record',
			ACTION_DND_ON:  'dnd_on',
                	ACTION_DND_OFF:	'dnd_off',
			ACTION_CW_ON: 	'cw_on',
                	ACTION_CW_OFF:	'cw_off',
			ACTION_CF_ON: 	'cf_on',
			ACTION_CF_OFF: 	'cf_off',
			ACTION_PARK: 	'park',
			ACTION_PICKUP: 	'pickup',
			ACTION_HANGUP_SPY: 'hangup_spy',
			ACTION_CF_BUSY_ON: 'cf_busy_on',
			ACTION_CF_BUSY_OFF: 'cf_busy_off',
			ACTION_STOP_RECORD: 'stoprecord',
			ACTION_SPY_LISTEN:  'spy_listen',
			ACTION_CHECK_CF_STATUS:    'check_cf_status',
			ACTION_CHECK_DND_STATUS:   'check_dnd_status',
			ACTION_CHECK_CW_STATUS:    'check_cw_status',
			ACTION_SPY_LISTEN_SPEAK:   'spy_listen_speak',
			ACTION_CF_UNAVAILABLE_ON: 'cf_unavailable_on',
			ACTION_CF_UNAVAILABLE_OFF: 'cf_unavailable_off',
			ACTION_REDIRECT_VOICEMAIL: 'redirect_voicemail',
			ACTION_GET_DAY_HISTORY_CALL:  'get_day_history_call',
			ACTION_CHECK_CALL_AUDIO_FILE: 'check_call_audio_file',
			ACTION_SEARCH_CONTACT_PHONEBOOK:  'search_contact_phonebook',
			ACTION_GET_PEER_LIST_COMPLETE_OP: 'get_peer_list_complete_op',
			ACTION_REDIRECT_VOICEMAIL_FROM_OP: 'redirect_voicemail_from_op',
			ACTION_GET_CURRENT_WEEK_HISTORY_CALL:  'get_current_week_history_call',
			ACTION_GET_CURRENT_MONTH_HISTORY_CALL: 'get_current_month_history_call'
		}
  		logger.info("ACTION received: from sessionId '" + client.sessionId + "' message " + sys.inspect(message));	
  		// manage request
  		switch(action){
  			case actions.ACTION_LOGIN:
	  			if(authenticator.authenticateUser(extFrom, message.secret)){  // the user is authenticated
  					// if the user is already logged in, a new session is created and the old is closed
  					if(testAlreadyLoggedExten(extFrom)){
						// close already present session
						var clientToClose = clients[extFrom];
						var respMsg = new ResponseMessage(clientToClose.sessionId, 'new_access', 'New Access from another place');
						clientToClose.send(respMsg);
						logger.warn("RESP 'new_access' has been sent to [" + extFrom + "] sessionId '" + clientToClose.sessionId + "'");
						removeClient(clientToClose.sessionId);
						if(!testAlreadyLoggedSessionId(clientToClose.sessionId))
							logger.warn("new access [" + extFrom + "]: logged OUT sessiondId '" + clientToClose.sessionId + "'");
						// new access: authenticate the user
						client.extension = extFrom;
						clients[extFrom] = client;
						var ipAddrClient = client.connection.remoteAddress;
						logger.warn("new access [" + extFrom + "]: logged IN, IP '" + ipAddrClient + "' sessionId '" + client.sessionId + "'");
						logger.info(Object.keys(clients).length + " logged in clients");
	                                        printLoggedClients();
						respMsg = new ResponseMessage(client.sessionId, "ack_login", "Login succesfully");
						respMsg.ext = extFrom;
						respMsg.secret = message.secret;
						client.send(respMsg);
						logger.info("RESP 'ack_login' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
  					} else {
	  					// authenticate the user
			  			client.extension = extFrom;
			  			clients[extFrom] = client;  
			  			var ipAddrClient = client.connection.remoteAddress;
				  		logger.info("logged IN: client [" + extFrom + "] IP '" + ipAddrClient + "' sessionId '" + client.sessionId + "'");
				  		logger.info(Object.keys(clients).length + " logged in clients");
				  		printLoggedClients();
				  		var respMsg = new ResponseMessage(client.sessionId, "ack_login", "Login succesfully");
				  		respMsg.ext = extFrom;
				  		respMsg.secret = message.secret;
			  			client.send(respMsg);
			  			logger.info("RESP 'ack_login' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
  				}
  				else{ // the user is not authenticated
  					logger.warn("AUTH FAILED: [" + extFrom + "] with secret '" + message.secret + "'");
  					client.send(new ResponseMessage(client.sessionId, "error_login", "Sorry, authentication failed !"));
  					logger.warn("RESP 'error_login' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
  				}
	  		break;
	  		case actions.ACTION_CHECK_DND_STATUS:
	  			// create action for asterisk server
	  			var cmd = "database get DND " + extFrom;
			  	var actionCheckDNDStatus = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCheckDNDStatus, function (resp) {
					logger.debug("'actionCheckDNDStatus' " + sys.inspect(actionCheckDNDStatus) + " has been sent to AST");
					if(resp.value==undefined){
						var msgstr = "Don't disturb  status of [" + extFrom + "] is OFF";
						client.send(new ResponseMessage(client.sessionId, 'dnd_status_off', msgstr));
						logger.info("RESP 'dnd_status_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
					else{
						var msgstr = "Don't disturb  status of [" + extFrom + "] is ON";
						client.send(new ResponseMessage(client.sessionId, 'dnd_status_on', msgstr));
						logger.info("RESP 'dnd_status_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
				});
	  		break;
	  		case actions.ACTION_CHECK_CW_STATUS:
	  			// create action for asterisk server
	  			var cmd = "database get CW " + extFrom;
			  	var actionCheckCWStatus = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCheckCWStatus, function (resp) {
					logger.debug("'actionCheckCWStatus' " + sys.inspect(actionCheckCWStatus) + " has been sent to AST");
					if(resp.value==undefined){
						var msgstr = "Call waiting  status of [" + extFrom + "] is OFF";
						client.send(new ResponseMessage(client.sessionId, 'cw_status_off', msgstr));
						logger.info("RESP 'cw_status_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
					else{
						var msgstr = "Call waiting  status of [" + extFrom + "] is ON";
						client.send(new ResponseMessage(client.sessionId, 'cw_status_on', msgstr));
						logger.info("RESP 'cw_status_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
				});
	  		break;
	  		case actions.ACTION_CHECK_CF_STATUS:
	  			// create action for asterisk server
	  			var cmd = "database get CF " + extFrom;
			  	var actionCheckCFStatus = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCheckCFStatus, function (resp) {
					logger.debug("'actionCheckCFStatus' " + sys.inspect(actionCheckCFStatus) + " has been sent to AST");
					if(resp.value==undefined){
						var msgstr = "Call forwarding  status of [" + extFrom + "] is OFF";
						client.send(new ResponseMessage(client.sessionId, 'cf_status_off', msgstr));
						logger.info("RESP 'cf_status_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
					else{
						var extTo = resp.value.split('\n')[0];
						var msgstr = "Call forwarding  status of [" + extFrom + "] is ON to " + extTo;
						var respMessage = new ResponseMessage(client.sessionId, 'cf_status_on', msgstr);
						respMessage.extTo = extTo;
						client.send(respMessage);
						logger.info("RESP 'cf_status_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					}
				});
	  		break;
	  		case actions.ACTION_CALLOUT:
  				var extToCall = message.extToCall;
  				// check if the client is logged in
	  			if(clients[extFrom]==undefined){
	  				logger.warn("ATTENTION: client [" + extFrom + "] not logged in");
	  				client.send(new ResponseMessage(client.sessionId, 'error_call', 'Error in calling: client not logged in'));
	  				logger.warn("RESP 'error_call' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
	  				return;
  				}
	  			// security check of real authenticity of the user who originated the call
	  			else if(client.sessionId != clients[extFrom].sessionId){
	  				logger.warn("SECURITY WARNING: attempt to fake the sender: session '" + client.sessionId + "' attempt to call with the fake exten [" + extFrom + "] !");
	  				client.send(new ResponseMessage(client.sessionId, 'error_call', 'Error in calling: attempt to call with the fake exten ' + extFrom));
	  				logger.warn("RESP 'error_call' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
	  				return;
	  			}
  				// check if the user has the permission of dial out
  				if(profiler.checkActionCallOutPermit(extFrom)){
  					logger.info("check 'callOut' permission for [" + extFrom + "] OK: execute calling...");
	  				// create call action for asterisk server
	  				var actionCall = {
						Action: 'Originate',
						Channel: 'SIP/' + extFrom,
						Exten: extToCall,
						Context: 'from-internal',
						Priority: 1,
						Callerid: CALL_PREFIX + extFrom,
						Account: extToCall,
						Timeout: 30000
					};
					/* update all clients that 'extFrom' has been started a call out, so they can update their OP.
					 * This is made because asterisk.js not generate 'newState' ringing event until the user
					 * has pickup his phone */
					sendAllClientAckCalloutFromCti(extFrom)
					// send action to asterisk
					am.send(actionCall, function () {
						logger.info('\'actionCall\' ' + sys.inspect(actionCall) + ' has been sent to AST');
						var msgTxt = "call action has been sent to asterisk: " + extFrom + " -> " + extToCall;
						var respMsg = new ResponseMessage(client.sessionId, "ack_callout", msgTxt);
                                                client.send(respMsg);
                                                logger.info("RESP 'ack_callout' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					});
	  			}
  				else{
		  			logger.warn("check 'callOut' permission for [" + extFrom + "] FAILED !");
		  			client.send(new ResponseMessage(client.sessionId, 'error_call', "Sorry, but you don't have permission to call !"));
		  			logger.warn("RESP 'error_call' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
  				}
		  	break;
		  	case actions.ACTION_HANGUP:
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
				logger.info("ACTION_HANGUP chStat = " + sys.inspect(chStat))
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
				// create hangup action for asterisk server
                                var actionHangup = {
                                        Action: 'Hangup',
                                        Channel: ch
                                }
				// send action to asterisk
                                am.send(actionHangup, function () {
                                        logger.info("'actionHangup' " + sys.inspect(actionHangup) + " has been sent to AST");
                                })
	  		break;
			case actions.ACTION_HANGUP_SPY:
				logger.info("ACTION_HANGUP_SPY chStat = " + sys.inspect(chStat))
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
                                // send action to asterisk
                                am.send(actionHangupSpy, function () {
                                        logger.info("'actionHangupSpy' " + sys.inspect(actionHangupSpy) + " has been sent to AST");
                                })

			break
	  		case actions.ACTION_LOGOUT:
	  			removeClient(client.sessionId);
	  			if(!testAlreadyLoggedSessionId(client.sessionId)){
			  		logger.info("logged OUT [" + extFrom + "] sessiondId '" + client.sessionId + "'");
			  		client.send(new ResponseMessage(client.sessionId, "ack_logout", "logout has been succesfully"));
			  		logger.info("RESP 'ack_logout' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
			  	}
		  		logger.info(Object.keys(clients).length + " logged in clients");
	  		break;
	  		case actions.ACTION_REDIRECT:
				logger.info("'ACTION_REDIRECT' chStat = " + sys.inspect(chStat))
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
	  				logger.info("check 'redirect' permission for [" + extFrom + "] OK: execute redirect...");	
	  				// get the channel
	  				var ch
					var redirectFromExt = message.redirectFromExt
					var callTo = message.callTo
					var redirectToExt = message.redirectToExt
					for(key in chStat){
						var tempChannel = chStat[key].channel
						if(modop.isChannelIntern(tempChannel)){
							var tempExt = modop.getExtInternFromChannel(tempChannel)
							if(tempExt==redirectFromExt && chStat[key].dialExt==callTo){
								ch = tempChannel
								break
							}
						}
						if(modop.isChannelTrunk(tempChannel) && chStat[key].dialExtUniqueid!=undefined){
							var dialExtUniqueid = chStat[key].dialExtUniqueid
							var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
							if(chStat[key].calleridnum==redirectFromExt && tempExt==callTo){
								ch = tempChannel
								break
							}
						}
					}
		  			// create redirect action for the asterisk server
		  			var actionRedirect = {
						Action: 'Redirect',
						Channel: ch,
						Context: 'from-internal',
						Exten: redirectToExt,
						Priority: 1
					};
					// send action to asterisk
					am.send(actionRedirect, function () {
						logger.info("'actionRedirect' " + sys.inspect(actionRedirect) + " has been sent to AST");
						client.send(new ResponseMessage(client.sessionId, 'ack_redirect'), 'Redirection has been taken');
						logger.info("RESP 'ack_redirect' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					});
		  		}
	  			else{
					logger.info("check 'redirect' permission for [" + extFrom + "] FAILED !");
			  		client.send(new ResponseMessage(client.sessionId, "error_redirect", "Sorry: you don't have permission to redirect !"));
			  		logger.info("RESP 'error_redirect' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
	  			}
	  		break;
	  		case actions.ACTION_SEARCH_CONTACT_PHONEBOOK:
	  			// check if the user has the permission to search contact in phonebook
				var res = profiler.checkActionPhonebookPermit(extFrom);
	  			if(res){
					logger.info("check 'searchContactPhonebook' permission for [" + extFrom + "] OK: search...");
	  				// execute query to search contact in phonebook
	  				var namex = message.namex;
					dataCollector.getContactsPhonebook(namex, function(results){
	  					var resultHTML = createResultSearchContactsPhonebook(results);
	  					var mess = new ResponseMessage(client.sessionId, "search_contacts_results", "received phonebook contacts");
	  					mess.resultHTML = resultHTML;
	  					client.send(mess);
	  					logger.info("RESP 'search_contacts_results' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
	  				});
	  			}
	  			else{
					logger.info("check 'searchContactPhonebook' permission for [" + extFrom + "] FAILED !");
  					client.send(new ResponseMessage(client.sessionId, "error_search_contacts", "Sorry: you don't have permission to search contacts in phonebook !"));
  					logger.info("RESP 'error_search_contacts' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
	  			}
	  		break;
	  		case actions.ACTION_RECORD:
	  			// check if the user has the permission of dial out
				if(profiler.checkActionRecordPermit(extFrom)){
					logger.info("check 'record' permission for [" + extFrom + "] OK: record...");
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
	  				var filename = START_TAG_FILENAME + message.callFromExt + "-" + message.callToExt + "-" + yyyyMMdd + "-" + hhmmss + "-" + uniqueid; 
	  				// create record action for asterisk server
			  		var actionRecord = {
						Action: 'Monitor',
						Channel: channel,
						File: filename,
						Mix: 1
					};
					var callFromInternTypeExt = modop.getInternTypeExtFromChannel(channel)
					var callToInternTypeExt = modop.getInternTypeExtFromChannel(destChannel)
					// send action to asterisk
					am.send(actionRecord, function () {
						logger.info("'actionRecord' " + sys.inspect(actionRecord) + " has been sent to AST");
						var msgstr = 'Recording of call ' + filename + ' started...';
						var msg = new ResponseMessage(client.sessionId, 'ack_record', msgstr);
						msg.extRecord = callFromExt;
						client.send(msg);
						logger.info("RESP 'ack_record' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
						logger.info(msgstr);
						// update info
						chStat[uniqueid].record = 1
						chStat[destUniqueid].record = 1
						if(modop.isTypeExtPresent(callFromInternTypeExt)){
							modop.updateCallConnectedUniqueidInternWithTypeExt(callFromInternTypeExt, uniqueid, chStat[uniqueid])
							updateAllClientsForOpWithTypeExt(callFromInternTypeExt)
						}
						if(modop.isTypeExtPresent(callToInternTypeExt)){
							modop.updateCallConnectedUniqueidInternWithTypeExt(callToInternTypeExt, destUniqueid, chStat[destUniqueid])
							updateAllClientsForOpWithTypeExt(callToInternTypeExt)
						}
					});
				}
				else{
					logger.info("check 'record' permission for [" + extFrom + "] FAILED !");
			  		client.send(new ResponseMessage(client.sessionId, "error_record", "Sorry: you don't have permission to record call !"));
			  		log("RESP 'error_record' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
	  			}	
	  		break;
	  		case actions.ACTION_STOP_RECORD:
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
	  			// create stop record action for asterisk server
			  	var actionStopRecord = {
					Action: 'StopMonitor',
					Channel: channel
				};
				var callFromInternTypeExt = modop.getInternTypeExtFromChannel(channel)
                                var callToInternTypeExt = modop.getInternTypeExtFromChannel(destChannel)
				// send action to asterisk
				am.send(actionStopRecord, function () {
					logger.info("'actionStopRecord' " + sys.inspect(actionStopRecord) + " has been sent to AST");
					var msgstr = 'Recording for ' + extFrom + ' stopped';
					client.send(new ResponseMessage(client.sessionId, 'ack_stoprecord', msgstr));
					logger.info("RESP 'ack_stoprecord' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
					// update info
					chStat[uniqueid].record = 0
					chStat[destUniqueid].record = 0
					if(modop.isTypeExtPresent(callFromInternTypeExt)){
                                                modop.updateCallConnectedUniqueidInternWithTypeExt(callFromInternTypeExt, uniqueid, chStat[uniqueid])
                                        	updateAllClientsForOpWithTypeExt(callFromInternTypeExt)
                                        }
                                       	if(modop.isTypeExtPresent(callToInternTypeExt)){
                                                modop.updateCallConnectedUniqueidInternWithTypeExt(callToInternTypeExt, destUniqueid, chStat[destUniqueid])
                                        	updateAllClientsForOpWithTypeExt(callToInternTypeExt)
                                        }
				});
	  		break;
	  		case actions.ACTION_DND_ON:
	  			// create action for asterisk server
	  			var cmd = "database put DND " + extFrom + " 1";
			  	var actionDNDon = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionDNDon, function () {
					logger.info("'actionDNDon' " + sys.inspect(actionDNDon) + " has been sent to AST");
					var msgstr = "[" + extFrom + "] DND ON";
					client.send(new ResponseMessage(client.sessionId, 'ack_dnd_on', msgstr));
					logger.info("RESP 'ack_dnd_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
					// update ext DND status
					modop.updateExtDNDStatusWithExt(extFrom, 'on');
					// update all clients for op
					updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
	  		case actions.ACTION_DND_OFF:
		  		// create action for asterisk server
	  			var cmd = "database del DND " + extFrom;
			  	var actionDNDoff = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionDNDoff, function () {
					logger.info("'actionDNDoff' " + sys.inspect(actionDNDoff) + " has been sent to AST");
					var msgstr = "[" + extFrom + "] DND OFF";
					client.send(new ResponseMessage(client.sessionId, 'ack_dnd_off', msgstr));
					logger.info("RESP 'ack_dnd_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
					// update ext DND status
                                        modop.updateExtDNDStatusWithExt(extFrom, 'off');
					// update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
	  		case actions.ACTION_CW_ON:
	  			// create action for asterisk server
	  			var cmd = "database put CW " + extFrom + " 1";
			  	var actionCWon = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCWon, function () {
					logger.info("'actionCWon' " + sys.inspect(actionCWon) + " has been sent to AST");
					var msgstr = "[" + extFrom + "] CW ON";
					client.send(new ResponseMessage(client.sessionId, 'ack_cw_on', msgstr));
					logger.info("RESP 'ack_cw_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
				});
	  		break;
	  		case actions.ACTION_CW_OFF:
		  		// create action for asterisk server
	  			var cmd = "database del CW " + extFrom;
			  	var actionCWoff = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCWoff, function () {
					logger.info("'actionCWoff' " + sys.inspect(actionCWoff) + " has been sent to AST");
					var msgstr = "[" + extFrom + "] CW OFF";
					client.send(new ResponseMessage(client.sessionId, 'ack_cw_off', msgstr));
					logger.info("RESP 'ack_cw_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
				});
	  		break;
	  		case actions.ACTION_CF_ON:
	  			var extTo = message.extTo;
	  			// create action for asterisk server
	  			var cmd = "database put CF " + extFrom + " " + extTo;
			  	var actionCFon = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCFon, function () {
					logger.info("'actionCFon' " + sys.inspect(actionCFon) + " has been sent to AST")
					var msgstr = "[" + extFrom + "] CF ON to [" + extTo + "]"
					var response = new ResponseMessage(client.sessionId, 'ack_cf_on', msgstr)
					response.extTo = extTo
					client.send(response)
					logger.info("RESP 'ack_cf_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
					// update ext CF status
                                        modop.updateExtCFStatusWithExt(extFrom, 'on', extTo);
                                        // update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
			case actions.ACTION_CF_UNAVAILABLE_ON:
                                var extTo = message.extTo;
                                // create action for asterisk server
                                var cmd = "database put CFU " + extFrom + " " + extTo;
                                var actionCFUnavailableOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                // send action to asterisk
                                am.send(actionCFUnavailableOn, function () {
                                        logger.info("'actionCFUnavailableOn' " + sys.inspect(actionCFUnavailableOn) + " has been sent to AST")
                                        var msgstr = "[" + extFrom + "] CF Unavailable ON to [" + extTo + "]"
                                        var response = new ResponseMessage(client.sessionId, 'ack_cf_unavailable_on', msgstr)
                                        response.extTo = extTo
                                        client.send(response)
                                        logger.info("RESP 'ack_cf_unavailable_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        logger.info(msgstr);
                                });
                        break;
			case actions.ACTION_CF_BUSY_ON:
                                var extTo = message.extTo;
                                // create action for asterisk server
                                var cmd = "database put CFB " + extFrom + " " + extTo;
                                var actionCFBusyOn = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                // send action to asterisk
                                am.send(actionCFBusyOn, function () {
                                        logger.info("'actionCFBusyOn' " + sys.inspect(actionCFBusyOn) + " has been sent to AST")
                                        var msgstr = "[" + extFrom + "] CF Busy ON to [" + extTo + "]"
                                        var response = new ResponseMessage(client.sessionId, 'ack_cf_busy_on', msgstr)
                                        response.extTo = extTo
                                        client.send(response)
                                        logger.info("RESP 'ack_cf_busy_on' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        logger.info(msgstr);
                                });
                        break;
	  		case actions.ACTION_CF_OFF:
		  		// create action for asterisk server
	  			var cmd = "database del CF " + extFrom;
			  	var actionCFoff = {
					Action: 'command',
					Command: cmd
				};
				// send action to asterisk
				am.send(actionCFoff, function () {
					logger.info("'actionCFoff' " + sys.inspect(actionCFoff) + " has been sent to AST");
					var msgstr = "[" + extFrom + "] CF OFF";
					client.send(new ResponseMessage(client.sessionId, 'ack_cf_off', msgstr));
					logger.info("RESP 'ack_cf_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
					// update ext CF status
                                        modop.updateExtCFStatusWithExt(extFrom, 'off');
                                        // update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
				});
	  		break;
			case actions.ACTION_CF_UNAVAILABLE_OFF:
                                // create action for asterisk server
                                var cmd = "database del CFU " + extFrom;
                                var actionCFUnavailableOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                // send action to asterisk
                                am.send(actionCFUnavailableOff, function () {
                                        logger.info("'actionCFUnavailableOff' " + sys.inspect(actionCFUnavailableOff) + " has been sent to AST");
                                        var msgstr = "[" + extFrom + "] CF Unavailable OFF";
                                        client.send(new ResponseMessage(client.sessionId, 'ack_cf_unavailable_off', msgstr));
                                        logger.info("RESP 'ack_cf_unavailable_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        logger.info(msgstr);
                                });
                        break;
			case actions.ACTION_CF_BUSY_OFF:
                                // create action for asterisk server
                                var cmd = "database del CFB " + extFrom;
                                var actionCFBusyOff = {
                                        Action: 'command',
                                        Command: cmd
                                };
                                // send action to asterisk
                                am.send(actionCFBusyOff, function () {
                                        logger.info("'actionCFBusyOff' " + sys.inspect(actionCFBusyOff) + " has been sent to AST");
                                        var msgstr = "[" + extFrom + "] CF Busy OFF";
                                        client.send(new ResponseMessage(client.sessionId, 'ack_cf_busy_off', msgstr));
                                        logger.info("RESP 'ack_cf_busy_off' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        logger.info(msgstr);
                                });
                        break;
			case actions.ACTION_GET_DAY_HISTORY_CALL:
				// check if the user has the permission to get the history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
					logger.info("check 'dayHistoryCall' permission for [" + extFrom + "] OK: get day history call...");
					// format date for query sql
					var dateFormat = formatDate(message.date);					
                                        // execute query to search contact in phonebook
                                        dataCollector.getDayHistoryCall(extFrom, dateFormat, function(results){
                                                var mess = new ResponseMessage(client.sessionId, "day_history_call", "received day history call");
                                                mess.results = createHistoryCallResponse(results);
                                                client.send(mess);
                                                logger.info("RESP 'day_history_call' (" + results.length + " entries) has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        });
                                }
                                else{
					logger.info("check 'dayHistoryCall' permission for [" + extFrom + "] FAILED !");
                                        client.send(new ResponseMessage(client.sessionId, "error_day_history_call", "Sorry: you don't have permission to view day history call !"));
                                        logger.info("RESP 'error_day_history_call' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                }
                        break;
			case actions.ACTION_GET_CURRENT_WEEK_HISTORY_CALL:
                                // check if the user has the permission to get history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
					logger.info("check 'currentWeekHistoryCall' permission for [" + extFrom + "] OK: get current week history call...");
                                        // execute query to search contact in phonebook
                                        dataCollector.getCurrentWeekHistoryCall(extFrom, function(results){
                                                var mess = new ResponseMessage(client.sessionId, "current_week_history_call", "received current week history call");
						mess.results = createHistoryCallResponse(results);
                                                client.send(mess);
                                                logger.info("RESP 'current_week_history_call' (" + results.length + " entries) has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        });
                                }
                                else{
					logger.info("check 'currentWeekHistoryCall' permission for [" + extFrom + "] FAILED !");
                                        client.send(new ResponseMessage(client.sessionId, "error_current_week_history_call", "Sorry: you don't have permission to view current week history call !"));
                                        logger.info("RESP 'error_current_week_history_call' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                }
                        break;
			case actions.ACTION_GET_CURRENT_MONTH_HISTORY_CALL:
                                // check if the user has the permission to get history of calling
				var res = profiler.checkActionHistoryCallPermit(extFrom);
                                if(res){
					logger.info("check 'currentMonthHistoryCall' permission for [" + extFrom + "] OK: get current month history call...");
                                        // execute query to search contact in phonebook
                                        dataCollector.getCurrentMonthHistoryCall(extFrom, function(results){
                                                var mess = new ResponseMessage(client.sessionId, "current_month_history_call", "received current month history call");
						mess.results = createHistoryCallResponse(results);
                                                client.send(mess);
                                                logger.info("RESP 'current_month_history_call' (" + results.length + " entries) has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                        });
                                }
                                else{
					logger.info("check 'currentMonthHistoryCall' permission for [" + extFrom + "] FAILED !");
                                        client.send(new ResponseMessage(client.sessionId, "error_current_month_history_call", "Sorry: you don't have permission to view current month history call !"));
                                        logger.info("RESP 'error_current_month_history_call' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                }
                        break;
			case actions.ACTION_CHECK_CALL_AUDIO_FILE:
				// check if there are some audio file with particular uniqueid
				var uniqueid = message.uniqueid;
				var audioFiles = [];
				fs.readdir(AST_CALL_AUDIO_DIR, function(err, files){					
					if(err){
						logger.error('ERROR reading \'' + AST_CALL_AUDIO_DIR + '\': ' + sys.inspect(err));
						return;
					}
					for(i=0; i<files.length; i++){
						if( (files[i].indexOf(uniqueid))!=-1 )
							audioFiles.push(files[i]);
					}	
					var mess = new ResponseMessage(client.sessionId, "audio_file_call_list", "received list of audio file of call");
	                                mess.results = audioFiles;
	                                client.send(mess);
	                                logger.info("RESP 'audio_file_call_list' (" + audioFiles.length + " files) has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
				});	
                        break;
			case actions.ACTION_GET_PEER_LIST_COMPLETE_OP:
				/* Set the global variables 'extToReturnExtStatusForOp' and 'clientToReturnExtStatusForOp' because 
				 * 'extStatusForOp' is returned to the client when the event 'ParkedCallsComplete' is emitted.
				 */
				extToReturnExtStatusForOp = extFrom;
				clientToReturnExtStatusForOp = client;
				/* send 'ParkedCalls' action to asterisk to update timeout information of parked calls in 'extStatusForOp'.
				 * When 'ParkedCallsComplete' event is emitted, the server return 'extStatusForOp' to the client.
				 * create action for asterisk server */
                                var actionParkedCalls = {
                                        Action: 'ParkedCalls'
                                };
                                // send action to asterisk
                                am.send(actionParkedCalls, function (resp) {
                                        logger.info("'actionParkedCalls' " + sys.inspect(actionParkedCalls) + " has been sent to AST to update timeout of the parked calls");
                                });
                        break;
			case actions.ACTION_PARK:
				var callToPark = message.callToPark;
                                var channel1_toPark = ''; // the extension to be parked
				var channel2 = '';  	  // the extension that has been request the park
                                for(key in am.participants){
                                        if(am.participants[key].number==callToPark)
                                                channel1_toPark = am.participants[key].channel;
					else if(am.participants[key].number==message.callFrom)
						channel2 = am.participants[key].channel;
                                }
				// create action for asterisk server
                                var actionPark = {
                                        Action: 'Park',
					Channel: channel1_toPark,
					Channel2: channel2
                                };
                                // send action to asterisk
                                am.send(actionPark, function (resp) {
					logger.info("'actionPark' " + sys.inspect(actionPark) + " has been sent to AST");
					// create message
	                                var msgstr = "received acknowledgment for parking the call";
	                                var mess = new ResponseMessage(client.sessionId, "ack_park", msgstr);
	                                client.send(mess);
	                                logger.info("RESP 'ack_park' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
                                });
			break;
			case actions.ACTION_SPY_LISTEN:
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
				var actionSpyListen = {
					Action: 'Originate',
					Channel: 'SIP/' + extFrom,
					Application: 'ChanSpy',
					Data: channelToSpy,
					Callerid: SPY_PREFIX + extToSpy
				};
				// send spy action to the asterisk server
				am.send(actionSpyListen, function(){
					logger.info("'actionSpyListen' " + sys.inspect(actionSpyListen) + " has been sent to AST");
				});
			break;
			case actions.ACTION_PICKUP:
				logger.info("chStat = " + sys.inspect(chStat))
                                var callerExt = message.callerExt
				var callTo = message.callTo
                        	var channel = ''
				for(key in chStat){
					var tempCh = chStat[key].channel
					if(modop.isChannelIntern(tempCh)){
						var tempExt = modop.getExtInternFromChannel(tempCh)
						if(tempExt==callerExt && chStat[key].dialExt==callTo){
							channel = tempCh
							break
						}
					} else if(modop.isChannelTrunk(tempCh) && chStat[key].dialExtUniqueid!=undefined){
						var dialExtUniqueid = chStat[key].dialExtUniqueid
						var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
						if(chStat[key].calleridnum==callerExt && tempExt==callTo){
							channel = tempCh
							break
						}
					}
				}
                                // create action to pickup the call. It is realized with redirect action 
                                var actionPickup = {
                                       Action: 'Redirect',
                                       Channel: channel,
                                       Context: 'from-internal',
                                       Exten: extFrom,
                                       Priority: 1
				};
                                // send the action to the asterisk server
                                am.send(actionPickup, function(){
					logger.info("'actionPickup' " + sys.inspect(actionPickup) + " has been sent to AST");
                                });
                        break;
			case actions.ACTION_SPY_LISTEN_SPEAK:
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
                                var actionSpyListenSpeak = {
                                        Action: 'Originate',
                                        Channel: 'SIP/' + extFrom,
                                        Application: 'ChanSpy',
                                        Data: channelToSpy + ',w',
                                        Callerid: SPY_PREFIX + extToSpy
                                };
                                // send spy action to the asterisk server
                                am.send(actionSpyListenSpeak, function(){
					logger.info("'actionSpyListenSpeak' " + sys.inspect(actionSpyListenSpeak) + " has been sent to AST");
                                });
                        break;
			case actions.ACTION_REDIRECT_VOICEMAIL:
                                var extTo = message.extTo;
				var callFromExt = message.callFromExt;
                                var channel = '';
                                for(key in am.participants){
	                                if(am.participants[key].number==callFromExt)
        	        	        	channel = am.participants[key].channel;
                                }
                                // create action to spy channel
				var actionRedirectVoicemail = {
					Action: 'Redirect',
					Channel: channel,
					Context: 'ext-local',
					Exten: 'vmu' + extTo,
					Priority: 1
				}
                                // send spy action to the asterisk server
                                am.send(actionRedirectVoicemail, function(){
					logger.info("'actionRedirectVoicemail' " + sys.inspect(actionRedirectVoicemail) + " has been sent to AST");
                                });
                        break;
			case actions.ACTION_REDIRECT_VOICEMAIL_FROM_OP:
				var callFrom = message.callFrom
				var callTo = message.callTo
				var redirectToExt = message.redirectToExt
				var ch
				for(key in chStat){
					var tempChannel = chStat[key].channel
					if(modop.isChannelIntern(tempChannel)){
						var tempExt = modop.getExtInternFromChannel(tempChannel)
						if(tempExt==callFrom && chStat[key].dialExt==callTo){
							ch = tempChannel
							break
						}
					} else if(modop.isChannelTrunk(tempChannel)){
						var dialExtUniqueid = chStat[key].dialExtUniqueid
						var tempExt = modop.getExtInternFromChannel(chStat[dialExtUniqueid].channel)
						if(chStat[key].calleridnum==callFrom && tempExt==callTo){
							ch = tempChannel
							break
						}
					}
					else if(chStat[key].channel.indexOf('callFrom')!=-1 && chStat[key].dialExt==callTo){
						ch = chStat[key].channel
						break
					}
				}
				// create action to spy channel
                                var actionRedirectVoicemailToExt = {
                                        Action: 'Redirect',
                                        Channel: ch,
                                        Context: 'ext-local',
                                        Exten: 'vmu' + redirectToExt,
                                        Priority: 1
                                }
                                // send spy action to the asterisk server
                                am.send(actionRedirectVoicemailToExt, function(){
                                        logger.info("'actionRedirectVoicemailToExt' " + sys.inspect(actionRedirectVoicemailToExt) + " has been sent to AST");
                                })
                        break;
	  		default:
	  			logger.warn("ATTENTION: received unknown ACTION '" + action + "': not supported");
	  		break;
	  	}
  	});

  	client.on('disconnect', function(){
  		logger.info("EVENT 'Disconnected': WebSocket client '" + client.sessionId + "' disconnected");
  		removeClient(client.sessionId);
  		if(!testAlreadyLoggedSessionId(client.sessionId))
  			logger.info("removed client sessionId '" + client.sessionId + "' from clients");
	  	logger.info(Object.keys(clients).length + ' logged in clients');
		printLoggedClients();
  	});
});

/*
 * end of section relative to WebSocket
 ************************************************************************************************/


logger.info("connection to asterisk server...");
am.connect();





/************************************************************************************************
 * Section relative to functions
 */


/* This function update all clients with the new state of the extension, givin typeext. 
 * This sent is used by the clients to update operator panel.
 * Example of 'typeext' is: SIP/500 */ 
function updateAllClientsForOpWithTypeExt(typeext){
	// get new state of the extension typeext
	logger.info('FUNCTION \'updateAllClientsForOpWithTypeExt(typeext)\': \'modop.getExtStatusWithTypeExt(typeext)\' with typeext = ' + typeext);
	var newState = modop.getExtStatusWithTypeExt(typeext);	
	logger.info('obtained newState: ' + sys.inspect(newState));
	// send update to all clients with the new state of the typeext for op (operator panel)
	logger.info('update all clients (with typeext)...');
        for(key in clients){
                var c = clients[key];
                var msg = "state of " + newState.Label + " has changed: update ext new state";
                var response = new ResponseMessage(c.sessionId, "update_ext_new_state_op", msg);
                response.extNewState = newState;
                c.send(response);
                logger.info("RESP 'update_ext_new_state_op' has been sent to client [" + key + "] sessionId '" + c.sessionId + "'");
        }
}

/* This function update all clients with the new state of 'ext'. 
 * So the clients can update their operator panel.
 * 'ext' must be in the form: '500' */
function updateAllClientsForOpWithExt(ext){
        // get new state of the extension ext
        logger.info('FUNCTION \'updateAllClientsForOpWithExt(ext)\': \'modop.getExtStatusWithExt(ext)\' with ext = \'' + ext + '\'');
        var newState = modop.getExtStatusWithExt(ext);
        logger.info('obtained newState: ' + sys.inspect(newState));
        // send update to all clients with the new state
        logger.info('update all clients (with ext)...');
        for(key in clients){
                var c = clients[key];
                var msg = "state of " + newState.Label + " has changed: update ext new state";
                var response = new ResponseMessage(c.sessionId, "update_ext_new_state_op", msg);
                response.extNewState = newState;
                c.send(response);
                logger.info("RESP 'update_ext_new_state_op' has been sent to [" + key + "] sessionId '" + c.sessionId + "'");
        }
}

/* Tells all clients that extFrom has started a call out from his CTI. So all clients can update
 * their OP with ringing icon. This is because asterisk.js don't generate 'newState' ringing event until
 * the user has pickup his phone */
function sendAllClientAckCalloutFromCti(extFrom){
	logger.info('FUNCTION \'sendAllClientAckCalloutFromCti(extFrom)\' for extFrom [' + extFrom + '] to update ringin ball on OP')
	for(key in clients){
                var c = clients[key]
                var msg = "[" + extFrom + "] has started a callout from CTI"
                var response = new ResponseMessage(c.sessionId, "ack_callout_from_cti", msg)
		response.extFrom = extFrom
                c.send(response)
                logger.info("RESP 'ack_callout_from_cti' has been sent to [" + key + "] sessionId '" + c.sessionId + "'")
        }
}

/* This function create the response for the client with the history call
 * that the client has been requested.
 */
function createHistoryCallResponse(results){
	var res = [];
/*
 * An example of result obtained by the database of history call
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
    ...]
*/
	for(i=0; i<results.length; i++){		
		var currRes = results[i];
		var temp = {};
		temp.date = currRes.date;
		temp.time = currRes.time;
		temp.clid = currRes.clid;
		temp.dst = currRes.dst;
		temp.duration = currRes.duration;
		temp.billsec = currRes.billsec;
		temp.disposition = currRes.disposition;
		temp.uniqueid = currRes.uniqueid;
		if(audioFileList[currRes.uniqueid]!=undefined)
			temp.recording = true;
		else
			temp.recording = false;
		res.push(temp);
	}
	return res;
}

// Format date from gg/mm/yyyy to yyyy-mm-dd
function formatDate(date){
	var ar = date.split('/');	
	var result = ar[2] + "-";
	result += ar[1] + "-";
	result += ar[0];
	return result;
}

// Remove client with specified sessionId
removeClient = function(sessionId){
	for(client in clients){
		if( (clients[client].sessionId)==sessionId )
			delete clients[client];
	}
}

// Check if the user exten already present in memory. 
testAlreadyLoggedExten = function(exten){
	if(clients[exten]!=undefined) return true;
	return false;
}


// Check if the user sessionId already present in memory.
testAlreadyLoggedSessionId = function(sessionId){
	for(client in clients){
		if(clients[client].sessionId==sessionId)
			return true;
	}
	return false;
}

/* Create html code to return to the client after when he receive calling. This code is 
 * the customer card of the calling user */
createCustomerCardHTML = function(customerCard, from){
	// read file
	var htmlTemplate = fs.readFileSync(TEMPLATE_DECORATOR_CUSTOMERCARD_FILENAME, "UTF-8", function(err, data) {
		if(err){
			logger.error("ERROR in reading '" + TEMPLATE_DECORATOR_CUSTOMERCARD_FILENAME + "' (function 'createCustomerCardHTML'): " + sys.inspect(err));
			return;
		}
		return data;
	});
	/* customerCard is undefined if the user that has do the request
  	 * hasn't the relative permission or the calling user is not in the db */
	if(customerCard==undefined){
		customerCard = {};
		customerCard.customerNotInDB = "true";
		customerCard.from = from;
	}
	var template = normal.compile(htmlTemplate);
	customerCard.server_address = "http://" + hostname + ":" + port;
	var toAdd = template(customerCard);
	var HTMLresult = toAdd;		
	return HTMLresult;
}

/* Create the html code for viewing result of searching contacts in phonebook.
 * It read template html file and personalize it with the parameter results. */
function createResultSearchContactsPhonebook(results){
	var HTMLresult = '';
	// read file
	var htmlTemplate = fs.readFileSync(TEMPLATE_DECORATOR_VCARD_FILENAME, "UTF-8", function(err, data) {
		if(err){
			logger.error("ERROR in reading '" + TEMPLATE_DECORATOR_VCARD_FILENAME + "' (function 'createResultSearchContactsPhonebook'): " + sys.inspect(err));
			return;
		}
		return data;
	});
	// repeat htmlTemplate for number of results
	var currentUser = '';
	var temp = '';
	var template = '';
	for(var i=0; i<results.length; i++){
		currentUser = results[i];
		template = normal.compile(htmlTemplate);
		currentUser.server_address = "http://" + hostname + ":" + port;
		temp = template(currentUser);
		HTMLresult += temp;
	}
	return HTMLresult;
}

//
function printLoggedClients(){
	logger.info("logged in clients:");
	for(key in clients)
		logger.info("\t[" + key + "] - IP '" + clients[key].connection.remoteAddress + "' - sessionId '" + clients[key].sessionId + "'");
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
	logger.error("am.participants:");
	logger.error(sys.inspect(am.participants));
	logger.error("extStatusForOp:");
	logger.error(sys.inspect(modop.getExtStatusForOp()));
	logger.error('*********************************************');
});
