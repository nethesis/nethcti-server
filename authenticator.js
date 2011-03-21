var fs = require("fs");
var sys = require("sys");
var AUTHENTICATOR_CONFIG_FILENAME = "sip_additional.conf";

// list of user with thier password. The user is the key and the password is the value
userAuthProfiles = {};



/*
 * Constructor
 */
exports.Authenticator = function(){
	inituserAuthProfiles();
	this.authenticateUser = function(user, secret){ return authenticateUser(user, secret); }
}


/*
 * Initialized all information about user authentication
 */
function inituserAuthProfiles(){

	// read file
	var users = fs.readFileSync(AUTHENTICATOR_CONFIG_FILENAME, "UTF-8", function(err, data) {
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
		
		userAuthProfiles[username] = secret;
	}
}

/*
 * Return true if the specified user and secret corresponding to 
 * initialized user authentication profile.
 */
authenticateUser = function(user, secret){

	if(userAuthProfiles[user]==secret)
		return true;
	return false;
}


