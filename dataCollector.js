var fs = require("fs");
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
	this.getDayHistoryCall = function(ext, date, cb) { return getDayHistoryCall(ext, date, cb); }
	this.getCurrentWeekHistoryCall = function(ext, cb) { return getCurrentWeekHistoryCall(ext, cb); }
	this.getCurrentMonthHistoryCall = function(ext, cb) { return getCurrentMonthHistoryCall(ext, cb); }
	this.addController = function(contr) { addController(contr) }
	this.setLogger = function(logfile,level) { log4js.addAppender(log4js.fileAppender(logfile), '[DataCollector]'); logger.setLevel(level); }
	this.checkAudioUid = function(uid, filename, cb) { return checkAudioUid(uid, filename, cb); }
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
	if(objQuery.dbtype=="mysql"){
		var client = new mysql.Client();
                client.host = objQuery.dbhost;
                client.port = objQuery.dbport;
                client.user = objQuery.dbuser;
                client.password = objQuery.dbpassword;
		client.database = objQuery.dbname;
	        client.connect();
		dbConnections[key] = client;
	}
        else if(objQuery.dbtype=="mssql"){
               	var db = new odbc.Database();
                var connect_str = "DRIVER={FreeTDS};SERVER=" + objQuery.dbhost + ";UID=" + objQuery.dbuser + ";PWD=" + objQuery.dbpassword + ";DATABASE=" + objQuery.dbname;
                db.open(connect_str, function(err) {
			logger.error("ERROR connect to DB mssql");
			logger.error(sys.inspect(err));
                });
		dbConnections[key] = db;
        }
}

// Initialize all the queries that can be executed and relative connection to database
function initQueries(){
        this.queries = iniparser.parseSync(DATACOLLECTOR_CONFIG_FILENAME);
	initDBConnections();
}

// Return the history of calling of the current month.
getCurrentMonthHistoryCall = function(ext, cb){
	var objQuery = queries[CURRENT_MONTH_HISTORY_CALL];
        if(objQuery!=undefined){
                // copy object
                var copyObjQuery = Object.create(objQuery);
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(CURRENT_MONTH_HISTORY_CALL, copyObjQuery, function(results){
                        cb(results);
                });
        }
        return undefined;
}


// Return the history of calling of the current week
getCurrentWeekHistoryCall = function(ext, cb){
	var objQuery = queries[CURRENT_WEEK_HISTORY_CALL];
        if(objQuery!=undefined){
                // copy object
                var copyObjQuery = Object.create(objQuery);
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(CURRENT_WEEK_HISTORY_CALL, copyObjQuery, function(results){
                        cb(results);
                });
        }
        return undefined;
}

// Return the history of calling of one day.
getDayHistoryCall = function(ext, date, cb){
	var objQuery = queries[DAY_HISTORY_CALL];
        if(objQuery!=undefined){
                // copy object
                var copyObjQuery = Object.create(objQuery);
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                copyObjQuery.query = copyObjQuery.query.replace(/\$DATE/g, date);
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
		// copy object
                var copyObjQuery = Object.create(objQuery);
		// substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$NAME_TO_REPLACE/g, name);
		// execute current sql query
		executeSQLQuery(PHONEBOOK, copyObjQuery, function(results){
			cb(results);
		});
	}
	return undefined;
}


/* Execute one sql query. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function. Otherwise it is possibile that the function return before
 * the completion of sql query operation */
function executeSQLQuery(type, objQuery, cb){
	// get already opened connection
	var conn = dbConnections[type];
        var query = objQuery.query + ";";
	conn.query(query, function (err, results, fields) {
        	if (err) {
        		logger.error("ERROR in execute " + objQuery.dbtype + " query");
	                logger.error(sys.inspect(err));
	        }
	        cb(results);
        });
}


/* Execute name one sql query. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function. Otherwise it is possibile that the function return before
 * the completion of sql query operation */
function executeNamedSQLQuery(type, objQuery, name, cb){
        // get already opened connection
        var conn = dbConnections[type];
        var query = objQuery.query + ";";
        conn.query(query, function (err, results, fields) {
                if (err) {
                        logger.error("ERROR in execute " + objQuery.dbtype + " query");
                        logger.error(sys.inspect(err));
                }
                cb(results, name);
        });
}
