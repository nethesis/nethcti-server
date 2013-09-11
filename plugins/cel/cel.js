/**
* TODO Provides the cel functions.
*
* @module cel
* @main arch_cel
*/

/**
* TODO Provides the mail functionalities.
*
* @class cel
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
* @default [cel]
*/
var IDLOG = '[cel]';

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
* The architect component to be used for database.
*
* @property compDbconn
* @type object
* @private
*/
var compDbconn;

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
* TODO Get the history of the cel sent by the user into the interval time.
* It can be possible to filter the results.
*
* @method getHistoryInterval
* @param {object} data
*   @param {string} data.username The username involved in the research
*   @param {string} data.from     The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to       The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used
* @param {function} cb The callback function
*/
function getCallTrace(linkedid, cb) {
    try {
        // check parameters
        if ( typeof linkedid !== 'string' ||  typeof cb !== 'function' ) {
            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search cel for linkedid "' + linkedid + '"');
        compDbconn.getCallTrace(linkedid, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Sets the database architect component.
*
* @method setCompDbconn
* @param {object} comp The database architect component.
*/
function setCompDbconn(comp) {
    try {
        compDbconn = comp;
        logger.info(IDLOG, 'set database architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.setLogger                 = setLogger;
exports.getCallTrace              = getCallTrace;
exports.setCompDbconn             = setCompDbconn;
