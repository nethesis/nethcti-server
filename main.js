var architect = require('architect');

var config = [
    { packagePath: "./plugins/com_auth_rest" },
    { packagePath: "./plugins/com_hist_rest" }
];

var app = architect.resolveConfig(config, __dirname);
architect.createApp(app, function () {
    console.log("app created");
});

console.log(architect);
