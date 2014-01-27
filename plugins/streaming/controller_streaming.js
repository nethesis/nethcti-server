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
* The asterisk proxy component used for asterisk functions.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

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
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.warn(IDLOG, path + ' doesn\'t exist');
            return;
        }

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
        logger.info(IDLOG, 'streaming configuration by file ' + path + ' ended');

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
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

/**
* Returns the streaming source in JSON format or an empty
* object in error case.
*
* @method getSourceJSONByExten
* @param  {string} extenId The extension endpoint identifier
* @return {object} The streaming source in JSON format.
*/
function getSourceJSONByExten(extenId) {
    try {
        // check parameter
        if (typeof extenId !== 'string') { throw new Error('wrong parameter'); }

        // cycle in all streaming sources
        var stream;
        for (stream in streamings) {

            if (streamings[stream].getExtension() === extenId) {
                return streamings[stream].toJSON();
            }
        }
        return {};

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return {};
    }
}

/**
* Check if the endpoint extension is a streaming source.
*
* @method isExtenStreamingSource
* @param  {string}  extenId The extension endpoint identifier
* @return {boolean} True if the extension endpoint is a steraming source.
*/
function isExtenStreamingSource(extenId) {
    try {
        // check parameter
        if (typeof extenId !== 'string') { throw new Error('wrong parameter'); }

        // cycle in all streaming sources
        var stream;
        for (stream in streamings) {

            // check if the streaming has the specified extension identifier
            if (streamings[stream].getExtension() === extenId) { return true; }
        }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

/**
* Executes the command associated with the streaming source to open
* the associated device, e.g. a door.
*
* @method open
* @param {string}   streamId The streaming source identifier
* @param {function} cb       The callback function
*/
function open(streamId, cb) {
    try {
        // check parameters
        if (typeof streamId !== 'string' || typeof cb !== 'function') {
            throw new Error('wrong parameters');
        }

        // check if the streaming source exists
        if (typeof streamings[streamId] !== 'object') {
            logger.warn(IDLOG, 'opening the non existent streaming source "' + streamId + '"');
            cb('error: streaming source "' + streamId + '" doesn\'t exist');
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
        compAstProxy.sendDTMFSequence(exten, opencmd, function (err) {

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
exports.getAllSourcesJSON      = getAllSourcesJSON;
exports.getSourceJSONByExten   = getSourceJSONByExten;
exports.isExtenStreamingSource = isExtenStreamingSource;
