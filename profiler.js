var fs = require("fs");
var sys = require("sys");
var configFilename = "profiles.conf";

listUserProfiles = [];

UserProfile = function(ext, cat, actionPermitArray, actionDenyArray){
	this.exten = ext;
	this.category = cat;
	this.permitActions = actionPermitArray;
	this.denyActions = actionDenyArray;
}

/*
 * Constructor
 */
exports.Profiler = function(){
	initProfiles();
	this.getUserProfiles = function(){ return listUserProfiles; }
	this.getUserProfile = function(exten){	return getUserProfile(exten); }
	this.getUserCategory = function(exten){	return getUserCategory(exten); }
	this.getUserPermitActions = function(exten){	return getUserPermitActions(exten); }
	this.getUserDenyActions = function(exten){	return getUserDenyActions(exten); }
	this.printUserProfiles = function(){ printListUserProfiles(); }
}

/*
 * Return the user category
 */
getUserCategory = function(exten){

	for(i=0; i<this.listUserProfiles.length; i++){
		
		currentUserProfile = this.listUserProfiles[i];
		
		if(currentUserProfile.exten==exten){
			return currentUserProfile.category;
		}
	}
}

/*
 * Return deny actions for the user
 */
getUserDenyActions = function(exten){

	for(i=0; i<this.listUserProfiles.length; i++){
		
		currentUserProfile = this.listUserProfiles[i];
		
		if(currentUserProfile.exten==exten){
			return currentUserProfile.denyActions;
		}
	}
}

/*
 * Return permite actions for the user
 */
getUserPermitActions = function(exten){

	for(i=0; i<this.listUserProfiles.length; i++){
		
		currentUserProfile = this.listUserProfiles[i];
		
		if(currentUserProfile.exten==exten){
			return currentUserProfile.permitActions;
		}
	}
}



/*
 * Return the user profile
 */
getUserProfile = function(exten){

	for(i=0; i<this.listUserProfiles.length; i++){
		
		currentUserProfile = this.listUserProfiles[i];
		
		if(currentUserProfile.exten==exten){
			return currentUserProfile;
		}
	}
}



/* 
 * Print all created users
 */
printListUserProfiles = function(){

	console.log("Current initialized users:");
	
	for(i=0; i<this.listUserProfiles.length; i++){
		console.log("[" + (i+1) + "] User name: " + this.listUserProfiles[i].exten);
		console.log("\tCategory name: " + this.listUserProfiles[i].category);
		console.log("\tPermit actions: " + this.listUserProfiles[i].permitActions);
		console.log("\tDeny actions: " + this.listUserProfiles[i].denyActions);
	}
	
	console.log("Total current users is " + this.listUserProfiles.length);
	
}

/*
 * Initialize the profiles of all users by means the reading of config file
 */
function initProfiles(){

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
		var listActionPermitArray;
		var listActionDenyArray;
		var listUsersArray;
		
		for(token=1; token<tempCategoryArray.length; token++){
		
			// array with permit actions
			if(tempCategoryArray[token].indexOf("permit") != -1){
				var listActionPermitStr = tempCategoryArray[token];
				listActionPermitArray = listActionPermitStr.split("=");
				listActionPermitArray = listActionPermitArray[1].split(",");
			}
			// array with deny actions
			else if(tempCategoryArray[token].indexOf("deny") != -1){
				var listActionDenyStr = tempCategoryArray[token];
				listActionDenyArray = listActionDenyStr.split("=");
				listActionDenyArray = listActionDenyArray[1].split(",");
			}
			// array with users
			else if(tempCategoryArray[token].indexOf("users") != -1){
				var listUsersStr = tempCategoryArray[token];
				listUsersArray = listUsersStr.split("=");
				listUsersArray = listUsersArray[1].split(",");
			}
		}
		
		// initialize users in memory if they aren't already present
		initUserProfilesInMemory(categoryName, listActionPermitArray, listActionDenyArray, listUsersArray);
	}

}


/*
 * Initialize user object and put it in "listUserProfiles" array
 */
function initUserProfilesInMemory(categoryName, listActionPermitArray, listActionDenyArray, listUsersArray){

	for(m=0; m<listUsersArray.length; m++){
	
		var user = listUsersArray[m];
		
		// the value of user exten is not set
		if(user==''){
//			console.log("user [" + user + "] not defined: continue");
			continue;
		}
		
		// if the user is not present, it create new user object
		if(!testUserPresence(user) && user!=''){
			var newUser = new UserProfile(user, categoryName, listActionPermitArray, listActionDenyArray);
			this.listUserProfiles.push(newUser);
//			console.log("added new user [" + user + "]");
		}
		else{
//			console.log("user [" + user + "] already present");
		}
	}
}


/*
 * Test if the user passed with exten is alreday present
 */
function testUserPresence(exten){
	for(i=0; i<this.listUserProfiles.length; i++){
		if(listUserProfiles[i].exten==exten){
			return true;
		}
	}
	return false;
}



