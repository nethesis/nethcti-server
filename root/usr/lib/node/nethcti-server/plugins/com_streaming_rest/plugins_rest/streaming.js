/**
 * Provides streaming functions through REST API.
 *
 * @module com_streaming_rest
 * @submodule plugins_rest
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [plugins_rest/streaming]
 */
var IDLOG = '[plugins_rest/streaming]';

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
 * The streaming architect component used for streaming functions.
 *
 * @property compStreaming
 * @type object
 * @private
 */
var compStreaming;

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
 * The config manager architect component.
 *
 * @property compConfigManager
 * @type object
 * @private
 */
var compConfigManager;

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
    if (typeof log === 'object' &&
      typeof log.info === 'function' &&
      typeof log.warn === 'function' &&
      typeof log.error === 'function') {

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
 * Set streaming architect component used by streaming functions.
 *
 * @method setCompStreaming
 * @param {object} cp The streaming architect component.
 */
function setCompStreaming(cp) {
  try {
    compStreaming = cp;
    logger.info(IDLOG, 'set streaming architect component');
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

/**
 * Set authorization architect component.
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
 * Sets config manager architect component.
 *
 * @method setCompConfigManager
 * @param {object} comp The config manager architect component.
 */
function setCompConfigManager(comp) {
  try {
    compConfigManager = comp;
    logger.info(IDLOG, 'set config manager architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

(function() {
  try {
    /**
        * REST plugin that provides streaming functions through the following REST API:
        *
        * # GET requests
        *
        * [`streaming/sources`](#sourcesget)
        *
        * Returns all the streaming sources.
        *
        * Example JSON response:
        *
        *     {
         "door": {
              "id": "door",
              "url": "http://192.168.5.169/enu/camera352x272.jpg",
              "type": "helios",
              "user": "",
              "cmdOpen": "0*",
              "password": "",
              "frameRate": "1000",
              "extension": "609",
              "description": "door"
         }
     }
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`streaming/open`](#openpost)
        *
        * ---
        *
        * ### <a id="streaming/openpost">**`streaming/open`**</a>
        *
        * Execute the command associated with the streaming to open the associated device, e.g. a door.
        * The request must contains the following parameters:
        *
        * * `id: the streaming identifier`
        *
        * Example JSON request parameters:
        *
        *     { "id": "door" }
        *
        * @class plugin_rest_streaming
        * @static
        */
    var streaming = {

      // the REST api
      api: {
        'root': 'streaming',

        /**
         * REST API to be requested using HTTP GET request.
         *
         * @property get
         * @type {array}
         *
         *   @param {string} sources To gets all the streaming sources
         */
        'get': ['sources'],

        /**
         * REST API to be requested using HTTP POST request.
         *
         * @property post
         * @type {array}
         *
         *   @param {string} open To execute the command associated with the streaming source
         */
        'post': ['open'],
        'head': [],
        'del': []
      },

      /**
       * Returns all the streaming sources by the following REST API:
       *
       *     sources
       *
       * @method sources
       * @param {object} req The client request.
       * @param {object} res The client response.
       * @param {function} next Function to run the next handler in the chain.
       */
      sources: function(req, res, next) {
        try {
          // get the username from the authorization header
          var username = req.headers.authorization_user;

          compStreaming.getAllStreamingSources(username, function(err, results) {
            try {
              logger.info(IDLOG, 'send authorized streaming sources "' + results + '" to the user "' + username + '"');
              res.send(200, results);
            } catch (error) {
              logger.error(IDLOG, error.stack);
              compUtil.net.sendHttp500(IDLOG, res, error.toString());
            }
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Executes the command associated with the streaming source to open
       * the associated device, e.g. a door, with the following REST API:
       *
       *     open
       *
       * @method open
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      open: function(req, res, next) {
        try {
          // get the username from the authorization header
          var username = req.headers.authorization_user;

          // get the streaming source identifier
          var stream = req.params.id;

          // check if the user is authorized to use the streaming source
          if (compAuthorization.authorizeStreamingSourceUser(username, stream) === true) {

            logger.info(IDLOG, 'authorization for user "' + username + '" to open streaming source "' + stream + '" has been successful');

            // create the caller identifier
            var defaultExten = compConfigManager.getDefaultUserExtensionConf(username);
            if (defaultExten === undefined || defaultExten === null) {
              defaultExten = '';
            }
            var callerid = '"' + username + '" <' + defaultExten + '>';

            compStreaming.open(stream, callerid, function(err) {

              if (err) {
                var str = 'opening streaming source "' + stream + '"';
                logger.error(IDLOG, str);
                compUtil.net.sendHttp500(IDLOG, res, str);

              } else {
                logger.info(IDLOG, 'opened streaming source "' + stream + '" successful');
                compUtil.net.sendHttp200(IDLOG, res);
              }
            });

          } else {
            logger.warn(IDLOG, 'authorization for user "' + username + '" for open streaming source "' + stream + '" has been failed !');
            compUtil.net.sendHttp403(IDLOG, res);
          }

        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }
    }
    exports.api = streaming.api;
    exports.open = streaming.open;
    exports.sources = streaming.sources;
    exports.setLogger = setLogger;
    exports.setCompUtil = setCompUtil;
    exports.setCompStreaming = setCompStreaming;
    exports.setCompAuthorization = setCompAuthorization;
    exports.setCompConfigManager = setCompConfigManager;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
})();