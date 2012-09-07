var mail = require('../mailModule');
var allargs = process.argv;
var args = allargs.splice(2);

var CMD_1 = 'sendCtiMailFromLocal';

if (args[0] === CMD_1 && args[1] !== undefined) {

    var mailModule = new mail.MailModule();
    var recvAddr = args[1];

    var subject = 'Test NethCTI';
    var body = 'This is a test e-mail from NethCTI server.\n' +
               'Result: sending was succesful';

    mailModule.sendCtiMailFromLocal(recvAddr, subject, body, function (error, response) {
        if (error) {
            console.log('ERROR: ' + error);
        } else {
            console.log("Message has been sent succesfully: " + response.message);
        }
    });
} else {
    _printHelp();
}

function _printHelp() {
    var cmd = allargs[1].split('/');
    cmd = cmd[cmd.length - 1];
    console.log("NAME\n\t"+cmd+" - test mail module mailModule.js\n");
    console.log("SYNOPSIS\n\t" + allargs[0] + " " + cmd + " COMMAND [ARGUMENTS]");
    console.log("\n");
    console.log("COMMAND");
    console.log("\t" + CMD_1 + " RECEIVER");
    console.log("\t\tsend e-mail from local server to specified receiver");
}
