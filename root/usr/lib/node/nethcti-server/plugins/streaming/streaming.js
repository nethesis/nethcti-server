/**
* Provides the streaming functions.
*
* @module streaming
* @main arch_streaming
*/
var fs        = require('fs');
var Streaming = require('./streaming_class').Streaming;
/**
* Provides the streaming functionalities.
*
* @class streaming
* @static
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [streaming]
*/
var IDLOG = '[streaming]';

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
* The streaming objects. The keys are the streaming identifiers and the
* values are the _Streaming_ objects. It is initialiazed by the _config_
* function.
*
* @property streamings
* @type object
* @private
* @default {}
*/
var streamings = {};

/**
* The asterisk proxy component used for asterisk functions.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

/**
 * The authorization architect component used for customer card functions.
 *
 * @property compAuthorization
 * @type object
 * @private
 */
var compAuthorization;

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
* Sets the asterisk proxy component used for asterisk functions.
*
* @method setCompAstProxy
* @param {object} ap The asterisk proxy component.
*/
function setCompAstProxy(ap) {
    try {
        compAstProxy = ap;
        logger.info(IDLOG, 'set asterisk proxy architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
 * Set the authorization architect component used by customer card functions.
 *
 * @method setCompAuthorization
 * @param {object} ca The authorization architect component.
 */
function setCompAuthorization(ca) {
  try {
    compAuthorization = ca;
    logger.info(IDLOG, 'set authorization architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
* It reads the configuration file and creates new _Streaming_
* objects. The file must use the JSON syntax.
*
* **The method can throw an Exception.**
*
* @method config
* @param {string} path The path of the configuration file
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') {
          throw new TypeError('wrong parameter');
        }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.warn(IDLOG, path + ' doesn\'t exist');
            return;
        }

        logger.info(IDLOG, 'configure streaming with ' + path);

        // read configuration file
        var json = require(path);

        // check JSON file
        if (typeof json !== 'object') {
          throw new Error('wrong JSON file ' + path);
        }

        // creates the Streaming objects and store them
        var id;
        var newStreaming;
        for (id in json) {
            // add the identifier to the current object. It's needed
            // to create the new Streaming object
            json[id].id = id;

            // create the new Streaming object
            newStreaming = new Streaming(json[id]);

            // memorize it
            streamings[id] = newStreaming;
        }

        logger.info(IDLOG, 'configured streaming sources: ' + Object.keys(streamings));
        logger.info(IDLOG, 'streaming configuration by file ' + path + ' ended');

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns all streaming sources for the user
* object in error case.
*
* @method getAllStreamingSources
* @param {string} extenId The extension endpoint identifier
* @param {function} cb The callback function
* @return {object} The streaming source in JSON format.
*/
function getAllStreamingSources(username, cb) {
  try {
    var allowedStreamingSources = compAuthorization.authorizeStreamingSourceUser(username);
    var permissions = [];
    for (var i in allowedStreamingSources) {
      permissions.push(allowedStreamingSources[i].name);
    }

    var results = {};
    for (var i in streamings) {
      if (permissions.indexOf(i) >= 0) {
        results[i] = streamings[i];
      }
    }

    cb(null, results);
  } catch (err) {
      logger.error(IDLOG, err.stack);
      return {};
  }
}

/**
* Executes the command associated with the streaming source to open
* the associated device, e.g. a door.
*
* @method open
* @param {string}   streamId The streaming source identifier
* @param {string}   callerid The caller identifier
* @param {function} cb       The callback function
*/
function open(streamId, callerid, cb) {
    try {
        // check parameters
        if (   typeof streamId !== 'string'
            || typeof callerid !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // check if the streaming source exists
        if (typeof streamings[streamId] !== 'object') {
            logger.warn(IDLOG, 'opening the non existent streaming source "' + streamId + '"');
            cb('error: streaming source "' + streamId + '" does not exist');
            return;
        }

        // get the open command of the streaming source
        var opencmd = streamings[streamId].getOpenCommand(streamId);
        // get the extension associated with the streaming source
        var exten = streamings[streamId].getExtension(streamId);

        // check the extension and the open command
        if (typeof exten !== 'string' || exten === '') {
            logger.warn(IDLOG, 'opening streaming source "' + streamId + '" with no extension');
        }
        if (typeof opencmd !== 'string' || opencmd === '') {
            logger.warn(IDLOG, 'opening streaming source "' + streamId + '" with no open command');
        }

        // sends the DTMF tones to the extension device associated
        // with the streaming source to open it
        compAstProxy.sendDTMFSequence(exten, opencmd, callerid, function (err) {

            if (err) {
                logger.error(IDLOG, 'sending DTMF sequence "' + opencmd + '" to extension ' + exten);
                cb(err);

            } else {
                logger.info(IDLOG, 'sending DTMF sequence "' + opencmd + '" to extension ' + exten + ' has been successful');
                cb(null);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

// public interface
exports.open                   = open;
exports.config                 = config;
exports.setLogger              = setLogger;
exports.setCompAstProxy        = setCompAstProxy;
exports.setCompAuthorization   = setCompAuthorization;
exports.getAllStreamingSources = getAllStreamingSources;
