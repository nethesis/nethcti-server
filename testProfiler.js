var proReq = require("./profiler.js");
var exten = "700";

console.log("TEST with exten = " + exten);

var profiler = new proReq.Profiler();
console.log("Profiler object created");

// print all user profiles
console.log("\nALL USER PROFILES ARE:");
profiler.printUserProfiles();
console.log("\n");

console.log("TEST with exten = " + exten);
// print one user profile
var userProfile = profiler.getUserProfile(exten);
console.log("getUserProfile: " + userProfile);

// print user permit actions
var userPermitActions = profiler.getUserPermitActions(exten)
console.log("getUserPermitActions: " + userPermitActions);

// print user deny actions
var userDenyActions = profiler.getUserDenyActions(exten) 
console.log("getUserDenyActions: " + userDenyActions);

// print user category name
var categoryName = profiler.getUserCategory(exten);
console.log("getUserCategory: " + categoryName);


