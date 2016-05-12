/**
* Provides the REST server for the sms functions.
*
* @module com_sms_rest
* @main arch_com_sms_rest
*/

/**
* Provides the REST server.
*
* @class server_com_sms_rest
*/
var fs      = require('fs');
var restify = require('restify');
var plugins = require('jsplugs')().require('./plugins/com_sms_rest/plugins_rest');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [server_com_sms_rest]
*/
var IDLOG = '[server_com_sms_rest]';

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
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

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
* Executed by all REST request. It calls the appropriate REST plugin function.
*
* @method execute
* @private
*/
function execute(req, res, next) {
    try {
        var tmp  = req.url.split('/');
        var p    = tmp[1];
        var name = tmp[2];

        logger.info(IDLOG, 'execute: ' + p + '.' + name);
        plugins[p][name].apply(plugins[p], [req, res, next]);

        return next();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the sms architect component to be used by REST plugins.
*
* @method setCompSms
* @param  {object} comp The architect sms component
* @static
*/
function setCompSms(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the authorization component for all REST plugins
        setAllRestPluginsCompSms(comp);

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
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

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
* Sets the sms component for all REST plugins.
*
* @method setAllRestPluginsCompSms
* @param  {object} comp The sms architect component
* @private
*/
function setAllRestPluginsCompSms(comp) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompSms === 'function') {
                plugins[key].setCompSms(comp);
                logger.info(IDLOG, 'sms component has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the authorization component for all REST plugins
        setAllRestPluginsAuthorization(comp);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the authorization component for all REST plugins.
*
* @method setAllRestPluginsAuthorization
* @param {object} comp The authorization architect component
* @private
*/
function setAllRestPluginsAuthorization(comp) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompAuthorization === 'function') {
                plugins[key].setCompAuthorization(comp);
                logger.info(IDLOG, 'authorization component has been set for rest plugin ' + key);
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
    // check parameter
    if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

    // check file presence
    if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

    // read configuration file
    var json = require(path).rest;

    // initialize the port of the REST server
    if (json.sms && json.sms.port) {
        port = json.sms.port;

    } else {
        logger.warn(IDLOG, 'no port has been specified in JSON file ' + path);
    }

    // initialize the address of the REST server
    if (json.sms && json.sms.address) {
        address = json.sms.address;

    } else {
        logger.warn(IDLOG, 'no address has been specified in JSON file ' + path);
    }
    logger.info(IDLOG, 'configuration by file ' + path + ' ended');
}

/**
* Customize the privacy used to hide phone numbers by a configuration file.
* The file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method configPrivacy
* @param {string} path The path of the configuration file
*/
function configPrivacy(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) { throw new Error(path + ' does not exist'); }

        // read configuration file
        var json = require(path);

        if (json.privacy_numbers) {
            // set the privacy for all REST plugins
            setAllRestPluginsPrivacy(json.privacy_numbers);

        } else {
            logger.warn(IDLOG, 'no privacy string has been specified in JSON file ' + path);
        }

        logger.info(IDLOG, 'privacy configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Calls _setPrivacy_ function for all REST plugins.
*
* @method setAllRestPluginsPrivacy
* @param {string} str The string used to hide last digits of phone numbers
* @private
*/
function setAllRestPluginsPrivacy(str) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setPrivacy === 'function') {
                plugins[key].setPrivacy(str);
                logger.info(IDLOG, 'privacy has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
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

        // load plugins
        for (p in plugins) {
            get  = plugins[p].api['get'];
            root = plugins[p].api['root'];
            post = plugins[p].api['post'];

            var k;
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
        server.listen(port, address, function () {
            logger.info(IDLOG, server.name + ' listening at ' + server.url);
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start                = start;
exports.config               = config;
exports.setLogger            = setLogger;
exports.setCompSms           = setCompSms;
exports.setCompUtil          = setCompUtil;
exports.configPrivacy        = configPrivacy;
exports.setCompAuthorization = setCompAuthorization;
