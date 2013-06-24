/**
* Provides the customer card functions.
*
* @module customer_card
* @main customer_card
*/
var async = require('async');

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
* Gets a customer card.
*
* @method getCustomerCardByNum
* @param {string} ccName The name of the customer card to search
* @param {string} num The number used to search the customer card.
* @param {function} cb The callback function
*/
function getCustomerCardByNum(ccName, num, cb) {
    try {
        // check parameters
        if (typeof num !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search customer card ' + ccName + ' by number ' + num + ' by means dbconn module');
        dbconn.getCustomerCardByNum(ccName, num, cb);

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
* Gets all authorized customer cards of the user.
*
* @method getAllCustomerCards
* @param {string} username The identifier of the user
* @param {string} num The number used to search the customer cards.
* @param {function} cb The callback function
*/
function getAllCustomerCards(username, num, cb) {
    try {
        // check parameters
        if (typeof username !== 'string'
            || typeof num   !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // get the list of the authorized customer card. It's an array with
        // the name of customer cards as strings
        var allowedCC = compAuthorization.authorizedCustomerCards(username);
        logger.info(IDLOG, 'user "' + username + '" is authorized to view "' + allowedCC.toString() + '" customer cards');

        var obj = {}; // object with all results

        // parallel execution
        async.each(allowedCC, function (ccName, callback) {

            getCustomerCardByNum(ccName, num, function (err, results) { // get one customer card
                try {
                    if (err) { // some error in the query
                        logger.error(IDLOG, err);

                    } else { // add the result
                        obj[ccName] = results;
                    }
                    callback();

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    callback();
                }
            });

        }, function (err) {
            if (err) { logger.error(IDLOG, err); }

            var objKeys = Object.keys(obj);
            logger.info(IDLOG, objKeys.length + ' customer cards "' + objKeys.toString() + '" obtained for user "' + username + '" searching num ' + num);

            cb(null, obj);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

// public interface
exports.setLogger            = setLogger;
exports.setDbconn            = setDbconn;
exports.getAllCustomerCards  = getAllCustomerCards;
exports.getCustomerCardByNum = getCustomerCardByNum;
exports.setCompAuthorization = setCompAuthorization;
