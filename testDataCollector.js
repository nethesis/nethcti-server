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

	case "customercard":
		console.log("\nTesting getCustomerCard: extent "+exten+" is searching '"+search+"'");
		dataCollector.getCustomerCard(exten, search, printResult);
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
	console.log("Usage: node testDataCollector.js -t <initQueries|getContactsPhonebook|phonebook|dayHistoryCall|currentMonthHistoryCall> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
};

