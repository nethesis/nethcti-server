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
var childProcess = require('child_process');

var key;
var user;
var fileContent;
var queries       = '';
var DB            = 'nethcti2';
var debug         = false;
var DB_TABLE      = 'user_settings';
var SQL_FILEPATH  = path.join('/etc/nethcti', 'migrate_user_prefs.sql');
var JSON_FILEPATH = '/etc/nethcti/user_prefs.json';
var query_timeout = 15000;

/**
 * If debug is enabled print the message.
 */
function log(msg) {
    if (debug) { console.log(msg); }
}

/**
 * Add an "INSERT" query to the queries list.
 */
function addInsertToQueries(username, key, value) {

    // escape double quotes " and backslash \ characters. The sequence is important
    if (typeof value === 'string') {
        value = value.replace(/\\/g, '\\\\\\\\');
        value = value.replace(/"/g, '\\"');
    }

    queries += '\nINSERT INTO ' + DB + '.' + DB_TABLE + ' (username, key_name, value) VALUES (\'' + user + '\', \'' + key + '\', \'' + value + '\');';
}

/**
 * Delete SQL file containing queries to import the users settings.
 */
function deleteSqlFile() {
    fs.unlink(SQL_FILEPATH, function (err) {
        if (err) {
            log('error deleting ' + SQL_FILEPATH);
        }
        log('successfully deleted ' + SQL_FILEPATH);
    });
}

/**
 * Delete JSON file of user preferences.
 */
function deleteJsonFile() {
    fs.unlink(JSON_FILEPATH, function (err) {
        if (err) {
            log('error deleting ' + JSON_FILEPATH);
        }
        log('successfully deleted ' + JSON_FILEPATH);
    });
}

/**
 * Execute bash command to do the migration.
 */
function execMigration() {

    // write sql file
    fs.writeFile(SQL_FILEPATH, queries, function (err) {
        if (err) {
            log('error writing ' + SQL_FILEPATH);
            process.exit(1);
        }
        log(SQL_FILEPATH + ' has been created');

        // execute the migration
        var cmd = 'mysql --defaults-file=/root/.my.cnf < ' + SQL_FILEPATH;

        childProcess.exec(cmd, { timeout: query_timeout }, function (error, stdout, stderr) {
            try {
                if (error === null) {
                    log('\n' + cmd + '\n\nmigration OK\n');
                    deleteJsonFile();
                    deleteSqlFile();

                } else {
                    log('\n' + cmd + '\n\nmigration FAILED: ' + error.message);
                }
            } catch (err) {
                log(err.stack);
            }
        });
    });
}

/**
 * Print the help documentation.
 */
function printHelp() {
    var help = '' +
    'NAME\n' +
    '\t' + require('path').basename(process.argv[1]) + ' - Migrates "' + JSON_FILEPATH + '" to mysql "' + DB + '.' + DB_TABLE + '" database table.\n\n' +
    'DESCRIPTION\n' +
    '\t-d\tactive debugging\n' +
    '\n' +
    '\t-t timeout\n' +
    '\t\tThe timeout in milliseconds to execute all the SQL queries';

    console.log(help);
    process.exit(0);
}

/**
 * Parse the command line arguments.
 */
function parseArgs() {

    var args = process.argv.slice(2);

    // print the help and exit
    if (args.indexOf('-h') > -1) { printHelp();  }
    else {
        // enable debug
        if (args.indexOf('-d') > -1) { debug = true; }

        // specify a timeout
        if (args.indexOf('-t') > -1) {

            if (isNaN(parseInt(args[args.indexOf('-t') + 1]))) { printHelp(); }
            else { query_timeout = parseInt(args[args.indexOf('-t') + 1]); }
        }
    }
}

/**
 * Check JSON file presence.
 */
function checkPreconditions() {

    // check JSON file existence
    if (!fs.existsSync(JSON_FILEPATH)) {
        log(JSON_FILEPATH + ' does not exist');
        process.exit(1);
    }
}

/**
 * Constructs a string containing all the INSERT queries to execute
 * and then execute it.
 */
(function () {

    parseArgs();
    checkPreconditions();

    // load the JSON file
    fs.readFile(JSON_FILEPATH, 'utf8', function (err, data) {
        if (err) {
            log('error reading ' + JSON_FILEPATH);
            process.exit(1);
        }

        if (data === '') {
            log(JSON_FILEPATH + ' is empty');
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
            log('malformed JSON file ' + JSON_FILEPATH);
            process.exit(1);
        }

        var numLastBraces = lastBracesStr.match(/}/g).length;
        data              = data.substring(0, data.length - (numLastBraces - 3));

        try {
            fileContent = JSON.parse(data);
        } catch (e) {
            log('error: malformed JSON file ' + JSON_FILEPATH);
            process.exit(1);
        }

        // check if the file is empty
        if (Object.keys(fileContent).length === 0) {
            log(JSON_FILEPATH + ' is empty');
            process.exit(1);
        }

        log('\nStart migration...');

        // construct the command
        for (user in fileContent) {

            // click2call type: "manual" or "automatic"
            key   = 'click2call_type';
            value = fileContent[user].configurations.click2call.type;
            addInsertToQueries(user, key, value);

            // phone username for automatic click2call
            key   = 'click2call_auto_user';
            value = fileContent[user].configurations.click2call.automatic.user;
            addInsertToQueries(user, key, value);

            // phone password for automatic click2call
            key   = 'click2call_auto_pwd';
            value = fileContent[user].configurations.click2call.automatic.password;
            addInsertToQueries(user, key, value);

            // sms postit notifications
            key   = 'notify_postit_sms_when';
            value = fileContent[user].configurations.notifications.postit.sms.when;
            addInsertToQueries(user, key, value);

            // email postit notifications
            key   = 'notify_postit_email_when';
            value = fileContent[user].configurations.notifications.postit.email.when;
            addInsertToQueries(user, key, value);

            // sms voicemail notifications
            key   = 'notify_voicemail_sms_when';
            value = fileContent[user].configurations.notifications.voicemail.sms.when;
            addInsertToQueries(user, key, value);

            // sms voicemail notifications
            key   = 'notify_voicemail_email_when';
            value = fileContent[user].configurations.notifications.voicemail.email.when;
            addInsertToQueries(user, key, value);

            // automatic queue login when cti login
            key   = 'auto_queue_login';
            value = fileContent[user].configurations.queue_auto_login;
            addInsertToQueries(user, key, value);

            // automatic queue logout when cti logout
            key   = 'auto_queue_logout';
            value = fileContent[user].configurations.queue_auto_logout;
            addInsertToQueries(user, key, value);

            // default extension
            key   = 'default_extension';
            value = fileContent[user].configurations.default_extension;
            addInsertToQueries(user, key, value);
        }
        execMigration();
    });
})();
