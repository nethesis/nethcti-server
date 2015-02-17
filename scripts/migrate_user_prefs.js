/**
 * Migrates all users settings from /etc/nethcti/user_prefs.json
 * to mysql nethcti2.user_settings database table.
 * It reads the JSON file, creates /etc/nethcti/migrate_user_prefs.sql
 * with all the sql INSERT queries and then executes the file.
 *
 * Use "node migrate_user_prefs.js -h" to print the help documentation.
 *
 * The migration is nedeed when update to nethcti-server version 2.3.
 */
var fs           = require('fs');
var path         = require('path');

var key;
var user;
var fileContent;
var DB            = 'nethcti2';
var DB_TABLE      = 'user_settings';
var JSON_FILEPATH = '/etc/nethcti/user_prefs.json';

/**
 * Add an "INSERT" query to the queries list.
 */
function printQuery(username, key, value) {

    // escape double quotes " and backslash \ characters. The sequence is important
    if (typeof value === 'string') {
        //value = value.replace(/\\/g, '\\\\\\\\');
        value = value.replace(/\\/g, '\\\\');
        value = value.replace(/"/g, '\\"');
    }

    console.log('INSERT INTO ' + DB + '.' + DB_TABLE + ' (username, key_name, value) VALUES (\'' + user + '\', \'' + key + '\', \'' + value + '\');');
}

/**
 * Check JSON file presence.
 */
function checkPreconditions() {

    // check JSON file existence
    if (!fs.existsSync(JSON_FILEPATH)) {
        console.error(JSON_FILEPATH + ' does not exist');
        process.exit(1);
    }
}

/**
 * Constructs a string containing all the INSERT queries to execute
 * and then execute it.
 */
(function () {

    checkPreconditions();

    // load the JSON file
    fs.readFile(JSON_FILEPATH, 'utf8', function (err, data) {
        if (err) {
            console.error('error reading ' + JSON_FILEPATH);
            process.exit(1);
        }

        if (data === '') {
            console.error(JSON_FILEPATH + ' is empty');
            process.exit(1);
        }

        // check for the presence of more braces at the end of the file (bug #3331)
        // eliminate all new lines and white spaces
        data = data.replace(/\n/g, '').replace(/\s/g, '');
        // check the number of the last braces: it must be three
        var arr           = data.split('"');
        var lastBracesStr = arr[arr.length - 1];

        // there are no braces at the end of the JSON file: the file is malformed
        if (lastBracesStr.match(/}/g) === null) {
            console.error('malformed JSON file ' + JSON_FILEPATH);
            process.exit(1);
        }

        var numLastBraces = lastBracesStr.match(/}/g).length;
        data              = data.substring(0, data.length - (numLastBraces - 3));

        try {
            fileContent = JSON.parse(data);
        } catch (e) {
            console.error('error: malformed JSON file ' + JSON_FILEPATH);
            process.exit(1);
        }

        // check if the file is empty
        if (Object.keys(fileContent).length === 0) {
            console.error(JSON_FILEPATH + ' is empty');
            process.exit(1);
        }

        // construct the command
        for (user in fileContent) {

            // click2call type: "manual" or "automatic"
            key   = 'click2call_type';
            value = fileContent[user].configurations.click2call.type;
            printQuery(user, key, value);

            // phone username for automatic click2call
            key   = 'click2call_auto_user';
            value = fileContent[user].configurations.click2call.automatic.user;
            printQuery(user, key, value);

            // phone password for automatic click2call
            key   = 'click2call_auto_pwd';
            value = fileContent[user].configurations.click2call.automatic.password;
            printQuery(user, key, value);

            // sms postit notifications
            key   = 'notify_postit_sms_when';
            value = fileContent[user].configurations.notifications.postit.sms.when;
            printQuery(user, key, value);

            // email postit notifications
            key   = 'notify_postit_email_when';
            value = fileContent[user].configurations.notifications.postit.email.when;
            printQuery(user, key, value);

            // sms voicemail notifications
            key   = 'notify_voicemail_sms_when';
            value = fileContent[user].configurations.notifications.voicemail.sms.when;
            printQuery(user, key, value);

            // sms voicemail notifications
            key   = 'notify_voicemail_email_when';
            value = fileContent[user].configurations.notifications.voicemail.email.when;
            printQuery(user, key, value);

            // automatic queue login when cti login
            key   = 'auto_queue_login';
            value = fileContent[user].configurations.queue_auto_login;
            printQuery(user, key, value);

            // automatic queue logout when cti logout
            key   = 'auto_queue_logout';
            value = fileContent[user].configurations.queue_auto_logout;
            printQuery(user, key, value);

            // default extension
            key   = 'default_extension';
            value = fileContent[user].configurations.default_extension;
            printQuery(user, key, value);
        }
    });
})();
