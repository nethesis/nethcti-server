/**
* Provides database functions.
*
* @module dbconn
* @submodule plugins
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins/dbconn_customer_card]
*/
var IDLOG = '[plugins/dbconn_customer_card]';

/**
* The prefix for all customer card name.
*
* @property CUSTOMER_CARD
* @type {object}
* @private
* @default { PREFIX_NAME: 'customer_card_' }
*/
var CUSTOMER_CARD = {
    PREFIX_NAME: 'customer_card_'
};

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
* The exported apis.
*
* @property apiList
* @type object
*/
var apiList = {};

/**
* The main architect dbconn component.
*
* @property compDbconnMain
* @type object
* @private
*/
var compDbconnMain;

/**
* Set the main dbconn architect component.
*
* @method setCompDbconnMain
* @param {object} comp The architect main dbconn component
* @static
*/
function setCompDbconnMain(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compDbconnMain = comp;
        logger.log(IDLOG, 'main dbconn component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

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
* Get the customer card of the specified type. It search the results into the
* database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
* or _/etc/nethcti/dbdynamic.json_ files.
*
* @method getCustomerCardByNum
* @param {string}   type The type of the customer card to retrieve
* @param {string}   num  The phone number used to search in _channel_ and _dstchannel_ mysql
*                        fields. It is used to filter. It is preceded by '%' character
* @param {function} cb   The callback function
*/
function getCustomerCardByNum(type, num, cb) {
    try {
        // check parameters
        if (typeof type   !== 'string'
            || typeof num !== 'string'
            || typeof cb  !== 'function') {

            throw new Error('wrong parameters');
        }

        // construct the name of the customer card
        type = CUSTOMER_CARD.PREFIX_NAME + type;

        // check the connection presence
        if (compDbconnMain.dbConn[type] === undefined) {
            var strError = 'no db connection getting customer card ' + type + ' for num ' + num;
            logger.warn(IDLOG, strError);
            cb(strError);
            return;
        }

        if (compDbconnMain.dbConfig[type].dbtype === 'mysql') {

            // escape of the number
            num = compDbconnMain.dbConn[type].getQueryInterface().escape(num); // e.g. num = '123456'
            num = num.substring(1, num.length - 1);             // remove external quote e.g. num = 123456

            // replace the key of the query with paramter
            var query = compDbconnMain.dbConfig[type].query.replace(/\$EXTEN/g, num);

            compDbconnMain.dbConn[type].query(query).success(function (results) {

                logger.info(IDLOG, results.length + ' results by searching ' + type + ' by num ' + num);
                cb(null, results);

            }).error(function (err1) { // manage the error

                logger.error(IDLOG, 'searching ' + type + ' by num ' + num + ': ' + err1.toString());
                cb(err1.toString());
            });

        } else if (isMssqlType(compDbconnMain.dbConfig[type].dbtype)) {

            var query = compDbconnMain.dbConfig[type].query.replace(/\$EXTEN/g, num);

            var request = new mssql.Request(compDbconnMain.dbConn[type]);
            request.query(query, function (err2, recordset) {
                try {
                    if (err2) {
                        logger.error(IDLOG, 'searching ' + type + ' by num ' + num + ': ' + err2.toString());
                        cb(err2.toString());

                    } else {
                        logger.info(IDLOG, recordset.length + ' results by searching ' + type + ' by num ' + num);
                        cb(null, recordset);
                    }
                } catch (err3) {
                    logger.error(IDLOG, err3.stack);
                    cb(err3.toString());
                }
            });
        }

        compDbconnMain.incNumExecQueries();

    } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error.toString());
    }
}

apiList.getCustomerCardByNum = getCustomerCardByNum;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
