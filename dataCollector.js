var fs = require("fs");
var path = require('path');
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var mysql = require('./lib/node-mysql');
var odbc = require("./lib/node-odbc/odbc");
var log4js = require('./lib/log4js-node/lib/log4js')();
const DATACOLLECTOR_CONFIG_FILENAME = "config/dataprofiles.ini";
const PHONEBOOK = "phonebook";
const CUSTOMER_CARD = "customer_card";
const DAY_HISTORY_CALL = "day_history_call";
var DAY_SWITCHBOARD_CALL = "day_switchboard_call";
var CURRENT_WEEK_SWITCHBOARD_CALL = 'current_week_switchboard_call';
var CURRENT_MONTH_SWITCHBOARD_CALL = 'current_month_switchboard_call';
var INTERVAL_SWITCHBOARD_CALL = "interval_switchboard_call";
const CURRENT_WEEK_HISTORY_CALL = "current_week_history_call";
const CURRENT_MONTH_HISTORY_CALL = "current_month_history_call";
const INTERVAL_HISTORY_CALL = "interval_history_call";
const SMS = "sms";
const CALL_NOTES = "call_notes";
var POSTIT = "postit";
const DB_TABLE_SMS = 'sms_history';
const DB_TABLE_CALLNOTES = 'call_notes';
const CHAT_ASSOCIATION = 'chat_association';
var EXTENSION_INFO = 'extension_info';

/* logger that write in output console and file
 * the level is (ALL) TRACE, DEBUG, INFO, WARN, ERROR, FATAL (OFF) */
var logger = log4js.getLogger('[DataCollector]');

/* this is the list of the queries expressed in the config file: the key is the section name
 * and the value is the all parameter to execute the query.
 *
 * An example:
{ customer_card_default: 
   { dbhost: 'localhost',
     dbport: '3306',
     dbtype: 'mysql',
     dbuser: 'pbookuser',
     dbpassword: 'pbookpass',
     dbname: 'phonebook',
     query: '"select * from phonebook where homephone like \'%$EXTEN\' or workphone like \'%$EXTEN\' or cellphone like \'%$EXTEN\' or fax like \'%$EXTEN\'"' 
   } 
} */
queries = {};

// this is the controller to manage changing in the configuration file of profiles
controller = null;

/* this is a JSON object that has section name of dataProfiles.ini as key and connection objects 
 * to database as the value */
dbConnections = {};

// Constructor 
exports.DataCollector = function(){
	initQueries();
	this.getContactsPhonebook = function(name, cb){ return getContactsPhonebook(name, cb); }
	this.getContactsPhonebookStartsWith = function (name, cb){ return _getContactsPhonebookStartsWith(name, cb); }
	this.getCustomerCard = function(ext, type, cb) { return getCustomerCard(ext, type, cb); }
	this.getDayHistoryCall = function(ext,date,num,cb) { return getDayHistoryCall(ext,date,num,cb); }
	this.getDaySwitchboardCall = function (ext, date, num, cb) { return _getDaySwitchboardCall(ext, date, num, cb); }
	this.getDayHistorySms = function(ext, date, num, cb) { return getDayHistorySms(ext, date, num, cb); }
	this.getDaySwitchboardSms = function(ext, date, num, cb) { return _getDaySwitchboardSms(ext, date, num, cb); }
	this.getDayHistoryCallNotes = function(ext, date, num, cb) { return getDayHistoryCallNotes(ext, date, num, cb); }
	this.getDayPostit = function(ext, date, cb) { return _getDayPostit(ext, date, cb); }
	this.getDaySwitchboardCallNotes = function(ext, date, num, cb) { return _getDaySwitchboardCallNotes(ext, date, num, cb); }
	this.getDaySwitchboardPostit = function (ext, date, cb) { return _getDaySwitchboardPostit(ext, date, cb); }
	this.getCurrentWeekHistoryCall = function(ext, num, cb) { return getCurrentWeekHistoryCall(ext, num, cb); }
	this.getCurrentWeekSwitchboardCall = function(ext, num, cb) { return _getCurrentWeekSwitchboardCall(ext, num, cb); }
	this.getCurrentWeekHistorySms = function(ext, num, cb) { return getCurrentWeekHistorySms(ext, num, cb); }
	this.getCurrentWeekSwitchboardSms = function(ext, num, cb) { return _getCurrentWeekSwitchboardSms(ext, num, cb); }
	this.getCurrentWeekHistoryCallNotes = function(ext, num, cb) { return getCurrentWeekHistoryCallNotes(ext, num, cb); }
	this.getCurrentWeekPostit = function(ext, cb) { return _getCurrentWeekPostit(ext, cb); }
	this.getCurrentWeekSwitchboardCallNotes = function (ext, num, cb) { return _getCurrentWeekSwitchboardCallNotes(ext, num, cb); }
	this.getCurrentWeekSwitchboardPostit = function (ext, cb) { return _getCurrentWeekSwitchboardPostit(ext, cb); }
	this.getCurrentMonthHistoryCall = function(ext, num, cb) { return getCurrentMonthHistoryCall(ext, num, cb); }
	this.getCurrentMonthSwitchboardCall = function(ext, num, cb) { return _getCurrentMonthSwitchboardCall(ext, num, cb); }
	this.getCurrentMonthHistorySms = function(ext, num, cb) { return getCurrentMonthHistorySms(ext, num, cb); }
	this.getCurrentMonthSwitchboardSms = function (ext, num, cb) { return _getCurrentMonthSwitchboardSms(ext, num, cb); }
	this.getCurrentMonthHistoryCallNotes = function(ext, num, cb) { return getCurrentMonthHistoryCallNotes(ext, num, cb); }
	this.getCurrentMonthPostit = function(ext, cb) { _getCurrentMonthPostit(ext, cb); }
	this.getCurrentMonthSwitchboardCallNotes = function (ext, num, cb) { return _getCurrentMonthSwitchboardCallNotes(ext, num, cb); }
	this.getCurrentMonthSwitchboardPostit = function (ext, cb) { return _getCurrentMonthSwitchboardPostit(ext, cb); }
	this.getIntervalHistoryCall = function(ext,dateFrom,dateTo,num,cb){ return getIntervalHistoryCall(ext,dateFrom,dateTo,num,cb); }
	this.getIntervalSwitchboardCall = function (ext, dateFrom, dateTo, num, cb) { return _getIntervalSwitchboardCall(ext, dateFrom, dateTo, num, cb); }
	this.getIntervalHistorySms = function(ext,dateFrom,dateTo,num,cb){ return getIntervalHistorySms(ext,dateFrom,dateTo,num,cb); }
	this.getIntervalSwitchboardSms = function (ext, dateFrom, dateTo, num, cb) { return _getIntervalSwitchboardSms(ext, dateFrom, dateTo, num, cb); }
	this.getIntervalHistoryCallNotes = function(ext,dateFrom,dateTo,num,cb){ return getIntervalHistoryCallNotes(ext,dateFrom,dateTo,num,cb); }
	this.getIntervalPostit = function (ext, dateFrom, dateTo, cb) { return _getIntervalPostit(ext, dateFrom, dateTo, cb); }
	this.getIntervalSwitchboardCallNotes = function (ext, dateFrom, dateTo, num, cb){ return _getIntervalSwitchboardCallNotes(ext,dateFrom,dateTo,num,cb); }
	this.getIntervalSwitchboardPostit = function (ext, dateFrom, dateTo, cb){ _getIntervalSwitchboardPostit(ext, dateFrom, dateTo, cb); }
	this.addController = function(contr) { addController(contr) }
	this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[DataCollector]'); logger.setLevel(level); }
	this.checkAudioUid = function(uid, filename, cb) { return checkAudioUid(uid, filename, cb); }
	this.checkListAudioUid = function(arruid, cb) { return checkListAudioUid(arruid, cb); }
	this.registerSmsSuccess = function(sender, destination, text, cb){ registerSmsSuccess(sender, destination, text, cb); }
	this.registerSmsFailed = function(sender, destination, text, cb){ registerSmsFailed(sender, destination, text, cb); }
	this.saveCallNote = function (obj,cb) { saveCallNote(obj,cb); }
	this.modifyCallNote = function(note,pub,expiration,expFormatVal,entryId,reservation,cb){ modifyCallNote(note,pub,expiration,expFormatVal,entryId,reservation,cb); }
	this.getCallNotes = function(num,cb){ getCallNotes(num,cb); }
	this.getExtCallReserved = function(num,cb){ getExtCallReserved(num,cb); }
	this.getChatAssociation = function(cb){ getChatAssociation(cb); }
	this.insertAndUpdateChatAssociation = function(extFrom,bareJid,cb){ insertAndUpdateChatAssociation(extFrom,bareJid,cb); }
	this.deleteCallNote = function(id,cb) { deleteCallNote(id,cb); }
	this.getQueries = function(){ return getQueries(); }
	this.getAllNotesForNum = function(ext,num,cb){ getAllNotesForNum(ext,num,cb); } 
        this.query = function (type, query, cb) { _query(type, query, cb); }
        this.getAllContactsByNum = function (num, numToSearch, cb) { _getAllContactsByNum(num, numToSearch, cb); }
        this.savePostit = function (obj, cb) { _savePostit(obj, cb); }
        this.getAllUnreadPostit = function (cb) { _getAllUnreadPostit(cb); }
        this.getPostit = function (id, cb) { _getPostit(id, cb); }
        this.setReadPostit = function (id, cb) { _setReadPostit(id, cb); }
        this.deletePostit = function (id, cb) { _deletePostit(id, cb); }
        this.storeNotificationCellphoneAndEmail = function (ext, notificationsInfo, cb) { _storeNotificationCellphoneAndEmail(ext, notificationsInfo, cb); }
        this.updateCellphoneNotificationsModalityForAll = function (ext, value, cb) { _updateCellphoneNotificationsModalityForAll(ext, value, cb); }
        this.updateEmailNotificationsModalityForAll = function (ext, value, cb) { _updateEmailNotificationsModalityForAll(ext, value, cb); }
        this.getEmailNotificationModalityVoicemail = function (ext, cb) { _getEmailNotificationModalityVoicemail(ext, cb); }
        this.getNotificationModalityVoicemail = function (ext, cb) { _getNotificationModalityVoicemail(ext, cb); }
        this.getNotificationModalityNote = function (ext, cb) { _getNotificationModalityNote(ext, cb); }
        this.getCellphoneNotificationsModalityForAll = function (ext, cb) { _getCellphoneNotificationsModalityForAll(ext, cb); }
        this.saveNotificationsSettings = function (ext, settings, cb) { _saveNotificationsSettings(ext, settings, cb); }
        this.getNotificationsSettings = function (ext, cb) { _getNotificationsSettings(ext, cb); }
        this.getPostitNotificationsSettingsForAllExt = function (cb) { _getPostitNotificationsSettingsForAllExt(cb); }
        this.getPostitNotificationsSettingsByExt = function (byext, cb) { _getPostitNotificationsSettingsByExt(byext, cb); }
        this.getNotifCellphoneForAllExt = function (cb) { _getNotifCellphoneForAllExt(cb); }
}

function _getNotifCellphoneForAllExt(cb) {
    try {
        var query = 'SELECT extension, notif_cellphone FROM ' + EXTENSION_INFO;
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('byext = ' + byext + ': ' + err.stack);
    }
}

function _getPostitNotificationsSettingsByExt(byext, cb) {
    try {
        var query = 'SELECT extension, notif_note_cellphone, notif_note_email FROM ' + EXTENSION_INFO + ' WHERE extension="' + byext + '"';
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('byext = ' + byext + ': ' + err.stack);
    }
}

function _getPostitNotificationsSettingsForAllExt(cb) {
    try {
        var query = 'SELECT extension, notif_note_cellphone, notif_note_email FROM ' + EXTENSION_INFO;
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ': ' + err.stack);
    }
}

function _getNotificationsSettings(ext, cb) {
    try {
        // make query
        var query = 'SELECT * FROM ' + EXTENSION_INFO + ' WHERE extension="' + ext + '"';
        // do query
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ': ' + err.stack);
    }
}

function _saveNotificationsSettings(ext, settings, cb) {
    try  {
        // get values
        var notificationsCellphone = settings.notif_cellphone.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
        var notificationsEmail = settings.notif_email.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
        var notificationCellphonePostit = settings.notif_note_cellphone;
        var notificationEmailPostit = settings.notif_note_email;
        var notificationCellphoneVoicemail = settings.notif_voicemail_cellphone;
        var notificationEmailVoicemail = settings.notif_voicemail_email;
        // make query
        var query = 'INSERT INTO extension_info (extension, notif_cellphone, notif_email, ' +
                    'notif_voicemail_cellphone, notif_voicemail_email, notif_note_cellphone, ' +
                    'notif_note_email) values ("' + ext + '", "' + notificationsCellphone + '", "' + notificationsEmail + '", ' +
                    '"' + notificationCellphoneVoicemail + '", ' +
                    '"' + notificationEmailVoicemail + '", "' + notificationCellphonePostit + '", "' + notificationEmailPostit + '") ' +
                    'ON DUPLICATE KEY UPDATE notif_cellphone="' + notificationsCellphone + '", notif_email="' + notificationsEmail + '", ' +
                    'notif_voicemail_cellphone="' + notificationCellphoneVoicemail + '", notif_voicemail_email="' + notificationEmailVoicemail + '", ' +
                    'notif_note_cellphone="' + notificationCellphonePostit + '", notif_note_email="' + notificationEmailPostit + '"';
        // do query
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', settings = ' + sys.inspect(settings) + ': ' + err.stack);
    }
}

function _getCellphoneNotificationsModalityForAll(ext, cb) {
    try {
        var query = 'SELECT notif_note_cellphone from ' + EXTENSION_INFO + ' WHERE extension="' + ext + '"';
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _getNotificationModalityNote(ext, cb) {
    try {
        var query = 'SELECT extension, notif_email, notif_cellphone, notif_note_email, notif_note_cellphone FROM ' + EXTENSION_INFO + ' WHERE extension="' + ext + '"';
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _getNotificationModalityVoicemail(ext, cb) {
    try {
        var query = 'SELECT extension, notif_email, notif_cellphone, notif_voicemail_email, notif_voicemail_cellphone FROM ' + EXTENSION_INFO + ' WHERE extension="' + ext + '"';
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _getEmailNotificationModalityVoicemail(ext, cb) {
    try {
        var query = 'SELECT extension, notif_email, notif_voicemail_email FROM ' + EXTENSION_INFO + ' WHERE extension="' + ext + '"';
        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _updateEmailNotificationsModalityForAll(ext, value, cb) {
    try {
        var query = 'UPDATE extension_info SET notif_voicemail_email="' + value + '", ' +
                    'notif_note_email="' + value + '" WHERE extension="' + ext + '"';

        _query(EXTENSION_INFO, query, function (result) {
           cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _updateCellphoneNotificationsModalityForAll(ext, value, cb) {
    try {
        var query = 'UPDATE extension_info SET notif_voicemail_cellphone="' + value + '", ' +
                    'notif_note_cellphone="' + value + '" WHERE extension="' + ext + '"';

        _query(EXTENSION_INFO, query, function (result) {
           cb(result);
        });
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _storeNotificationCellphoneAndEmail(ext, notificationsInfo, cb) {
    try {
        var notificationsCellphone = notificationsInfo.notificationsCellphone.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
        var notificationsEmail = notificationsInfo.notificationsEmail.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
        var notificationsVoicemailCell = notificationsInfo.notificationsVoicemailCell;
        var notificationsVoicemailEmail = notificationsInfo.notificationsVoicemailEmail;
        var notificationsNoteCell = notificationsInfo.notificationsNoteCell;
        var notificationsNoteEmail = notificationsInfo.notificationsNoteEmail;

        var query = 'INSERT INTO extension_info (extension, notif_cellphone, notif_email, ' +
                    'notif_voicemail_cellphone, notif_voicemail_email, notif_note_cellphone, ' +
                    'notif_note_email) values ("' + ext + '", "' + notificationsCellphone + '", "' + notificationsEmail + '", ' +
                    '"' + notificationsVoicemailCell + '", ' +
                    '"' + notificationsVoicemailEmail + '", "' + notificationsNoteCell + '", "' + notificationsNoteEmail + '") ' +
                    'ON DUPLICATE KEY UPDATE notif_cellphone="' + notificationsCellphone + '", notif_email="' + notificationsEmail + '", ' +
                    'notif_voicemail_cellphone="' + notificationsVoicemailCell + '", notif_voicemail_email="' + notificationsVoicemailEmail + '", ' +
                    'notif_note_cellphone="' + notificationsNoteCell + '", notif_note_email="' + notificationsNoteEmail + '"';

        _query(EXTENSION_INFO, query, function (result) {
            cb(result);
        });
    } catch (err) {
       logger.error('ext = ' + ext + ', notificationsInfo = ' + sys.inspect(notificationsInfo) + ': ' + err.stack);
    }
}

function _getAllContactsByNum(num, numToSearch, cb) {
    try {
        var query = 'SELECT * FROM ' + PHONEBOOK + ' WHERE (homephone="' + numToSearch + '" OR workphone="' + numToSearch + '" OR cellphone="' + numToSearch + '")';
        _query(PHONEBOOK, query, function (result) {
            cb(result, num);
        });
    } catch (err) {
        logger.error('num = ' + num + ', numToSearch = ' + numToSearch + ': ' + err.stack);
    }
}

function getQueries(){
	return queries;
}
// delete all entries that contains extFrom or bareJid. Then insert new chat association extFrom=bareJid
function insertAndUpdateChatAssociation(extFrom,bareJid,cb){
	var objQuery = queries[CHAT_ASSOCIATION];
	bareJid = bareJid.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
	// delete all entries
	objQuery.query = "delete from chat_association where extension='"+extFrom+"' OR bare_jid='"+bareJid+"'";
	executeSQLQuery(CHAT_ASSOCIATION, objQuery, function(results){
	});
	// insert new chat association
	objQuery.query = "insert into chat_association (extension,bare_jid) values ('"+extFrom+"','"+bareJid+"')";
	executeSQLQuery(CHAT_ASSOCIATION, objQuery, function(results){
                try {
			cb(results);
		} catch(err){
                        logger.error("insert and update chat association from " + extFrom + " for barejid " + bareJid + ": "  + err.stack);
                }
        });
}
function getChatAssociation(cb){
	var objQuery = queries[CHAT_ASSOCIATION];
	objQuery.query = "select * from chat_association";
        executeSQLQuery(CHAT_ASSOCIATION, objQuery, function(results){
                try {
			cb(results);
		} catch(err){
                        logger.error("get chat association: "  + err.stack);
                }
        });
}
// Return extensions that has reserved the call and the reservation date
function getExtCallReserved(num,cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, extension FROM call_notes WHERE (number='"+num+"' AND reservation=1 AND expiration>now())";
	executeSQLQuery(CALL_NOTES,objQuery,function(results){
		try {
			cb(results);
		} catch(err){
                        logger.error("get ext call reservation for num " + num + ": "  + err.stack);
                }
	});
}
// Execute callback with all call notes for number that aren't expired
function getCallNotes(num,cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "select * from call_notes where (number='"+num+"' AND expiration>now())";
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		try {
			cb(results);
		} catch(err){
			logger.error("get call notes for num " + num + ": "  + err.stack);
		}
       	});
}
function modifyCallNote(note,pub,expiration,expFormatVal,entryId,reservation,cb){
	var objQuery = queries[CALL_NOTES];
	note = note.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
	objQuery.query = "UPDATE call_notes SET text='"+note+"',public="+pub+",expiration=DATE_ADD(now(),INTERVAL "+expiration+" "+expFormatVal+"),reservation="+reservation+" where id="+entryId;
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		try {
			cb(results);
		} catch(err) {
                        logger.error("modify call note for entryId " + entryId + ": "  + err.stack);
                }
	});
}
function deleteCallNote(id,cb){
	var objQuery = queries[CALL_NOTES];
	id = id.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
	objQuery.query = "delete from " + CALL_NOTES + " where id='"+id+"';";
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		try {
			cb(results);
		} catch(err) {
                        logger.error("delete call note id " + id + ": "  + err.stack);
                }
	});
}

function _deletePostit(id, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'DELETE FROM ' + POSTIT + ' WHERE id="' + id + '"';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.warn('no query for [' + POSTIT + ']');
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        } 
    } catch (err) {
        logger.error('id = ' + id + ': ' + err.stack);
    }
}

function _setReadPostit(id, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'UPDATE ' + POSTIT + ' SET status="1" WHERE id="' + id + '"';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.warn('no query for [' + POSTIT + ']');
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        } 
    } catch (err) {
        logger.error('id = ' + id + ': ' + err.stack);
    }
}

function _getPostit(id, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE (id="' + id + '")';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.warn('no query for [' + POSTIT + ']');
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error('id = ' + id + ': ' + err.stack);
    }
}

function _savePostit(obj, cb) {
    try {
        var note = obj.note;
        var assigned = obj.assigned;
        var extFrom = obj.extFrom;
        var objQuery = queries[POSTIT];
        note = note.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
        objQuery.query = 'INSERT INTO ' + POSTIT + ' (owner, text, assigned, status) VALUES ("' + extFrom + '", "' + note + '", "' + assigned + '", "0")';
        executeSQLQuery(POSTIT, objQuery, function (results) {
            try {
                cb(results);
            } catch(err) {
                logger.error('obj = ' + sys.inspect(obj) + ': ' + err.stack);
            }
        });
    } catch (err) {
        logger.error('obj = ' + sys.inspect(obj) + ': ' + err.stack);
    }
}

function saveCallNote(message, cb) {
    try {
        var note = message.note;
        var extension = message.extFrom;
        var pub = message.pub;
        var expiration = message.expiration;
        var expFormatVal = message.expFormatVal;
        var num = message.num;
        var reservation = message.nextCallReservation;
	var objQuery = queries[CALL_NOTES];
	note = note.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
	objQuery.query = 'INSERT INTO call_notes (text, extension, number, public, expiration, reservation) VALUES ("' + 
            note + '", "' + extension + '", "' + num + '", "' + pub + '", DATE_ADD(now(), INTERVAL ' + expiration + ' ' + 
            expFormatVal + '), "' + reservation + '")';
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		try {
			cb(results);
		} catch(err) {
                    logger.error('note = ' + note + ', extension = ' + extension + ', pub = ' + pub + ', expiration = ' + expiration + ', expFormatVal = ' + expFormatVal + ', num = ' + num + ', reservation = ' + reservation + ', assigns = ' + sys.insepct(assigns) + ': ' + err.stack);
                }
	});
    } catch (err) {
        logger.error('note = ' + note + ', extension = ' + extension + ', pub = ' + pub + ', expiration = ' + expiration + ', expFormatVal = ' + expFormatVal + ', num = ' + num + ', reservation = ' + reservation + ', assigns = ' + sys.inspect(assigns) + ': ' + err.stack);
    }
}

function _getIntervalSwitchboardSms(ext, dateFrom, dateTo, num, cb) {
    try {
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (DATE(date)>='" + dateFrom + "' AND DATE(date)<='" + dateTo + "') AND destination like '" + num + "')";
	if (objQuery !== undefined) {
		executeSQLQuery(SMS, objQuery, function (results) {
			try {
				cb(results);
			} catch(err) {
                                logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ", num = " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
    } catch(err) {
        logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

function getIntervalHistorySms(ext,dateFrom,dateTo,num,cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (sender LIKE '"+ext+"') AND (DATE(date)>='"+dateFrom+"' AND DATE(date)<='"+dateTo+"') AND destination like '"+num+"' )";
	if(objQuery!==undefined){
		executeSQLQuery(SMS, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get interval history sms ("+dateFrom+" - "+dateTo+") for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
}

function _getIntervalSwitchboardPostit(ext, dateFrom, dateTo, cb) {
    try {
	var objQuery = queries[POSTIT];
	objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE (DATE(date)>="' + dateFrom + '" AND DATE(date)<="' + dateTo + '")';
	if (objQuery !== undefined) {
		executeSQLQuery(POSTIT, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ": "  + err.stack);
                        }
		});
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ": "  + err.stack);
    }
}

function _getIntervalSwitchboardCallNotes(ext,dateFrom,dateTo,num,cb){
    try {
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((DATE(date)>='"+dateFrom+"' AND DATE(date)<='"+dateTo+"') AND expiration>now())";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ", num = " + num + ": "  + err.stack);
                        }
		});
        } else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
    } catch (err) {
        logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

function _getIntervalPostit(ext, dateFrom, dateTo, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE ((owner="' + ext + '" OR assigned="' + ext + '") AND (DATE(date)>="' + dateFrom + '" AND DATE(date)<="' + dateTo + '"))';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ", dateFrom = " + dateFrom + ", dateTo = " + dateTo + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", dateFrom = " + dateFrom + ", dateTo = " + dateTo + ": "  + err.stack);
    }
}

function getIntervalHistoryCallNotes(ext,dateFrom,dateTo,num,cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension="+ext+" AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND (DATE(date)>='"+dateFrom+"' AND DATE(date)<='"+dateTo+"') AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get interval history call notes ("+dateFrom+" - "+dateTo+") for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
}
function getAllNotesForNum(ext,num,cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
	                try {
				cb(results);
			} catch(err) {
                                logger.error("get all notes for ext " + ext + " for num " + num + ": "  + err.stack);
                        }
                });
	} else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
}

function _getCurrentMonthSwitchboardPostit(ext, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY)))';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ": "  + err.stack);
    } 
}

function _getCurrentMonthSwitchboardCallNotes(ext, num, cb) {
    try {
        var objQuery = queries[CALL_NOTES];
        num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
        objQuery.query = "SELECT * from " + DB_TABLE_CALLNOTES + " WHERE ((DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))) AND expiration>now())";
        if (objQuery !== undefined) {
            executeSQLQuery(CALL_NOTES, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
    } 
}

function _getCurrentMonthPostit(ext, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE ((owner="' + ext + '" OR assigned="' + ext + '") AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))))';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch (err) {
                    logger.error('ext = ' + ext + ': ' + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        } 
    } catch (err) {
        logger.error('ext = ' + ext + ': ' + err.stack);
    }
}

function getCurrentMonthHistoryCallNotes(ext, num, cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))) AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get current month history call notes for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
}

function _getCurrentMonthSwitchboardSms(ext, num, cb) {
    try {
        var objQuery = queries[SMS];
        num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
        objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM " + DB_TABLE_SMS + " WHERE ( (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))) AND destination like '" + num + "')";
        if (objQuery !== undefined) {
                executeSQLQuery(SMS, objQuery, function (results) {
                        try {
                                cb(results);
                        } catch(err) {
                                logger.error("get current month history sms for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
                });
        } else {
            logger.warn('no query for [' + SMS + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

function getCurrentMonthHistorySms(ext, num, cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (sender LIKE '"+ext+"') AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))) AND destination like '"+num+"'  )";
	if(objQuery!==undefined){
		executeSQLQuery(SMS, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get current month history sms for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
}

function _getCurrentWeekSwitchboardPostit(ext, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY)))';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch (err) {
                    logger.error("ext = " + ext + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ": "  + err.stack);
    }
}

function _getCurrentWeekSwitchboardCallNotes(ext, num, cb) {
    try {
        var objQuery = queries[CALL_NOTES];
        num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
        objQuery.query = "SELECT * from " + DB_TABLE_CALLNOTES + " WHERE ((DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))) AND expiration>now())";
        if (objQuery !== undefined) {
            executeSQLQuery(CALL_NOTES, objQuery, function (results) {
                try {
                    cb(results);
                } catch (err) {
                    logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}


function _getCurrentWeekPostit(ext, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE ((owner="' + ext + '" OR assigned="' + ext + '") AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))))';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function(results){
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch(err) {
        logger.error("ext = " + ext + ": "  + err.stack);
    }
}

function getCurrentWeekHistoryCallNotes(ext, num, cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))) AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get current week history call notes for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
}

function _getCurrentWeekSwitchboardSms(ext, num, cb) {
    try {
        var objQuery = queries[SMS];
        num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
        objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM " + DB_TABLE_SMS + " WHERE ( (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))) AND destination like '" + num + "')";
        if (objQuery !== undefined) {
            executeSQLQuery(SMS, objQuery, function(results){
                try {
                    cb(results);
                } catch (err) {
                    logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + SMS + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

function getCurrentWeekHistorySms(ext, num, cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (sender LIKE '"+ext+"') AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))) AND destination like '"+num+"'  )";
	if(objQuery!==undefined){
		executeSQLQuery(SMS, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get current week history sms for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
}


function _getDaySwitchboardPostit(ext, date, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE (DATE(date)="' + date + '")';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ", date = " + date + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch(err) {
        logger.error("ext = " + ext + ", date = " + date + ": "  + err.stack);
    }
}

function _getDaySwitchboardCallNotes(ext, date, num, cb) {
    try {
        var objQuery = queries[CALL_NOTES];
        num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
        objQuery.query = "SELECT * FROM " + DB_TABLE_CALLNOTES + " WHERE (number like '" + num + "' AND DATE(date)='" + date + "' AND expiration>now())";
        if (objQuery !== undefined) {
            executeSQLQuery(CALL_NOTES, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ", date = " + date + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
    } catch(err) {
        logger.error("ext = " + ext + ", date = " + date + ", num = " + num + ": "  + err.stack);
    }
}

function _getAllUnreadPostit(cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE status="0"';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.warn('no query for [' + POSTIT + ']');
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error('ext = ' + ext + ', date = ' + date + ': ' + err.stack);
    }
}

function _getDayPostit(ext, date, cb) {
    try {
        var objQuery = queries[POSTIT];
        objQuery.query = 'SELECT * FROM ' + POSTIT + ' WHERE ((owner="' + ext + '" OR assigned="' + ext + '") AND (DATE(date)="' + date + '"))';
        if (objQuery !== undefined) {
            executeSQLQuery(POSTIT, objQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.warn('no query for [' + POSTIT + ']');
                }
            });
        } else {
            logger.warn('no query for [' + POSTIT + ']');
        }
    } catch (err) {
        logger.error('ext = ' + ext + ', date = ' + date + ': ' + err.stack);
    }
}


function getDayHistoryCallNotes(ext, date, num, cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND DATE(date)='"+date+"' AND expiration>now()";
	if(objQuery!==undefined){
	        executeSQLQuery(CALL_NOTES, objQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get day history call notes for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + CALL_NOTES + ']');
        }
	return undefined;
}

function _getDaySwitchboardSms(ext, date, num, cb) {
    try {
        var objQuery = queries[SMS];
        num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
        objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM " + DB_TABLE_SMS +
            " WHERE (DATE(date)='" + date + "' AND destination like '" + num + "')";
        if (objQuery !== undefined) {
            executeSQLQuery(SMS, objQuery, function (results) {
                try {
                    cb(results);
                } catch (err) {
                    logger.error("ext = " + ext + ", date = " + date + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + SMS + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", date = " + date + ", num = " + num + ": "  + err.stack);
    }
}

function getDayHistorySms(ext, date, num, cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+
	" WHERE (sender LIKE '"+ext+"' AND DATE(date)='"+date+"' AND destination like '"+num+"')";
	if(objQuery!==undefined){
	        executeSQLQuery(SMS, objQuery, function(results){
			var objQuery = queries[SMS];
			try {
				cb(results);
			} catch(err) {
	                        logger.error("get day history sms for ext " + ext + " of num " + num + ": "  + err.stack);
                	}
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
	return undefined;
}
function registerSmsSuccess(sender, destination, text, cb){
	var objQuery = queries[SMS];
	if(objQuery!==undefined){
		var conn = dbConnections[SMS];
		var que = 'INSERT INTO '+DB_TABLE_SMS+' SET sender = ?, destination = ?, text = ?, date = now(), status = 1';
		logger.debug('execute SQL query: ' + que);
		conn.query(que, [sender, destination, text], function (err, results, fields){
			if(err){
				logger.error("ERROR in execute query: " + que);
				logger.error(sys.inspect(err));
			}
			try {
				cb(results);
			} catch(err) {
                                logger.error("register sms succcess from " + sender + " to " + destination + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
	return undefined;
}
function registerSmsFailed(sender, destination, text, cb){
	var objQuery = queries[SMS];
	if(objQuery!==undefined){
		var conn = dbConnections[SMS];
		var que = 'INSERT INTO '+DB_TABLE_SMS+' SET sender = ?, destination = ?, text = ?, date = now(), status = 0';
		logger.debug('execute SQL query: ' + que);
		conn.query(que, [sender, destination, text], function (err, results, fields){
			if(err){
				logger.error("ERROR in execute query: " + que);
				logger.error(sys.inspect(err));
			}
			try {
				cb(results);
			} catch(err) {
                                logger.error("register sms failed from " + sender + " to " + destination + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + SMS + ']');
        }
	return undefined;
}
// Return all uniqueid present in cdr that has been passed as array argument
function checkListAudioUid(arruid,cb){
	var objQuery = queries[DAY_HISTORY_CALL];
	if(objQuery!==undefined){
		var strListUniqueid = '';
		var tempUid = '';
		for(var i=0; i<arruid.length; i++){
			tempUid = arruid[i];
			tempUid = tempUid.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
			strListUniqueid += "'" + tempUid + "',";
		}
		strListUniqueid = strListUniqueid.substring(0,strListUniqueid.length-1);
		var copyObjQuery = Object.create(objQuery);
		copyObjQuery.query = "SELECT uniqueid FROM cdr WHERE uniqueid in (" + strListUniqueid + ") AND disposition=\"ANSWERED\"";
		executeSQLQuery(DAY_HISTORY_CALL, copyObjQuery, function(results){
			try {
				cb(results);
			} catch(err) {
				logger.error("check list audio uid (" + arruid.length + " elements): " + err.stack);
			}
		});
	} else {
            logger.warn('no query for [' + DAY_HISTORY_CALL + ']');
        }
}
/* check if the uniqueid 'uid' is present in 'cdr' table of 'asteriskcdrdb' database
 * return true if it is present, false otherwise */
function checkAudioUid(uid, filename, cb){
	var objQuery = queries[DAY_HISTORY_CALL];
	uid = uid.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
        if(objQuery!==undefined){
                var copyObjQuery = Object.create(objQuery); // copy object
                copyObjQuery.query = "SELECT * FROM cdr WHERE uniqueid=\""+uid+"\" AND disposition=\"ANSWERED\""; // substitute query
                executeSQLQuery(DAY_HISTORY_CALL, copyObjQuery, function(results){ // execute current sql query
                        try {
				cb(results, filename, uid);
			} catch(err) {
				logger.error("check audio uid " + uid + ": " + err.stack);
			}
                });
        } else {
            logger.warn('no query for [' + DAY_HISTORY_CALL + ']');
        }
}
// add controller to manage changin in configuration file
function addController(contr){
        controller = contr;
        logger.debug("added controller");
        controller.addFile(DATACOLLECTOR_CONFIG_FILENAME);
        controller.addListener("change_file", function(filename){
               if(filename==DATACOLLECTOR_CONFIG_FILENAME){
                        logger.info("update configuration file " + DATACOLLECTOR_CONFIG_FILENAME);
                        updateConfiguration();
                }
        });
}

/* This function update queries in memory after changing of configuration
 * file. It checks modified sections and restablish connections only for modified section.
 * If one section is deleted, the relative connection is closed and entry is removed from
 * dbConnections. 
 * If one section is added, a new connection is made and new entry is added to dbConnections */
function updateConfiguration(){
	// read modified configuration file
	var reloadQueries = iniparser.parseSync(DATACOLLECTOR_CONFIG_FILENAME);
	for(key in reloadQueries){
		var modified = false;
		if(queries[key]==undefined) {  // a new section is added to configuration file
			logger.debug("new section '" + key + "' into " + DATACOLLECTOR_CONFIG_FILENAME + " has been added");
			queries[key] = reloadQueries[key];
			// new connection of added section
                        logger.debug("made new db connection of key = " + key + " " + sys.inspect(queries[key]));
                        initConn(queries[key], key);
		}
		else{
			var currReloadObj = reloadQueries[key];  // value of the current key
			var oldObj = queries[key];
			/* An example of oldObj
			{ dbhost: 'localhost',
	      		  dbport: '3306',
			  dbtype: 'mysql',
			  dbuser: 'pbookuser',
			  dbpassword: 'pbookpass',
			  dbname: 'phonebook',
			  query: '"select * from phonebook where homephone like \'%$EXTEN\' or workphone like \'%$EXTEN\' or cellphone like \'%$EXTEN\' or fax like \'%$EXTEN\'"' 
			} */
			for(valKey in oldObj){
				if(oldObj[valKey]!=currReloadObj[valKey]){	// modified value of valKey
					modified = true;
					// update modified value in queries
                                        oldObj[valKey] = currReloadObj[valKey];
				}
			}
		}
		if(modified){ // a section has been modified
			logger.info("section '" + key + "' has been modified in " + DATACOLLECTOR_CONFIG_FILENAME);
			if(queries[key].dbtype=="mysql"){ 
				// close mysql connection
				logger.debug("close mysql connection of key = " + key);
				dbConnections[key].end();
			}
			else if(queries[key].dbtype=="mssql"){ // close mssql connection
				logger.debug("close mssql connection");
				dbConnections[key].close(function(){});
			}
			// new connection of modified section
                        logger.debug("made new db connection of key = " + key + " " + sys.inspect(queries[key]));
                        initConn(queries[key], key);
		}
	}
	// manage eventually removed section in modified configuration file
	for (key in queries){
		if(reloadQueries[key]==undefined){
			logger.info("section '" + key + "' has been removed from " + DATACOLLECTOR_CONFIG_FILENAME);
			delete queries[key];
		}
	}
}

/* This function open new connection for each section of configuration file dataProfiles.ini and
 * memorize it in dbConnections object. The key is the section name and the value is the connection */
function initDBConnections(){
	for(key in queries){
		var objQuery = queries[key];
		initConn(objQuery, key);
	}
}

// This function initialize one connection
function initConn(objQuery, key){
	logger.debug('initialize DB connection to \''+key+'\'');
	if(objQuery.dbtype===undefined || objQuery.dbhost===undefined || objQuery.dbuser===undefined || objQuery.dbpassword===undefined || objQuery.dbname===undefined ||
		objQuery.query===undefined || objQuery.dbport===undefined){
		logger.error('error in configuration file of queries for \''+key+'\'');
		return;
	}
	if(objQuery.dbtype=="mysql"){
		var client = new mysql.createClient();
                client.host = objQuery.dbhost;
                client.port = objQuery.dbport;
                client.user = objQuery.dbuser;
                client.password = objQuery.dbpassword;
		client.database = objQuery.dbname;
		dbConnections[key] = client;
	}
        else if(objQuery.dbtype=="mssql"){
               	var db = new odbc.Database();
		var connect_str = "DRIVER={FreeTDS};SERVER=" + objQuery.dbhost + ";PORT=" + objQuery.dbport + ";UID=" + objQuery.dbuser + ";PWD=" + objQuery.dbpassword + ";DATABASE=" + objQuery.dbname;
                db.open(connect_str, function(err) {
			if(err){
				logger.error("ERROR connect to DB mssql");
				logger.error(sys.inspect(err));
			}
                });
		dbConnections[key] = db;
        }
}

// Initialize all the queries that can be executed and relative connection to database
function initQueries(){
	if(!path.existsSync(DATACOLLECTOR_CONFIG_FILENAME)){
		logger.error('configuration file \''+DATACOLLECTOR_CONFIG_FILENAME+'\' not exists');
		process.exit(0);
	}
        this.queries = iniparser.parseSync(DATACOLLECTOR_CONFIG_FILENAME);
	this.queries[SMS] = {
		dbhost: 'localhost',
		dbport: '/var/lib/mysql/mysql.sock',
		dbtype: 'mysql',
		dbuser: 'smsuser',
		dbpassword: 'smspass',
		dbname: 'nethcti',
		query: ''
	};
	this.queries[POSTIT] = {
		dbhost: 'localhost',
		dbport: '/var/lib/mysql/mysql.sock',
		dbtype: 'mysql',
		dbuser: 'smsuser',
		dbpassword: 'smspass',
		dbname: 'nethcti',
		query: ''
	};
	this.queries[CALL_NOTES] = {
		dbhost: 'localhost',
		dbport: '/var/lib/mysql/mysql.sock',
		dbtype: 'mysql',
		dbuser: 'smsuser',
		dbpassword: 'smspass',
		dbname: 'nethcti',
		query: ''
	};
	this.queries[CHAT_ASSOCIATION] = {
		dbhost: 'localhost',
		dbport: '/var/lib/mysql/mysql.sock',
		dbtype: 'mysql',
		dbuser: 'smsuser',
		dbpassword: 'smspass',
		dbname: 'nethcti',
		query: ''
	};
	this.queries[EXTENSION_INFO] = {
		dbhost: 'localhost',
		dbport: '/var/lib/mysql/mysql.sock',
		dbtype: 'mysql',
		dbuser: 'smsuser',
		dbpassword: 'smspass',
		dbname: 'nethcti',
		query: ''
	};
	initDBConnections();
}

_getIntervalSwitchboardCall = function(ext, dateFrom, dateTo, num, cb) {
    try {
        var objQuery = queries[INTERVAL_SWITCHBOARD_CALL];
        if (objQuery !== undefined) {
            var copyObjQuery = Object.create(objQuery);
            num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
            copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$DATE_FROM/g,dateFrom).replace(/\$DATE_TO/g,dateTo).replace(/\$NUM/g,num);
            executeSQLQuery(INTERVAL_SWITCHBOARD_CALL, copyObjQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + INTERVAL_SWITCHBOARD_CALL + ']');
        }
    } catch (err) {
        logger.error("dateFrom = " + dateFrom + ", dateTo = " + dateTo + ", ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

// Return the history of calling between specified interval time
getIntervalHistoryCall = function(ext,dateFrom,dateTo,num,cb){
	var objQuery = queries[INTERVAL_HISTORY_CALL];
	if(objQuery!=undefined){
		var copyObjQuery = Object.create(objQuery);
		num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$DATE_FROM/g,dateFrom).replace(/\$DATE_TO/g,dateTo).replace(/\$NUM/g,num);
		executeSQLQuery(INTERVAL_HISTORY_CALL, copyObjQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get interval history call ("+dateFrom+" - "+dateTo+") for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
		});
	} else {
            logger.warn('no query for [' + INTERVAL_HISTORY_CALL + ']');
        }
	return undefined;
}

_getCurrentMonthSwitchboardCall = function (ext, num, cb) {
    try {
        var objQuery = queries[CURRENT_MONTH_SWITCHBOARD_CALL];
        if (objQuery !== undefined) {
            var copyObjQuery = Object.create(objQuery);
            num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
            copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$NUM/g, num);
            executeSQLQuery(CURRENT_MONTH_SWITCHBOARD_CALL, copyObjQuery, function (results) {
                try {
                    cb(results);
                } catch (err) {
                    logger.error("get current month history call for ext " + ext + " of num " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + CURRENT_MONTH_SWITCHBOARD_CALL + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

// Return the history of calling of the current month.
getCurrentMonthHistoryCall = function(ext, num, cb){
	var objQuery = queries[CURRENT_MONTH_HISTORY_CALL];
        if(objQuery!=undefined){
                // copy object
                var copyObjQuery = Object.create(objQuery);
		num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$NUM/g, num);
                // execute current sql query
                executeSQLQuery(CURRENT_MONTH_HISTORY_CALL, copyObjQuery, function(results){
                        try {
				cb(results);
			} catch(err) {
                                logger.error("get current month history call for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
                });
        } else {
            logger.warn('no query for [' + CURRENT_MONTH_HISTORY_CALL + ']');
        }
        return undefined;
}

_getCurrentWeekSwitchboardCall = function (ext, num, cb) {
    try {
        var objQuery = queries[CURRENT_WEEK_SWITCHBOARD_CALL];
        if (objQuery !== undefined) {
            var copyObjQuery = Object.create(objQuery);
            num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
            copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$NUM/g, num);
            executeSQLQuery(CURRENT_WEEK_HISTORY_CALL, copyObjQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + CURRENT_WEEK_SWITCHBOARD_CALL + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", num = " + num + ": "  + err.stack);
    }
}

// Return the history of calling of the current week
getCurrentWeekHistoryCall = function(ext, num, cb){
	var objQuery = queries[CURRENT_WEEK_HISTORY_CALL];
        if(objQuery!=undefined){
                // copy object
                var copyObjQuery = Object.create(objQuery);
		num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$NUM/g, num);
                // execute current sql query
                executeSQLQuery(CURRENT_WEEK_HISTORY_CALL, copyObjQuery, function(results){
                        try {
				cb(results);
			} catch(err) {
                                logger.error("get current week history call for ext " + ext + " of num " + num + ": "  + err.stack);
                        }
                });
        } else {
            logger.warn('no query for [' + CURRENT_WEEK_HISTORY_CALL + ']');
        }
        return undefined;
}

_getDaySwitchboardCall = function (ext, date, num, cb) {
    try {
        var objQuery = queries[DAY_SWITCHBOARD_CALL];
        if (objQuery !== undefined) {
            var copyObjQuery = Object.create(objQuery);
            num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
            copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$DATE/g, date).replace(/\$NUM/g, num);
            executeSQLQuery(DAY_SWITCHBOARD_CALL, copyObjQuery, function (results) {
                try {
                    cb(results);
                } catch(err) {
                    logger.error("ext = " + ext + ", date = " + date + ", num = " + num + ": "  + err.stack);
                }
            });
        } else {
            logger.warn('no query for [' + DAY_SWITCHBOARD_CALL + ']');
        }
    } catch (err) {
        logger.error("ext = " + ext + ", date = " + date + ", num = " + num + ": "  + err.stack);
    }
}

// Return the history of calling of one day.
getDayHistoryCall = function(ext, date, num, cb){
	var objQuery = queries[DAY_HISTORY_CALL];
        if(objQuery!=undefined){
                // copy object
                var copyObjQuery = Object.create(objQuery);
		num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$DATE/g, date).replace(/\$NUM/g, num);
                // execute current sql query
                executeSQLQuery(DAY_HISTORY_CALL, copyObjQuery, function(results){
                        try {
				cb(results);
			} catch(err) {
	                        logger.error("get day history call for ext " + ext + " of num " + num + ": "  + err.stack);
                	}
                });
        } else {
            logger.warn('no query for [' + DAY_HISTORY_CALL + ']');
        }
        return undefined;
}
/* Return the customer card of the client extCC in type format.
 * The type is specified in section [CUSTOMER_CARD] of profiles.ini file */
getCustomerCard = function(ext, type, cb){
	var section = CUSTOMER_CARD + "_" + type;
	var objQuery = queries[section];
        if(objQuery!==undefined){
		// copy object
                var copyObjQuery = Object.create(objQuery);
                // substitue template field in query
		ext = ext.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		if(copyObjQuery.query===undefined){
			logger.error('query of \''+section+'\' is empty');
			try {
				cb(undefined);
			} catch(err) {
	                        logger.error("get customer card for num " + ext + " of type " + type + ": "  + err.stack);
                	}
			return;
		
		}
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeNamedSQLQuery(section, copyObjQuery, type, function(results, type){
                        try {
				cb(results, type);
			} catch(err) {
                                logger.error("get customer card for num " + ext + " of type " + type + ": "  + err.stack);
                        }
                });
        } else {
		logger.error('no query for section \'' + section + '\'');
		try {
			cb(undefined);
		} catch(err) {
                        logger.error("get customer card for num " + ext + " of type " + type + ": "  + err.stack);
                }
	}
}

function _getContactsPhonebookStartsWith(name, cb) {
    try {
	var objQuery = queries[PHONEBOOK];
	if (objQuery !== undefined) {
                var copyObjQuery = Object.create(objQuery);
		name = name.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		if (copyObjQuery.query === undefined) {
			logger.error('query for \'' + PHONEBOOK + '\' not exists');
			try {
				cb(undefined);
			} catch(err) {
                	        logger.error("get contacts phonebook for name " + name + ": "  + err.stack);
	                }
			return;
		}
                copyObjQuery.query = 'SELECT * FROM phonebook WHERE (name LIKE "%$NAME_TO_REPLACE%" OR company LIKE "%$NAME_TO_REPLACE%") ORDER BY name ASC, company ASC';
                copyObjQuery.query = copyObjQuery.query.replace(/\%$NAME_TO_REPLACE/g, name); // substitue template field in query
		executeSQLQuery(PHONEBOOK, copyObjQuery, function (results) {
			try {
				cb(results);
			} catch(err) {
                                logger.error("get contacts phonebook for name " + name + ": "  + err.stack);
                        }
		});
	} else {
		logger.error('error in query configuration file for \'' + PHONEBOOK + '\'');
		try {	
			cb(undefined);
		} catch(err) {
                       logger.error("get contacts phonebook for name " + name + ": "  + err.stack);
                }
	}
    }  catch(err) {
        logger.error("name = " + name + ": "  + err.stack);
    }
}

// Search in the database all phonebook contacts that match the given name
function getContactsPhonebook(name, cb){
	var objQuery = queries[PHONEBOOK];
	if(objQuery!==undefined){
                var copyObjQuery = Object.create(objQuery); // copy object
		name = name.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		if(copyObjQuery.query===undefined){
			logger.error('query for \''+PHONEBOOK+'\' not exists');
			try {
				cb(undefined);
			} catch(err) {
                	        logger.error("get contacts phonebook for name " + name + ": "  + err.stack);
	                }
			return;
		}
                copyObjQuery.query = copyObjQuery.query.replace(/\$NAME_TO_REPLACE/g, name); // substitue template field in query
		executeSQLQuery(PHONEBOOK, copyObjQuery, function(results){
			try {
				cb(results);
			} catch(err) {
                                logger.error("get contacts phonebook for name " + name + ": "  + err.stack);
                        }
		});
	} else {
		logger.error('error in query configuration file for \''+PHONEBOOK+'\'');
		try {	
			cb(undefined);
		} catch(err) {
                       logger.error("get contacts phonebook for name " + name + ": "  + err.stack);
                }
	}
}

function _query(type, query, cb) {
    try {
        var obj = queries[type];
        obj.query = query;
        executeSQLQuery(type, obj, cb);
    } catch (err) {
        logger.error(err.stack);
    }
}

/* Execute one sql query. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function. Otherwise it is possibile that the function return before
 * the completion of sql query operation */
function executeSQLQuery(type, objQuery, cb){
    try {
	// get already opened connection
	var conn = dbConnections[type];
	if(conn!==undefined){
	        var query = objQuery.query + ";";
		logger.debug('execute SQL query: ' + query);
		conn.query(query, function (err, results, fields) {
	        	if (err) {
	        		logger.error("ERROR in execute " + objQuery.dbtype + " query: " + err.stack);
		        }
			cb(results);
	        });
	} else {
		logger.error('connection for query \''+type+'\' is ' + conn);
	}
    } catch (err) {
        logger.error(err.stack);
    }
}
/* Execute name one sql query. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function. Otherwise it is possibile that the function return before
 * the completion of sql query operation */
function executeNamedSQLQuery(type, objQuery, name, cb){
        // get already opened connection
        var conn = dbConnections[type];
	if(conn!==undefined){
	        var query = objQuery.query + ";";
		logger.debug('execute SQL query: ' + query);
	        conn.query(query, function (err, results, fields) {
	                if (err) {
	                        logger.error("ERROR in execute " + objQuery.dbtype + " query: " + err.message);
	                }
		        cb(results, name);
	        });
	} else {
		logger.error('connection for query \''+type+'\' is ' + conn);
	}
}
