var args = require('./lib/argparser.js').parse()
var proAuth = require("./authenticator.js");

var l = Object.keys(args).length;

if(l < 2)
 help();

var exten = args["-e"];
var search = args["-s"];
if(search == undefined)
	search = "";

var authenticator = new proAuth.Authenticator();

switch ( args["-t"] )
{
	case "initProfiles":
		console.log("\nTesting initProfiles()");
		break;
	
	case "authenticateUser":
                console.log("\nTesting authenticateUser(exten, secret): extent " + exten + " secret " + search);
                var res = authenticator.authenticateUser(exten, search);
                console.log(res);
                break;

	default:
		help();
}


function help()
{
	console.log("Usage: node testProfiler.js -t <initProfiles|authenticateUser> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
};

