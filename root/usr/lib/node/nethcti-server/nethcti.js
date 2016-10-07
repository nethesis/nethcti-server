#!/usr/bin/env node
// Main application that starts all architect modules

var fs              = require('fs');
var path            = require('path');
var architect       = require('architect');
var PLUGINS_DIRNAME = './plugins';

try {
    // create list of modules to be loaded reading the plugins directory content
    var modules = [];
    fs.readdir(PLUGINS_DIRNAME, function (err, files) {
        try {
            if (err) {
                console.log(err.stack);
                return;
            }

            var i;
            for (i = 0; i < files.length; i++) {
                modules.push(PLUGINS_DIRNAME + path.sep + files[i]);
            }

            // load config
            architect.resolveConfig(modules, __dirname, function (err, config) {
                try {
                    if (err) {
                        console.log(err.stack);
                        return;
                    }

                    // create the app
                    architect.createApp(config, function (err, app) {
                        try {
                            if (err) {
                                console.log(err.stack);
                                return;
                            }
                        } catch (err) {
                            console.log(err.stack);
                        }
                    });

                } catch (err) {
                    console.log(err.stack);
                }
            });

            process.on('uncaughtException', function (err) {
                console.log('UncaughtException !!!');
                console.log(err.stack);
            });

            process.on('SIGTERM', function (err) {
                process.exit(0);
            });

        } catch (err) {
            console.log(err.stack);
        }
    });

} catch (err) {
    console.log(err.stack);
}
