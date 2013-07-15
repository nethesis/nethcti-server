/**
* Provides the streaming functions.
*
* @module streaming
* @main arch_controller_streaming
*/
var fs        = require('fs');
var Streaming = require('./streaming').Streaming;

/**
* Provides the streaming functionalities.
*
* @class controller_streaming
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
* @default [controller_streaming]
*/
var IDLOG = '[controller_streaming]';

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
* It reads the configuration file and creates new _Streaming_
* objects. The file must use the JSON syntax.
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

    logger.info(IDLOG, 'configure streaming with ' + path);

    // read configuration file
    var json = require(path);

    // check JSON file
    if (typeof json !== 'object') { throw new Error('wrong JSON file ' + path); }

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
    logger.info(IDLOG, 'strreaming configuration by file ' + path + ' ended');
}

/**
* Returns all the streaming sources in JSON format or an empty
* object in case of error.
*
* @method getAllSourcesJSON
* @return {object} All the streaming sources in JSON format.
*/
function getAllSourcesJSON() {
    try {
        var result = {}; // object to return

        // cycle in all streaming sources
        var stream;
        for (stream in streamings) {

            // add the streaming source in JSON format
            result[stream] = streamings[stream].toJSON();
        }
        return result;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

// public interface
exports.config            = config;
exports.setLogger         = setLogger;
exports.getAllSourcesJSON = getAllSourcesJSON;
