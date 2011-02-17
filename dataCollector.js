var fs = require("fs");
var sys = require("sys");
// require mysql-devel: yum install mysql-devel
var mysql = require('./lib/node-mysql-libmysqlclient');
var configFilename = "dataProfiles.conf";

// array of UserSQLProfile object
listUserSQLProfiles = [];


/*
 * An sql query
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
 * Sql user profile  object
 */
UserSQLProfile = function(ext, sqlQuery){
	this.exten = ext;
	// listSQLQueriesArray is an array of SQLQuery object 
	this.listSQLQueriesArray = sqlQuery;
}


/*
 * Constructor
 */
exports.DataCollector = function(){
	initSQLProfiles();
	this.printUserSQLProfiles = function() { printListUserSQLProfiles(); }
	this.executeQueriesForUser = function(exten) { executeQueriesForUser(exten); }
	this.getAllUserSQLProfiles = function(){ return listUserSQLProfiles; }
	this.getUserSQLProfile = function(exten){	return getUserSQLProfile(exten); }
	this.executeSQLQueriesForUser = function(exten) { return executeSQLQueriesForUser(exten); }
}


/*
 * 
 */
getUserSQLProfile = function(exten){

	for(i=0; i<this.listUserSQLProfiles.length; i++){
		
		currentUserSQLProfile = this.listUserSQLProfiles[i];
		
		if(currentUserSQLProfile.exten==exten){
			return currentUserSQLProfile;
		}
	}
}


/*
 * Execute all queries for the exten user. 
 * Return an array of result. Each element of the 
 * returned array is another array contains objects.
 */
executeSQLQueriesForUser = function(exten){
	
	// user sql profile
	var queriesResultArray = new Array();
	var currentUserSQLProfileObj = getUserSQLProfile(exten);
	console.log(currentUserSQLProfileObj);
	
	// user sql queries
	var currentUserSQLQueriesArray = currentUserSQLProfile.listSQLQueriesArray;
	
	// execute all queries for the user
	for(i=0; i<currentUserSQLQueriesArray.length; i++){
	
		var currentSQLQueryObj = currentUserSQLQueriesArray[i];
		
		// execute current sql query
		var result = executeSQLQuery(currentSQLQueryObj);
		queriesResultArray.push(result);
	}
	
	return queriesResultArray.slice(1, queriesResultArray.length);
//	return queriesResultArray;
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
//		sys.puts(sys.inspect(rows) + "\n");
		dbConnection.closeSync();
		return rows;
		
		// asynchronous query
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
	
	/*
		var connection = new ActiveXObject("ADODB.Connection") ;

		var connectionstring="Data Source=&lt;server&gt;;Initial Catalog=&lt;catalog&gt;;User ID=&lt;user&gt;;Password=&lt;password&gt;;Provider=SQLOLEDB";

		connection.Open(connectionstring);
		var rs = new ActiveXObject("ADODB.Recordset");

		rs.Open("SELECT * FROM table", connection);
		rs.MoveFirst
		while(!rs.eof)
		{
		   document.write(rs.fields(1));
		   rs.movenext;
		}

		rs.close;
		connection.close;

	*/
		console.log("connection to mssql TO IMPLEMENT");		
	}
	
}


/*
 * 
 */
printListUserSQLProfiles = function(){

	console.log("Current initialized sql profiles of users:");
	
	for(i=0; i<this.listUserSQLProfiles.length; i++){
			
		console.log("[" + (i+1) + "] User name: " + this.listUserSQLProfiles[i].exten);

		var currentSQLQueryArray = this.listUserSQLProfiles[i].listSQLQueriesArray;		
		
		for(x=0; x<currentSQLQueryArray.length; x++){
		
			var currentSQLQuery = currentSQLQueryArray[x];
			
			console.log("\tQuery [" + (x+1) + "]");
			console.log("\t\tcategory: " + currentSQLQuery.category);
			console.log("\t\tdbHost: " + currentSQLQuery.dbHost);
			console.log("\t\tdbPort: " + currentSQLQuery.dbPort);
			console.log("\t\tdbType: " + currentSQLQuery.dbType);
			console.log("\t\tdbUsername: " + currentSQLQuery.dbUsername);
			console.log("\t\tdbPassword: " + currentSQLQuery.dbPassword);
			console.log("\t\tdbName: " + currentSQLQuery.dbName);
			console.log("\t\t\tquery: " + currentSQLQuery.sqlQueryStr);
		}
		console.log();
	}
	
	console.log("Total current sql user profiles is " + this.listUserSQLProfiles.length);
	
}



/*
 * 
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
				dbQuerySQLStr = dbQuerySQLLineStr.split("=")[1];
			}
			// array with users
			else if(tempCategoryArray[token].indexOf("users") != -1){
				var listUsersStr = tempCategoryArray[token];
				listUsersArray = listUsersStr.split("=");
				listUsersArray = listUsersArray[1].split(",");
			}
		}
		/*
		console.log(categoryName);
		console.log(dbHost);
		console.log(dbPort);
		console.log(dbType);
		console.log(dbUsername);
		console.log(dbPassword);
		console.log(dbName);
		console.log(dbQuerySQLStr);
		console.log(listUsersArray);
		console.log("\n");
		*/
		// initialize categories in memory if they aren't already present
		initUserSQLProfilesInMemory(categoryName, dbHost, dbPort, dbType, dbUsername, dbPassword, dbName, dbQuerySQLStr, listUsersArray);
	}

}


/*
 * 
 */
function initUserSQLProfilesInMemory(categoryName, dbHost, dbPort, dbType, dbUsername, dbPassword, dbName, dbQuerySQLStr, listUsersArray){

	for(m=0; m<listUsersArray.length; m++){
	
		var user = listUsersArray[m];
		
		// the value of user exten is not set
		if(user==''){
//			console.log("user [" + user + "] not defined: continue");
			continue;
		}
		
		// create new SQLQuery object
			var newSqlQueryObj = new SQLQuery(categoryName, dbHost, dbPort, dbType, dbUsername, dbPassword, dbName, dbQuerySQLStr);
			
		// if the user is not present, it create new UserSQLProfile object
		if(!testUserSQLProfilePresence(user) && user!=''){
			
			// create new UserSQLProfile
			var newUserSQLProfile = new UserSQLProfile(user, new Array(newSqlQueryObj));
			this.listUserSQLProfiles.push(newUserSQLProfile);
//			console.log("added new user [" + user + "]");
		}
		// it add sql query to user already present
		else{
			addSQLQueryToUser(user, newSqlQueryObj);
		}
	}
}


/*
 * 
 */
function addSQLQueryToUser(exten, sqlQueryObj){

	for(i=0; i<this.listUserSQLProfiles.length; i++){
	
		if(this.listUserSQLProfiles[i].exten==exten){
			this.listUserSQLProfiles[i].listSQLQueriesArray.push(sqlQueryObj);
			return;
		}
	}

}


/*
 * 
 */
function testUserSQLProfilePresence(exten){

	for(i=0; i<this.listUserSQLProfiles.length; i++){
		if(listUserSQLProfiles[i].exten==exten){
			return true;
		}
	}
	return false;
}




