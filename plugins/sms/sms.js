/**
* Provides the sms functions.
*
* @module sms
* @main arch_sms
*/
var fs               = require('fs');
var pathreq          = require('path');
var smsDeliveryTypes = require('./sms_delivery_types');

/**
* Provides the mail functionalities.
*
* @class sms
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
* @default [sms]
*/
var IDLOG = '[sms]';

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
* The sms delivery type. The allowed type is defined in
* _sms\_delivery\_types.js_ file. It's defined into the
* configuration file.
*
* @property deliveryType
* @type string
* @private
*/
var deliveryType;

/**
* The prefix number to be used. It's defined into the
* configuration file.
*
* @property prefix
* @type string
* @private
* @default ""
*/
var prefix = '';

/**
* The configurations used to send sms by portech. It's
* initialized by the configuration file.
*
* @property portech
* @type object
* @private
* @default {
    queuePath: ""
}
*/
var portech = {
    queuePath: ''
};

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
* Configurates by a configuration file that must use the JSON syntax.
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

    // read configuration file
    var json = require(path);

    // check the configuration
    if (   typeof json      !== 'object'
        || typeof json.type !== 'string' || typeof json.prefix !== 'string'
        || smsDeliveryTypes.isValidDeliveryType(json.type) === false
        || (json.type === smsDeliveryTypes.TYPES.portech    && !json.portech)
        || (json.type === smsDeliveryTypes.TYPES.webservice && !json.webservice)) {

        throw new Error('sms configuration file ' + path);
    }

    // set the delivery type
    deliveryType = json.type;
    logger.info(IDLOG, 'sms configuration for "' + deliveryType + '"');

    if (deliveryType === smsDeliveryTypes.TYPES.portech) {
        configDeliveryPortech(json.portech);

    } else if (deliveryType === smsDeliveryTypes.TYPES.webservice) {
        //configDeliveryWebservice(json.webservice);
    }

    logger.info(IDLOG, 'sms configuration by file ' + path + ' ended');
}

/**
* Configuration for portech usage.
*
* @method configDeliveryPortech
* @param {object} json
*  @param {string} json.queue_path The filesystem path of the directory in which
*    the sms will be queued into the files
* @private
*/
function configDeliveryPortech(json) {
    // check parameter
    if (typeof json !== 'object' || typeof json.queue_path !== 'string') {
        throw new Error('wrong parameter');
    }
    portech.queuePath = json.queue_path;
    logger.info(IDLOG, 'queue path ' + portech.queuePath + ' for sms files for portech has been set');
}

/**
* Sends an sms message.
*
* @method send
* @param {string}   from The sender identifier
* @param {string}   to   The destination number
* @param {string}   body The body of the sms message
* @param {function} cb   The callback function
*/
function send(from, to, body, cb) {
    try {
        // check parameters
        if (   typeof to   !== 'string'
            || typeof body !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        if (deliveryType === smsDeliveryTypes.TYPES.portech) {
            logger.info(IDLOG, 'send sms to ' + to + ' with portech');
            sendSmsByPortech(from, to, body, cb);

        } else {
            throw new Error('sendSmsByWebservice TO IMPLEMENT.......');
            //..................................
            //..................................
        }
    } catch (err) {
        logger.error(err.stack);
        cb(err);
    }
}

/**
* Creates a file in the sms queue directory. After that, the script
* _sendsms.php_ will read the file and will send the sms message to
* the destination number. The script executes each interval of time.
*
* @method sendSmsByPortech
* @param {string}   from The sender identifier
* @param {string}   to   The destination email address
* @param {string}   body The body of the email
* @param {function} cb   The callback function
* @private
*/
function sendSmsByPortech(from, to, body, cb) {
    try {
        // check parameters
        if (   typeof to   !== 'string'
            || typeof body !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // separator character to be used in the file name
        var SEP = '-';

        // construct filename
        var filename    = from + SEP + to;
        var filepath    = pathreq.join(portech.queuePath, filename);
        var filepathOri = pathreq.join(portech.queuePath, filename);

        // check if the filepath already exists. If it's, then it
        // appends an index number to the end of the file path
        var index = 1;
        while (fs.existsSync(filepath)) {

            filepath = filepathOri + SEP + index;
            index += 1;
        }

        // write file to the queue directory
        fs.writeFile(filepath, body, function (err) {
            try {
                if (err) {
                    logger.error(IDLOG, 'creating new sms file ' + filepath + ': ' + err.stack);
                    cb(err);

                } else {
                    logger.info(IDLOG, 'new sms file ' + filepath + ' has been created successfully');
                    cb(null);
                }
            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get the history of the sms sent by the user into the interval time.
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
function getHistoryInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data          !== 'object'
            ||  typeof cb            !== 'function' || typeof data.to       !== 'string'
            ||  typeof data.from     !== 'string'   || typeof data.username !== 'string'
            || (typeof data.filter   !== 'string'   && data.filter !== undefined)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search history sms between ' + data.from + ' to ' + data.to + ' sent by ' +
                           'username "' + data.username + '" and filter ' + (data.filter ? data.filter : '""'));
        compDbconn.getHistorySmsInterval(data, cb);

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the history of the sms sent by all the user into the interval time.
* It can be possible to filter the results.
*
* @method getAllUserHistoryInterval
* @param {object} data
*   @param {string} data.from     The starting date of the interval in the YYYYMMDD format (e.g. 20130521)
*   @param {string} data.to       The ending date of the interval in the YYYYMMDD format (e.g. 20130528)
*   @param {string} [data.filter] The filter to be used
* @param {function} cb The callback function
*/
function getAllUserHistoryInterval(data, cb) {
    try {
        // check parameters
        if (    typeof data        !== 'object' || typeof cb      !== 'function'
            ||  typeof data.from   !== 'string' || typeof data.to !== 'string'
            || (typeof data.filter !== 'string' && data.filter    !== undefined)) {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search all history sms between ' + data.from + ' to ' + data.to + ' sent by ' +
                           ' all users and filter ' + (data.filter ? data.filter : '""'));
        compDbconn.getAllUserHistorySmsInterval(data, cb);

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
exports.send                      = send;
exports.config                    = config;
exports.setLogger                 = setLogger;
exports.setCompDbconn             = setCompDbconn;
exports.getHistoryInterval        = getHistoryInterval;
exports.getAllUserHistoryInterval = getAllUserHistoryInterval;
