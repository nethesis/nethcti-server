/**
* Provides the sms functions.
*
* @module sms
* @main arch_sms
*/
var fs               = require('fs');
var url              = require('url');
var http             = require('http');
var pathreq          = require('path');
var querystring      = require('querystring');
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
* The configurations used to send sms by webservice. It's
* initialized by the configuration file.
*
* @property webservice
* @type object
* @private
* @default {}
*/
var webservice = {};

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

    // set the prefix to be used
    prefix = json.prefix;

    if (deliveryType === smsDeliveryTypes.TYPES.portech) {
        configDeliveryPortech(json.portech);

    } else if (deliveryType === smsDeliveryTypes.TYPES.webservice) {
        configDeliveryWebservice(json.webservice);
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
* Configuration for webservice usage.
*
* @method configDeliveryWebservice
* @param {object} json
*   @param {string} json.url      The parameterized url of the webservice
*   @param {string} json.user     The username to use the webservice
*   @param {string} json.method   The method used to make the HTTP request for the webservice (GET or POST)
*   @param {string} json.password The password to use the webservice
* @private
*/
function configDeliveryWebservice(json) {
    // check parameter
    if (   typeof json        !== 'object'
        || typeof json.url    !== 'string' || typeof json.user     !== 'string'
        || typeof json.method !== 'string' || typeof json.password !== 'string') {

        throw new Error('wrong parameter');
    }

    // get the escape values of the user and password to be used in the http url
    var user     = escapeHttpUrlArgValue(json.user);
    var password = escapeHttpUrlArgValue(json.password);

    webservice.url    = json.url.replace('$USER', user).replace('$PASSWORD', password);
    webservice.method = json.method.toUpperCase();

    logger.info(IDLOG, 'delivery by webservice has been configured');
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

        // add the prefix to the destination number, if it doesn't contains it 
        if (to.length <= 10 && to.substring(0, 1) === '3') { to = prefix + to; }

        if (deliveryType === smsDeliveryTypes.TYPES.portech) {
            logger.info(IDLOG, 'send sms to ' + to + ' with portech');
            sendSmsByPortech(from, to, body, cb);

        } else {
            logger.info(IDLOG, 'send sms to ' + to + ' with webservice');
            sendSmsByWebservice(to, body, cb);
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
* @param {string}   to   The destination number
* @param {string}   body The text of the sms
* @param {function} cb   The callback function
* @private
*/
function sendSmsByPortech(from, to, body, cb) {
    try {
        // check parameters
        if (   typeof to   !== 'string' || typeof from !== 'string'
            || typeof body !== 'string' || typeof cb   !== 'function') {

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
* Sends an sms using a webservice.
*
* @method sendSmsByWebservice
* @param {string}   to   The destination number
* @param {string}   body The text of the sms
* @param {function} cb   The callback function
* @private
*/
function sendSmsByWebservice(to, body, cb) {
    try {
        // check parameters
        if (   typeof to   !== 'string'
            || typeof body !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        if (webservice.method === 'GET') {
            sendSmsByHttpGet(to, body, cb);

        } else if (webservice.method === 'POST') {
            sendSmsByHttpPost(to, body, cb);

        } else {
            var str = 'sending sms to ' + to + ': bad webservice delivery method ' + webservice.method;
            logger.warn(IDLOG, str);
            cb(str);
        }

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Sends an sms using a POST HTTP request.
*
* @method sendSmsByHttpPost
* @param {string}   to   The destination number
* @param {string}   body The text of the sms
* @param {function} cb   The callback function
* @private
*/
function sendSmsByHttpPost(to, body, cb) {
    try {
        // check parameters
        if (   typeof to   !== 'string'
            || typeof body !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // escape the values of "to" and "body" to be inserted in the http url
        var eto   = escapeHttpUrlArgValue(to);
        var ebody = escapeHttpUrlArgValue(body);

        var httpUrl   = webservice.url.replace('$NUMBER', eto).replace('$TEXT', ebody);
        var parsedUrl = url.parse(httpUrl, true);
        var dataPost  = querystring.stringify(parsedUrl.query);

        var options = {
            host:    parsedUrl.hostname,
            port:    parsedUrl.port ? parsedUrl.port : '80',
            path:    parsedUrl.pathname,
            method:  webservice.method,
            headers: {
               'Content-Type':   'application/x-www-form-urlencoded',
               'Content-Length': dataPost.length
            }
        };

        logger.info(IDLOG, 'sending sms to ' + to + ' using HTTP POST request');

        var request = http.request(options, function (res) {
            try {
                // the http response is successful
                if (res.statusCode === 200) {

                    res.setEncoding('utf8');

                    // analize the response. Only the response of webservice "smshosting" is analyzed in detail
                    res.on('data', function (chunk) {
                        try {
                            analizeWebserviceResponse(parsedUrl.hostname, to, chunk, cb);

                        } catch (err2) {
                            logger.error(err2.stack);
                            cb(err2);
                        }
                    });
                }

                // there is an error in the http response
                else {
                    var str = 'sending sms to ' + to + ': response statusCode ' + res.statusCode;
                    logger.warn(IDLOG, str);
                    cb(str);
                }

            } catch (err1) {
                logger.error(err1.stack);
                cb(err1);
            }
        });

        request.on('error', function (e) {
            var str = 'sending sms to ' + to + ': ' + e.message;
            logger.warn(IDLOG, str);
            cb(str);
        });

        // send the request
        request.write(dataPost);
        request.end();

    } catch (err) {
        logger.error(err.stack);
        cb(err);
    }
}

/**
* Sends an sms using a GET HTTP request.
*
* @method sendSmsByHttpGet
* @param {string}   to   The destination number
* @param {string}   body The text of the sms
* @param {function} cb   The callback function
* @private
*/
function sendSmsByHttpGet(to, body, cb) {
    try {
        // check parameters
        if (   typeof to   !== 'string'
            || typeof body !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // escape the values of "to" and "body" to be inserted in the http url
        var eto       = escapeHttpUrlArgValue(to);
        var ebody     = escapeHttpUrlArgValue(body);

        var httpUrl   = webservice.url.replace('$NUMBER', eto).replace('$TEXT', ebody);
        var parsedUrl = url.parse(httpUrl, true);

        var options = {
            host:   parsedUrl.hostname,
            port:   parsedUrl.port ? parsedUrl.port : '80',
            path:   parsedUrl.pathname + parsedUrl.search,
            method: webservice.method
        };

        logger.info(IDLOG, 'sending sms to ' + to + ' using HTTP GET request');

        var request = http.request(options, function (res) {
            try {
                // the http response is successful
                if (res.statusCode === 200) {

                    res.setEncoding('utf8');

                    res.on('data', function (chunk) {
                        try {
                            analizeWebserviceResponse(parsedUrl.hostname, to, chunk, cb);

                        } catch (err2) {
                            logger.error(err2.stack);
                            cb(err2);
                        }
                    });
                }

                // there is an error in the http response
                else {
                    var str = 'sending sms to ' + to + ': response statusCode ' + res.statusCode;
                    logger.warn(IDLOG, str);
                    cb(str);
                }

            } catch (err1) {
                logger.error(err1.stack);
                cb(err1);
            }
        });

        request.on('error', function (e) {
            var str = 'sending sms to ' + to + ': ' + e.message;
            logger.warn(IDLOG, str);
            cb(str);
        });

        // send the request
        request.end();

    } catch (err) {
        logger.error(err.stack);
        cb(err);
    }
}

/**
* Analize the webservice response to understand if it's successful or not.
*
* @method analizeWebserviceResponse
* @param  {string}   serviceName The webservice name
* @param  {string}   response    The response from the webservice
* @param  {string}   to          The destination number
* @return {function} The callback function
* @private
*/
function analizeWebserviceResponse(serviceName, to, response, cb) {
    try {
        var i, respCode;
        var temp = response.split('<CODICE>');

        for (i = 0; i < temp.length; i++) {

            if (temp[i].indexOf('</CODICE>') !== -1) {
                respCode = temp[i].split('</CODICE>')[0];
            }
        }

        // the sms was sent successfully
        if (   respCode === 'HTTP_00'
            || serviceName.indexOf('smshosting') === -1) {

            logger.info(IDLOG, 'sms has been sent successfully to ' + to);
            cb();

        } else {
            var str = 'sending sms to ' + to + ': response code "' + respCode + '"';
            logger.warn(IDLOG, str);
            cb(str);
        }
    } catch (err) {
        logger.error(err.stack);
        cb(err);
    }
}

/**
* Returns the escape of the specified argument value to be inserted in a HTTP URL.
*
* @method escapeHttpUrlArgValue
* @param  {string} value The value to be escape
* @return {string} The escape of the value
* @private
*/
function escapeHttpUrlArgValue(value) {
    try {
        var str = escape(value);

        str = str.replace(/[*]/g, "%2A")
        .replace(/[@]/g, "%40")
        .replace(/[-]/g, "%2D")
        .replace(/[_]/g, "%5F")
        .replace(/[+]/g, "%2B")
        .replace(/[.]/g, "%2E")
        .replace(/[/]/g, "%2F");

        return str;

    } catch (err) {
        logger.error(err.stack);
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
