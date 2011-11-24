/* This object provides all data structure and operations to simplify 
 * the management of operator panel. This object require asterisk manager
 * to function properly. Is possible to add it with addAsteriskManager function */
var sys = require('sys');
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var log4js = require('./lib/log4js-node/lib/log4js')();
var pathreq = require('path')
var inherits = require("sys").inherits
var EventEmitter = require("events").EventEmitter
var idIntervalRefresh
var refreshChannels = {}
var cacheQueueTypeExt = [];
var intervalUpdateQueueExpired = true;
const FILE_TAB_OP = "config/optab.ini";
const FILE_FASCI_INI = "config/trunks.ini"
const FILE_EXT_LIST = "/etc/asterisk/nethcti.ini";
const FILE_VM = "/etc/asterisk/voicemail_additionals.conf";
const DIAL_FROM = 1;
const DIAL_TO = 0;
const START_RECORD = 1;
const STOP_RECORD = 0;
const VM_PATH_BASE = '/var/spool/asterisk/voicemail/default'
const QUEUE_NAME = 'code';
const INTERNO = 'interno';
/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[Modop]');
/* This is for update CTI on the status of all extensions registered in the asterisk server.
 * The scope for the clients is to create the operator panel with all informations about the extensions.
 * It is created by the server at the start and it is update by the server at runtime.
 * The key is the 'ext' and the value is an object with some informations:
 *
 'SIP/500': 
   { Label: '"500 : alessandro"',
     Extension: '500',
     Context: 'from-internal',
     activeLinks: {},
     Voicemail_Context: 'device',
     VoiceMailExt: '*500@from-internal',
     tab: 'interno',
     astdbkey: '500',
     status: 'OK (1 ms)',
     dndStatus: 'on',
     cfStatus: 'off',
     cfStatusToExt: '' }, */
var extStatusForOp = {};
/* This is the list of tab to view or not in the operator panel of the clients.
 * It has the same structure as the configuration file optab.ini, with key equal
 * to section names, and the value the object that reports keywords of the section */
var tabOp = {};
var am = undefined; // asterisk manager
var controller; // controller
var listExtActiveVM = {}; // list of extensions that has active voicemail
/* create action for asterisk server that generate series of 'QueueMember' events
 * to add informations if the extension is present in some queue */
var actionQueueStatus = {
	Action: 'QueueStatus'
};
// Constructor 
exports.Modop = function(){
	EventEmitter.call(this)
	self = this
	/* initialize the list of tabs to view in the operator panel by reading 
	 * configuration file 'optab.ini' */
	initTabOp();
	this.addAsteriskManager = function(amanager) { addAsteriskManager(amanager); }
	this.initExtStatusForOp = function(){ initExtStatusForOp(); }
	this.getExtStatusForOp = function() { return extStatusForOp; }
	this.updateExtStatusForOpWithTypeExt = function(typeext, status) { updateExtStatusForOpWithTypeExt(typeext, status);  }  // example of typeext is SIP/500
	this.getExtStatusWithTypeExt = function(typeext) { return getExtStatusWithTypeExt(typeext); }
	this.updateExtStatusForOpWithExt = function(ext, status) { updateExtStatusForOpWithExt(ext, status); } // example of ext is 500
	this.getExtStatusWithExt = function(ext) { return getExtStatusWithExt(ext); }
	this.updateExtDNDStatusWithExt = function(ext, value) { updateExtDNDStatusWithExt(ext, value); }
	this.updateExtCFStatusWithExt = function(ext, value, extTo) { updateExtCFStatusWithExt(ext, value, extTo); }
	this.getTabOp = function() { return tabOp; }
	this.updateExtStatusOpDialFrom = function(ext, extTo) { updateExtStatusOpDialFrom(ext, extTo); }
	this.updateExtStatusOpDialTo = function(ext, extFrom) { updateExtStatusOpDialTo(ext, extFrom); }
	this.updateParkExtStatus = function(parking, uniqueid, extParked, parkFrom, timeout) { updateParkExtStatus(parking, uniqueid, extParked, parkFrom, timeout); }
	this.updateEndParkExtStatus = function(parking) { updateEndParkExtStatus(parking); }
	this.updateVMCountWithExt = function(ext, count) { updateVMCountWithExt(ext,count) }
	this.isExtPresent = function(ext) { return isExtPresent(ext) }
	this.isTypeExtPresent = function(typeext) { return isTypeExtPresent(typeext) }
	this.addActiveLinkExt = function(ext, ch1, ch2) { addActiveLinkExt(ext, ch1, ch2) }
	this.removeActiveLinkExt = function(ext, ch) { removeActiveLinkExt(ext, ch) }
	this.setCurrentActiveLink = function(ext, ch) { setCurrentActiveLink(ext, ch) }
	this.isExtInterno = function(ext) { return isExtInterno(ext) }
	this.addController = function(contr) { addController(contr) }
	this.updateLastDialExt = function(ext) { updateLastDialExt(ext) }
	this.updateDialExt = function(ext, fromNum) { updateDialExt(ext, fromNum) }
	this.isTypeExtFascio = function(typeext) { return isTypeExtFascio(typeext) }
	this.isChannelTrunk = function(ch) { return isChannelTrunk(ch) }
	this.updateTrunkStatusWithChannel = function(ch, stat) { updateTrunkStatusWithChannel(ch, stat) }
	this.hasTrunkCallConnectedUniqueidWithChannel = function(ch, uniqueid) {  return hasTrunkCallConnectedUniqueidWithChannel(ch, uniqueid) }
	this.hasTrunkCallConnectedUniqueidWithTypeExt = function(typeExt, uniqueid) { return hasTrunkCallConnectedUniqueidWithTypeExt(typeExt, uniqueid) }
	this.hasTrunkDialingUniqueidWithTypeExt = function(typeExt, uniqueid) { return hasTrunkDialingUniqueidWithTypeExt(typeExt, uniqueid) }
	this.addCallConnectedUniqueidTrunkWithChannel = function(ch, uniqueid) { addCallConnectedUniqueidTrunkWithChannel(ch, uniqueid) }
	this.addCallConnectedUniqueidTrunkWithTypeExt = function(typeExt, uniqueid, chValue) { addCallConnectedUniqueidTrunkWithTypeExt(typeExt, uniqueid, chValue) }
	this.addDialingUniqueidTrunkWithTypeExt = function(typeExt, uniqueid, chValue) { addDialingUniqueidTrunkWithTypeExt(typeExt, uniqueid, chValue) }
	this.getTrunkTypeExtFromChannel = function(ch) { return getTrunkTypeExtFromChannel(ch) }
	this.removeCallConnectedUniqueidTrunkWithTypeExt = function(typeExt, uniqueid) { removeCallConnectedUniqueidTrunkWithTypeExt(typeExt, uniqueid) }
	this.removeDialingUniqueidTrunkWithTypeExt = function(typeExt, uniqueid) { removeDialingUniqueidTrunkWithTypeExt(typeExt, uniqueid) }
	this.isChannelIntern = function(ch) { return isChannelIntern(ch) }
	this.isExtGroup = function(ext) { return isExtGroup(ext) }
	this.getExtInternFromChannel = function(ch) { return getExtInternFromChannel(ch) }
        this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[Modop]'); logger.setLevel(level); }
	this.getInternTypeExtFromChannel = function(ch) { return getInternTypeExtFromChannel(ch) }
	this.hasInternCallConnectedUniqueidWithTypeExt = function(typeExt, uniqueid) { return hasInternCallConnectedUniqueidWithTypeExt(typeExt, uniqueid) }
	this.addCallConnectedUniqueidInternWithTypeExt = function(typeExt, uniqueid, chValue) { addCallConnectedUniqueidInternWithTypeExt(typeExt, uniqueid, chValue) }
	this.removeCallConnectedUniqueidInternWithTypeExt = function(typeExt, uniqueid) { removeCallConnectedUniqueidInternWithTypeExt(typeExt, uniqueid) }
	this.updateHangupUniqueidInternWithTypeExt = function(typeExt, uniqueid) { updateHangupUniqueidInternWithTypeExt(typeExt, uniqueid) }
	this.addDialingUniqueidInternWithTypeExt = function(typeExt, uniqueid, chValue) { addDialingUniqueidInternWithTypeExt(typeExt, uniqueid, chValue) }
	this.removeDialingUniqueidInternWithTypeExt = function(typeExt, uniqueid) { removeDialingUniqueidInternWithTypeExt(typeExt, uniqueid) }
	this.hasInternDialingUniqueidWithTypeExt = function(typeExt, uniqueid) { return hasInternDialingUniqueidWithTypeExt(typeExt, uniqueid) }
	this.updateCallConnectedUniqueidInternWithTypeExt = function(typeExt, uniqueid, chValue) { updateCallConnectedUniqueidInternWithTypeExt(typeExt, uniqueid, chValue) }
	this.updateDialingUniqueidInternWithTypeExt = function(typeExt, uniqueid, chValue) { updateDialingUniqueidInternWithTypeExt(typeExt, uniqueid, chValue) }
	this.getExtFromQueueChannel = function(ch) { return getExtFromQueueChannel(ch) }
	this.setRefreshInterval = function(min) { setRefreshInterval(min) }
	this.stopRefresh = function() { stopRefresh() }
	this.getAllVoicemailStatus = function() { return getAllVoicemailStatus(); }
	this.addUniqueidCallToQueueWithTypeExt = function(queueTypeExt, uniqueid, calleridnum) { addUniqueidCallToQueueWithTypeExt(queueTypeExt, uniqueid, calleridnum);  }
	this.hasQueueUniqueidCallWithTypeExt = function(queueTypeExt, uniqueid) { return hasQueueUniqueidCallWithTypeExt(queueTypeExt, uniqueid); }
	this.removeUniqueidCallFromQueue = function(uniqueid) { return removeUniqueidCallFromQueue(uniqueid); }
	this.getParkedUniqueid = function(parking) { return getParkedUniqueid(parking)}
	this.setUserBareJid = function(ext,bareJid){setUserBareJid(ext,bareJid);}
	this.addQueueWaitingCaller = function(channel,calleridnum,calleridname,waitingTime,queueTypeExt) { addQueueWaitingCaller(channel,calleridnum,calleridname,waitingTime,queueTypeExt); }
	this.addQueueCcCaller = function(ch,ext){return addQueueCcCaller(ch,ext)}
	this.removeQueueCcCaller = function(ch){return removeQueueCcCaller(ch)}
	this.removeQueueWaitingCaller = function(ch){return removeQueueWaitingCaller(ch)}
	this.getInternExtFromQueueChannel = function(ch){ return getInternExtFromQueueChannel(ch) }
	this.updateQueueStatus = function(interval){ updateQueueStatus(interval) }
	this.updatePriorityQueueStatus = function(interval){ updatePriorityQueueStatus() }
	this.getQueueStatus = function(){ return getQueueStatus(); }
}
// Return the status of all queues get from extStatusForOp
function getQueueStatus(){
	var obj = {};
	for(key in extStatusForOp){
		if(extStatusForOp[key].tab==='code'){
			obj[key] = extStatusForOp[key];
		}
	}
	return obj;
}
function updatePriorityQueueStatus(){
	initQueueMembers();
	am.send(actionQueueStatus, function () {
        	logger.debug("'actionQueueStatus' " + sys.inspect(actionQueueStatus) + " has been sent to AST");
	});	
}
/* Execute asterisk action to update queue status. At most it execute one action in one period of time (interval).
 * So, if multiple request arrive simultaneously, only one will be executed */
function updateQueueStatus(interval){
	initQueueMembers();	
	if(intervalUpdateQueueExpired){
		intervalUpdateQueueExpired = false;
		setTimeout(function(){
			intervalUpdateQueueExpired = true;
		}, interval);
	        am.send(actionQueueStatus, function () {
	                logger.debug("'actionQueueStatus' " + sys.inspect(actionQueueStatus) + " has been sent to AST");
	        });
	}
}
function getInternExtFromQueueChannel(ch){ // ex ch = Local/272@from-internal-57dd;1
	return ch.split('@')[0].split('/')[1];
}
function removeQueueWaitingCaller(ch){
	for(var i=0, qtypeExt; qtypeExt=cacheQueueTypeExt[i]; i++){
		if(extStatusForOp[qtypeExt].queueWaitingCaller[ch]!==undefined){
			delete extStatusForOp[qtypeExt].queueWaitingCaller[ch];
			return qtypeExt;
		}
	}
	return undefined;
}
function removeQueueCcCaller(ch){
	for(var i=0, qtypeExt; qtypeExt=cacheQueueTypeExt[i]; i++){
		if(extStatusForOp[qtypeExt].queueCcCaller[ch]!==undefined){
			delete extStatusForOp[qtypeExt].queueCcCaller[ch];
			return qtypeExt;
		}
	}
	return undefined;
}
function addQueueCcCaller(ch,ext){
	for(var i=0, qtypeExt; qtypeExt=cacheQueueTypeExt[i]; i++){
		console.log("qtypeExt = " + qtypeExt);
		if(extStatusForOp[qtypeExt].queueWaitingCaller[ch]!==undefined){
			extStatusForOp[qtypeExt].queueCcCaller[ch] = extStatusForOp[qtypeExt].queueWaitingCaller[ch];
			extStatusForOp[qtypeExt].queueCcCaller[ch].startCcDate = new Date();
			extStatusForOp[qtypeExt].queueCcCaller[ch].ext = ext;
			delete extStatusForOp[qtypeExt].queueWaitingCaller[ch];
			return qtypeExt;
		}
	}
	return undefined;
}
function addQueueWaitingCaller(channel,calleridnum,calleridname,waitingTime,queueTypeExt){
	if(extStatusForOp[queueTypeExt].queueWaitingCaller[channel]===undefined){
		var startWaitingDate = new Date((new Date()).getTime() - (waitingTime*1000));
		extStatusForOp[queueTypeExt].queueWaitingCaller[channel] = {calleridnum: calleridnum, calleridname: calleridname, startWaitingDate: startWaitingDate, waitingTime: waitingTime};
	} else {
		extStatusForOp[queueTypeExt].queueWaitingCaller[channel].waitingTime = waitingTime;
	}
}
function setUserBareJid(ext,bareJid){
	extStatusForOp['SIP/'+ext].bareJid = bareJid;
}
function getParkedUniqueid(parking){ return extStatusForOp['PARK'+parking].parkedUniqueid;}
function removeUniqueidCallFromQueue(uniqueid){
	var queueTypeExt = undefined;
	for(typeExt in extStatusForOp){
		if(extStatusForOp[typeExt].tab==='code' && extStatusForOp[typeExt].listCall[uniqueid]!==undefined){
			queueTypeExt = typeExt;
			delete extStatusForOp[typeExt].listCall[uniqueid];
		}
	}
	return queueTypeExt;
}
function hasQueueUniqueidCallWithTypeExt(queueTypeExt, uniqueid){
	if(extStatusForOp[queueTypeExt].tab==='code' && extStatusForOp[queueTypeExt].listCall[uniqueid]!==undefined){
		return true;
	}
	return false;
}
function addUniqueidCallToQueueWithTypeExt(queueTypeExt, uniqueid, calleridnum){
	if(extStatusForOp[queueTypeExt].tab==='code'){
		extStatusForOp[queueTypeExt].listCall[uniqueid] = calleridnum;
	}
}
function getAllVoicemailStatus(){ return listExtActiveVM; }
function stopRefresh(){
	logger.debug("stop refresh")
	clearInterval(idIntervalRefresh)
}
function setRefreshInterval(min){
	logger.debug("set refresh interval to '" + min + "' min")
	//idIntervalRefresh = setInterval(function(){ refresh() },(min*1000*60)) 
	idIntervalRefresh = setInterval(function(){ refresh() },(min*1000)) 
}
function refresh(){
	refreshChannels = {}
	var actionCoreShowChannels = { Action: 'CoreShowChannels' }
        am.send(actionCoreShowChannels, function () { logger.debug("'actionCoreShowChannels' " + sys.inspect(actionCoreShowChannels) + " has been sent to AST") })
}
function getExtFromQueueChannel(ch){
	// Local/270@from-internal-7f89;1
	if(ch.indexOf('Local/')!=-1 && ch.indexOf('@from-internal-')!=-1 && (ch.indexOf(';2')!=-1 || ch.indexOf(';1')!=-1))
		return ch.split('@')[0].split('/')[1]
}
function removeDialingUniqueidInternWithTypeExt(typeExt, uniqueid){
	delete extStatusForOp[typeExt].dialingUniqueid[uniqueid]
}
function addDialingUniqueidInternWithTypeExt(typeExt, uniqueid, chValue){
	if(extStatusForOp[typeExt].tab===INTERNO){
		extStatusForOp[typeExt].dialingUniqueid[uniqueid] = chValue
		extStatusForOp[typeExt].lastDialingUniqueid = uniqueid
	}
}
function updateHangupUniqueidInternWithTypeExt(typeExt, uniqueid){
	if(extStatusForOp[typeExt].tab===INTERNO)
		extStatusForOp[typeExt].lastHangupUniqueid = uniqueid
}
function getInternTypeExtFromChannel(ch){
	for(key in extStatusForOp)
		if(ch.indexOf(key)!=-1 && extStatusForOp[key].tab===INTERNO)
			return key
}
function getExtInternFromChannel(ch){
	for(key in extStatusForOp)
		if(ch.indexOf(key)!=-1 && extStatusForOp[key].tab===INTERNO)
			return extStatusForOp[key].Extension
}
function isExtGroup(ext){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1 && extStatusForOp[key].tab=='group')
			return true
	}
	return false
}
function removeCallConnectedUniqueidInternWithTypeExt(typeExt, uniqueid){
	if(extStatusForOp[typeExt].tab===INTERNO){
		delete extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]
		extStatusForOp[typeExt].callConnectedCount--
	}
}
function removeDialingUniqueidTrunkWithTypeExt(typeExt, uniqueid){
	if(extStatusForOp[typeExt].tab=='fasci'){
		delete extStatusForOp[typeExt].dialingUniqueid[uniqueid]
	}
}
function removeCallConnectedUniqueidTrunkWithTypeExt(typeExt, uniqueid){
	if(extStatusForOp[typeExt].tab=='fasci'){
		delete extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]
		extStatusForOp[typeExt].callConnectedCount--
	}
}
// return typeext if the passed channel is a trunk
function getTrunkTypeExtFromChannel(ch){
	for(key in extStatusForOp)
		if( ch.indexOf(key)!=-1 && extStatusForOp[key].tab=='fasci' )
			return key
}
function addCallConnectedUniqueidInternWithTypeExt(typeExt, uniqueid, chValue){
	if(extStatusForOp[typeExt].tab===INTERNO){
		extStatusForOp[typeExt].callConnectedUniqueid[uniqueid] = chValue
		extStatusForOp[typeExt].callConnectedCount++
		extStatusForOp[typeExt].lastCallConnectedUniqueid = uniqueid
	}
}
function updateCallConnectedUniqueidInternWithTypeExt(typeExt, uniqueid, chValue){
	if(extStatusForOp[typeExt].tab===INTERNO)
		extStatusForOp[typeExt].callConnectedUniqueid[uniqueid] = chValue
}
function updateDialingUniqueidInternWithTypeExt(typeExt, uniqueid, chValue){
	if(extStatusForOp[typeExt].tab===INTERNO){
		extStatusForOp[typeExt].dialingUniqueid[uniqueid] = chValue;
	}
}
/* add uniqueid of channel to trunk identified by 'typeExt'. Uniqueid and channel is relative to
 * received 'dialing' event */
function addDialingUniqueidTrunkWithTypeExt(typeExt, uniqueid, chValue){
        if( extStatusForOp[typeExt].tab=='fasci' ){
                extStatusForOp[typeExt].dialingUniqueid[uniqueid] = chValue
        }
}
/* add uniqueid of channel to trunk identified by 'typeExt'. Uniqueid and channel is relative to
 * received 'CallConnected' event */
function addCallConnectedUniqueidTrunkWithTypeExt(typeExt, uniqueid, chValue){
	if( extStatusForOp[typeExt].tab=='fasci' ){
		extStatusForOp[typeExt].callConnectedUniqueid[uniqueid] = chValue
		extStatusForOp[typeExt].callConnectedCount++
	}
}
/* add uniqueid of channel to trunk identified by channel 'ch'. Uniqueid and channel is relative to
 * received 'CallConnected' event */
function addCallConnectedUniqueidTrunkWithChannel(ch, uniqueid){
	for(key in extStatusForOp){
		if( ch.indexOf(key)!=-1 && extStatusForOp[key].tab=='fasci' ){
			extStatusForOp[key].callConnectedUniqueid[uniqueid] = ''
			extStatusForOp[key].callConnectedCount++
		}
	}
}
function hasInternDialingUniqueidWithTypeExt(typeExt, uniqueid){
	if(extStatusForOp[typeExt].tab===INTERNO && extStatusForOp[typeExt].dialingUniqueid[uniqueid]!=undefined ) return true
	return false
}
function hasInternCallConnectedUniqueidWithTypeExt(typeExt, uniqueid){
	if(extStatusForOp[typeExt].tab===INTERNO && extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]!=undefined ) return true
	return false
}
/* check if the trunk identified by 'typeExt' has the uniqueid of the channel relative to
 * received 'dialing' event */
function hasTrunkDialingUniqueidWithTypeExt(typeExt, uniqueid){
        if( extStatusForOp[typeExt].tab=='fasci' && extStatusForOp[typeExt].dialingUniqueid[uniqueid]!=undefined ) return true
        return false
}
/* check if the trunk identified by 'typeExt' has the uniqueid of the channel relative to
 * received 'CallConnected' event */
function hasTrunkCallConnectedUniqueidWithTypeExt(typeExt, uniqueid){
	if( extStatusForOp[typeExt].tab=='fasci' && extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]!=undefined ) return true
	return false
}
/* check if the trunk identified by channel 'ch' has the uniqueid of the channel relative to
 * received 'CallConnected' event */
function hasTrunkCallConnectedUniqueidWithChannel(ch, uniqueid){
	for(key in extStatusForOp){
		if( ch.indexOf(key)!=-1 && extStatusForOp[key].tab=='fasci' )
			if( extStatusForOp[key].callConnectedUniqueid[uniqueid]!=undefined )
				return true
	}
	return false
}
function updateTrunkStatusWithChannel(ch, stat){
	for(key in extStatusForOp){
		if( ch.indexOf(key)!=-1 && extStatusForOp[key].tab=='fasci' ){
			extStatusForOp[key].status = stat
		}
	}
}
function isChannelIntern(ch){
	for(key in extStatusForOp){
		if( ch.indexOf(key)!=-1 && extStatusForOp[key].tab===INTERNO)
			return true
	}
	return false
}
function isChannelTrunk(ch){
	for(key in extStatusForOp){
		if( ch.indexOf(key)!=-1 && extStatusForOp[key].tab=='fasci' )
			return true
	}
	return false
}
function isTypeExtFascio(typeext){ 
	if(extStatusForOp[typeext]!==undefined && extStatusForOp[typeext].tab==='fasci') return true;
	return false;
}
function updateDialExt(ext, fromNum){
	for(key in extStatusForOp)
		if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialExt = fromNum
		}
}
function updateLastDialExt(ext){
	for(key in extStatusForOp)
		if(key.indexOf(ext)!=-1){
			extStatusForOp[key].lastDialExt = extStatusForOp[key].dialExt
			extStatusForOp[key].dialExt = ''
		}
}
function addController(contr){ controller = contr }
function isExtInterno(ext){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			if(extStatusForOp[key].tab===INTERNO)
				return true
		}
	}
	return false
}
function setCurrentActiveLink(ext, ch){
	for(key in extStatusForOp)
		if(key.indexOf(ext)!=-1)
			extStatusForOp[key].currentActiveLink = ch
}

function removeActiveLinkExt(ext, ch){
	for(key in extStatusForOp)
		if(key.indexOf(ext)!=-1){
			var al = extStatusForOp[key].activeLinks
			for(chKey in al){
				if(chKey.indexOf('AsyncGoto/SIP/')!=-1 && chKey.indexOf(ch)!=-1)
					delete extStatusForOp[key].activeLinks[chKey]
			}
			delete extStatusForOp[key].activeLinks[ch]
		}
}

function addActiveLinkExt(ext, ch1, ch2){
	for(key in extStatusForOp)
		if(key.indexOf(ext)!=-1)	
			extStatusForOp[key].activeLinks[ch1] = ch2
}

function isTypeExtPresent(typeext){
	if(extStatusForOp[typeext]!=undefined) return true;
	return false;
}

function isExtPresent(ext){
	for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1)
			return true;
        }
	return false;
}

// update voicemail count of the extension 
function updateVMCountWithExt(ext,count){
	for(key in extStatusForOp){
        	if(key.indexOf(ext)!=-1)
			extStatusForOp[key].voicemailCount = count;
	}
}

// Delete old information of the parked call
function updateEndParkExtStatus(parking){
	delete extStatusForOp[parking].parkedCall;
	delete extStatusForOp[parking].parkFrom;
}

function updateParkExtStatus(parking, uniqueid, extParked, parkFrom, timeout){
	extStatusForOp[parking].parkedUniqueid = uniqueid;
        extStatusForOp[parking].parkedCall = extParked;
        extStatusForOp[parking].parkFrom = parkFrom;
	extStatusForOp[parking].timeout = timeout;
}


/* This function update the status of 'ext' that receive a call. Set his status to 
 * 'dialTo' and add 'dialFromExt' key to its state with the value 'extFrom'. */
function updateExtStatusOpDialTo(ext, extFrom){
        for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialDirection = DIAL_TO;
                        extStatusForOp[key].dialExt = extFrom;
                }
        }
}



/* This function update the status of 'ext' that start the call. Set his 'dialDirection' to 
 * 'dialFrom' and add 'dialToExt' key to its state with the value 'extTo'. */
function updateExtStatusOpDialFrom(ext, extTo){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			extStatusForOp[key].dialDirection = DIAL_FROM;
			extStatusForOp[key].dialExt = extTo;
		}
	}
}

/* update the cf status of extension. In the case it's 'on' it set 
 * also 'cfStatusToExt' */
function updateExtCFStatusWithExt(ext, value, extTo){
	for(key in extStatusForOp){
                if(key.indexOf(ext)!=-1){
			if(value=='off'){
	                        extStatusForOp[key].cfStatus = value;
				extStatusForOp[key].cfStatusToExt = '';
			}
			else if(value=='on'){
				extStatusForOp[key].cfStatus = value;
				extStatusForOp[key].cfStatusToExt = extTo;
			}
                }
        }
}

function updateExtDNDStatusWithExt(ext, value){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){
			if(value=='on' || value=='off')
				extStatusForOp[key].dndStatus = value;
		}
	}
}

// return the value object associated with 'ext' key in the 'extStatusForOp'
function getExtStatusWithExt(ext){
	for(key in extStatusForOp){	
		if(key.indexOf(ext)!=-1)
			return extStatusForOp[key];
	}
}

// example of 'ext' is: 500
function updateExtStatusForOpWithExt(ext, status){
	for(key in extStatusForOp){
		if(key.indexOf(ext)!=-1){	
			extStatusForOp[key].lastStatus = extStatusForOp[key].status;
			extStatusForOp[key].status = status;
		}
	}
}

// return the object value of status associated with 'typeext' key in 'extStatusForOp'
function getExtStatusWithTypeExt(typeext){
	return extStatusForOp[typeext];
}

// Example of 'typeext' is: SIP/500
function updateExtStatusForOpWithTypeExt(typeext, status){
	if(extStatusForOp[typeext]!=undefined){
	        extStatusForOp[typeext].lastStatus = extStatusForOp[typeext].status;
	        extStatusForOp[typeext].status = status;
	}
}

/* This function add asterisk manager to local variable. Then addListener to it and
 * finally initialize 'extStatusForOp' */
function addAsteriskManager(amanager){
	am = amanager;
	addListenerToAm(); // add listeners to asterisk manager to manage extStatusForOp
	/* initialize the status of all extensions ('extStatusForOp') present in the asterisk server.
         * Its scope is to put the right informations to 'extStatusForOp' to help 'proxycti.js'
         * to give correct informations to the clients for viewing the operator panel */
}

// This function add listeners to asterisk manager.
function addListenerToAm(){
	/* This event is generated for each registered user.
	 * This event is triggered after the 'SIPPeers' action has been executed into the asterisk server.
	 * This action is made by 'initExtStatusForOp' function.
	 * This event permit to add status informations about extension, to 'extStatusForOp'.
	 * The status informations are 'dndStatus', 'cfStatus' and 'status'. In the case 'cfStatus' is 'on',
	 * then it report also 'cfStatusExtTo' information, to know the extension setted for call forwarding.
	 *
	'PeerEntry' event: { event: 'PeerEntry',
	  actionid: 'cti_SIPPeers_action',
	  channeltype: 'SIP',
	  objectname: '501',
	  chanobjecttype: 'peer',
	  ipaddress: '-none-',
	  ipport: '0',
	  dynamic: 'yes',
	  natsupport: 'yes',
	  videosupport: 'yes',
	  textsupport: 'no',
	  acl: 'yes',
	  status: 'UNKNOWN',
	  realtimedevice: 'no' } 
	*
	'PeerEntry' event: { event: 'PeerEntry',
	  actionid: 'cti_SIPPeers_action',
	  channeltype: 'SIP',
	  objectname: '2002',
	  chanobjecttype: 'peer',
	  ipaddress: '-none-',
	  ipport: '5060',
	  dynamic: 'yes',
	  natsupport: 'no',
	  videosupport: 'yes',
	  textsupport: 'no',
	  acl: 'no',
	  status: 'UNKNOWN',
	  realtimedevice: 'no' }
	* 
	'PeerEntry' event: { event: 'PeerEntry',
	  channeltype: 'IAX2',
	  chanobjecttype: 'peer',
	  objectname: 'villa/from-villa',
	  ipaddress: '79.38.61.136',
	  ipport: '4569',
	  dynamic: 'no',
	  status: 'OK (125 ms)' } */
	am.addListener('peerentry', function(headers) {
		//logger.info("'PeerEntry' event: " + sys.inspect(headers))
	        var ext = headers.objectname;
	        var status = headers.status;
	        logger.debug("EVENT 'PeerEntry': ext [" + ext + "], status '" + status + "'");
	        var dndStatus = '';
	        var cfStatus = '';
	        var cfStatusToExt = '';
		/* ATTENTION:
		 * This check is for an error that is generated only in nethservice and not in development environment.
		 * In nethservice machine arrive 'PeerEntry' event that has entries as: 'objectname: ranocchilab/from-neth'.
		 * The 'typeext' generated below to access 'extStatusForOp' is constructed with this 'objectname', but in 'extStatusForOp'
		 * there aren't any key with 'IAX2/something/something', because 'extStatusForOp' is initially created considering 
		 * 'nethcti.ini' file generated from perl script and in this file there are more IAX2 entries as 'IAX2/something' and not
		 * 'IAX2/something/something'. So this line of code consider only the first part: 'IAX2/something' */
		if(headers.channeltype=='IAX2'){
			ext = headers.objectname.split("/")[0];
		}
	        var typeext = headers.channeltype + "/" + ext;
		// set status	
		updateExtStatusForOpWithTypeExt(typeext, status);
		if(extStatusForOp[typeext]==undefined){
			logger.warn("extStatusForOp[" + typeext + "] is undefined: " + extStatusForOp[typeext])
		} else {
			extStatusForOp[typeext].chType = headers.channeltype;
			extStatusForOp[typeext].ip = headers.ipaddress;
		}
		/* Check for the DND and CF status of current ext.
	         * This is made beacuse 'PeerEntry' event don't report the DND and CF status, and so
	         * it can be possibile to correctly update 'extStatusForOp' */
	        // create action DND for asterisk server
	        var cmd = "database get DND " + ext;
	        var actionCheckDNDStatus = {
	                Action: 'command',
	                Command: cmd
	        };
        	// send action to asterisk
	        am.send(actionCheckDNDStatus, function (resp) {
	                if(resp.value==undefined) dndStatus = 'off';
	                else dndStatus = 'on';
	                // set the status informations to ext of extStatusForOp
	                extStatusForOp[typeext].dndStatus = dndStatus;
	        });
	        // create action CF for asterisk server
	        var cmd = "database get CF " + ext;
	        var actionCheckCFStatus = {
	                Action: 'command',
	                Command: cmd
	        };
		// send action to asterisk
	        am.send(actionCheckCFStatus, function (resp) {
	                if(resp.value==undefined) 
				cfStatus = 'off';
	                else{
	                        cfStatus = 'on';
	                        cfStatusToExt = resp.value.split('\n')[0];
	                }
	                // set the status informations to ext of extStatusForOp
	                extStatusForOp[typeext].cfStatus = cfStatus;
	                extStatusForOp[typeext].cfStatusToExt = cfStatusToExt;
	        });
		/* Check for the presence of voicemail.
                 * This is made beacuse 'PeerEntry' event don't report this information, and so
                 * it can be possibile to correctly update 'extStatusForOp'.
		 * This piece of code can be optimized obtaining the only mailbox status for
		 * that extension obtained with command 'voicemail show users' */
		// create action for asterisk server
                var actionMailboxCount = {
                        Action: 'MailboxCount',
                        Mailbox: ext
                };
		// send action to asterisk
                am.send(actionMailboxCount, function (resp) {
			var newMsgCount = resp.newmessages;
			extStatusForOp[typeext].voicemailCount = newMsgCount;
                });
		// if the ext is an 'interno' then add to controller the directory of voicemail to controll
		if(isExtInterno(ext)){
			var pathDir = VM_PATH_BASE + '/' + ext + '/INBOX'
			pathreq.exists(pathDir, function(exists){
				if(exists)
					controller.addVMDir(pathDir)
			})
		}
	});	

	/* This event is triggered when 'PeerEntry' event is emitted for each user registered in asterisk.
	 * So, the initialization of 'extStatusForOp' can be completed */
	am.addListener('peerlistcomplete', function(){
	        logger.debug("PeerListComplete event");
	});

	/* This event is necessary to add information of queue membership to extension status
	 * 
	 'QueueMember' event: { event: 'QueueMember',
	  queue: '401',
	  name: 'Local/202@from-internal/n',
	  location: 'Local/202@from-internal/n',
	  membership: 'dynamic',
	  penalty: '0',
	  callstaken: '0',
	  lastcall: '0',
	  status: '1',
	  paused: '0',
	  actionid: '1308578822527' } */
	am.addListener('queuemember', function(headers){
		//logger.debug("'QueueMember' event: [" + ext + "] belongs to queue '" + queue + "': " + sys.inspect(headers));
		var ext = headers.name.split("@")[0].split('/')[1];
		var queue = headers.queue;
		extStatusForOp['SIP/'+ext].queue = queue;
		extStatusForOp['QUEUE/'+queue].member[ext] = '';
	});
	am.addListener('queueentry', function(headers){
		logger.info("'QueueEntry' event: " + sys.inspect(headers));
		addQueueWaitingCaller(headers.channel,headers.calleridnum,headers.calleridname,headers.wait,'QUEUE/'+headers.queue);
	});

	/* EVENT 'CtiResultCoreShowChannels': headers = { channel: 'SIP/209-000000a1',
	  uniqueid: '1310544816.345',
	  context: 'macro-dial',
	  extension: 's',
	  priority: '1',
	  channelstate: '6',
	  channelstatedesc: 'Up',
	  application: 'AppDial',
	  applicationdata: '(Outgoing Line)',
	  calleridnum: '209',
	  duration: '00:01:11',
	  accountcode: '',
	  bridgedchannel: 'Local/209@from-internal-080e;2',
	  bridgeduniqueid: '1310544814.334',
	  event: 'CtiResultCoreShowChannels' }
	 *
	 *
	EVENT 'CtiResultCoreShowChannels': headers = { channel: 'SIP/272-0000030f',
	  uniqueid: '1310562416.1628',
	  context: 'from-internal',
	  extension: '272',
	  priority: '1',
	  channelstate: '5',
	  channelstatedesc: 'Ringing',
	  application: 'AppDial',
	  applicationdata: '(Outgoing Line)',
	  calleridnum: '272',
	  duration: '00:00:08',
	  accountcode: '',
	  bridgedchannel: '',
	  bridgeduniqueid: '',
	  event: 'CtiResultCoreShowChannels' }
	 *
	 *
	EVENT 'CtiResultCoreShowChannels': headers = { channel: 'SIP/2004-00000290',
	  uniqueid: '1310558983.1374',
	  context: 'from-pstn',
	  extension: '187',
	  priority: '1',
	  channelstate: '0',
	  channelstatedesc: 'Down',
	  application: 'AppDial',
	  applicationdata: '(Outgoing Line)',
	  calleridnum: '187',
	  duration: '00:00:03',
	  accountcode: '',
	  bridgedchannel: '',
	  bridgeduniqueid: '',
	  event: 'CtiResultCoreShowChannels' }
	*
	*
	EVENT 'CtiResultCoreShowChannels': headers = { channel: 'SIP/271-0000028f',
	  uniqueid: '1310558982.1373',
	  context: 'macro-dialout-trunk',
	  extension: 's',
	  priority: '21',
	  channelstate: '4',
	  channelstatedesc: 'Ring',
	  application: 'Dial',
	  applicationdata: 'SIP/2004/187,300,wWtT',
	  calleridnum: '271',
	  duration: '00:00:04',
	  accountcode: '',
	  bridgedchannel: '',
	  bridgeduniqueid: '',
	  event: 'CtiResultCoreShowChannels' } 
	  *
	* collect active channel in refreshChannels until 'coreshowchannelscomplete' event is emitted */
	am.addListener('ctiresultcoreshowchannels', function(headers){
		logger.debug("EVENT 'CtiResultCoreShowChannels': headers = " + sys.inspect(headers))
		var ch = headers.channel
		var typeExt
		var uniqueid = headers.uniqueid
		var temp
		logger.debug("refreshChannels elements are:")
		for(key in refreshChannels){
			logger.debug("[" + key + "] has " + Object.keys(refreshChannels[key]).length + " channels")
		}
		if(isChannelIntern(ch)){ // intern channel
			logger.debug("channel [" + ch + "] is an intern")
			typeExt = getInternTypeExtFromChannel(ch)
			if(refreshChannels[typeExt]==undefined) refreshChannels[typeExt] = {} // initialize
			logger.debug("add headers to refreshChannels[" + typeExt + "][" + uniqueid + "]")
			refreshChannels[typeExt][uniqueid] = headers
		} else if(isChannelTrunk(ch)){ // truk channel
			logger.debug("channel [" + ch + "] is a trunk")
			typeExt = getTrunkTypeExtFromChannel(ch)
			if(refreshChannels[typeExt]==undefined) refreshChannels[typeExt] = {} // initialize
			logger.debug("add headers to refreshChannels[" + typeExt + "][" + uniqueid + "]")
			refreshChannels[typeExt][uniqueid] = headers
		}
		logger.debug("refreshChannels elements are:")
		for(key in refreshChannels){
			logger.debug("[" + key + "] has " + Object.keys(refreshChannels[key]).length + " channels")
		}
	})
	/* { 'SIP/2004': 
   { '1310563770.1697': 
      { channel: 'SIP/2004-0000032d',
        uniqueid: '1310563770.1697',
        context: 'from-pstn',
        extension: '',
        priority: '1',
        channelstate: '6',
        channelstatedesc: 'Up',
        application: 'AppDial',
        applicationdata: '(Outgoing Line)',
        calleridnum: '187',
        duration: '00:00:55',
        accountcode: '',
        bridgedchannel: 'SIP/271-0000032c',
        bridgeduniqueid: '1310563769.1696',
        event: 'CtiResultCoreShowChannels' } },
  'SIP/271': 
   { '1310563769.1696': 
      { channel: 'SIP/271-0000032c',
        uniqueid: '1310563769.1696',
        context: 'macro-dialout-trunk',
        extension: 's',
        priority: '21',
        channelstate: '6',
        channelstatedesc: 'Up',
        application: 'Dial',
        applicationdata: 'SIP/2004/187,300,wWtT',
        calleridnum: '271',
        duration: '00:00:55',
        accountcode: '',
        bridgedchannel: 'SIP/2004-0000032d',
        bridgeduniqueid: '1310563770.1697',
        event: 'CtiResultCoreShowChannels' } } } 
	* check inconsistencies between refreshChannels (current active channels) and 
	* status of all extensions in extStatusForOp */
	am.addListener('coreshowchannelscomplete', function(headers){
		logger.debug("EVENT 'CoreShowChannelsComplete': headers = " + sys.inspect(headers))
		logger.debug("refreshChannels = " + sys.inspect(refreshChannels))
		// clean extStatusForOp
		for(typeExt in extStatusForOp){
			if(extStatusForOp[typeExt].tab===INTERNO || extStatusForOp[typeExt].tab=='fasci'){
				var refreshCh = refreshChannels[typeExt] // all real active channels for current typeExt
				if(refreshCh==undefined){ // typeExt hasn't any connections, so reset data
					logger.debug("no channels for [" + typeExt + "]: reset it")
					extStatusForOp[typeExt].callConnectedCount = 0
					extStatusForOp[typeExt].callConnectedUniqueid = {}
					extStatusForOp[typeExt].dialingUniqueid = {}
					extStatusForOp[typeExt].lastCallConnectedUniqueid = ''
					extStatusForOp[typeExt].lastDialingUniqueid = ''
					var sta = extStatusForOp[typeExt].status
					if(sta!=undefined && (sta=='ring' || sta=='up' || sta=='ringing'))
						extStatusForOp[typeExt].status = 'ok'
				} else { // check if there is some channel in wrong position: checking in dialingUniqueid and callConnectedUniqueid
					logger.debug("there are refreshCh = " + sys.inspect(refreshCh) + " for typeExt [" + typeExt + "]")
					for(uniqueid in refreshCh){
						var currCh = refreshCh[uniqueid]
						var sta = currCh.channelstatedesc.toLowerCase()
						if(sta=='ring' || sta=='ringing'){
							if(extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]!=undefined){ // check if it is in callConnectedUniqueid
								logger.warn("refresh: there is the active channel '" + sys.inspect(currCh) + "' that is present in extStatusForOp[" + typeExt + "].callConnectedUniqueid, that is " + sys.inspect(extStatusForOp[typeExt].callConnectedUniqueid) + ". So remove it")
								delete extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]
							}
							if(extStatusForOp[typeExt].dialingUniqueid!=undefined && extStatusForOp[typeExt].dialingUniqueid[uniqueid]==undefined){ // check if it is present in dialingUniqueid: it must be present
								logger.warn("refresh: there is the active channel '" + sys.inspect(currCh) + "' that isn't present in extStatusForOp[" + typeExt + "].dialingUniqueid that is: " + sys.inspect(extStatusForOp[typeExt].dialingUniqueid) + ". Update not possible")
							}
						} else if(sta=='up'){
							if(extStatusForOp[typeExt].dialingUniqueid!=undefined && extStatusForOp[typeExt].dialingUniqueid[uniqueid]!=undefined){ // check if it is in dialingUniqueid
								logger.warn("refresh: there is the active channel '" + sys.inspect(currCh) + "' that is present in extStatusForOp[" + typeExt + "].dialingUniqueid, that is " + sys.inspect(extStatusForOp[typeExt].dialingUniqueid) + ". So remove it")
								delete extStatusForOp[typeExt].dialingUniqueid[uniqueid]
							}
							if(extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]==undefined){ // check if it is present in callConnectedUniqueid: it must be present
								logger.warn("refresh: there is the active channel '" + sys.inspect(currCh) + "' that isn't present in extStatusForOp[" + typeExt + "].callConnectedUniqueid that is: " + sys.inspect(extStatusForOp[typeExt].callConnectedUniqueid) + ". Update not possible")
							}
						}
					}
				}
				logger.debug("check if extStatusForOp contains some dialing channels that doesn't exists")
				// check if the extStatusForOp[typeExt] has some channels 'dialingUniqueid' that doesn't exists
				var dialingUniqueid = extStatusForOp[typeExt].dialingUniqueid
				if(dialingUniqueid!=undefined){
					for(uniqueid in dialingUniqueid){
						if(refreshCh[uniqueid]==undefined){
							logger.warn("'refresh: find a dialingUniqueid '" + uniqueid + "that doesn't exits, so remove it")
							delete extStatusForOp[typeExt].dialingUniqueid[uniqueid]
						}
					}
				}
				logger.debug("check if extStatusForOp contains some callConnected channels that doesn't exists")
				// check if the extStatusForOp[typeExt] has some channels 'callConnectedUniqueid' that doesn't exists
				var callConnectedUniqueid = extStatusForOp[typeExt].callConnectedUniqueid
				if(callConnectedUniqueid!=undefined){
					for(uniqueid in callConnectedUniqueid){
						if(refreshCh[uniqueid]==undefined){
							logger.warn("'refresh: find a callConnectedUniqueid '" + uniqueid + "that doesn't exits, so remove it")
							delete extStatusForOp[typeExt].callConnectedUniqueid[uniqueid]
						}
					}
				}
			}
		}
	})
}

// add callConnectedCount = 0 to all trunk
function initCallConnectedCountForTrunk(){
	for(key in extStatusForOp)
		if(extStatusForOp[key].tab=='fasci')
			extStatusForOp[key].callConnectedCount = 0
}
/* add object 'callConnectedUniqueid' to all trunk. This object has 'uniquedid' of callconnected
 * event as a key and an empty string ('') as a value */
function initCallConnectedUniqueidForTrunk(){
	for(key in extStatusForOp)
		if(extStatusForOp[key].tab=='fasci')
			extStatusForOp[key].callConnectedUniqueid = {}
}
// add callConnectedCount = 0 to all intern
function initCallConnectedCountForIntern(){
        for(key in extStatusForOp)
                if(extStatusForOp[key].tab===INTERNO)
                        extStatusForOp[key].callConnectedCount = 0
}
/* add object 'callConnectedUniqueid' to all intern. This object has 'uniquedid' of callconnected
 * event as a key and an empty string ('') as a value */
function initCallConnectedUniqueidForIntern(){
        for(key in extStatusForOp)
                if(extStatusForOp[key].tab===INTERNO)
                        extStatusForOp[key].callConnectedUniqueid = {}
}
function initDialingUniqueidForIntern(){
	for(key in extStatusForOp)
		if(extStatusForOp[key].tab===INTERNO)
			extStatusForOp[key].dialingUniqueid = {}
}
function initDialingUniqueidForTrunk(){
	for(key in extStatusForOp)
		if(extStatusForOp[key].tab=='fasci')
			extStatusForOp[key].dialingUniqueid = {}
}
function initTrunkWithFasciIni(tempFasciIni){
	for(key in extStatusForOp){
		if(extStatusForOp[key].tab=='fasci'){
			var tempLabel = extStatusForOp[key].Label.replace(/['"']/g, "").replace(/[' ']/g, "")
			if(tempFasciIni[tempLabel]!=undefined){
				if(tempFasciIni[tempLabel].label1!=undefined)
					extStatusForOp[key].label1 = tempFasciIni[tempLabel].label1
				if(tempFasciIni[tempLabel].label2!=undefined)
					extStatusForOp[key].label2 = tempFasciIni[tempLabel].label2
			}
		}
	}
}
function initQueueWaitingCaller(){
	for(key in extStatusForOp){
		if(extStatusForOp[key].tab===QUEUE_NAME){
			cacheQueueTypeExt.push(key); // cache of queueTypeExt
			extStatusForOp[key].queueWaitingCaller = {};
		}
	}
}
function initQueueCcCaller(){
	for(key in extStatusForOp){
		if(extStatusForOp[key].tab===QUEUE_NAME){
			extStatusForOp[key].queueCcCaller = {};
		}
	}
}
function initQueueMembers(){
	for(key in extStatusForOp){
		if(extStatusForOp[key].tab===QUEUE_NAME){
			extStatusForOp[key].member = {};
		}
	}
}
/* Initialize 'extStatusForOp'. Initially it read a configuration file that contains list of
 * all extensions. After that it sends the 'SIPPeers' action to the asterisk server. So, it
 * successively receives more 'PeerEntry' events from the asterisk server and at the end it receive
 * 'PeerListComplete' event.
 * The number of 'PeerEntry' event is equal to the number of extensions present in the asterisk server.
 * The receive of one 'PeerEntry' event, allow to add status informations of the extension to 'extStatusForOp' */
function initExtStatusForOp(){
        logger.debug("initialize status of all extensions...");
	extStatusForOp = {}
	// read file where are the list of all extensions
        extStatusForOp = iniparser.parseSync(FILE_EXT_LIST);
	// initialize listExtActiveVM
	var contFileVm = iniparser.parseSync(FILE_VM);
	for(key in contFileVm["default"]){
		listExtActiveVM[key] = "";
	}
	// check if exists FILE_FASCI_INI
	var tempFasciIni = undefined
	if(pathreq.existsSync(FILE_FASCI_INI)){
		tempFasciIni = iniparser.parseSync(FILE_FASCI_INI)
		initTrunkWithFasciIni(tempFasciIni)
	}
	// init trunk
	initCallConnectedCountForTrunk()
	initCallConnectedUniqueidForTrunk()
	initDialingUniqueidForTrunk()
	// init intern
	initCallConnectedUniqueidForIntern()
	initCallConnectedCountForIntern()
	initDialingUniqueidForIntern()
	// init queue
	initQueueWaitingCaller();
	initQueueCcCaller();
	initQueueMembers();
	// create action for asterisk server that generate series of 'PeerEntry' events
        var actionSIPPeersOP = {
                Action: 'SIPPeers'
        };
        // send action to asterisk
        am.send(actionSIPPeersOP, function () {
                logger.debug("'actionSIPPeersOP' " + sys.inspect(actionSIPPeersOP) + " has been sent to AST");
        });
	/* create action for asterisk server that generate series of 'PeerEntry' events
         * to add status informations to 'extStatusForOp' for each IAXPeer */
        var actionIAXPeersOP = {
                Action: 'IAXPeers'
        };
        // send action to asterisk
        am.send(actionIAXPeersOP, function () {
                logger.debug("'actionIAXPeersOP' " + sys.inspect(actionIAXPeersOP) + " has been sent to AST");
        });
        // send action to asterisk
        am.send(actionQueueStatus, function () {
                logger.debug("'actionQueueStatus' " + sys.inspect(actionQueueStatus) + " has been sent to AST");
        });
}

/* This function initialize all tabs to be view in the operator panel, by reading 
 * the configuration file 'optab.ini'
{ interni_commerciali: { extensions: '500,501' },
  trunks: { show: 'yes' },
  queues: { show: 'yes' },
  parking: { show: 'si' } } */
function initTabOp(){ tabOp = iniparser.parseSync(FILE_TAB_OP) }
inherits(exports.Modop, EventEmitter)
