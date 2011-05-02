/*
 * This object provides all data structure and operations to simplify 
 * the management of operator panel.
 */

var iniparser = require("./lib/node-iniparser/lib/node-iniparser");

const FILE_TAB_OP = "config/optab.ini";




/* This is for update client on the status of all extension registered in the asterisk server.
 * The scope for the client is to create operator panel with all informations about the extensions.
 * It is created by the server at the start and it is update by the server at runtime.
 * The key is the 'ext' and the status is an object.
 */ 
var extStatusForOp = {};

/* This is the list of tab to view or not in the operator panel of the clients.
 * It has the same structure as the configuration file optab.ini, with key equal
 * to section names, and the value the object the report keywords of section.
 */
var tabOp = {};







/*
 * Constructor
 */
exports.Modop = function(){
	/* initialize the list of tabs to view in operator panel by reading 
	 * configuration file "optab.ini"
	 */
	initTabOp();
}


function initTabOp(){
        log("initialize tabOp for tabs to view in the operator panel");
        tabOp = iniparser.parseSync(FILE_TAB_OP);

}

function log(msg){
        console.log(new Date().toUTCString() + " - [Modop]: " + msg);
}
