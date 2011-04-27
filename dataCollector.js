var fs = require("fs");
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var mysql = require('./lib/node-mysql');
var odbc = require("./lib/node-odbc/odbc");

const DATACOLLECTOR_CONFIG_FILENAME = "dataProfiles.ini";
const PHONEBOOK = "phonebook";
const CUSTOMER_CARD = "customer_card";
const DAY_HISTORY_CALL = "day_history_call";
const CURRENT_WEEK_HISTORY_CALL = "current_week_history_call";
const CURRENT_MONTH_HISTORY_CALL = "current_month_history_call";


/* this is the list of the queries expressed in the config file: the key is the section name
 * and the value is the all parameter to execute the query.
 */
/* An example:
{ customer_card_default: 
   { dbhost: 'localhost',
     dbport: '3306',
     dbtype: 'mysql',
     dbuser: 'pbookuser',
     dbpassword: 'pbookpass',
     dbname: 'phonebook',
     query: '"select * from phonebook where homephone like \'%$EXTEN\' or workphone like \'%$EXTEN\' or cellphone like \'%$EXTEN\' or fax like \'%$EXTEN\'"' 
   } 
}
*/
queries = {};

// this is the controller to manage changing in the configuration file of profiles
controller = null;


/* this is a JSON object that has section name of dataProfiles.ini as key and connection objects 
 * to database as the value.
 */
dbConnections = {};

/*
 * Constructor
 */
exports.DataCollector = function(){
	initQueries();
	this.getContactsPhonebook = function(name, cb){ return getContactsPhonebook(name, cb); }
	this.getCustomerCard = function(ext, type, cb) { return getCustomerCard(ext, type, cb); }
	this.getDayHistoryCall = function(ext, date, cb) { return getDayHistoryCall(ext, date, cb); }
	this.getCurrentWeekHistoryCall = function(ext, cb) { return getCurrentWeekHistoryCall(ext, cb); }
	this.getCurrentMonthHistoryCall = function(ext, cb) { return getCurrentMonthHistoryCall(ext, cb); }
	this.addController = function(contr) { addController(contr) }
}

// add controller to manage changin in configuration file
function addController(contr){
        controller = contr;
        log("added controller");
        controller.addFile(DATACOLLECTOR_CONFIG_FILENAME);
        controller.addListener("change_file", function(filename){
               if(filename==DATACOLLECTOR_CONFIG_FILENAME){
                        log("update configuration file " + DATACOLLECTOR_CONFIG_FILENAME);
                        updateConfiguration();
                }
        });
}

/* this function update queries in memory after changing of configuration
 * file.
 */
function updateConfiguration(){
        initQueries();
}

/* This function open new connection for each section of configuration file dataProfiles.ini and
 * memorize it in dbConnections object. The key is the section name and the value is the connection.
 */
function initDBConnections(){
	for(key in queries){
		var objQuery = queries[key];
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
				log("ERROR in connect to DB mssql");
				console.log(err);
	                });
			dbConnections[key] = db;
	        }
	}
	console.log(dbConnections);
}

/*
 * Initialize all the queries that can be executed and relative connection to database
 */
function initQueries(){
        this.queries = iniparser.parseSync(DATACOLLECTOR_CONFIG_FILENAME);
	initDBConnections();
}

/* 
 * Return the history of calling of the current month.
 */
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

/* 
 * Return the history of calling of the current week.
 */
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

/* 
 * Return the history of calling of one day.
 */
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

/*
 * Return the customer card of the client extCC in type format.
 * The type is specified in section [CUSTOMER_CARD] of profiles.ini file.
 */
getCustomerCard = function(ext, type, cb){
	var section = CUSTOMER_CARD + "_" + type;
	var objQuery = queries[section];
        if(objQuery!=undefined){
		// copy object
                var copyObjQuery = Object.create(objQuery);
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(section, copyObjQuery, function(results){
                        cb(results);
                });
        }
        return undefined;
}

/*
 * Search in the database all phonebook contacts that match the given name
 */
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

/*
 * Execute one sql query. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function.Otherwise it is possibile that the function return before
 * the completion of sql query operation.
 */
function executeSQLQuery(type, objQuery, cb){
	// get already opened connection
	var conn = dbConnections[type];
        var query = objQuery.query + ";";
	if(objQuery.dbtype=="mysql"){  // execute mysql query
	       	conn.query(query, function selectCb(err, results, fields) {
	        	if (err) {
	                	log("ERROR in execute mysql query");
				console.log(err);
	                        throw err;
	                }
	                cb(results);
	        });	
	}
	else if(objQuery.dbtype=="mssql"){ // execute mssql query
		db.query(query, function(err, rows, moreResultSets)
                {
			if (err) {
                                log("ERROR in execute mssql query");
                                console.log(err);
                                throw err;
                        }
	                cb(rows);
                });
	}
}

// custom log function to output debug info
function log(msg){
	console.log(new Date().toUTCString() + " - [DataCollector]: " + msg);
}
