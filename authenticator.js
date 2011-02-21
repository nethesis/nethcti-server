var fs = require("fs");
var sys = require("sys");
var configFilename = "sip_additional.conf";

userAuth = {};

/*
 * Constructor
 */
exports.Authenticator = function(){
	initUserAuth();
	this.authenticateUser = function(user, secret){ return authenticateUser(user, secret); }
	/*
	this.getUserProfiles = function(){ return listUserProfiles; }
	this.getUserProfile = function(exten){	return getUserProfile(exten); }
	this.getUserCategory = function(exten){	return getUserCategory(exten); }
	this.getUserPermitActions = function(exten){	return getUserPermitActions(exten); }
	this.getUserDenyActions = function(exten){	return getUserDenyActions(exten); }
	this.printUserProfiles = function(){ printListUserProfiles(); }
	this.testPermitActionUser = function(exten, permit){ return testPermitActionUser(exten, permit); }
	*/
}



function initUserAuth(){

	// read file
	var users = fs.readFileSync(configFilename, "UTF-8", function(err, data) {
		if(err){
			sys.puts("error in reading file");
			sys.puts(err);
			return;
		}
		return data;
	});
	
	// each array element has information of one user as string
	var usersArray = users.split("[");
	usersArray = usersArray.slice(1,usersArray.length);

	// 
	for(var i=0; i<usersArray.length; i++){
	
		var tempUserStr = usersArray[i];
		

		// current array contains only one user
		var tempUserArray = tempUserStr.split("\n");
		var username = tempUserArray[0].slice(0, tempUserArray[0].length-1);
		
		var secret;
		
		for(token=1; token<tempUserArray.length; token++){
		
			// array with permit actions
			if(tempUserArray[token].indexOf("secret") != -1){
				var secretStr = tempUserArray[token];
				secretArray = secretStr.split("=");
				secret = secretArray[1];
			}
		}
		
		userAuth[username] = secret;
	}
}


authenticateUser = function(user, secret){

	if(userAuth[user]==secret)
		return true;
	return false;
	
}


