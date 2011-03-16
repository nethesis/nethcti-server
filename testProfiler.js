var proReq = require("./profiler.js");
var exten = "500";

console.log("TEST with exten = " + exten);

var profiler = new proReq.Profiler();
console.log("Profiler object created");

/*
// print all user profiles
console.log("\nTEST printUserProfiles");
profiler.printUserProfiles();
console.log("\n");

//
console.log("\nTEST getUserProfile");
var userProfile = profiler.getUserProfile(exten);
console.log("RES:");
console.log(userProfile);
console.log("\n");

// print user category name
console.log("\nTEST getUserCategory");
var categoryName = profiler.getUserCategory(exten);
console.log("RES:");
console.log(categoryName);
console.log("\n");

// print user permit actions
console.log("\nTEST getUserPermitActions");
var userPermitActions = profiler.getUserPermitActions(exten)
console.log("RES:");
console.log(userPermitActions);
console.log("\n");

// print user deny actions
console.log("\nTEST getUserDenyActions");
var userDenyActions = profiler.getUserDenyActions(exten) 
console.log("RES:");
console.log(userDenyActions);
console.log("\n");
*/

//
console.log("TEST testPermitActionUser");
console.log(profiler.testPermitActionUser(exten, "call_out"));

