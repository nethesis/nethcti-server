var fs = require("fs");
var sys = require("sys");
var iniparser = require("./lib/node-iniparser/lib/node-iniparser");
var mysql = require('./lib/node-mysql');
const DATACOLLECTOR_CONFIG_FILENAME = "dataProfiles.ini";
const PHONEBOOK = "phonebook";
const CUSTOMER_CARD = "customer_card";

var SECTION_NAME_CUSTOMER_CARD = "customer_card";
var SECTION_HISTORY_CALL = "history_call";
var SECTION_DAY_HISTORY_CALL = "day_history_call";
var SECTION_CURRENT_WEEK_HISTORY_CALL = "current_week_history_call";
var SECTION_CURRENT_MONTH_HISTORY_CALL = "current_month_history_call";

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

/*
 * Constructor
 */
exports.DataCollector = function(){
	initQueries();
	this.getContactsPhonebook = function(name, cb){ return getContactsPhonebook(name, cb); }
	this.getCustomerCard = function(ext, type, cb) { return getCustomerCard(ext, type, cb); }

	this.searchContactsPhonebook = function(extFrom, namex, cb){ return searchContactsPhonebook(extFrom, namex, cb); }
	this.getHistoryCall = function(exten, cb) { return getHistoryCall(exten, cb); }
	this.getDayHistoryCall = function(exten, date, cb) { return getDayHistoryCall(exten, date, cb); }
	this.checkUserPermitCurrentWeekHistoryCall = function(exten) { return checkUserPermitCurrentWeekHistoryCall(exten); }
	this.getCurrentWeekHistoryCall = function(exten, cb) { return getCurrentWeekHistoryCall(exten, cb); }
	this.checkUserPermitCurrentMonthHistoryCall = function(exten) { return checkUserPermitCurrentMonthHistoryCall(exten); }
	this.getCurrentMonthHistoryCall = function(exten, cb) { return getCurrentMonthHistoryCall(exten, cb); }
}

/*
 * Initialize all the queries that can be executed
 */
function initQueries(){
        this.queries = iniparser.parseSync(DATACOLLECTOR_CONFIG_FILENAME);
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
                var copyObjQuery = new Object(objQuery);
                // substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(copyObjQuery, function(results){
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
                var copyObjQuery = new Object(objQuery);
		// substitue template field in query
                copyObjQuery.query = copyObjQuery.query.replace(/\$NAME_TO_REPLACE/g, name);
		// execute current sql query
		executeSQLQuery(copyObjQuery, function(results){
			cb(results);
		});
	}
	return undefined;
}



/* 
 * Return the history of calling of the current month.
 */
getCurrentMonthHistoryCall = function(ext, cb){

        var currentUserSQLProfileObj = getUserSQLProfile(ext);
        var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_CURRENT_MONTH_HISTORY_CALL];

        if(currentSQLQueryObj!=undefined){
		// copy object
                var copyCurrentSQLQueryObj = Object.create(currentSQLQueryObj);
		// substitue template field in query
                copyCurrentSQLQueryObj.sqlQueryStr = copyCurrentSQLQueryObj.sqlQueryStr.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(copyCurrentSQLQueryObj, function(results){
                        cb(results);
                });
        }
        return undefined;
}



/* 
 * Return the history of calling of the current week.
 */
getCurrentWeekHistoryCall = function(ext, cb){

        var currentUserSQLProfileObj = getUserSQLProfile(ext);
        var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_CURRENT_WEEK_HISTORY_CALL];

        if(currentSQLQueryObj!=undefined){
		// copy object
                var copyCurrentSQLQueryObj = Object.create(currentSQLQueryObj);
		// substitue template field in query
                copyCurrentSQLQueryObj.sqlQueryStr = copyCurrentSQLQueryObj.sqlQueryStr.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(copyCurrentSQLQueryObj, function(results){
                        cb(results);
                });
        }
        return undefined;
}


/* 
 * Return the history of calling of one day.
 */
getDayHistoryCall = function(ext, date, cb){

        var currentUserSQLProfileObj = getUserSQLProfile(ext);
        var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_DAY_HISTORY_CALL];

        if(currentSQLQueryObj!=undefined){
		// copy object
		var copyCurrentSQLQueryObj = Object.create(currentSQLQueryObj);
		// substitue template field in query
		copyCurrentSQLQueryObj.sqlQueryStr = copyCurrentSQLQueryObj.sqlQueryStr.replace(/\$EXTEN/g, ext);		
		copyCurrentSQLQueryObj.sqlQueryStr = copyCurrentSQLQueryObj.sqlQueryStr.replace(/\$DATE/g, date);		

                // execute current sql query
                executeSQLQuery(copyCurrentSQLQueryObj, function(results){
                        cb(results);
                });
        }
        return undefined;
}



/* 
 * Return the full history of calling.
 */
getHistoryCall = function(ext, cb){

	var currentUserSQLProfileObj = getUserSQLProfile(ext);
        var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_HISTORY_CALL];

	if(currentSQLQueryObj!=undefined){
		// copy object
                var copyCurrentSQLQueryObj = Object.create(currentSQLQueryObj);
		// substitue template field in query
                copyCurrentSQLQueryObj.sqlQueryStr = copyCurrentSQLQueryObj.sqlQueryStr.replace(/\$EXTEN/g, ext);
                // execute current sql query
                executeSQLQuery(copyCurrentSQLQueryObj, function(results){
                        cb(results);
                });
        }
        return undefined;
}




/*
 * Return the sql user profile.
 */
getUserSQLProfile = function(exten){

	return this.listUserSQLProfiles[exten];
}



/*
 * Execute one sql query and return an array of object. This function must have 
 * a callback function as second parameter because the asynchronous nature of
 * mysql query function. Otherwise it is possibile that the function return before
 * the completion of sql query operation.
 */
function executeSQLQuery(objQuery, cb){
	// execute query to mysql server
	if(objQuery.dbtype=="mysql"){
		var client = new mysql.Client();
		client.host = objQuery.dbhost;
		client.port = objQuery.dbport;
		client.user = objQuery.dbuser;
		client.password = objQuery.dbpassword;
		client.connect();
		// set the database to use
		var query = "USE " + objQuery.dbname + ";";
		client.query(query, function selectCb(err, results, fields) {
		    if (err) {
      			throw err;
		    }
		});
		// execute query
		query = objQuery.query + ";";
		client.query(query, function selectCb(err, results, fields) {
		    if (err) {
			client.end();
      			throw err;
		    }
		    client.end();
		    cb(results);
		});
	}
	// execute query to microsoft sql server
	else if(objQuery.dbtype=="mssql"){
		var odbc = require("./lib/node-odbc/odbc");

		var db = new odbc.Database();
		var connect_str = "DRIVER={FreeTDS};SERVER=" + objQuery.dbhost + ";UID=" + objQuery.dbuser + ";PWD=" + objQuery.dbpassword + ";DATABASE=" + objQuery.dbname;
		query = objQuery.query + ";";

		db.open(connect_str, function(err)
		{
    			db.query(query, function(err, rows, moreResultSets)
    			{
				cb(rows);
        			db.close(function(){});
    			});
		});
	}
}


/*
 * Print all sql query profile of the users.
 */
printListUserSQLProfiles = function(){

	console.log("Current initialized sql profiles of users are:");
	console.log(this.listUserSQLProfiles);
}



/*
 * Initialize all sql profiles of the users.
 */
function initSQLProfiles(){

	// read file
	var profiles = fs.readFileSync(DATACOLLECTOR_CONFIG_FILENAME, "UTF-8", function(err, data) {
		if(err){
			sys.puts("error in reading file");
			sys.puts(err);
			return;
		}
		return data;
	});
	
	// each array element has information of one category as string
	var categoriesArray = profiles.split("[");
	categoriesArray = categoriesArray.slice(1,categoriesArray.length);

	// 
	for(var i=0; i<categoriesArray.length; i++){
	
		var tempCategoryStr = categoriesArray[i];
		// current array contains only one category
		var tempCategoryArray = tempCategoryStr.split("\n");
		var categoryName = tempCategoryArray[0].slice(0, tempCategoryArray[0].length-1);
		var dbHost;
		var dbPort;
		var dbType;
		var dbUsername;
		var dbPassword;
		var dbName;
		var dbQuerySQLStr;
		var listUsersArray;
		
		for(token=1; token<tempCategoryArray.length; token++){
		
			// initialize dbHost
			if(tempCategoryArray[token].indexOf("dbhost") != -1){
				var dbHostLineStr = tempCategoryArray[token];
				dbHost = dbHostLineStr.split("=")[1];
			}
			// initialize dbPort
			else if(tempCategoryArray[token].indexOf("dbport") != -1){
				var dbPortLineStr = tempCategoryArray[token];
				dbPort = dbPortLineStr.split("=")[1];
			}
			// initialize dbType
			else if(tempCategoryArray[token].indexOf("dbtype") != -1){
				var dbTypeLineStr = tempCategoryArray[token];
				dbType = dbTypeLineStr.split("=")[1];
			}
			// initialize dbUsername
			else if(tempCategoryArray[token].indexOf("dbuser") != -1){
				var dbUsernameLineStr = tempCategoryArray[token];
				dbUsername = dbUsernameLineStr.split("=")[1];
			}
			// initialize dbUserPassword
			else if(tempCategoryArray[token].indexOf("dbpassword") != -1){
				var dbPasswordLineStr = tempCategoryArray[token];
				dbPassword = dbPasswordLineStr.split("=")[1];
			}
			// initialize dbName
			else if(tempCategoryArray[token].indexOf("dbname") != -1){
				var dbNameLineStr = tempCategoryArray[token];
				dbName = dbNameLineStr.split("=")[1];
			}
			// initialize dbQuerySQL
			else if(tempCategoryArray[token].indexOf("query") != -1){
				var dbQuerySQLLineStr = tempCategoryArray[token];
				dbQuerySQLStr = dbQuerySQLLineStr.split('"')[1];
			}
			// array with users
			else if(tempCategoryArray[token].indexOf("users") != -1){
				var listUsersStr = tempCategoryArray[token];
				listUsersArray = listUsersStr.split("=");
				listUsersArray = listUsersArray[1].split(",");
			}
		}
		// initialize categories in memory if they aren't already present
		initUserSQLProfilesInMemory(categoryName, dbHost, dbPort, dbType, dbUsername, dbPassword, dbName, dbQuerySQLStr, listUsersArray);
	}

}


/*
 * Initialize one sql user profile.
 */
function initUserSQLProfilesInMemory(categoryName, dbHost, dbPort, dbType, dbUsername, dbPassword, dbName, dbQuerySQLStr, listUsersArray){


	for(m=0; m<listUsersArray.length; m++){
	
		var user = listUsersArray[m];
		
		// the value of user exten is not set in config file
		if(user==''){
			continue;
		}
		
		// create new SQLQuery object
		var newSqlQueryObj = new SQLQuery(categoryName, dbHost, dbPort, dbType, dbUsername, dbPassword, dbName, dbQuerySQLStr);
			
		// if the user is not present, it create new UserSQLProfile object
		if(!testUserSQLProfilePresence(user) && user!=''){
			
			// create new UserSQLProfile
			var newUserSQLProfile = new UserSQLProfile(user);
			newUserSQLProfile.listSQLQueries[categoryName] = newSqlQueryObj;
			
			// add new sql user profile
			this.listUserSQLProfiles[user] = newUserSQLProfile;
			//console.log("added new user [" + user + "]\n");
		}
		// add sql query to user already present
		else{
			addSQLQueryToUser(user, newSqlQueryObj);
		}
	}
}


/*
 * Add new sql query to already created user.
 */
function addSQLQueryToUser(exten, sqlQueryObj){

	var categoryName = sqlQueryObj.category;
	this.listUserSQLProfiles[exten].listSQLQueries[categoryName] = sqlQueryObj;
}


/*
 * Test if the user exten is already created.
 */
function testUserSQLProfilePresence(exten){

	if(this.listUserSQLProfiles[exten]!=undefined)
		return true;
	return false;
}
