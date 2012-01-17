var datareq = require("../dataCollector.js");
var allargs = process.argv;
var args = allargs.splice(2);
var dataCollector = new datareq.DataCollector();
switch(args[0]){
	case 'phonebook':
		var content = args[1];
		content===undefined ? printHelp() : '';
		console.log("PRIMA");
		dataCollector.getContactsPhonebook(content,cbPhonebook);
		console.log("DOPO");
	break;
	case 'cc':
		var typecc = args[1];
		var content = args[2];
		(typecc===undefined || content===undefined) ? printHelp() : '';
		dataCollector.getCustomerCard(content,typecc,cbCC);
	break;
	case 'hist_call_curr_week':
		var ext = args[1];
		ext===undefined ? printHelp() : '';
		dataCollector.getCurrentWeekHistoryCall(ext,cbHistCall);
	break;
	case 'hist_call_curr_month':
		var ext = args[1];
		ext===undefined ? printHelp() : '';
		dataCollector.getCurrentMonthHistoryCall(ext,cbHistCallCurrMonth);
	break;
	case 'hist_call_day':
		var ext = args[1];
		var datex = args[2];
		(ext===undefined || datex===undefined) ? printHelp() : '';
		dataCollector.getDayHistoryCall(ext,datex,cbHistCall);
	break;
	case 'ini':
		var queries = dataCollector.getQueries();
		printObj(queries,'ini file:',true);
	break;
	default:
		printHelp();
	break;
}
function cbHistCall(result){
	printArr(result,'Results:',true);
}
function cbHistCallCurrMonth(result){
	printArr(result,'Results:',false);
	printHelpExit();
}
function cbCC(result){
	printArr(result,'Results:',true);
}
function cbPhonebook(result){
	printArr(result,'Results:',true);
}
function printHelpExit(){
	console.log("CTRL+C to exit");
}
function printObj(obj,title,exit){
	console.log(title);
	console.log(obj);
	console.log(Object.keys(obj).length + " keys");
	if(exit){
		process.exit(0);
	}
}
function printArr(arr,title,exit){
	console.log(title);
	console.log(arr);
	console.log(arr.length + " elements");
	if(exit){
		process.exit(0);
	}
}
function printHelp(){
	var cmd = allargs[1].split('/');
	cmd = cmd[cmd.length-1];
	console.log(cmd);
	console.log("NAME\n\t"+cmd+" - test DB query through dataCollector.js object. Configuration file is config/dataprofiles.ini\n");
	console.log("SYNOPSIS\n\t" + allargs[0] + " " + cmd + " TYPE [OPTIONS]\n");
	console.log("OPTIONS");
	console.log("\tini");
	console.log("\t\tprint configuration file used by dataCollector\n");
	console.log("\tphonebook EXTENSION");
	console.log("\t\tview result of phonebook query for user specified as EXTENSION\n");
	console.log("\tcc TYPE EXTENSION");
	console.log("\t\tview customer card of type TYPE for user EXTENSION\n");
	console.log("\thist_call_day EXTENSION DATE");
	console.log("\t\tview history calls of the EXTENSION for specified DATE (yyyy/mm/gg)\n");
	console.log("\thist_call_currweek EXTENSION");
	console.log("\t\tview history calls of the EXTENSION for current week\n");
	console.log("\thist_call_currmonth EXTENSION");
	console.log("\t\tview history calls of the EXTENSION for current month\n");
	console.log("EXAMPLE\n\t" + allargs[0] + " " + cmd + " phonebook net");
	console.log("\t" + allargs[0] + " " + cmd + " cc default net");
	process.exit(0);
}
