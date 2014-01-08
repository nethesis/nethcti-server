/**
* Provides the mail functions.
*
* @module mailer
* @main arch_mailer
*/
var fs         = require('fs');
var nodemailer = require('nodemailer');

/**
* Provides the mail functionalities.
*
* @class mailer
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
* @default [mailer]
*/
var IDLOG = '[mailer]';

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
* The mail server port. It can be customized by the
* configuration file.
*
* @property port
* @type string
* @private
* @default "25"
*/
var port = '25';

/**
* The address of the mail server. It can be customized by the
* configuration file.
*
* @property address
* @type string
* @private
* @default "localhost"
*/
var address = 'localhost';

/**
* The email address of the sender. It can be customized by the
* configuration file.
*
* @property sender
* @type string
* @private
* @default "nethcti@mycompany.local"
*/
var sender = 'nethcti@mycompany.local';

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
    try {
        // check parameter
        if (typeof path !== 'string') { throw new TypeError('wrong parameter'); }

        // check file presence
        if (!fs.existsSync(path)) {
            logger.warn(IDLOG, path + ' doesn\'t exist: use default values "' + address  + '" "' + port + '" from "' + sender + '"');
            return;
        }

        // read the configuration file
        var json = require(path);

        // check the configuration
        if (   typeof json.sender  !== 'string' || json.sender  === ''
            || typeof json.port    !== 'string' || json.port    === ''
            || typeof json.address !== 'string' || json.address === '') {

            logger.warn(IDLOG, 'wrong configuration file ' + path);
            return;
        }

        port    = json.port;
        sender  = json.sender;
        address = json.address;

        logger.info(IDLOG, 'configuration by file ' + path + ' ended');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sends an email.
*
* @method send
* @param {string}   to      The destination email address
* @param {string}   subject The subject of the email
* @param {string}   body    The body of the email
* @param {function} cb      The callback function
*/
function send(to, subject, body, cb) {
    try {
        // check parameters
        if (   typeof to      !== 'string' || typeof cb   !== 'function'
            || typeof subject !== 'string' || typeof body !== 'string') {

            throw new Error('wrong parameters');
        }

        // initialize SMTP transport
        var smtpOptions = {
            port: port,
            host: address
        };
        var smtpTransport = nodemailer.createTransport("SMTP", smtpOptions);
        logger.info(IDLOG, 'smtp transport created to ' + address + ':' + port);

        // send the email
        var mailOptions = {
            to:      to,
            from:    sender,
            text:    body,
            subject: subject
        };
        smtpTransport.sendMail(mailOptions, function (err, resp) {
            try {
                if (err) { logger.error(IDLOG, 'ERR: sending email to ' + to); }
                else     { logger.info(IDLOG,  'INFO: email to ' + to + ' has been sent successfully'); }

                smtpTransport.close();
                logger.info(IDLOG, 'INFO: smtp transport from ' + address + ':' + port + ' has been closed');

                cb(err, resp);

            } catch (err) {
                logger.error(err.stack);
                cb(err);
            }
        });

    } catch (err) {
        logger.error(err.stack);
        cb(err);
    }
}

// public interface
exports.send      = send;
exports.config    = config;
exports.setLogger = setLogger;
