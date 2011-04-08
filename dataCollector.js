var fs = require("fs");
var sys = require("sys");
var mysql = require('./lib/node-mysql');
var DATACOLLECTOR_CONFIG_FILENAME = "dataProfiles.conf";
var SECTION_NAME_CUSTOMER_CARD = "customer_card";
var SECTION_SEARCH_ADDRESSES = "search_addresses";
var SECTION_HISTORY_CALL = "history_call";
var SECTION_DAY_HISTORY_CALL = "day_history_call";

//var SECTION_NAME_CUSTOMER_CARD = "customer_card";// for development


/* It's the list of sql user profiles expressed as hash table of key and value.
 * The key is the exten of the user and its value is the object UserSQLProfile.
 */
listUserSQLProfiles = {};


/*
 * SQL query object.
 */
SQLQuery = function(cat, host, port, type, user, pwd, dbname, sqlQuery){
	this.category = cat;
	this.dbHost = host;
	this.dbPort = port;
	this.dbType = type;
	this.dbUsername = user;
	this.dbPassword = pwd;
	this.dbName = dbname;
	// sqlQueryStr is an sql query as a string
	this.sqlQueryStr = sqlQuery;
}



/*
 * SQL user profile object.
 */
UserSQLProfile = function(ext){
	this.exten = ext;
	/* it is an hash table. The key is the category of sql query and the value
	 * is SQLQuery object with all parameters needed to execute query.
	 */
	this.listSQLQueries = {};
}


/*
 * Constructor
 */
exports.DataCollector = function(){
	initSQLProfiles();
	this.printUserSQLProfiles = function() { printListUserSQLProfiles(); }
	this.getAllUserSQLProfiles = function(){ return listUserSQLProfiles; }
	this.getUserSQLProfile = function(exten){	return getUserSQLProfile(exten); }
	this.testUserPermitCustomerCard = function(exten) { return testUserPermitCustomerCard(exten); }
	this.getCustomerCard = function(extenApplicant, extenCustomerCard, cb) { return getCustomerCard(extenApplicant, extenCustomerCard, cb); }
	this.testPermitUserSearchAddressPhonebook = function(extFrom){ return testPermitUserSearchAddressPhonebook(extFrom); }
	this.searchContactsPhonebook = function(extFrom, namex, cb){ return searchContactsPhonebook(extFrom, namex, cb); }
	this.getHistoryCall = function(exten, cb) { return getHistoryCall(exten, cb); }
	this.getDayHistoryCall = function(exten, date, cb) { return getDayHistoryCall(exten, date, cb); }
	this.testUserPermitHistoryCall = function(exten) { return testUserPermitHistoryCall(exten); }
}



/*
 * Search in database all phonebook contacts that match given namex
 */
searchContactsPhonebook = function(extFrom, namex, cb){

	var currentUserSQLProfileObj = getUserSQLProfile(extFrom);
	var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_SEARCH_ADDRESSES];
		
	var temp = currentSQLQueryObj.sqlQueryStr;
		
	if(currentSQLQueryObj!=undefined){
	
		// substitute query template
		while(currentSQLQueryObj.sqlQueryStr.indexOf("$NAME_TO_REPLACE")!=-1){
		
			currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace("$NAME_TO_REPLACE", namex);
		}
		
		// execute current sql query
		executeSQLQuery(currentSQLQueryObj, function(results){
			cb(results);
		});
		
		// reconstruct oroginal query for future asking
		currentSQLQueryObj.sqlQueryStr = temp;
	}
	return undefined;

}



/*
 * Test if the user exten has the authorization to search contact in phonebook. 
 */
testPermitUserSearchAddressPhonebook = function(exten){

	if(this.listUserSQLProfiles[exten].listSQLQueries[SECTION_SEARCH_ADDRESSES]!=undefined)
		return true;
	return false;

}



/*
 * Test if the user exten has the authorization to view customer card. Therefore
 * it check if the user has a query of category "SECTION_NAME_CUSTOMER_CARD".
 */
testUserPermitCustomerCard = function(exten){

	if(this.listUserSQLProfiles[exten].listSQLQueries[SECTION_NAME_CUSTOMER_CARD]!=undefined)
		return true;
	return false;

}


/*
 * Test if the user exten has the authorization to view his history of calling. Therefore
 * it check if the user has a query of category "SECTION__HISTORY_CALL".
 */
testUserPermitHistoryCall = function(exten){

        if(this.listUserSQLProfiles[exten].listSQLQueries[SECTION_HISTORY_CALL]!=undefined)
                return true;
        return false;

}


/* 
 * Return the full history of calling.
 */
getDayHistoryCall = function(ext, date, cb){

        var currentUserSQLProfileObj = getUserSQLProfile(ext);
        var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_DAY_HISTORY_CALL];

        console.log("currentSQLQueryObj =");
        console.log(currentSQLQueryObj);
        console.log(currentSQLQueryObj.sqlQueryStr);

        if(currentSQLQueryObj!=undefined){

		// substitue $EXTEN
                while(currentSQLQueryObj.sqlQueryStr.indexOf("$EXTEN")!=-1){
                        currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace("$EXTEN", ext);
                }

		// substitute $DATE
		while(currentSQLQueryObj.sqlQueryStr.indexOf("$DATE")!=-1){
                        currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace("$DATE", date);
                }


                // execute current sql query
                executeSQLQuery(currentSQLQueryObj, function(results){
                        cb(results);
                });


		while(currentSQLQueryObj.sqlQueryStr.indexOf(ext)!=-1){
                        currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace(ext, "$EXTEN");
                }

                while(currentSQLQueryObj.sqlQueryStr.indexOf(date)!=-1){
                        currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace(date, "$DATE");
                }

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
	
                while(currentSQLQueryObj.sqlQueryStr.indexOf("$EXTEN")!=-1){
                        currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace("$EXTEN", ext);
                }

                // execute current sql query
                executeSQLQuery(currentSQLQueryObj, function(results){
                        cb(results);
                });

                while(currentSQLQueryObj.sqlQueryStr.indexOf(ext)!=-1){
                        currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace(ext, "$EXTEN");
                }
        }
        return undefined;
}

/*
 * Return the customer card of client exten. If the user hasn't query to get 
 * customer card, means that he doesn't has the right of access to custormer card.
 * So, in this case, the function return an undefined.
 */
getCustomerCard = function(extenApplicant, extenCustomerCard, cb){

	var currentUserSQLProfileObj = getUserSQLProfile(extenApplicant);
	var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[SECTION_NAME_CUSTOMER_CARD];
		
	if(currentSQLQueryObj!=undefined){
	
		while(currentSQLQueryObj.sqlQueryStr.indexOf("$EXTEN")!=-1){
			currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace("$EXTEN", extenCustomerCard);
		}
		
		// execute current sql query
		executeSQLQuery(currentSQLQueryObj, function(results){
			cb(results);
		});
		
		
		while(currentSQLQueryObj.sqlQueryStr.indexOf(extenCustomerCard)!=-1){
			currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace(extenCustomerCard, "$EXTEN");
		}
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
executeSQLQuery = function(currentSQLQueryObj, cb){
	
	// execute query to mysql server
	if(currentSQLQueryObj.dbType=="mysql"){
		
		var client = new mysql.Client();
		client.host = currentSQLQueryObj.dbHost;
		client.port = currentSQLQueryObj.dbPort;
		client.user = currentSQLQueryObj.dbUsername;
		client.password = currentSQLQueryObj.dbPassword;
		
		client.connect();
		// set the database to use
		var query = "USE " + currentSQLQueryObj.dbName + ";";
		client.query(query, function selectCb(err, results, fields) {
		    if (err) {
      			throw err;
		    }
		});
		
		// execute query
		query = currentSQLQueryObj.sqlQueryStr + ";";
		client.query(query, function selectCb(err, results, fields) {
		    if (err) {
      			throw err;
		    }

		    client.end();
		    cb(results);
		});
	}
	// execute query to microsoft sql server
	else if(currentSQLQueryObj.dbType=="mssql"){
		console.log("connection to mssql TO IMPLEMENT !!!!!!!");		
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
