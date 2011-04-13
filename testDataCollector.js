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
	case "customercard":
		console.log("\nTesting getCustomerCard: extent "+exten+" is searching '"+search+"'");
		dataCollector.getCustomerCard(exten, search, printResult);
		break;
	
	case "phonebook":
		console.log("\nTesting searchContactsPhonebook: extent "+exten+" is searching '"+search+"'");
 		dataCollector.searchContactsPhonebook(exten, search, printResult);
		break;

	default:
		help();
}


function help()
{
	console.log("Usage: node testDataCollector.js -t <customercard|phonebook> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
});

