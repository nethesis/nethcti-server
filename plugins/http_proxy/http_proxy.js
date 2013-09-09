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
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

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
* Listening protocol, can be 'https' or 'http'. It can be
* customized in the configuration file.
*
* @property proto
* @type string
* @private
* @default "http"
*/
var proto = 'http';


/**
* Listening URL of the HTTPS proxy server. It is set by the _config_ method.
*
* @property listenUrl
* @type string
* @private
*/
var listenUrl;

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
    var json = require(path).http_proxy;

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

    // initialize the proto of the proxy
    if (json.proto) {
        proto = json.proto;

    } else {
        logger.warn(IDLOG, 'no proto specified in JSON file ' + path);
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

    // initialize the listen url of the proxy
    if (json.hostname && json.port && json.proto) {
        listenUrl = json.proto + '://' + json.hostname + ':' +  json.port;

    } else {
        logger.warn(IDLOG, 'building "listenUrl" of https proxy: "hostname" or "proto" or "port" not specified in JSON file ' + path);
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
        var options = {
            router: router
        };
        // create HTTPS proxy
        if (proto === 'https') { 
            options.https = {
                key:  fs.readFileSync(HTTPS_KEY,  'utf8'),
                cert: fs.readFileSync(HTTPS_CERT, 'utf8')
            };
        }
        var server = httpProxy.createServer(options, proxyRequest).listen(port);
        logger.info(IDLOG, proto.toUpperCase() + ' proxy listening on port ' + port);

        // called when some error occurs in the proxy
        server.proxy.on('proxyError', function (err, req, res) {
            logger.error(IDLOG, getProxyLog(req) + ': ' + err);
            compUtil.net.sendHttp500(IDLOG, res, err.toString());
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
        // bypass the token verification if the request is:
        // 1. an authentication nonce request
        // 2. a static file request
        if (   req.url.indexOf('/authentication/authenticate') !== -1
            || req.url.indexOf('/static') !== -1) {

            proxy.proxyRequest(req, res);
            return;
        }

        // no token is present
        if (req.headers.authorization === undefined) {
            compUtil.net.sendHttp401(IDLOG, res);
            return;
        }

        // check authentication
        // arr[0] is the username
        // arr[1] is the token
        var arr = req.headers.authorization.split(':');
        if (compAuthentication.verifyToken(arr[0], arr[1]) === true) {

            // add header used by the authorization module
            req.headers.authorization_user = arr[0];

            // proxy the request
            proxy.proxyRequest(req, res);

        } else { // authentication failed
            compUtil.net.sendHttp401(IDLOG, res);
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the url of the proxy.
*
* @method getUrl
* @return {string} The url of the proxy.
*/
function getUrl() {
    try {
        return listenUrl;

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

// public interface
exports.start                 = start;
exports.getUrl                = getUrl;
exports.config                = config;
exports.setLogger             = setLogger;
exports.setCompUtil           = setCompUtil;
exports.setCompAuthentication = setCompAuthentication;
