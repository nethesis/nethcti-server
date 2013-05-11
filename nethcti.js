#!/usr/bin/env node
// Main application that starts all architect modules

var architect = require('architect');

try{
    // architect components
    var config = [
        { packagePath: "./plugins/logger"         },
        { packagePath: "./plugins/dbconn"         },
        { packagePath: "./plugins/postit"         },
        { packagePath: "./plugins/phonebook"      },
        { packagePath: "./plugins/operator"       },
        { packagePath: "./plugins/authentication" },
        { packagePath: "./plugins/com_authe_rest" },
        { packagePath: "./plugins/ast_proxy"      },
        { packagePath: "./plugins/com_nethcti_ws" }
    ];

    var app = architect.resolveConfig(config, __dirname);

    architect.createApp(app, function (resp) {
        console.log('nethcti architect app created');
    });

    process.on('uncaughtException', function (err) {
        console.log('UncaughtException !!!');
        console.log(err.stack);
    });

} catch (err) {
    console.log(err.stack);
}
