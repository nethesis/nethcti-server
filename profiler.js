var fs = require("fs");
var sys = require("sys");
var configFilename = "profiles.conf";

/* It's the list of user profiles expressed as hash table of key and value.
 * The key is the exten of the user and its value is the object UserProfile.
 */
listUserProfiles = {};

// Object that represents the profile of the user.
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
	this.testPermitActionUser = function(exten, permit){ return testPermitActionUser(exten, permit); }
}



/*
 * Test if the user exten has specified permit.
 * Return true if the specified permit is present or "all" permit 
 * has been specified in config file. If permit actions of the user include all
 * actions, but the specified permit is present in deny action list of the user,
 * than false is returned.
 */ 
testPermitActionUser = function(exten, permit){

	var userPermitAction = getUserPermitActions(exten);
	var userDenyAction = getUserDenyActions(exten);
	
	// check if the permit is present in permit action of the profile of user
	for(i=0; i<userPermitAction.length; i++){
		if(userPermitAction[i]==permit || userPermitAction[i]=="all"){
			
			// check if the permit is present in deny action of the profile of user
			for(x=0; x<userDenyAction.length; x++){	
				if(userDenyAction[x]==permit)
					return false;
			}
			
			return true;
		}
	}
	
	return false;
}


/*
 * Return the user category.
 */
getUserCategory = function(exten){

	return listUserProfiles[exten].category;
}

/*
 * Return deny actions for the user exten.
 */
getUserDenyActions = function(exten){

	return listUserProfiles[exten].denyActions;
}

/*
 * Return permite actions for the user exten.
 */
getUserPermitActions = function(exten){
	
	if(listUserProfiles[exten]==undefined) 
		throw "Error: user not present in configuration file.";

	return listUserProfiles[exten].permitActions;
}



/*
 * Return the profile of user exten.
 */
getUserProfile = function(exten){

	return listUserProfiles[exten];
}



/* 
 * Print all initialized users.
 */
printListUserProfiles = function(){

	console.log("Current initialized users are:");
	
	for(user in listUserProfiles){
		console.log(user + " : ");
		console.log(sys.inspect(listUserProfiles[user]));
		console.log("\n");
	}
}

/*
 * Initialize the profiles of all users by means the reading of the config file.
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
 * Initialize one user object and put it in memory.
 */
function initUserProfilesInMemory(categoryName, listActionPermitArray, listActionDenyArray, listUsersArray){

	for(m=0; m<listUsersArray.length; m++){
	
		var user = listUsersArray[m];
		
		// the value of user exten is not set
		if(user==''){
			continue;
		}
		
		// if the user is not present, it create new user object
		if(!testUserPresence(user) && user!=''){
			var newUser = new UserProfile(user, categoryName, listActionPermitArray, listActionDenyArray);
			this.listUserProfiles[user] = newUser;
			//console.log("added new user [" + user + "]");
		}
	}
}


/*
 * Test if the user passed with exten is alreday present.
 */
function testUserPresence(exten){

	if(listUserProfiles.exten!=undefined)
		return true;
	return false;
}



