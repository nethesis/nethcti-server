/**
* The test for the mailer component.
*
* @module mailer
* @submodule test
*/

/**
* **Temporary test**
*
* Test for the mailer.js file
*
* @class test_mailer
* @static
*/
var mailer = require('../mailer');

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
        mailer.config('/etc/nethcti/mailer.json');

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
        var to      = args[0];
        var body    = args[2];
        var subject = args[1];

        mailer.send(to, body, subject, function (err, resp) {
            try {
                if (err) { console.log('ERROR: ' + err.stack); }
                else     { console.log('OK: ', resp);          }

            } catch (err) {
               console.log(err.stack);
            }
            
        });
    } catch (err) {
        console.log(err.stack);
    }
}
