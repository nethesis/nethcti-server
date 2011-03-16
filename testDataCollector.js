var dataReq = require("./dataCollector.js");
var exten = "500";

//console.log("TEST with exten = " + exten);

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
console.log("\nTEST testUserPermitPhonebook " + exten);
var res = dataCollector.testUserPermitPhonebook(exten);
console.log("RES = ");
console.log(res);
console.log("\n");
*/
//
console.log("\nTEST getCustomerCard from applicant 500 for customer 501");
dataCollector.getPhonebook("500", "501", function(result){
	console.log("RES = ");
	console.log(result);
	console.log("\n");
});


