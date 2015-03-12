/**
* Provides the REST server for serving upload files as images, css files and so on.
*
* @module com_upload_http
* @main arch_com_upload_http
*/

/**
* Provides the REST server.
*
* @class server_com_upload_http
*/
var fs         = require('fs');
var http       = require('http');
var formidable = require('formidable');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [server_com_upload_http]
*/
var IDLOG = '[server_com_upload_http]';

/**
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* Listening port of the REST server. It can be customized by the
* configuration file.
*
* @property port
* @type string
* @private
* @default "9016"
*/
var port = '9016';

/**
* Listening address of the REST server. It can be customized by the
* configuration file.
*
* @property address
* @type string
* @private
* @default "localhost"
*/
var address = 'localhost';

/**
* The root directory of the uploaded files.
*
* @property uploadRoot
* @type string
* @private
*/
var uploadRoot;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* Set the logger to be used.
*
* @method setLogger
* @param {object} log The logger object. It must have at least
* three methods: _info, warn and error_ as console object.
* @static
*/
function setLogger(log) {
    try {
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the utility architect component.
*
* @method setCompUtil
* @param {object} comp The utility architect component.
*/
function setCompUtil(comp) {
    try {
        compUtil = comp;
        logger.info(IDLOG, 'set util architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Configurates the REST server properties by a configuration file.
* The file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' does not exist'); }

    // read configuration file
    var json = require(path).rest;

    // initialize the port of the REST server
    if (json.upload && json.upload.port) {
        port = json.upload.port;

    } else {
        logger.warn(IDLOG, 'no port has been specified in JSON file ' + path);
    }

    // initialize the address of the REST server
    if (json.upload && json.upload.address) {
        address = json.upload.address;

    } else {
        logger.warn(IDLOG, 'no address has been specified in JSON file ' + path);
    }

    // initialize uploadRoot
    if (json.upload.upload_root) { uploadRoot = json.upload.upload_root; }

    logger.info(IDLOG, 'configuration by file ' + path + ' ended');
}

/**
* Start the REST server.
*
* @method start
* @static
*/
function start() {
    try {
        // create http server
        var server = http.createServer(httpServerCb).listen(port, address);
        logger.info(IDLOG, 'listening at ' + address + ':' + port);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* The callback function of the create http server invocation.
*
* @method httpServerCb
* @param {object} req The http request
* @param {object} res The http response
* @static
*/
function httpServerCb(req, res) {
    try {
        var username        = req.headers.authorization_user;
        var form            = new formidable.IncomingForm();
        var files           = [];
        form.encoding       = 'utf-8';
        form.uploadDir      = uploadRoot;
        form.keepExtensions = true;

        form.on('field',     function (name, value) {});
        form.on('progress',  function (bytesReceived, bytesExpected) {});
        form.on('file',      function (field, file) { files.push(file); });
        form.on('end',       function () {});
        form.on('error',     function (err) {
            logger.warn(IDLOG, 'uploading file "' + file.name + '" (' + form.bytesExpected + ' bytes) by user "' + username + '": ' + err);
        });
        form.on('aborted',   function () {
            logger.warn(IDLOG, 'uploading file "' + file.name + '" (' + form.bytesExpected + ' bytes) by user "' + username + '": aborted');
        });
        form.on('fileBegin', function (name, file)  {
            logger.info(IDLOG, 'user "' + username + '" uploading file "' + file.name + '" (' + form.bytesExpected + ' bytes)');
        });
        form.parse(req, function(err, fields, files) {
            // send the answer to the client
            res.writeHead(200, {'content-type': 'text/plain'});
            res.end(JSON.stringify({ fields: fields, files: files }));
            // check the file existence
            fs.exists(files.files.path, function (exists) {
                if (exists) {
                    logger.info(IDLOG, 'file "' + files.files.name + '" (size: ' + form.bytesReceived + ') has been uploaded by user "' + username + '"');
                    console.log(IDLOG, 'file "' + files.files.name + '" (size: ' + form.bytesReceived + ') has been uploaded by user "' + username + '"');
                } else {
                    logger.warn(IDLOG, 'uploading file "' + files.files.name + '" (size: ' + form.bytesReceived + ') by user "' + username + '": failed');
                    console.log(IDLOG, 'uploading file "' + files.files.name + '" (size: ' + form.bytesReceived + ') by user "' + username + '": failed');
                }
            });
        });
    } catch (err) {
        logger.error(IDLOG, 'serving static file ' + req.url + ': ' + err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

// public interface
exports.start       = start;
exports.config      = config;
exports.setLogger   = setLogger;
exports.setCompUtil = setCompUtil;