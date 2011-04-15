var args = require('./lib/argparser.js').parse()
var proReq = require("./profiler.js");

var l = Object.keys(args).length;

if(l < 2)
 help();

var exten = args["-e"];
var search = args["-s"];
if(search == undefined)
	search = "";

var profiler = new proReq.Profiler();

switch ( args["-t"] )
{
	case "initProfiles":
		console.log("\nTesting initProfiles()");
		break;
	
	case "checkActionCallOutPermit":
                console.log("\nTesting checkActionCallOutPermit(exten): extent " + exten);
                var res = profiler.checkActionCallOutPermit(exten);
                console.log(res);
                break;

	case "checkActionPhonebookPermit":
                console.log("\nTesting checkActionPhonebookPermit(exten): extent " + exten);
                var res = profiler.checkActionPhonebookPermit(exten);
                console.log(res);
                break;

	case "checkActionCallInPermit":
                console.log("\nTesting checkActionCallInPermit(exten): extent " + exten);
                var res = profiler.checkActionCallInPermit(exten);
                console.log(res);
                break;
	
	case "checkActionRedirectPermit":
                console.log("\nTesting checkActionCallInPermit(exten): extent " + exten);
                var res = profiler.checkActionRedirectPermit(exten);
                console.log(res);
                break;

	case "checkActionRecordPermit":
                console.log("\nTesting checkActionRecordPermit(exten): extent " + exten);
                var res = profiler.checkActionRecordPermit(exten);
                console.log(res);
                break;

	case "checkActionHistoryCallPermit":
                console.log("\nTesting checkActionHistoryCallPermit(exten): extent " + exten);
                var res = profiler.checkActionHistoryCallPermit(exten);
                console.log(res);
                break;


	default:
		help();
}


function help()
{
	console.log("Usage: node testProfiler.js -t <initProfiles|checkActionCallOutPermit|checkActionPhonebookPermit|checkActionCallInPermit|checkActionRedirectPermit|checkActionRecordPermit|checkActionHistoryCallPermit> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
};

