#!/usr/bin/env node

/*
   Migrate mysql data from NethCTI 1.x to NethCTI 2.0
   This script must be executed AFTER server configuration.
*/

var fs = require('fs');
var mysql      = require('mysql');
var moment = require('moment');
var async = require('async');
var Sequelize = require("sequelize");
var dbConn;
var logger = console;
var IDLOG  = 'migration.js';

var file = require('/etc/nethcti/users.json');
var ext2user = {};
var dbuser = '';
var dbpass = '';
var models = {};

function help() {
    console.log("Usage: migratedb <dbpass>");
    process.exit(1)
}

if (process.argv.length < 3) {
    help();    
} else {
    dbpass = process.argv[2];
}

var connection = {
  host     : 'localhost',
  port     : '/var/lib/mysql/mysql.sock',
  user     : 'smsuser',
  password : 'smspass',
  database : 'nethcti'
};

var ctiPbConfig = {
    "dbhost":     "localhost",
    "dbport":     "/var/lib/mysql/mysql.sock",
    "dbtype":     "mysql",
    "dbuser":     "nethcti",
    "dbpassword": dbpass,
    "dbname":     "nethcti2"
};

function initConnection() {
    try {
    if (ctiPbConfig.dbtype === 'mysql') {

        dbConn = new Sequelize(ctiPbConfig.dbname, ctiPbConfig.dbuser, ctiPbConfig.dbpassword, {
        port:    ctiPbConfig.dbport,
        host:    ctiPbConfig.dbhost,
        define:  {
            charset:     'utf8',
            timestamps:      false,
            freezeTableName: true
        },
        dialect: ctiPbConfig.dbtype,
        logging: false
        });

    }
    } catch (err) {
    logger.error(IDLOG, err.stack);
    }
}

function importModel(path) {
    try {
        if (fs.existsSync(path) === true) {
            return dbConn.import(path);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}


function saveCtiPbContact(data, cb) {
    try {
        // get the sequelize model already loaded
        var contact = models['phonebook'].build(data);

        // save the model into the database
        contact.save()
        .success(function () { // the save was successful
            //logger.info(IDLOG, 'cti phonebook contact saved successfully');
            cb();

        }).error(function (err) { // manage the error
            //logger.error(IDLOG, 'saving cti phonebook contact: ' + err.toString());
            cb(err.toString());
        });
    } catch (err) {
         logger.error(IDLOG, err.stack);
    }
}

function saveCallerNote(data, cb) {
    try {
        // get the sequelize model already loaded
        var callerNote = models['caller_notes'].build(data);

        // save the model into the database
        callerNote.save()
        .success(function () { // the save was successful
            cb();

        }).error(function (err) { // manage the error
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

function savePostit(data, cb) {
    try {
        var postit = models['postit'].build(data);
        // save the model into the database
        postit.save()
        .success(function () { // the save was successful
            cb();

        }).error(function (err) { // manage the error
            cb(err.toString());
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}



function importPhonebook() {
    var c = mysql.createConnection(connection);

    c.query('SELECT * FROM cti_phonebook', function(err, rows, fields) {
    if (err) throw err;

    for (var k in rows) {
        var row = rows[k];
        var user = ext2user[row.owner_id];
        if (typeof user === "undefined") {
            logger.info("SKIPPING phonebook contact: " + row.id + " (owner: " + row.owner_id + ")");
            continue;
        }
        delete row.id;
        delete row.extentsion;
        row.owner_id = user;

        saveCtiPbContact(row, function (err) {
           if (err) {
               logger.error("ERROR creating phonebook contact: " + row.name + " (owner: " + row.owner_id + ") : " + err.toString());
           }
        });
    }
    
    c.end();
    });
}


function importCallerNotes() {
    var c = mysql.createConnection(connection);
    c.query('SELECT * FROM call_notes', function(err, rows, fields) {
    if (err) throw err;

    for (var k in rows) {
        var row = rows[k];
        var user = ext2user[row.extension];
        if (typeof user === "undefined") {
            logger.info("SKIPPING caller note: " + row.id + " (owner: " + row.extension + ")");
            continue;
        }
        delete row.id;
        row.creator = user;
        row.creation = moment(row.date).format();
        delete row.date;
        delete row.extension;

        saveCallerNote(row, function (err) {
           if (err) {
               logger.error("ERROR creating caller note (owner: " + row.creator + ") : " + err.toString());
           }
        });
        }
    c.end();
    });
}

function importPostit() {
    var c = mysql.createConnection(connection);
    c.query('SELECT * FROM postit', function(err, rows, fields) {
    if (err) throw err;

    for (var k in rows) {
        var row = rows[k];
        var user = ext2user[row.owner];
        if (typeof user === "undefined") {
            logger.info("SKIPPING postit: " + row.id + " (owner: " + row.owner + ")");
            continue;
        }
        delete row.id;
        row.creator = user;
        row.creation = moment(row.date).format();
        row.readdate = moment().format();
        row.recipient = ext2user[row.assigned] || "";
        delete row.date;
        delete row.owner;
        delete row.assigned;
        delete row.status;

        savePostit(row, function (err) {
           if (err) {
               logger.error("ERROR creating postit: owner: " + row.creator + ") : " + err.toString());
           }
        });
        }
        c.end();
    });
}


(function start() {

    for (var key in file) {
        var user = file[key];
        for (var exten in user.endpoints.extension) {
            ext2user[exten] = key;
        }
    }

    initConnection();
    models['phonebook'] = importModel('/usr/lib/node/nethcti-server/plugins/dbconn/sequelize_models/cti_phonebook.js');
    models['postit'] = importModel('/usr/lib/node/nethcti-server/plugins/dbconn/sequelize_models/postit.js');
    models['caller_notes'] = importModel('/usr/lib/node/nethcti-server/plugins/dbconn/sequelize_models/caller_note.js');
    importPhonebook();
    importCallerNotes();
    importPostit();
})();
