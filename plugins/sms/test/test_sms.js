/**
* The test for the sms component.
*
* @module sms
* @submodule test
*/

/**
* **Temporary test**
*
* Test for the sms.js file
*
* @class test_sms
* @static
*/
var sms = require('../sms');

/**
* Line command arguments.
*
* @property args
* @type array
* @private
*/
var args;

(function () {
    try {

        args = process.argv.splice(2);

        // configure the module by JSON file
        sms.config('/etc/nethcti/sms.json');

        // test
        test_send();

    } catch (err) {
        console.log(err.stack);
    }
})();

/**
* Test for the send method.
*
* @method test_send
* @private
*/
function test_send() {
    try {
        var from = args[0];
        var to   = args[1];
        var body = args[2];

        sms.send(from, to, body, function (err) {
            try {
                if (err) {
                    console.log('ERROR: ' + err.stack);

                } else {
                    console.log('OK: ');
                }

            } catch (err) {
               console.log(err.stack);
            }
            
        });
    } catch (err) {
        console.log(err.stack);
    }
}
