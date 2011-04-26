var args = require('./lib/argparser.js').parse()
var proController = require("./controller.js");

var l = Object.keys(args).length;

if(l < 2)
 help();

var arg1 = args["-e"];
var search = args["-s"];
if(search == undefined)
	search = "";

var controller = null;
var controller = new proController.Controller();

switch ( args["-t"] )
{
	case "creation":
		if(controller!=null){
			console.log("OK");
		} else{
			console.log("Failed");
		}
		break;
	
	case "addFile":
                console.log("\nTesting addFile(filename): filename " + arg1);
                controller.addFile(arg1);
		controller.addListener("change", function(curr, prev){
			console.log("change event emetted");
		});
                break;


	default:
		help();
}


function help()
{
	console.log("Usage: node testController.js -t <creation|addFile> -e <exten> [-s <search>] ");
	process.exit(1);
}

function printResult(result)
{
	console.log("Result=\n");
	console.log(result);
	console.log("\n");
};

