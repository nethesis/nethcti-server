var dataReq = require("./dataCollector.js");
var exten = "700";

console.log("TEST with exten = " + exten);

var dataCollector = new dataReq.DataCollector();
console.log("DataCollector object created");

/*
//
console.log("\nTEST printUserSQLProfiles:");
dataCollector.printUserSQLProfiles();
console.log("\n");

//
console.log("\nTEST getAllUserSQLProfiles");
var allUserSQLProfiles = dataCollector.getAllUserSQLProfiles();
console.log(allUserSQLProfiles);
console.log("\n");

//
console.log("\nTEST getUserSQLProfile");
var userSQLProfiles = dataCollector.getUserSQLProfile(exten);
console.log(userSQLProfiles);
console.log("\n");
*/
//
console.log("\nTEST executeQueriesForUser " + exten);
var resultArray = dataCollector.executeSQLQueriesForUser(exten);
console.log("RES = ");
console.log(resultArray);
console.log("\n");


