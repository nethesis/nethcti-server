var dataReq = require("./dataCollector.js");
var exten = "500";

console.log("TEST with exten = " + exten);

var dataCollector = new dataReq.DataCollector();
console.log("DataCollector object created");


//
/*
console.log("\nTEST printUserSQLProfiles:");
dataCollector.printUserSQLProfiles();
console.log("\n");


//
console.log("\nTEST getUserSQLProfile");
var userSQLProfiles = dataCollector.getUserSQLProfile(exten);
console.log(userSQLProfiles);
console.log("\n");

//
console.log("\nTEST testUserPermitCustomerCard " + exten);
var res = dataCollector.testUserPermitCustomerCard(exten);
console.log("RES = ");
console.log(res);
console.log("\n");



//
console.log("\nTEST executeQueriesForUser " + exten);
var resultArray = dataCollector.executeSQLQueriesForUser(exten);
console.log("RES = ");
console.log(resultArray);
console.log("\n");


//
console.log("\nTEST getCustomerCard from applicant 500 for customer 501");
var res = dataCollector.getCustomerCard("500", "501");
console.log("RES = ");
console.log(res);
console.log("\n");
*/



