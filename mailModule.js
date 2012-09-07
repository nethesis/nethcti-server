var log4js = require('./lib/log4js-node/lib/log4js')();
var nodemailer = require('./lib/Nodemailer/lib/nodemailer');

var SENDER_NAME = 'NethCTI';
var SENDER_ADDRESS = SENDER_NAME + '@nethcti.it';

var logger = log4js.getLogger('[MailModule]');

exports.MailModule = function () {
    this.setLogger = function (logfile, level) { log4js.addAppender(log4js.fileAppender(logfile), '[MailModule]'); logger.setLevel(level); }
    this.sendCtiMailFromLocal = function (recvAddr, subject, body, cb) { _sendCtiMailFromLocal(recvAddr, subject, body, cb); }
}

function _sendCtiMailFromLocal(recvAddr, subject, body, cb) {
    try {
        
        var localSmtpTransport = nodemailer.createTransport("SMTP", {
            host: "localhost",
            port: 25,
            debug: false
        });

        var mailOptions = {
            from: SENDER_ADDRESS,
            to: recvAddr,
            subject: subject,
            text: body
        }

        localSmtpTransport.sendMail(mailOptions, function (error, response) {
            cb (error, response);
            localSmtpTransport.close();
        });

    } catch (err) {
        logger.error('recvAddr = ' + recvAddr + ', subject = ' + subject + ', body = ' + body + ': ' + err.stack);
    }
}



