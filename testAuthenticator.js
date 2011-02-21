var authReq = require("./authenticator.js");
var exten = "500";
var pwd = "50as0";

console.log("TEST with exten = " + exten);

var authenticator = new authReq.Authenticator();
console.log("Authenticator object created");

console.log(authenticator.authenticateUser(exten, pwd));
