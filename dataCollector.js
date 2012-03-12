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
const CURRENT_WEEK_HISTORY_CALL = "current_week_history_call";
const CURRENT_MONTH_HISTORY_CALL = "current_month_history_call";
const INTERVAL_HISTORY_CALL = "interval_history_call";
const SMS = "sms";
const CALL_NOTES = "call_notes";
const DB_TABLE_SMS = 'sms_history';
const DB_TABLE_CALLNOTES = 'call_notes';
const CHAT_ASSOCIATION = 'chat_association';

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
	this.getCustomerCard = function(ext, type, cb) { return getCustomerCard(ext, type, cb); }
	this.getDayHistoryCall = function(ext,date,num,cb) { return getDayHistoryCall(ext,date,num,cb); }
	this.getDayHistorySms = function(ext, date, num, cb) { return getDayHistorySms(ext, date, num, cb); }
	this.getDayHistoryCallNotes = function(ext, date, num, cb) { return getDayHistoryCallNotes(ext, date, num, cb); }
	this.getCurrentWeekHistoryCall = function(ext, num, cb) { return getCurrentWeekHistoryCall(ext, num, cb); }
	this.getCurrentWeekHistorySms = function(ext, num, cb) { return getCurrentWeekHistorySms(ext, num, cb); }
	this.getCurrentWeekHistoryCallNotes = function(ext, num, cb) { return getCurrentWeekHistoryCallNotes(ext, num, cb); }
	this.getCurrentMonthHistoryCall = function(ext, num, cb) { return getCurrentMonthHistoryCall(ext, num, cb); }
	this.getCurrentMonthHistorySms = function(ext, num, cb) { return getCurrentMonthHistorySms(ext, num, cb); }
	this.getCurrentMonthHistoryCallNotes = function(ext, num, cb) { return getCurrentMonthHistoryCallNotes(ext, num, cb); }
	this.getIntervalHistoryCall = function(ext,dateFrom,dateTo,num,cb){ return getIntervalHistoryCall(ext,dateFrom,dateTo,num,cb); }
	this.getIntervalHistorySms = function(ext,dateFrom,dateTo,num,cb){ return getIntervalHistorySms(ext,dateFrom,dateTo,num,cb); }
	this.getIntervalHistoryCallNotes = function(ext,dateFrom,dateTo,num,cb){ return getIntervalHistoryCallNotes(ext,dateFrom,dateTo,num,cb); }
	this.addController = function(contr) { addController(contr) }
	this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[DataCollector]'); logger.setLevel(level); }
	this.checkAudioUid = function(uid, filename, cb) { return checkAudioUid(uid, filename, cb); }
	this.registerSmsSuccess = function(sender, destination, text, cb){ registerSmsSuccess(sender, destination, text, cb); }
	this.registerSmsFailed = function(sender, destination, text, cb){ registerSmsFailed(sender, destination, text, cb); }
	this.saveCallNote = function(note,extension,pub,expiration,expFormatVal,num,reservation,cb){ saveCallNote(note,extension,pub,expiration,expFormatVal,num,reservation,cb); }
	this.modifyCallNote = function(note,pub,expiration,expFormatVal,entryId,reservation,cb){ modifyCallNote(note,pub,expiration,expFormatVal,entryId,reservation,cb); }
	this.getCallNotes = function(num,cb){ getCallNotes(num,cb); }
	this.getExtCallReserved = function(num,cb){ getExtCallReserved(num,cb); }
	this.getChatAssociation = function(cb){ getChatAssociation(cb); }
	this.insertAndUpdateChatAssociation = function(extFrom,bareJid,cb){ insertAndUpdateChatAssociation(extFrom,bareJid,cb); }
	this.deleteCallNote = function(id,cb) { deleteCallNote(id,cb); }
	this.getQueries = function(){ return getQueries(); }
	this.getAllNotesForNum = function(ext,num,cb){ getAllNotesForNum(ext,num,cb); } 
}
function getQueries(){
	return queries;
}
// delete all entries that contains extFrom or bareJid. Then insert new chat association extFrom=bareJid
function insertAndUpdateChatAssociation(extFrom,bareJid,cb){
	var objQuery = queries[CHAT_ASSOCIATION];
	// delete all entries
	objQuery.query = "delete from chat_association where extension='"+extFrom+"' OR bare_jid='"+bareJid+"';";
	executeSQLQuery(CHAT_ASSOCIATION, objQuery, function(results){
	});
	// insert new chat association
	objQuery.query = "insert into chat_association (extension,bare_jid) values ('"+extFrom+"','"+bareJid+"');";
	executeSQLQuery(CHAT_ASSOCIATION, objQuery, function(results){
                cb(results);
        });
}
function getChatAssociation(cb){
	var objQuery = queries[CHAT_ASSOCIATION];
	objQuery.query = "select * from chat_association;";
        executeSQLQuery(CHAT_ASSOCIATION, objQuery, function(results){
                cb(results);
        });
}
// Return extensions that has reserved the call and the reservation date
function getExtCallReserved(num,cb){
	var objQuery = queries[CALL_NOTES];
	objQuery.query = "SELECT date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, extension FROM call_notes WHERE (number='"+num+"' AND reservation=1 AND expiration>now())";
	executeSQLQuery(CALL_NOTES,objQuery,function(results){
		cb(results);
	});
}
// Execute callback with all call notes for number that aren't expired
function getCallNotes(num,cb){
	var objQuery = queries[CALL_NOTES];
	objQuery.query = "select * from call_notes where (number='"+num+"' AND expiration>now())";
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		cb(results);
       	});
}
function modifyCallNote(note,pub,expiration,expFormatVal,entryId,reservation,cb){
	var objQuery = queries[CALL_NOTES];
	objQuery.query = "UPDATE call_notes SET text='"+note+"',public="+pub+",expiration=DATE_ADD(now(),INTERVAL "+expiration+" "+expFormatVal+"),reservation="+reservation+" where id="+entryId;
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		cb(results);
	});
}
function deleteCallNote(id,cb){
	var objQuery = queries[CALL_NOTES];
	objQuery.query = "delete from " + CALL_NOTES + " where id='"+id+"';";
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		cb(results);
	});
}
function saveCallNote(note,extension,pub,expiration,expFormatVal,num,reservation,cb){
	var objQuery = queries[CALL_NOTES];
	objQuery.query = "INSERT INTO call_notes (text,extension,number,public,expiration,reservation) VALUES ('"+note+"','"+extension+"','"+num+"',"+pub+",DATE_ADD(now(), INTERVAL "+expiration+" "+expFormatVal+"),"+reservation+")";
	executeSQLQuery(CALL_NOTES, objQuery, function(results){
		cb(results);
	});
}
function getIntervalHistorySms(ext,dateFrom,dateTo,num,cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (sender LIKE '"+ext+"') AND (DATE(date)>='"+dateFrom+"' AND DATE(date)<='"+dateTo+"') AND destination like '"+num+"' )";
	if(objQuery!==undefined){
		executeSQLQuery(SMS, objQuery, function(results){
			cb(results);
		});
	}
}
function getIntervalHistoryCallNotes(ext,dateFrom,dateTo,num,cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension="+ext+" AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND (DATE(date)>='"+dateFrom+"' AND DATE(date)<='"+dateTo+"') AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			cb(results);
		});
	}
}
function getAllNotesForNum(ext,num,cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
	                cb(results);
                });
	}
}
function getCurrentMonthHistoryCallNotes(ext, num, cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))) AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			cb(results);
		});
	}
}
function getCurrentMonthHistorySms(ext, num, cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (sender LIKE '"+ext+"') AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE())-1 DAY))) AND destination like '"+num+"'  )";
	if(objQuery!==undefined){
		executeSQLQuery(SMS, objQuery, function(results){
			cb(results);
		});
	}
}
function getCurrentWeekHistoryCallNotes(ext, num, cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))) AND expiration>now()";
	if(objQuery!==undefined){
		executeSQLQuery(CALL_NOTES, objQuery, function(results){
			cb(results);
		});
	}
}
function getCurrentWeekHistorySms(ext, num, cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+" WHERE ( (sender LIKE '"+ext+"') AND (DATE(date)>=(DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-2 DAY))) AND destination like '"+num+"'  )";
	if(objQuery!==undefined){
		executeSQLQuery(SMS, objQuery, function(results){
			cb(results);
		});
	}
}
function getDayHistoryCallNotes(ext, date, num, cb){
	var objQuery = queries[CALL_NOTES];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT * from "+DB_TABLE_CALLNOTES+" WHERE ((extension='"+ext+"' AND number like '"+num+"') OR (number like '"+num+"' AND public=1)) AND DATE(date)='"+date+"' AND expiration>now()";
	if(objQuery!==undefined){
	        executeSQLQuery(CALL_NOTES, objQuery, function(results){
			cb(results);
		});
	}
	return undefined;
}
function getDayHistorySms(ext, date, num, cb){
	var objQuery = queries[SMS];
	num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
	objQuery.query = "SELECT id, sender, destination, text, date_format(date,'%d/%m/%Y') AS date, date_format(date,'%H:%i:%S') AS time, status FROM "+DB_TABLE_SMS+
	" WHERE (sender LIKE '"+ext+"' AND DATE(date)='"+date+"' AND destination like '"+num+"')";
	if(objQuery!==undefined){
	        executeSQLQuery(SMS, objQuery, function(results){
			var objQuery = queries[SMS];
			cb(results);
		});
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
			cb(results);
		});
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
			cb(results);
		});
	}
	return undefined;
}
/* check if the uniqueid 'uid' is present in 'cdr' table of 'asteriskcdrdb' database
 * return true if it is present, false otherwise */
function checkAudioUid(uid, filename, cb){
	var objQuery = queries[DAY_HISTORY_CALL];
        if(objQuery!==undefined){
                var copyObjQuery = Object.create(objQuery); // copy object
                copyObjQuery.query = "SELECT * FROM cdr WHERE uniqueid=\""+uid+"\" AND disposition=\"ANSWERED\""; // substitute query
                executeSQLQuery(DAY_HISTORY_CALL, copyObjQuery, function(results){ // execute current sql query
                        cb(results, filename, uid);
                });
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
                var connect_str = "DRIVER={FreeTDS};SERVER=" + objQuery.dbhost + ";UID=" + objQuery.dbuser + ";PWD=" + objQuery.dbpassword + ";DATABASE=" + objQuery.dbname;
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
	initDBConnections();
}
// Return the history of calling between specified interval time
getIntervalHistoryCall = function(ext,dateFrom,dateTo,num,cb){
	var objQuery = queries[INTERVAL_HISTORY_CALL];
	if(objQuery!=undefined){
		var copyObjQuery = Object.create(objQuery);
		num = num.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext).replace(/\$DATE_FROM/g,dateFrom).replace(/\$DATE_TO/g,dateTo).replace(/\$NUM/g,num);
		executeSQLQuery(INTERVAL_HISTORY_CALL, copyObjQuery, function(results){
			cb(results);
		});
	}
	return undefined;
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
                        cb(results);
                });
        }
        return undefined;
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
                        cb(results);
                });
        }
        return undefined;
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
                        cb(results);
                });
        }
        return undefined;
}
/* Return the customer card of the client extCC in type format.
 * The type is specified in section [CUSTOMER_CARD] of profiles.ini file */
getCustomerCard = function(ext, type, cb){
	var section = CUSTOMER_CARD + "_" + type;
	var objQuery = queries[section];
        if(objQuery!=undefined){
		// copy object
                var copyObjQuery = Object.create(objQuery);
                // substitue template field in query
		ext = ext.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		if(copyObjQuery.query===undefined){
			logger.error('query of \''+section+'\' is empty');
			cb(undefined);
			return;
		
		}
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeNamedSQLQuery(section, copyObjQuery, type, function(results, type){
                        cb(results, type);
                });
        } else {
		logger.error('no query for section \'' + section + '\'')
		cb(undefined)
	}
}
// Search in the database all phonebook contacts that match the given name
function getContactsPhonebook(name, cb){
	var objQuery = queries[PHONEBOOK];
	if(objQuery!=undefined){
                var copyObjQuery = Object.create(objQuery); // copy object
		name = name.replace(/'/g, "\\\'").replace(/"/g, "\\\""); // escape of chars ' and "
		if(copyObjQuery.query===undefined){
			logger.error('query for \''+PHONEBOOK+'\' not exists');
			cb(undefined);
			return;
		}
                copyObjQuery.query = copyObjQuery.query.replace(/\$NAME_TO_REPLACE/g, name); // substitue template field in query
		executeSQLQuery(PHONEBOOK, copyObjQuery, function(results){
			cb(results);
		});
	} else {
		logger.error('error in query configuration file for \''+PHONEBOOK+'\'');
		cb(undefined);
	}
}
/* Execute one sql query. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function. Otherwise it is possibile that the function return before
 * the completion of sql query operation */
function executeSQLQuery(type, objQuery, cb){
	// get already opened connection
	var conn = dbConnections[type];
	if(conn!==undefined){
	        var query = objQuery.query + ";";
		logger.debug('execute SQL query: ' + query);
		conn.query(query, function (err, results, fields) {
	        	if (err) {
	        		logger.error("ERROR in execute " + objQuery.dbtype + " query: " + err.message);
		        }
			cb(results);
	        });
	} else {
		logger.error('connection for query \''+type+'\' is ' + conn);
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
