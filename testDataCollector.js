var args = require('./lib/argparser.js').parse()
var dataReq = require("./dataCollector.js");

var l = Object.keys(args).length;

if(l < 3)
 help();

var exten = args["-e"];
var search = args["-s"];
if(search == undefined)
	search = "";

var dataCollector = new dataReq.DataCollector();

switch ( args["-t"] )
{
	case "initQueries":
                console.log("\nTesting initQueries");
                break;

	case "getContactsPhonebook":
                console.log("\nTesting getContactsPhonebook(name, cb): name " + exten);
                dataCollector.getContactsPhonebook(exten, function(results){
			console.log("results = ");
			console.log(results);
		});
                break;

	case "getCustomerCard":
		console.log("\nTesting getCustomerCard(ext, type, cb): ext " + exten + " type " + search);
                dataCollector.getCustomerCard(exten, search, function(results){
                        console.log("results = ");
                        console.log(results);
                });
		break;

	case "getDayHistoryCall":
		console.log("\nTesting getDayHistoryCall(ext, date, cb): ext " + exten + " date " + search);
                dataCollector.getDayHistoryCall(exten, search, function(results){
                        console.log("results = ");
                        console.log(results);
                });
		break;

	case "getCurrentWeekHistoryCall":
		console.log("\nTesting getCurrentWeekHistoryCall(ext, cb): ext " + exten);
                dataCollector.getCurrentWeekHistoryCall(exten, function(results){
                        console.log("results = ");
                        console.log(results);
                });
		break;













	
	case "phonebook":
		console.log("\nTesting searchContactsPhonebook: extent "+exten+" is searching '"+search+"'");
 		dataCollector.searchContactsPhonebook(exten, search, printResult);
		break;

	case "currentMonthHistoryCall":
		console.log("\nTesting getCurrentMonthHistoryCall: extent "+exten+" is searching '"+search+"'");
		dataCollector.getCurrentMonthHistoryCall(exten, printResult);
		break;

	case "dayHistoryCall":
		console.log("\nTesting getDayHistoryCall: extent "+exten+" is searching '"+search+"'");
		dataCollector.getDayHistoryCall(exten, search, printResult);
		break;

	default:
		help();
}


function help()
{
	console.log("Usage: node testDataCollector.js -t <initQueries|getContactsPhonebook|getCustomerCard|getDayHistoryCall|getCurrentWeekHistoryCall  phonebook|dayHistoryCall|currentMonthHistoryCall> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
};

