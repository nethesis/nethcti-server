/**
 * Provides the REST server for phonebook functions using
 * _phonebook_ component.
 *
 * @module com_phonebook_rest
 * @main com_phonebook_rest
 */

/**
 * Provides the REST server.
 *
 * @class server_com_phonebook_rest
 */
var fs = require('fs');
var restify = require('restify');
var plugins = require('jsplugs')().require('./plugins/com_phonebook_rest/plugins_rest');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [server_com_phonebook_rest]
 */
var IDLOG = '[server_com_phonebook_rest]';

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
 */
var address;

/**
 * The architect component to be used for authorization.
 *
 * @property compAuthorization
 * @type object
 * @private
 */
var compAuthorization;

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

    compUtil = comp;
    logger.info(IDLOG, 'util component has been set');

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

    // check authorization
    var username = req.headers.authorization_user;
    // if (compAuthorization.authorizePhonebookUser(username) === true) {
    // todo with authorization module
    if (true) {

      logger.info(IDLOG, 'phonebook authorization successfully for user "' + username + '"');
      logger.info(IDLOG, 'execute: ' + p + '.' + name);
      plugins[p][name].apply(plugins[p], [req, res, next]);

    } else { // authorization failed
      logger.warn(IDLOG, 'phonebook authorization failed for user "' + username + '"!');
      compUtil.net.sendHttp403(IDLOG, res);
    }
    return next();

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the phonebook architect component to be used by REST plugins.
 *
 * @method setCompPhonebook
 * @param {object} compPhonebook The architect phonebook component
 * @static
 */
function setCompPhonebook(compPhonebook) {
  try {
    // check parameter
    if (typeof compPhonebook !== 'object') {
      throw new Error('wrong parameter');
    }

    var p;
    // set phonebook architect component to all REST plugins
    for (p in plugins) {
      plugins[p].setCompPhonebook(compPhonebook);
    }

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the authorization architect component.
 *
 * @method setCompAuthorization
 * @param {object} ca The architect authorization component
 * @static
 */
function setCompAuthorization(ca) {
  try {
    // check parameter
    if (typeof ca !== 'object') {
      throw new Error('wrong parameter');
    }

    compAuthorization = ca;
    logger.log(IDLOG, 'authorization component has been set');

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
  if (typeof path !== 'string') {
    throw new TypeError('wrong parameter');
  }

  // check file presence
  if (!fs.existsSync(path)) {
    throw new Error(path + ' does not exist');
  }

  // read configuration file
  var json = require(path).rest;

  // initialize the port of the REST server
  if (json.phonebook && json.phonebook.port) {
    port = json.phonebook.port;
  } else {
    logger.warn(IDLOG, 'wrong ' + path + ': no "port" key in rest user');
  }

  // initialize the address of the REST server
  if (json.phonebook && json.phonebook.address) {
    address = json.phonebook.address;
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
exports.setCompPhonebook = setCompPhonebook;
exports.setCompAuthorization = setCompAuthorization;
