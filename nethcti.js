#!/usr/bin/env node
var architect = require('architect');

var config = [
    { packagePath: "./plugins/com_authe_rest" },
    { packagePath: "./plugins/com_hist_rest" }
];
var app = architect.resolveConfig(config, __dirname);
architect.createApp(app, function () {
    console.log("app created");
});
process.on('uncaughtException', function (err) {
    console.log('UncaughtException !!!');
    console.log(err);
});
