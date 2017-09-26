/**
 * Provides the HTTP server for all services.
 *
 * @module http_proxy
 * @main http_proxy
 */

/**
 * Provides the HTTP proxy server.
 *
 * @class http_proxy
 */
var fs = require('fs');
var http = require('http');
var httpProxy = require('http-proxy');
var httpProxyRules = require('http-proxy-rules');

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
 * The asterisk proxy architect component.
 *
 * @property compAstProxy
 * @type object
 * @private
 */
var compAstProxy;

/**
 * The user module.
 *
 * @property compUser
 * @type object
 * @private
 */
var compUser;

/**
 * The utility architect component.
 *
 * @property compUtil
 * @type object
 * @private
 */
var compUtil;

/**
 * Listening port of the HTTP proxy server. It can be
 * customized in the configuration file.
 *
 * @property port
 * @type string
 * @private
 */
var port;

/**
 * Listening address of the HTTP proxy server.
 *
 * @property address
 * @type string
 * @private
 * @final
 * @readOnly
 * @default "localhost"
 */
var address = 'localhost';

/**
 * The HTTP server to be used with proxy.
 *
 * @property httpServer
 * @type object
 * @private
 */
var httpServer;

/**
 * The routing of the HTTP proxy. It's initialized by the _config_ method.
 * It must be customized in the configuration file.
 *
 * @property router
 * @type object
 * @default {}
 * @private
 */
var router = {};

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
    if (typeof log === 'object' && typeof log.log.info === 'function' &&
      typeof log.log.warn === 'function' && typeof log.log.error === 'function') {

      logger = log;
      logger.log.info(IDLOG, 'new logger has been set');

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Configure the HTTP proxy properties and the router url mappings.
 * The file must use the JSON syntax.
 *
 * **The method can throw an Exception.**
 *
 * @method config
 * @param {string} path The path of the configuration file
 */
function config(path) {
  if (typeof path !== 'string') {
    throw new TypeError('wrong parameter');
  }

  if (!fs.existsSync(path)) {
    throw new Error(path + ' does not exist');
  }

  var json = (JSON.parse(fs.readFileSync(path, 'utf8'))).http_proxy;

  if (json.router) {
    router = json.router;
  } else {
    logger.log.warn(IDLOG, 'wrong ' + path + ': no "router" key into "http_proxy"');
  }

  if (json.http_port) {
    port = json.http_port;
  } else {
    logger.log.warn(IDLOG, 'wrong ' + path + ': no "http_port" key into "http_proxy"');
  }
  logger.log.info(IDLOG, 'configuration done by ' + path);
}

/**
 * Sets the authentication architect component.
 *
 * @method setCompAuthentication
 * @param {object} comp The authentication architect component.
 */
function setCompAuthentication(comp) {
  try {
    compAuthentication = comp;
    logger.log.info(IDLOG, 'set authentication architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Starts the HTTP proxy server.
 *
 * @method start
 * @static
 */
function start() {
  try {
    var proxyRules = new httpProxyRules({
      rules: router
    });
    var proxy = httpProxy.createProxy();

    httpServer = http.createServer(function (req, res) {
      try {
        logger.log.info(IDLOG, getProxyLog(req));

        if (req.method === 'OPTIONS') {
          var headers = {};
          headers["Access-Control-Allow-Origin"] = "*";
          headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
          headers["Access-Control-Allow-Credentials"] = true;
          headers["Access-Control-Max-Age"] = '86400';
          headers["Access-Control-Allow-Headers"] = 'X-Requested-With,' +
            ' Access-Control-Allow-Origin,' +
            ' X-HTTP-Method-Override,' +
            ' Content-Type,' +
            ' Authorization,' +
            ' Accept,' +
            ' User,' +
            ' Secretkey,' +
            ' WWW-Authenticate';

          res.writeHead(200, headers);
          res.end();
          return;
        }

        // #1 Check FreePBX "admin" user
        //
        // freepbx admin user is managed in a special way. If the user supply the headers "User: admin" and
        // "Secretkey: 12345", the authentication is verified each time and he can use some rest api.
        // "admin" user is FreePBX admin user
        if (req.headers.user === 'admin' && req.headers.secretkey) {

          if (compAuthentication.authenticateFreepbxAdmin(req.headers.secretkey) === true) {

            // check if the url is one of the permitted urls for freepbx admin user
            if (req.url === '/dbconn/test' ||
              req.url === '/custcard/preview') {

              // add header used by the authorization module
              req.headers.authorization_user = 'admin';

              var target = proxyRules.match(req);
              if (target) {
                return proxy.web(req, res, {
                  target: target
                });
              }
              compUtil.net.sendHttp404(IDLOG, res);
              return;

            } else {
              compUtil.net.sendHttp403(IDLOG, res);
              return;
            }

          } else { // authentication failed
            compUtil.net.sendHttp401(IDLOG, res);
            return;
          }
        }

        // #2. Check CTI user
        //
        // bypass the token verification if the request is:
        // 1. an authentication nonce request
        // 2. a static file request
        // 3. unauthenticated call enabled
        // 4. an remote authentication nonce request
        if (req.url !== '/authentication/login' &&
          req.url !== '/authentication/remotelogin' &&
          req.url !== '/static' &&
          (req.url === '/astproxy/unauthe_call' && compAuthentication.isUnautheCallEnabled() === false) &&
          req.headers.authorization === undefined) { // no authentication token present

          compUtil.net.sendHttp401(IDLOG, res);
          return;
        }

        if ((req.headers.authorization !== undefined && typeof req.headers.authorization !== 'string') ||
          (req.headers.authorization !== undefined && (req.headers.authorization.split(':')).length !== 2)) {

          compUtil.net.sendHttp401(IDLOG, res);
          return;
        }

        // check authentication
        // arr[0] is the username or the extension number
        // arr[1] is the token
        if (req.headers.authorization) {

          var arr = req.headers.authorization.split(':');
          if (compAuthentication.verifyToken(arr[0], arr[1]) === true) {

            // add header used by the authorization module
            if (compAstProxy.isExten(arr[0]) && req.url !== '/authentication/logout') {
              // this is to support login with extension number
              req.headers.authorization_user = compUser.getUserUsingEndpointExtension(arr[0]);
            } else if (req.url !== '/authentication/logout') {
              // remove "@domain" from username if it is present
              req.headers.authorization_user = arr[0].indexOf('@') !== -1 ? arr[0].substring(0, arr[0].lastIndexOf('@')) : arr[0];
            } else {
              // because login and logout are done with user or user@domain as passed by the client
              req.headers.authorization_user = arr[0];
            }
            req.headers.authorization_token = arr[1];

          } else { // authentication failed
            compUtil.net.sendHttp401(IDLOG, res);
            return;
          }
        }

        var target = proxyRules.match(req);
        if (target) {
          return proxy.web(req, res, {
            target: target
          });
        }
        compUtil.net.sendHttp404(IDLOG, res);

      } catch (err) {
        logger.log.error(IDLOG, err.stack);
      }
    }).listen(port, address);

    httpServer.on('listening', function () {
      logger.log.warn(IDLOG, 'listening on ' + httpServer.address().address + ':' + httpServer.address().port);
    });
    httpServer.on('error', function (e) {
      logger.log.error(IDLOG, e.stack);
    });
    httpServer.on('close', function () {
      logger.log.warn(IDLOG, 'stop listening');
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Set user module to be used.
 *
 * @method setCompUser
 * @param {object} comp The user module
 * @private
 */
function setCompUser(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new TypeError('wrong parameter');
    }
    compUser = comp;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Returns the string to log the REST request.
 *
 * @method getProxyLog
 * @param  {object} req The request object
 * @return {string} The string describing the REST request.
 * @private
 */
function getProxyLog(req) {
  try {
    return [
      req.method, ' ',
      req.url,
      ' - [UA: ', req.headers['user-agent'], ']',
      ' - ', req.headers['x-forwarded-for'],
      ' -> ', req.headers.host
    ].join('');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
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
    logger.log.info(IDLOG, 'set util architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Set the asterisk proxy architect component.
 *
 * @method setCompAstProxy
 * @param {object} comp The asterisk proxy architect component.
 */
function setCompAstProxy(comp) {
  try {
    compAstProxy = comp;
    logger.log.info(IDLOG, 'set asterisk proxy architect component');

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

// public interface
exports.start = start;
exports.config = config;
exports.setLogger = setLogger;
exports.setCompUtil = setCompUtil;
exports.setCompUser = setCompUser;
exports.setCompAstProxy = setCompAstProxy;
exports.setCompAuthentication = setCompAuthentication;
