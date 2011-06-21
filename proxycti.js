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
const LOGFILE = './log/proxy.log';
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
}



/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF)
 */
log4js.addAppender(log4js.fileAppender(LOGFILE), '[ProxyCTI]');
var logger = log4js.getLogger('[ProxyCTI]');
logger.setLevel('ALL');




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
var dataCollector = new dataReq.DataCollector();
var authenticator = new authReq.Authenticator();
var controller = new contrReq.Controller(); // check changing in audio directory
var modop = new modopReq.Modop();
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
  uniqueid: '1308662518.892' } */ 
am.addListener('newchannel', function(headers){
	logger.info("EVENT 'NewChannel': headers = " + sys.inspect(headers))
	chStat[headers.uniqueid] = {
		channel: headers.channel
	}
	console.log("'newChannel' chStat = " + sys.inspect(chStat))
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
 EVENT 'NewState': headers '{ event: 'Newstate',
  privilege: 'call,all',
  channel: 'SIP/271-000001c4',
  channelstate: '5',
  channelstatedesc: 'Ringing',
  calleridnum: '',
  calleridname: 'CTI-271',
  uniqueid: '1308579754.556' }' */
am.addListener('newstate', function(headers){
        logger.info("EVENT 'NewState': headers '" + sys.inspect(headers) +  "'")
	chStat[headers.uniqueid].status = headers.channelstatedesc.toLowerCase()
	
	// calleridnum
	if(headers.calleridnum!='') // call come from soft phone
		chStat[headers.uniqueid].calleridnum = headers.calleridnum
	else if(headers.calleridname.indexOf('CTI-')!=-1) // call come from cti
		chStat[headers.uniqueid].calleridnum = headers.calleridname.split('-')[1]

	// calleridname
	chStat[headers.uniqueid].calleridname = headers.calleridname

	// update for OP
	modop.updateExtStatusForOpWithExt(chStat[headers.uniqueid].calleridnum, chStat[headers.uniqueid].status)
	updateAllClientsForOpWithExt(chStat[headers.uniqueid].calleridnum)
	
	console.log("'newState' chStat = " + sys.inspect(chStat))
return












// CODICE VECCHIO CHE NON VIENE ESEGUITO

        var typeext = ''
        if(headers.channel.indexOf('@')==-1){
                typeext = headers.channel.split("-")[0]
        }
        else{
                // return because another 'newState' event is generated for channel 'SIP/271-0000042f' (if the current channel is 'Local/271@from-internal-6f6c;1')
                logger.info('channel \'' + headers.channel + '\' is for queue: return')
                return
        }
        var statusEvent = headers.channelstatedesc.toLowerCase();
        // if the call is a spy call, doesn't warn anyone
        if(headers.calleridname.indexOf(SPY_PREFIX)==-1){
                if(modop.isTypeExtPresent(typeext)){
                        // update ext status for op
                        modop.updateExtStatusForOpWithTypeExt(typeext, statusEvent);
                        // update all clients with the new state of extension, for update operator panel
                        updateAllClientsForOpWithTypeExt(typeext);
                } else
                        logger.warn('[' + typeext + '] is not present in extStatusForOp');
        }

	console.log("'newState' chStat = " + sys.inspect(chStat))
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


// OLDDDDDDDDDDDDDDDDDD
/* Dial FROM '{ name: '',
  number: '270',
  channel: 'SIP/270-000008a9',
  with: '1306940613.3224' }'  -->  TO '{ name: '',
  number: '271',
  channel: 'SIP/271-000008aa',
  with: '1306940616.3225' }'
 *
 * when redirect:
{ name: '',
  number: 'SIP',
  channel: 'AsyncGoto/SIP/270-00000514',
  with: '1307961027.2301' } -> { name: '',
  number: '272',
  channel: 'SIP/272-00000515',
  with: '1307961028.2302' } 
 * 
 * when come from queue:
{ name: '',
  number: '270@from',
  channel: 'Local/270@from-internal-b3f4;2',
  with: '1307961094.2305' } -> { name: '',
  number: '270',
  channel: 'SIP/270-00000517',
  with: '1307961094.2308' }
 *
 * or from trunk:
  FROM '{ name: '',
  number: '541906611',
  channel: 'SIP/2004-00000aac',
  with: '1308554729.5888' }'  -->  TO '{ name: '',
  number: '226',
  channel: 'SIP/226-00000ab0',
  with: '1308554734.5892' }'
 *
 * when call out in a trunk the telnet event is:
 Event: Dial
 Privilege: call,all
 SubEvent: Begin
 Channel: SIP/208-000003b9
 Destination: SIP/UMTS-000003ba
 CallerIDNum: 208
 CallerIDName: Giacomo Sanchietti
 UniqueID: 1308153327.2010
 DestUniqueID: 1308153328.2011
 Dialstring: UMTS/#31#3393164194 */

//NEWWWWWWWWWWWWWWWW
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
  dialstring: 'UMTS/#31#3405567088' }' */ 
am.addListener('dialing', function(headers) {
        logger.info("EVENT 'Dialing': headers '" + sys.inspect(headers) + "'")
console.log("'dialing' chstat = " + sys.inspect(chStat))
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
	  '1308669778.8746': { channel: 'SIP/UMTS-0000104e' } }      (CASE A)  */
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
	// this case is the redirect
	else if(from==undefined && chStat[headers.uniqueid].channel.indexOf('AsyncGoto/SIP/')!=-1 )
		from = chStat[headers.uniqueid].channel.split('-')[0].split('/')[2]
	logger.info("Dialing from '" + from + "' -> '" + to + "'")

	// advise the client that receive the call
	if(to!=undefined && to!='' && modop.isExtPresent(to) && modop.isExtInterno(to)){
		// check the permission of the user to receive the call
                if(!profiler.checkActionCallInPermit(toExt)){
                	logger.info("check 'callIn' permission for [" + toExt + "] FAILED !")
                        return
		}
		var c = clients[to]
		if(c!=undefined){
                        /* in this response the html is not passed, because the chrome desktop 
                         * notification of the client accept only one absolute or relative url */
                        var response = new ResponseMessage(c.sessionId, "dialing", from)
                        response.from = from
                        response.to = to
                        var typesCC = profiler.getTypesCustomerCardPermit(to)
                        logger.info("[" + to + "] is able to view customer card of types: " + sys.inspect(typesCC))
                        if(typesCC.length==0){
                                // the user hasn't the authorization of view customer card, then the length is 0
                                logger.info("check permission to view Customer Card for [" + to + "] FAILED !")
                                response.customerCard = ""
                                response.noPermission = ''
                                c.send(response)
                                logger.info("RESP 'dialing' has been sent to [" + to + "] sessionId '" + c.sessionId + "'")
                                return
                        }
                        var customerCardResult = []
                        for(i=0; i<typesCC.length; i++){
                                dataCollector.getCustomerCard(from, typesCC[i], function(cc){
                                        if(cc!=undefined){
                                                var custCardHTML = createCustomerCardHTML(cc[0], from)
                                                customerCardResult.push(custCardHTML)
                                        } else{
                                                customerCardResult.push(cc)
                                        }
                                        if(customerCardResult.length==typesCC.length){
                                                response.customerCard = customerCardResult
                                                c.send(response)
                                                logger.info("RESP 'dialing' has been sent to [" + to + "] sessionId '" + c.sessionId + "' with relative customer card")
                                        }
                                })
                        }
                }
	}
	// update for OP
	if(from!=undefined && to!=undefined){
		// check if the call come from queue. In this case, the caller (272) has already been update in AgentCalled event
		if(headers.channel.indexOf('Local/')==-1 && headers.channel.indexOf('@from-internal-')==-1 && headers.channel.indexOf(';2')==-1){ 
			if(modop.isExtPresent(from)){
				modop.updateExtStatusOpDialFrom(from, to)
		        	updateAllClientsForOpWithExt(from)
			}
		}
		if(modop.isExtPresent(to)){
	                modop.updateExtStatusOpDialTo(to, from)
	        	updateAllClientsForOpWithExt(to)
		}	
	}
	
return

















// CODICE VECCHIO CHE NON VIENE ESEGUITO
        // check the source of the call: if come from queue, then return because 'AgentCalled' event is emitted
        var ch = from.channel
        var fromExt = ''
        if(ch.indexOf("@from-internal")!=-1){
                logger.info('\'dialing\' come from queue: return')
                // update caller number
                var toExt = headers.dialstring
                var fromNumber = headers.calleridnum
                modop.updateDialExt(toExt, fromNumber)
                return
        }
        else if(ch.indexOf('AsyncGoto/SIP/')!=-1)
                fromExt = from.channel.split('/')[2].split('-')[0]
        else{
                var fromTypeExt = ch.split('-')[0]
                if(modop.isTypeExtPresent(fromTypeExt)){
                        if(modop.getExtStatusWithTypeExt(fromTypeExt).tab=='fasci'){
                                fromExt = from.number
                        } else if(modop.getExtStatusWithTypeExt(fromTypeExt).tab=='interno')
                                fromExt = from.channel.split('-')[0].split('/')[1]
                }
        }
        logger.info("Dial FROM '" + sys.inspect(from) + "'  -->  TO '" + sys.inspect(to) + "' and headers: '" + sys.inspect(headers)  + "'")
        if(to!=undefined){
                var toExt = ''
                /* toExt:
                 * if the call is out in a trunk then, the 'to.channel' is: 'SIP/UMTS-000003ae'
                 * otherwise it can be: 'SIP/272-00000088' */
                var toTypeExt = to.channel.split('-')[0] // 'toTypeExt' has the form: 'SIP/UMTS' or 'SIP/272'
                if(modop.isTypeExtPresent(toTypeExt)){ // the call is out into a trunk
                        if(modop.getExtStatusWithTypeExt(toTypeExt).tab=='fasci'){
                                toExt = headers.dialstring.split('/')[1]  // headers.dialstring is: 'UMTS/#31#3393164194'
                                if(toExt.indexOf('#31#')!=-1) // if it has hidden code, remove it
                                        toExt = toExt.split('#31#')[1]
                        } else if(modop.getExtStatusWithTypeExt(toTypeExt).tab=='interno')
                                toExt = to.channel.split('-')[0].split('/')[1]
                }
        }
})


/* OLD DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
{ event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/272-000004e3',
  uniqueid: '1307958249.2251',
  calleridnum: '272',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' } 
 *
 * or:
 { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/271-000004ff',
  uniqueid: '1307959965.2279',
  calleridnum: '<unknown>',
  calleridname: 'CTI-271',
  cause: '16',
  causetxt: 'Normal Clearing' } 
 *
 * or when call come from queue:
{ event: 'Hangup',
  privilege: 'call,all',
  channel: 'Local/271@from-internal-b48c;1',
  uniqueid: '1307967705.2426',
  calleridnum: '271',
  calleridname: 'Alessandrotest2',
  cause: '0',
  causetxt: 'Unknown' }
  *
  * or when call has been redirect
  EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'AsyncGoto/SIP/270-0000005c<ZOMBIE>',
  uniqueid: '1308146834.135',
  calleridnum: '<unknown>',
  calleridname: '<unknown>',
  cause: '16',
  causetxt: 'Normal Clearing' } */

/* NEWWWWWWWWWWWWWWWWW
* when call come from soft phone:
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
* and
EVENT 'Hangup': headers = { event: 'Hangup',
  privilege: 'call,all',
  channel: 'SIP/270-000002df',
  uniqueid: '1308664818.896',
  calleridnum: '270',
  calleridname: 'Alessandrotest1',
  cause: '16',
  causetxt: 'Normal Clearing' }
'hangup' chStat = {} */
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
	chStat = { '1308664818.896': { channel: 'AsyncGoto/SIP/270-000002df' } } */
	if(chStat[headers.uniqueid].channel.indexOf('Local/')!=-1 && chStat[headers.uniqueid].channel.indexOf('@from-internal-')!=-1 && chStat[headers.uniqueid].channel.indexOf(';1')!=-1 ){
		delete chStat[headers.uniqueid]
	        console.log("'hangup' chStat = " + sys.inspect(chStat))
		return
	}

	// ext
	var ext
	if(chStat[headers.uniqueid].calleridnum!='' && chStat[headers.uniqueid].calleridnum!=undefined ){
		/* '1308643186.683': 
		   { channel: 'SIP/270-00000243',
		     calleridname: '',
		     calleridnum: '270',
		     status: 'up' } } */
		ext = chStat[headers.uniqueid].calleridnum
	}
	else{
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
	delete chStat[headers.uniqueid]
	console.log("'hangup' chStat = " + sys.inspect(chStat))

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
		if(modop.isExtPresent(ext)){
	                modop.updateExtStatusForOpWithExt(ext, 'hangup')
	                modop.updateStopRecordExtStatusForOpWithExt(ext)
	                modop.updateLastDialExt(ext)
	                updateAllClientsForOpWithExt(ext)
	        } else
         	       logger.warn('[' + ext + '] is not present in extStatusForOp')
	} else
		logger.info("discarded event 'hangup' because redirect")

	// TO eliminate data structure of asterisk.js
	//delete am.participants[headers.uniqueid]
        //logger.info('removed \'' + headers.uniqueid  + '\' from am.participants: ' + sys.inspect(am.participants))

return




// CODICE VECCHIO MAI ESEGUITO
        // ext is constructed from channel because other field change with context, for example when call come from cti
        var ch = headers.channel
        var ext = ''
        /* check if the hangup is relative to active channel of the client or not. If not, then is the case of a call the 
         * come from queue and that has been accepted from another client */
        if(ch.indexOf('@from-internal')!=-1){
                logger.info('hangup is relative to \'' + ch  + '\': delete from am.participants and return')
                delete am.participants[headers.uniqueid]
                logger.info('_removed \'' + headers.uniqueid  + '\' from am.participants: ' + sys.inspect(am.participants))
                return
        } else if(ch.indexOf('<ZOMBIE>')!=-1) {
		ext = ch.split('-')[0].split('/')[2]
                ch = ch.split('/')[1] + '/' + ch.split('<ZOMBIE>')[0].split('/')[2]
                modop.removeActiveLinkExt(ext, ch)
                logger.info('hangup is relative to \'' + ch + '\': don\'t advise any clients')
                return
        }
        else {
                ext = ch.split('-')[0].split('/')[1]
                modop.removeActiveLinkExt(ext, ch)
        }
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
*
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
  callerid2: '272' }' */ 
am.addListener('callconnected', function(headers) {
        logger.info("EVENT 'CallConnected': headers = '" + sys.inspect(headers) + "'")
	console.log("'callconnected' chStat = " + sys.inspect(chStat))
	/* when redirect:
	chStat = { '1308664818.896': { channel: 'AsyncGoto/SIP/270-000002df' },
	  '1308664819.897': 
	   { channel: 'SIP/272-000002e0',
	     status: 'up',
	     calleridnum: '272',
	     calleridname: '' } } */
	// check if the call 
	if( headers.callerid1==headers.callerid2 && headers.channel2.indexOf('Local/')!=-1 && headers.channel2.indexOf('@from-internal-')!=-1 && headers.channel2.indexOf(';1')!=-1  ){
		logger.info("discarded event 'callconnected'")
		return
	}
	var from = headers.callerid1
        var to = headers.callerid2
	// advise two clients of call
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


return
// VECCHO CODICE NON ESEGUITO
        var fromExt = ''
        var toExt = ''
        /* In the case that one ext has been redirected, 'from' can be:
         * { name: '',
         *   number: 'SIP',
         *   channel: 'AsyncGoto/SIP/271-000001f1',
         *   with: '1307605551.710' } 
         * 
         * in normal case can be:
         * 
         * { name: '',
         *   number: '272',
         *   channel: 'SIP/272-000001f2',
         *   with: '1307605551.711' } 
         *
         * in the case of queue:
         *
         * FROM '{ name: 'SIP/273',
          number: '273',
          channel: 'SIP/273-000005b0' }' TO '{ name: '',
          number: '271@from',
          channel: 'Local/271@from-internal-805b;1' }' 
         * 
         * or:
          FROM '{ name: '',
          number: '271@from',
          channel: 'Local/271@from-internal-d287;2',
          with: '1307972728.2666' }' TO '{ name: '',
          number: '271',
          channel: 'SIP/271-000005c7',
          with: '1307972728.2668' }' */
        if(from!=undefined){
                if(from.channel.indexOf('AsyncGoto/SIP/')==-1)
                        fromExt = from.channel.split('-')[0].split('/')[1]
                else
                        fromExt = from.channel.split('-')[0].split('/')[2]
        }
        if(to!=undefined){
                if(to.channel.indexOf('AsyncGoto/SIP/')!=-1)
                        toExt = to.channel.split('-')[0].split('/')[2]
                else
                        toExt = to.channel.split('-')[0].split('/')[1]
        }
        if(from!=undefined && modop.isExtPresent(fromExt) && to!=undefined){
		logger.info("add active link to [" + fromExt + "] with ch1 '" + from.channel + "' and ch2 '" + to.channel + "'");
                modop.addActiveLinkExt(fromExt, from.channel, to.channel)
                modop.setCurrentActiveLink(fromExt, from.channel)
                updateAllClientsForOpWithExt(fromExt);
        }
        if(to!=undefined && modop.isExtPresent(toExt) && from!=undefined){
                logger.info("add active link to [" + toExt + "] with ch1 '" + to.channel + "' and ch2 '" + from.channel + "'");
                modop.addActiveLinkExt(toExt, to.channel, from.channel)
                modop.setCurrentActiveLink(toExt, to.channel)
                updateAllClientsForOpWithExt(toExt);
        }
        if(clients[fromExt]!=undefined){
                var c = clients[fromExt];
                var msg = "Call from " + fromExt + " to " + toExt + " CONNECTED";
                var response = new ResponseMessage(c.sessionId, "callconnected", msg);
                response.from = fromExt;
                response.to = toExt;
                c.send(response);
                logger.info("RESP 'callconnected' has been sent to [" + from.number + "] sessionId '" + c.sessionId + "'");
        }
        if(clients[toExt]!=undefined){
                var c = clients[toExt];
                var msg = "Call from " + fromExt + " to " + toExt + " CONNECTED";
                var response = new ResponseMessage(c.sessionId, "callconnected", msg);
                response.from = fromExt;
                response.to = toExt;
                c.send(response);
                logger.info("RESP 'callconnected' has been sent to [" + toExt + "] sessionId '" + c.sessionId + "'");
        }
})



/* OLDDDDDDDDDDDDDDd
{ event: 'AgentCalled',
  privilege: 'agent,all',
  queue: '900',
  agentcalled: 'Local/270@from-internal/n',
  agentname: 'Local/270@from-internal/n',
  channelcalling: 'SIP/272-00000548',
  destinationchannel: 'Local/270@from-internal-1f91;1',
  calleridnum: '272',
  calleridname: 'Alessandrotest3',
  context: 'from-internal',
  extension: '900',
  priority: '10',
  uniqueid: '1307966610.2357' } */

/* NEWWWWWWWWWWWW
EVENT 'AgentCalled': headers = { event: 'AgentCalled',
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
	if(modop.isExtPresent(from)){
		modop.updateExtStatusOpDialFrom(from, headers.queue)
		updateAllClientsForOpWithExt(from)
	}
	
return

// VECCHIO CODICE NON ESEGUITO
	var toExt = headers.destinationchannel.split('@')[0].split('/')[1]
	var c = clients[toExt]
	var fromid = headers.calleridnum
	if(toExt!=undefined && c!=undefined){
		// check the permission of the user to receive the call
                if(!profiler.checkActionCallInPermit(toExt)){
			logger.info("check 'callIn' permission for [" + toExt + "] FAILED !")
                        return
                }
		// create the response for the client
	        var msg = headers.calleridname
		/* in this response the html is not passed, because the chrome desktop 
                 * notification of the client accept only one absolute or relative url */
		var response = new ResponseMessage(c.sessionId, "dialing", msg)
		response.from = fromid
		response.to = toExt
		var typesCC = profiler.getTypesCustomerCardPermit(toExt)
		logger.info("[" + toExt + "] is able to view customer card of types: " + sys.inspect(typesCC))
		if(typesCC.length==0){
                        // the user hasn't the authorization of view customer card: the length is 0
			logger.info("check permission to view Customer Card for [" + toExt + "] FAILED !")
                        response.customerCard = ""
			response.noPermission = ''
                        c.send(response)
			logger.info("RESP 'dialing' has been sent to [" + toExt + "] sessionId '" + c.sessionId + "'")
                        return
                }
		var customerCardResult = []
                for(i=0; i<typesCC.length; i++){
                        dataCollector.getCustomerCard(fromid, typesCC[i], function(cc){
				if(cc!=undefined){
	                                var custCardHTML = createCustomerCardHTML(cc[0], fromid)
	                                customerCardResult.push(custCardHTML)
				} else {
					customerCardResult.push(cc)
				}
                                if(customerCardResult.length==typesCC.length){
                                        response.customerCard = customerCardResult
                                        c.send(response)
					logger.info("RESP 'dialing' has been sent to [" + toExt + "] sessionId '" + c.sessionId + "' with relative customer card")
                                }
                        })
                }
	}
	if(toExt!=undefined){
		if(modop.isExtPresent(fromid)){
	                modop.updateExtStatusOpDialFrom(fromid, headers.queue)
	                updateAllClientsForOpWithExt(fromid)
		}
		if(modop.isExtPresent(toExt)){
	                modop.updateExtStatusOpDialTo(toExt, fromid)
	                updateAllClientsForOpWithExt(toExt)
		}
        }
});

 
























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

	/* Example of 'Peerstatus' event:
	 *
	{ event: 'PeerStatus',
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
				console.log("ACTION_HANGUP chStat = " + sys.inspect(chStat))
				var ch
				for(key in chStat){ // when call come from soft phone
					if(chStat[key].calleridnum==extFrom){
						ch = chStat[key].channel
						break
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
				console.log("'ACTION_REDIRECT' chStat = " + sys.inspect(chStat))
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
					for(key in chStat){
						if(chStat[key].calleridnum==message.redirectFrom){
							ch = chStat[key].channel
							break
						}
					}
		  			// create redirect action for the asterisk server
		  			var actionRedirect = {
						Action: 'Redirect',
						Channel: ch,
						Context: 'from-internal',
						Exten: message.redirectTo,
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
					var uniqueid = '';
					var callFromExt = message.callFromExt;
					// get channel to record. It is always the caller (callFromExt)
	  				for(key in am.participants){
	  					if(am.participants[key].number==callFromExt){
	  						channel = am.participants[key].channel;
							uniqueid = am.participants[key].with;
	  					}
	  				}
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
					// send action to asterisk
					am.send(actionRecord, function () {
						logger.info("'actionRecord' " + sys.inspect(actionRecord) + " has been sent to AST");
						var msgstr = 'Recording of call ' + filename + ' started...';
						var msg = new ResponseMessage(client.sessionId, 'ack_record', msgstr);
						msg.extRecord = callFromExt;
						client.send(msg);
						logger.info("RESP 'ack_record' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
						logger.info(msgstr);
						// update status information for operator panel
						modop.updateStartRecordExtStatusForOpWithExt(message.callFromExt);
						modop.updateStartRecordExtStatusForOpWithExt(message.callToExt);
						// update all clients for op
	                                        updateAllClientsForOpWithExt(message.callFromExt);
	                                        updateAllClientsForOpWithExt(message.callToExt);
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
  				var channel = '';
  				for(key in am.participants){
  					if(am.participants[key].number==extFrom){
  						channel = am.participants[key].channel;
  					}
  				}
	  			// create stop record action for asterisk server
			  	var actionStopRecord = {
					Action: 'StopMonitor',
					Channel: channel
				};
				// send action to asterisk
				am.send(actionStopRecord, function () {
					logger.info("'actionStopRecord' " + sys.inspect(actionStopRecord) + " has been sent to AST");
					var msgstr = 'Recording for ' + extFrom + ' stopped';
					client.send(new ResponseMessage(client.sessionId, 'ack_stoprecord', msgstr));
					logger.info("RESP 'ack_stoprecord' has been sent to [" + extFrom + "] sessionId '" + client.sessionId + "'");
					logger.info(msgstr);
					// update status information for operator panel
                                        modop.updateStopRecordExtStatusForOpWithExt(extFrom);
                                        modop.updateStopRecordExtStatusForOpWithExt(message.extTo);
                                        // update all clients for op
                                        updateAllClientsForOpWithExt(extFrom);
                                        updateAllClientsForOpWithExt(message.extTo);
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
				var extToSpy = message.extToSpy;
                                var channelToSpy = '';
                                for(key in am.participants){
                                        if(am.participants[key].number==extToSpy)
                                                channelToSpy = am.participants[key].channel;
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
                                var callerExt = message.callerExt;
                        	var channel = '';
                                for(key in am.participants){
                                        if(am.participants[key].number==callerExt)
                                                channel = am.participants[key].channel;
                                };
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
                                var extToSpy = message.extToSpy;
                                var channelToSpy = '';
                                for(key in am.participants){
                                        if(am.participants[key].number==extToSpy)
                                                channelToSpy = am.participants[key].channel;
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
