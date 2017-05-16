/**
 * Provides database functions.
 *
 * @module dbconn
 * @submodule plugins
 */
var mssql = require('mssql');

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
    if (typeof comp !== 'object') {
      throw new Error('wrong parameter');
    }

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
 * Get the customer card of the specified type.
 *
 * @method getCustomerCardByNum
 * @param {string} permissionId The permission identifier of the customer card in asterisk.rest_cti_permissions
 * @param {string} ccName The customer card name
 * @param {string} num The phone number used to search in _channel_ and _dstchannel_ mysql
 *                     fields. It is used to filter out. It is preceded by '%' character
 * @param {function} cb The callback function
 */
function getCustomerCardByNum(permissionId, ccName, num, cb) {
  try {
    // check parameters
    if (typeof permissionId !== 'string' ||
      typeof ccName !== 'string' ||
      typeof num !== 'string' ||
      typeof cb !== 'function') {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    var query;
    // get the db connection relative to customer card specified
    var dbConnId = compDbconnMain.custCardTemplatesData[permissionId].dbconn_id;

    // check the connection presence
    if (compDbconnMain.dbConnCustCard[dbConnId] === undefined) {
      var strError = 'no db connection for customer card ' + ccName + ' (permission_id: ' + permissionId +
        ') for num ' + num + ' (dbConnId: ' + dbConnId + ')';
      logger.warn(IDLOG, strError);
      cb(strError);
      return;
    }

    if (compDbconnMain.dbConfigCustCardData[dbConnId].type === 'mysql') {

      // escape of the number
      num = compDbconnMain.dbConnCustCard[dbConnId].getQueryInterface().escape(num); // e.g. num = '123456'
      num = num.substring(1, num.length - 1); // remove external quote e.g. num = 123456

      // replace the key of the query with parameter
      query = compDbconnMain.custCardTemplatesData[permissionId].query.replace(/\$EXTEN/g, num);

      compDbconnMain.dbConnCustCard[dbConnId].query(query).then(function(results) {

        logger.info(IDLOG, results[0].length + ' results by searching cust card "' + ccName +
          '" (permission_id: ' + permissionId + ') by num ' + num);
        cb(null, results[0]);

      }, function(err1) { // manage the error

        logger.error(IDLOG, 'searching cust card "' + ccName + '" (permission_id: ' + permissionId + ') by num ' +
          num + ': ' + err1.toString());
        cb(err1.toString());
      });

    } else if (compDbconnMain.dbConfigCustCardData[dbConnId].type === 'postgres') {

      query = compDbconnMain.custCardTemplatesData[permissionId].query.replace(/\$EXTEN/g, num);
      compDbconnMain.dbConnCustCard[dbConnId].query(query, function(err2, results) {
        if (err2) {
          logger.error(IDLOG, 'searching cust card "' + ccName + '" (permission_id: ' + permissionId + ') by num ' +
            num + ': ' + err2.toString());
          cb(err2.toString());

        } else {
          logger.info(IDLOG, results.rows.length + ' results by searching cust card "' + ccName +
            '" (permission_id: ' + permissionId + ') by num ' + num);
          cb(null, results.rows);
        }
      });

    } else if (compDbconnMain.isMssqlType(compDbconnMain.dbConfigCustCardData[dbConnId].type)) {

      var request = new mssql.Request(compDbconnMain.dbConnCustCard[dbConnId]);
      query = compDbconnMain.custCardTemplatesData[permissionId].query.replace(/\$EXTEN/g, num);
      request.query(query, function(err2, recordset) {
        try {
          if (err2) {
            logger.error(IDLOG, 'searching cust card "' + ccName + '" (permission_id: ' + permissionId +
              ') by num ' + num + ': ' + err2.toString());
            cb(err2.toString());

          } else {
            logger.info(IDLOG, recordset.length + ' results by searching cust card "' + ccName +
              '" (permission_id: ' + permissionId + ') by num ' + num);
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

/**
 * Return the name of the customer cards.
 *
 * @method getCustCardNames
 * @param {function} cb The callback function
 */
function getCustCardNames(cb) {
  try {
    compDbconnMain.readCustomerCard(function(err, results) {
      if (err) {
        logger.warn(IDLOG, 'getting customer card names');
        cb(err);
        return;
      }
      var i;
      var arr = [];
      for (i = 0; i < results.length; i++) {
        arr.push(results[i].template);
      }
      cb(null, arr);
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Test if the database connection to specified customer card exists.
 *
 * @method checkDbconnCustCard
 * @param {string} permissionId The permission identifier of the customer card in asterisk.rest_cti_permissions
 * @return {boolean} True if the connection exists.
 */
function checkDbconnCustCard(permissionId) {
  try {
    if (typeof permissionId !== 'string') {
      throw new Error('wrong parameter: ' + JSON.stringify(arguments));
    }

    var connid = compDbconnMain.custCardTemplatesData[permissionId] ? compDbconnMain.custCardTemplatesData[permissionId].dbconn_id : null;
    if (compDbconnMain.dbConnCustCard[connid]) {
      return true;
    }
    return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    return false;
  }
}

/**
 * Return the name of the template file.
 *
 * @method getCustCardTemplateName
 * @param {string} permissionId The permission identifier of the customer card in asterisk.rest_cti_permissions
 * @return {string} The name of the template file or undefined.
 */
function getCustCardTemplateName(permissionId) {
  try {
    if (typeof permissionId !== 'string') {
      throw new Error('wrong parameter: ' + JSON.stringify(arguments));
    }
    if (compDbconnMain.custCardTemplatesData[permissionId]) {
      return compDbconnMain.custCardTemplatesData[permissionId].template;
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Return the name of the customer card.
 *
 * @method getCustCardNameDescr
 * @param {string} permissionId The permission identifier of the customer card in asterisk.rest_cti_permissions
 * @return {string} The name of the customer card with the specified permission id.
 */
function getCustCardNameDescr(permissionId) {
  try {
    if (typeof permissionId !== 'string') {
      throw new Error('wrong parameter: ' + JSON.stringify(arguments));
    }
    if (compDbconnMain.custCardTemplatesData[permissionId]) {
      return compDbconnMain.custCardTemplatesData[permissionId].name;
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

apiList.getCustCardNames = getCustCardNames;
apiList.checkDbconnCustCard = checkDbconnCustCard;
apiList.getCustCardNameDescr = getCustCardNameDescr;
apiList.getCustomerCardByNum = getCustomerCardByNum;
apiList.getCustCardTemplateName = getCustCardTemplateName;

// public interface
exports.apiList = apiList;
exports.setLogger = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
