var datareq = require("../dataCollector.js");
var allargs = process.argv;
var args = allargs.splice(2);
var dataCollector = new datareq.DataCollector();
switch(args[0]){
	case 'phonebook':
		var content = args[1];
		content===undefined ? help() : '';
		console.log("PRIMA");
		dataCollector.getContactsPhonebook(content,printResult);
		console.log("DOPO");
	break;
	case 'cc':
		var typecc = args[1];
		var content = args[2];
		(typecc===undefined || content===undefined) ? help() : '';
		dataCollector.getCustomerCard(content,typecc,printResult);
	break;
	case 'hist_call_day':
		var ext = args[1];
		var datex = args[2];
		(ext===undefined || datex===undefined) ? help() : '';
		dataCollector.getDayHistoryCall(ext,datex,printResult);
	break;
	case 'hist_call_currweek':
		var ext = args[1];
		ext===undefined ? help() : '';
		dataCollector.getCurrentWeekHistoryCall(ext,printResult);
	break;
	case 'hist_call_currmonth':
		var ext = args[1];
		ext===undefined ? help() : '';
		dataCollector.getCurrentMonthHistoryCall(ext,printResult);
	break;
	case 'hist_call_interval':
		var ext = args[1];
		var dateFrom = args[2];
		var dateTo = args[3];
		(ext===undefined || dateFrom===undefined || dateTo===undefined) ? help() : '';
		dataCollector.getIntervalHistoryCall(ext,dateFrom,dateTo,printResult);
	break;
	case 'hist_sms_day':
		var ext = args[1];
		var datex = args[2];
		(ext===undefined || datex===undefined) ? help() : '';
		dataCollector.getDayHistorySms(ext,datex,printResult);
	break;
	case 'hist_sms_currweek':
		var ext = args[1];
		ext===undefined ? help() : '';
		dataCollector.getCurrentWeekHistorySms(ext,printResult);
	break;
	case 'hist_sms_currmonth':
		var ext = args[1];
		ext===undefined ? help() : '';
		dataCollector.getCurrentMonthHistorySms(ext,printResult);
	break;
	case 'hist_sms_interval':
		var ext = args[1];
	        var dateFrom = args[2];
	        var dateTo = args[3];
                (ext===undefined || dateFrom===undefined || dateTo===undefined) ? help() : '';
		dataCollector.getIntervalHistorySms(ext,dateFrom,dateTo,printResult);
	break;
	case 'hist_callnotes_day':
		var ext = args[1];
		var datex = args[2];
		(ext===undefined || datex===undefined) ? help() : '';
		dataCollector.getDayHistoryCallNotes(ext,datex,printResult);
	break;
	case 'hist_callnotes_currweek':
		var ext = args[1];
		ext===undefined ? help() : '';
		dataCollector.getCurrentWeekHistoryCallNotes(ext,printResult);
	break;
	case 'hist_callnotes_currmonth':
		var ext = args[1];
		ext===undefined ? help() : '';
		dataCollector.getCurrentMonthHistoryCallNotes(ext,printResult);
	break;
	case 'hist_callnotes_interval':
		var ext = args[1];
                var dateFrom = args[2];
                var dateTo = args[3];
                (ext===undefined || dateFrom===undefined || dateTo===undefined) ? help() : '';
		dataCollector.getIntervalHistoryCallNotes(ext,dateFrom,dateTo,printResult);
	break;
	case 'ini':
		var queries = dataCollector.getQueries();
		printObj(queries,'ini file:',false);
	break;
	default:
		help();
	break;
}
function helpExit(){
	console.log("CTRL+C to exit");
}
function printObj(obj,title,exit){
	console.log(title);
	console.log(obj);
	console.log(Object.keys(obj).length + " keys");
	if(exit){
		process.exit(0);
	}
	helpExit();
}
function printResult(result){
	printArr(result,'Results:',false);
	helpExit();
}
function printArr(arr,title,exit){
	console.log(title);
	console.log(arr);
	console.log(arr.length + " elements");
	if(exit){
		process.exit(0);
	}
}
function help(){
	var cmd = allargs[1].split('/');
	cmd = cmd[cmd.length-1];
	console.log(cmd);
	console.log("NAME\n\t"+cmd+" - test DB query through dataCollector.js object. Configuration file is config/dataprofiles.ini\n");
	console.log("SYNOPSIS\n\t" + allargs[0] + " " + cmd + " TYPE [OPTIONS]");
	console.log("\n");
	console.log("OPTIONS");
	console.log("\tini");
	console.log("\t\tprint configuration file used by dataCollector");
	console.log("\n");
	console.log("\tphonebook EXTENSION");
	console.log("\t\tview result of phonebook query for user specified as EXTENSION");
	console.log("\n");
	console.log("\tcc TYPE EXTENSION");
	console.log("\t\tview customer card of type TYPE for user EXTENSION");
	console.log("\n");
	console.log("\thist_call_day EXTENSION DATE");
	console.log("\t\tview history calls of the EXTENSION for specified DATE (yyyy/mm/gg)");
	console.log("\n");
	console.log("\thist_call_currweek EXTENSION");
	console.log("\t\tview history calls of the EXTENSION for current week");
	console.log("\n");
	console.log("\thist_call_currmonth EXTENSION");
	console.log("\t\tview history calls of the EXTENSION for current month");
	console.log("\n");
	console.log("\thist_call_interval EXTENSION DATE_FROM DATE_TO");
	console.log("\t\tview history calls of the EXTENSION for specified interval of date (yyyy/mm/dd)");
	console.log("\n");
	console.log("\thist_sms_day EXTENSION DATE");
	console.log("\t\tview history sms of the EXTENSION for specified DATE (yyyy/mm/dd)");
	console.log("\n");
	console.log("\thist_sms_currweek EXTENSION");
	console.log("\t\tview history sms of the EXTENSION for current week");
	console.log("\n");
	console.log("\thist_sms_currmonth EXTENSION");
	console.log("\t\tview history sms of the EXTENSION for current month");
	console.log("\n");
	console.log("\thist_sms_interval EXTENSION DATE_FROM DATE_TO");
	console.log("\t\tview history sms of the EXTENSION for specified interval of date (yyyy/mm/dd)");
	console.log("\n");
	console.log("\thist_callnotes_day EXTENSION DATE");
	console.log("\t\tview history call notes of the EXTENSION for specified DATE (yyyy/mm/dd)");
	console.log("\n");
	console.log("\thist_callnotes_currweek EXTENSION");
	console.log("\t\tview history call notes of the EXTENSION for current week");
	console.log("\n");
	console.log("\thist_callnotes_currmonth EXTENSION");
	console.log("\t\tview history call notes of the EXTENSION for current month");
	console.log("\n");
	console.log("\thist_callnotes_interval EXTENSION DATE_FROM DATE_TO");
	console.log("\t\tview history call notes of the EXTENSION for specified interval of date (yyyy/mm/dd)");
	console.log("EXAMPLE\n\t" + allargs[0] + " " + cmd + " phonebook net");
	console.log("\t" + allargs[0] + " " + cmd + " cc default net");
	process.exit(0);
}
