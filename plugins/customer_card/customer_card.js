/**
* Provides the customer card functions.
*
* @module customer_card
* @main customer_card
*/

/**
* Provides the customer card functionalities.
*
* @class customer_card
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
* @default [customer_card]
*/
var IDLOG = '[customer_card]';

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
* The dbconn module.
*
* @property dbconn
* @type object
* @private
*/
var dbconn;

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
* Set the module to be used for database functionalities.
*
* @method setDbconn
* @param {object} dbConnMod The dbconn module.
*/
function setDbconn(dbconnMod) {
    try {
        // check parameter
        if (typeof dbconnMod !== 'object') { throw new Error('wrong dbconn object'); }
        dbconn = dbconnMod;
        logger.info(IDLOG, 'set dbconn module');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets the enabled customer cards by number.
*
* @method getCustomerCardByNum
* @param {string} user The username of the client that has made the request
* @param {string} num The number to search the customer cards.
* @param {function} cb The callback function
*/
function getCustomerCardByNum(user, num, cb) {
    try {
        // check parameters
        if (typeof num !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search customer card by number ' + num + ' by means dbconn module');
        dbconn.getCustomerCardByNum('identity', num, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.setLogger            = setLogger;
exports.setDbconn            = setDbconn;
exports.getCustomerCardByNum = getCustomerCardByNum;
