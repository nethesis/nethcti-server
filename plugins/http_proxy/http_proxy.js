/**
* Provides the HTTPS proxy server for all services.
*
* @module http_proxy
* @main http_proxy
*/

/**
* Provides the HTTPS proxy server.
*
* @class http_proxy
*/
var fs        = require('fs');
var httpProxy = require('http-proxy');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [http_proxy]
*/
var IDLOG = '[http_proxy]';

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
* The authentication architect component.
*
* @property compAuthentication
* @type object
* @private
*/
var compAuthentication;

/**
* Listening port of the HTTPS proxy server. It can be
* customized in the configuration file.
*
* @property port
* @type string
* @private
* @default "8282"
*/
var port = '8282';

/**
* The routing of the HTTPS proxy. It's initialized by the _config_ method.
* It must be customized in the configuration file.
*
* @property router
* @type object
* @default {}
* @private
*/
var router = {};

/**
* The path of the certificate to be used by HTTPS server. It can be
* customized in the configuration file.
*
* @property HTTPS_CERT
* @type string
* @private
* @default "/etc/pki/tls/certs/localhost.crt"
*/
var HTTPS_CERT = '/etc/pki/tls/certs/localhost.crt';

/**
* The path of key to be used by HTTPS server. It can be
* customized in the configuration file.
*
* @property HTTPS_KEY
* @type string
* @private
* @default "/etc/pki/tls/private/localhost.key"
*/
var HTTPS_KEY = '/etc/pki/tls/private/localhost.key';

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
* Configurates the HTTPS proxy properties and the router url mappings.
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
    if (!fs.existsSync(path)) { throw new Error(path + ' not exists'); }

    // read configuration file
    var json = require(path);

    // initialize the routes of the proxy
    if (json.router) {
        router = json.router;

    } else {
        logger.warn(IDLOG, 'no router specified in JSON file ' + path);
    }

    // initialize the port of the proxy
    if (json.port) {
        port = json.port;

    } else {
        logger.warn(IDLOG, 'no port specified in JSON file ' + path);
    }

    // initialize the key of the HTTPS proxy
    if (json.https_key) {
        HTTPS_KEY = json.https_key;

    } else {
        logger.warn(IDLOG, 'no HTTPS key specified in JSON file ' + path);
    }

    // initialize the certificate of the HTTPS proxy
    if (json.https_cert) {
        HTTPS_CERT = json.https_cert;

    } else {
        logger.warn(IDLOG, 'no HTTPS certificate specified in JSON file ' + path);
    }
    logger.info(IDLOG, 'configuration by file ' + path + ' ended');
}

/**
* Sets the authentication architect component.
*
* @method setCompAuthentication
* @param {object} ca The authentication architect component.
*/
function setCompAuthentication(ca) {
    try {
        compAuthentication = ca;
        logger.info(IDLOG, 'set authentication architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Starts the HTTPS proxy server.
*
* @method start
* @static
*/
function start() {
    try {
        // create HTTPS proxy
        var options = {
            https: {
                key:  fs.readFileSync(HTTPS_KEY,  'utf8'),
                cert: fs.readFileSync(HTTPS_CERT, 'utf8')
            },
            router: router
        };
        var server = httpProxy.createServer(options, proxyRequest).listen(port);
        logger.info(IDLOG, 'HTTPS proxy listening on port ' + port);

        // called when some error occurs in the proxy
        server.proxy.on('proxyError', function (err, req, res) {
            logger.error(IDLOG, getProxyLog(req) + ': ' + err);
            sendHttp500(res, err);
        });

        // called at the start of a request
        server.proxy.on('start', function (req, res, three) {
            logger.info(IDLOG, 'start ' + getProxyLog(req));
        });

        // called at the end of a request
        server.proxy.on('end', function (req, res, three) {
            logger.info(IDLOG, 'end ' + getProxyLog(req));
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Return the string to log the REST request.
*
* @method getProxyLog
* @param {object} req The request object
* @return {string} The string describing the REST request.
* @private
*/
function getProxyLog(req) {
    try {
        return 'REST api ' + req.headers['x-forwarded-proto'] +
               ' '      + req.method +
               ' '      + req.url    +
               ' [UA: ' + req.headers['user-agent'] + ']' +
               ' from ' + req.headers['x-forwarded-for']  +
               ' to '   + req.headers.host;
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send HTTP 500 internal server error response.
*
* @method sendHttp500
* @param {object} resp The client response object
* @param {string} [err] The error message
* @private
*/
function sendHttp500(resp, err) {
    try {
        var text;
        if (err === undefined || typeof err !== 'string') {
            text = '';

        } else {
            text = err;
        }

        resp.writeHead(500, { error: err });
        logger.info(IDLOG, 'send HTTP 500 response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Send HTTP 401 unauthorized response.
*
* @method sendHttp401
* @param {object} resp The client response object.
* @private
*/
function sendHttp401(resp) {
    try {
        resp.writeHead(401);
        logger.info(IDLOG, 'send HTTP 401 response to ' + resp.connection.remoteAddress);
        resp.end();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* It routes the request to the correct service using the _router_
* property. Each request is authenticated before processing it, so
* the first time authentication request is needed and then each
* requests must contain the authentication token.
*
* @method proxyRequest
* @param {object} req The request object
* @param {object} res The response object
* @param {obejct} proxy The proxy to route the request
*/
function proxyRequest(req, res, proxy) {
    try {
        // check if the request is an authentication request
        if (req.url.indexOf('/authentication/authenticate/') !== -1) {
            proxy.proxyRequest(req, res);
            return;
        }

        // no token is present
        if (req.headers.authorization === undefined) {
            sendHttp401(res);
            return;
        }

        // check authentication
        var arr = req.headers.authorization.split(':');
        if (compAuthentication.verifyToken(arr[0], arr[1]) === true) {

            // add header used by the authorization module
            req.headers.authorization_user = arr[0];

            // proxy the request
            proxy.proxyRequest(req, res);

        } else { // authentication failed
            sendHttp401(res);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start     = start;
exports.config    = config;
exports.setLogger = setLogger;
exports.setCompAuthentication = setCompAuthentication;
