var fs = require("fs");
var sys = require("sys");
// require mysql-devel: yum install mysql-devel
var mysql = require('./lib/node-mysql-libmysqlclient');
var configFilename = "dataProfiles.conf";




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
	this.executeSQLQueriesForUser = function(exten) { return executeSQLQueriesForUser(exten); }
	this.getCustomerCard = function(extenApplicant, extenCustomerCard) { return getCustomerCard(extenApplicant, extenCustomerCard); }
	this.testUserPermitCustomerCard = function(exten) { return testUserPermitCustomerCard(exten); }
}


/*
 * Test if the user exten has the authorization to view customer card. Therefore
 * it check if the user has a query of category "customer_card".
 */
testUserPermitCustomerCard = function(exten){

	if(this.listUserSQLProfiles[exten].listSQLQueries["customer_card"]!=undefined)
		return true;
	return false;

}


/*
 * Return the customer card of client exten. If the user hasn't query to get 
 * customer card, means that he doesn't has the right of access to custormer card.
 * So, in this case, the function return an undefined.
 */
getCustomerCard = function(extenApplicant, extenCustomerCard){

	var currentUserSQLProfileObj = getUserSQLProfile(extenApplicant);
	var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries["customer_card"];
	if(currentSQLQueryObj!=undefined){
		currentSQLQueryObj.sqlQueryStr = currentSQLQueryObj.sqlQueryStr.replace("$EXTEN", extenCustomerCard);
	
		// execute current sql query
		return executeSQLQuery(currentSQLQueryObj);
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
 * Execute all queries for the exten user. 
 * Return an array of result. Each element of the 
 * returned array is another array containing objects.
 */
executeSQLQueriesForUser = function(exten){
	
	var queriesResultArray = new Array();
	
	var currentUserSQLProfileObj = getUserSQLProfile(exten);
	for(currSQLQuery in currentUserSQLProfileObj.listSQLQueries){
		var currentSQLQueryObj = currentUserSQLProfileObj.listSQLQueries[currSQLQuery];
		console.log("Eseguo query di : ");
		console.log(currentSQLQueryObj);
		
		// execute current sql query
		var result = executeSQLQuery(currentSQLQueryObj);
		queriesResultArray.push(result);
	}
	return queriesResultArray;
}


/*
 * Execute one sql query and return an array of object.
 */
executeSQLQuery = function(currentSQLQueryObj){
	
	
	// execute query to mysql server
	if(currentSQLQueryObj.dbType=="mysql"){
	
		var dbConnection = mysql.createConnectionSync();
		dbConnection.connectSync(currentSQLQueryObj.dbHost, currentSQLQueryObj.dbUsername, currentSQLQueryObj.dbPassword, "hotel");

		if (!dbConnection.connectedSync()) {
		  	sys.puts("Connection error " + dbConnection.connectErrno + ": " + dbConnection.connectError);
			process.exit(1);
		}
		else{
			console.log("Connected to database '" + currentSQLQueryObj.dbName + "'");
		}
		
		// synchronous query
		console.log('execute query: "' + currentSQLQueryObj.sqlQueryStr + '"');
		result = dbConnection.querySync(currentSQLQueryObj.sqlQueryStr + ";");
		rows = result.fetchAllSync();
		dbConnection.closeSync();
		return rows;
		
		// this is the asynchronous query
		/* 
		dbConnection.query("SELECT * FROM camere;", function (err, res) {
  			if (err) {
   			throw err;
  			}
  
  			res.fetchAll(function (err, rows) {
    			if (err) {
      			throw err;
    			}
    
    			sys.puts("Rows in table hotel.camere:");
    			sys.puts(sys.inspect(rows));
  			});
		});
		
	   process.on('exit', function () {
  			dbConnection.closeSync();
		});
		*/
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
	var profiles = fs.readFileSync(configFilename, "UTF-8", function(err, data) {
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




