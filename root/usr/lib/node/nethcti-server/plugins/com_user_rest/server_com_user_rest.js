/**
 * Provides the REST server for the user functions.
 *
 * @module com_user_rest
 * @main arch_com_user_rest
 */

/**
 * Provides the REST server.
 *
 * @class server_com_user_rest
 */
var fs = require('fs');
var restify = require('restify');
var plugins = require('jsplugs')().require('./plugins/com_user_rest/plugins_rest');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [server_com_user_rest]
 */
var IDLOG = '[server_com_user_rest]';

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
 */
var port;

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
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object. It must have at least
 * three methods: _info, warn and error_ as console object.
 * @static
 */
function setLogger(log) {
  try {
    if (typeof log === 'object' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function') {

      logger = log;
      logger.info(IDLOG, 'new logger has been set');

      // set the logger for all REST plugins
      setAllRestPluginsLogger(log);

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Call _setLogger_ function for all REST plugins.
 *
 * @method setAllRestPluginsLogger
 * @private
 * @param log The logger object.
 * @type {object}
 */
function setAllRestPluginsLogger(log) {
  try {
    var key;
    for (key in plugins) {

      if (typeof plugins[key].setLogger === 'function') {
        plugins[key].setLogger(log);
        logger.info(IDLOG, 'new logger has been set for rest plugin ' + key);
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the utility architect component to be used by REST plugins.
 *
 * @method setCompUtil
 * @param {object} comp The architect utility component
 * @static
 */
function setCompUtil(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong parameter');
    }

    var p;
    // set utility architect component to all REST plugins
    for (p in plugins) {
      if (typeof plugins[p].setCompUtil === 'function') {
        plugins[p].setCompUtil(comp);
      }
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

// /**
//  * Set the authorization architect component for all REST plugins.
//  *
//  * @method setCompAuthorization
//  * @param {object} ca The architect authorization component
//  * @static
//  */
// function setCompAuthorization(ca) {
//   try {
//     // check parameter
//     if (typeof ca !== 'object') {
//       throw new Error('wrong parameter');
//     }

//     // set the authorization for all REST plugins
//     setAllRestPluginsAuthorization(ca);

//   } catch (err) {
//     logger.error(IDLOG, err.stack);
//   }
// }

// /**
//  * Called by _setCompAuthorization_ function for all REST plugins.
//  *
//  * @method setAllRestPluginsAuthorization
//  * @private
//  * @param ca The architect authorization component
//  * @type {object}
//  */
// function setAllRestPluginsAuthorization(ca) {
//   try {
//     var key;
//     for (key in plugins) {

//       if (typeof plugins[key].setCompAuthorization === 'function') {
//         plugins[key].setCompAuthorization(ca);
//         logger.info(IDLOG, 'authorization component has been set for rest plugin ' + key);
//       }
//     }
//   } catch (err) {
//     logger.error(IDLOG, err.stack);
//   }
// }

/**
 * Executed by all REST request. It calls the appropriate REST plugin function.
 *
 * @method execute
 * @private
 */
function execute(req, res, next) {
  try {
    var tmp = req.url.split('/');
    var p = tmp[1];
    var name = tmp[2];

    logger.info(IDLOG, 'execute: ' + p + '.' + name);
    plugins[p][name].apply(plugins[p], [req, res, next]);

    return next();

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the user architect component to be used by REST plugins.
 *
 * @method setCompuser
 * @param {object} cu The architect user component
 * @static
 */
function setCompUser(cu) {
  try {
    // check parameter
    if (typeof cu !== 'object') {
      throw new Error('wrong parameter');
    }

    var p;
    // set user architect component to all REST plugins
    for (p in plugins) {

      if (typeof plugins[p].setCompUser === 'function') {
        plugins[p].setCompUser(cu);
      }
    }
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
  if (typeof path !== 'string') {
    throw new TypeError('wrong parameter');
  }
  if (!fs.existsSync(path)) {
    throw new Error(path + ' does not exist');
  }

  var json = require(path).rest;
  // initialize the port of the REST server
  if (json.user && json.user.port) {
    port = json.user.port;
  } else {
    logger.warn(IDLOG, 'wrong ' + path + ': no "port" key in rest user');
  }
  // initialize the address of the REST server
  if (json.user && json.user.address) {
    address = json.user.address;
  } else {
    logger.warn(IDLOG, 'wrong ' + path + ': no "address" key in rest user');
  }
  logger.info(IDLOG, 'configuration done by ' + path);
}

/**
 * Start the REST server.
 *
 * @method start
 * @static
 */
function start() {
  try {
    var p, root, get, post, k;

    /**
     * The REST server.
     *
     * @property server
     * @type {object}
     * @private
     */
    var server = restify.createServer();

    // set the middlewares to use
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());
    server.use(restify.CORS({
      origins: ['*'],
      credentials: true,
      headers: ['WWW-Authenticate', 'Authorization']
    }));

    // load plugins
    for (p in plugins) {
      get = plugins[p].api.get;
      root = plugins[p].api.root;
      post = plugins[p].api.post;

      // add routing functions
      for (k in get) {
        logger.info(IDLOG, 'Binding GET: /' + root + '/' + get[k]);
        server.get('/' + root + '/' + get[k], execute);
      }
      for (k in post) {
        logger.info(IDLOG, 'Binding POST: /' + root + '/' + post[k]);
        server.post('/' + root + '/' + post[k], execute);
      }
    }

    // start the REST server
    server.listen(port, address, function() {
      logger.info(IDLOG, server.name + ' listening at ' + server.url);
    });

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

// public interface
exports.start = start;
exports.config = config;
exports.setLogger = setLogger;
exports.setCompUtil = setCompUtil;
exports.setCompUser = setCompUser;
// exports.setCompAuthorization = setCompAuthorization;