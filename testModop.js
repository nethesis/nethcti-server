var args = require('./lib/argparser.js').parse()
var modopReq = require("./modop.js");

var l = Object.keys(args).length;

if(l < 2)
 help();

var exten = args["-e"];
var search = args["-s"];
if(search == undefined)
	search = "";

var modop = new modopReq.Modop();

switch ( args["-t"] )
{
	case "constructor":
		console.log("\nTesting initProfiles()");
		break;
	
	case "addAsteriskManager":
                console.log("\nTesting addAsteriskManager(am): am " + exten);
                var res = profiler.checkActionCallOutPermit(exten);
                console.log(res);
                break;

	default:
		help();
}


function help()
{
	console.log("Usage: node testProfiler.js -t <constructor> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
};

