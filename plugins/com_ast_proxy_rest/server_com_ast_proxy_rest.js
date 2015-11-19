/**
* Provides the REST server for asterisk proxy functions using
* _ast\_proxy_ component.
*
* @module com_ast_proxy_rest
* @main com_ast_proxy_rest
*/

/**
* Provides the REST server.
*
* @class server_com_ast_proxy_rest
*/
var fs      = require('fs');
var restify = require('restify');
var plugins = require('jsplugs')().require('./plugins/com_ast_proxy_rest/plugins_rest');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [server_com_ast_proxy_rest]
*/
var IDLOG = '[server_com_ast_proxy_rest]';

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
* @default "9008"
*/
var port = '9008';

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
* Sets the component that communicates with remote sites.
*
* @method setCompComNethctiRemotes
* @param {object} comp The remote sites communication architect component.
*/
function setCompComNethctiRemotes(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the remote sites communication component for all the REST plugins
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompComNethctiRemotes === 'function') {
                plugins[key].setCompComNethctiRemotes(comp);
                logger.info(IDLOG, 'remote sites communication component has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set configuration manager architect component used by configuration functions.
*
* @method setCompConfigManager
* @param {object} comp The configuration manager architect component.
*/
function setCompConfigManager(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the configuration manager for all the REST plugins
        setAllRestPluginsCompConfigManager(comp);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the configuration manager for all the REST plugins.
*
* @method setAllRestPluginsCompConfigManager
* @param {object} comp The configuration manager
* @private
*/
function setAllRestPluginsCompConfigManager(comp) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompConfigManager === 'function') {
                plugins[key].setCompConfigManager(comp);
                logger.info(IDLOG, 'configuration manager component has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the operator architect component to be used by REST plugins.
*
* @method setCompOperator
* @param {object} comp The architect operator component
* @static
*/
function setCompOperator(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the asterisk proxy for all the REST plugins
        setAllRestPluginsCompOperator(comp);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the operator component for all the REST plugins.
*
* @method setAllRestPluginsCompOperator
* @param {object} comp The operator object
* @private
*/
function setAllRestPluginsCompOperator(comp) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompOperator === 'function') {
                plugins[key].setCompOperator(comp);
                logger.info(IDLOG, 'operator component has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the user architect component to be used by REST plugins.
*
* @method setCompUser
* @param {object} comp The architect user component
* @static
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the user component for all the REST plugins
        setAllRestPluginsCompUser(comp);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the user component for all the REST plugins.
*
* @method setAllRestPluginsCompUser
* @param {object} comp The user object
* @private
*/
function setAllRestPluginsCompUser(comp) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompUser === 'function') {
                plugins[key].setCompUser(comp);
                logger.info(IDLOG, 'user component has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the asterisk proxy architect component to be used by REST plugins.
*
* @method setCompAstProxy
* @param {object} cap The architect asterisk proxy component
* @static
*/
function setCompAstProxy(cap) {
    try {
        // check parameter
        if (typeof cap !== 'object') { throw new Error('wrong parameter'); }

        // set the asterisk proxy for all the REST plugins
        setAllRestPluginsAstProxy(cap);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the asterisk proxy component for all the REST plugins.
*
* @method setAllRestPluginsAstProxy
* @param {object} ap The asterisk proxy object.
* @private
*/
function setAllRestPluginsAstProxy(ap) {
    try {
        var key;
        for (key in plugins) {

            if (typeof plugins[key].setCompAstProxy === 'function') {
                plugins[key].setCompAstProxy(ap);
                logger.info(IDLOG, 'asterisk proxy component has been set for rest plugin ' + key);
            }
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component for all REST plugins.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        // set the authorization for all REST plugins
        setAllRestPluginsAuthorization(comp);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Called by _setCompAuthorization_ function for all REST plugins.
*
* @method setAllRestPluginsAuthorization
* @private
* @param comp The architect authorization component
* @type {object}
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
* Configurates the REST server properties by the configuration file.
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
    if (json.asterisk_proxy && json.asterisk_proxy.port) {
        port = json.asterisk_proxy.port;

    } else {
        logger.warn(IDLOG, 'no port has been specified in JSON file ' + path);
    }

    // initialize the address of the REST server
    if (json.asterisk_proxy && json.asterisk_proxy.address) {
        address = json.asterisk_proxy.address;

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
        if (!fs.existsSync(path)) { throw new Error(path + ' doesn\'t exist'); }

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
exports.start                    = start;
exports.config                   = config;
exports.setLogger                = setLogger;
exports.setCompUtil              = setCompUtil;
exports.setCompUser              = setCompUser;
exports.configPrivacy            = configPrivacy;
exports.setCompOperator          = setCompOperator;
exports.setCompAstProxy          = setCompAstProxy;
exports.setCompAuthorization     = setCompAuthorization;
exports.setCompConfigManager     = setCompConfigManager;
exports.setCompComNethctiRemotes = setCompComNethctiRemotes;
