var fs = require('fs');
var sys = require('sys');
var url = require('url');
var http = require('http');
var querystring = require('querystring');
var log4js = require('./lib/log4js-node/lib/log4js')();
var logger = log4js.getLogger('[SmsModule]');
var responseMessageReq = require('./responseMessage.js');
var ResponseMessage = responseMessageReq.ResponseMessage;

var SMS_DIR = 'sms';
var SMSHOSTING_URL = 'smshosting';
var sms_conf, dataCollector;

exports.Sms = function () {
    this.setLogger = function (logfile, level) { log4js.addAppender(log4js.fileAppender(logfile), '[SmsModule]'); logger.setLevel(level); }
    this.sendSmsAndResponse = function (extFrom, destNum, text, client) { _sendSmsAndResponse(extFrom, destNum, text, client); }
    this.sendSms = function (destNum, text) { _sendSms(destNum, text); }
    this.setSmsConf = function (smsConf) { _setSmsConf(smsConf); }
    this.setDataCollector = function (dc) { _setDataCollector(dc); }
}


function _setDataCollector(dc) {
    try {
        dataCollector = dc;
    } catch (err) {
        logger.error(err.stack);
    }
}

function _setSmsConf(smsConf) {
    try {
        sms_conf = smsConf;
    } catch (err) {
        logger.error('sms_conf = ' + sms_conf + ': ' + err.stack);
    }
}

function _urlEscape(url){
    try {
        url = escape(url);
        return url.replace(/[*]/g, "%2A")
            .replace(/[@]/g, "%40")
            .replace(/[-]/g, "%2D")
            .replace(/[_]/g, "%5F")
            .replace(/[+]/g, "%2B")
            .replace(/[.]/g, "%2E")
            .replace(/[/]/g, "%2F");
    } catch (err) {
        logger.error(err.stack);
    }
}


function _sendSms(destNum, text) {
    try {

        var prefix = sms_conf['SMS'].prefix;
       
        if (prefix === undefined) {
            logger.warn('send sms: "prefix" not exists in configuration file: set to empty');
            prefix = '';
        }
        if (prefix !== "" && destNum.length <= 10 && destNum.substring(0,1) === '3') {
            destNum = prefix + destNum;
        }

        if (sms_conf["SMS"].type === 'web') {

            if (sms_conf['SMS'].method === undefined) {
                logger.error('send sms: "method" not exists in configuration file');
                return;
            }
            var meth = sms_conf['SMS'].method.toUpperCase();
            if (meth !== 'GET' && meth !== 'POST') {
                logger.error('wrong method "' + meth + '" to send sms: check configuration');
                return;
            }
            if (meth === 'GET') {
                var user = sms_conf['SMS'].user;
                var pwd = sms_conf['SMS'].password;
                var userEscape = _urlEscape(user);
                var pwdEscape = _urlEscape(pwd);
                var destNumEscape = _urlEscape(destNum);
                var textEscape = _urlEscape(text);
                
                if (sms_conf['SMS'].url === undefined) {
                    logger.error('send sms: "url" not exists in configuration file');
                    return;
                }
                
                var httpurl = sms_conf['SMS'].url.replace("$USER",userEscape).replace("$PASSWORD",pwdEscape).replace("$NUMBER",destNumEscape).replace("$TEXT",textEscape);
                var parsed_url = url.parse(httpurl, true);
                var porturl = 80;
                
                if (parsed_url.port !== undefined) {
                    porturl = parsed_url.port;
                }
                
                var options = {
                    host: parsed_url.hostname,
                    port: porturl,
                    path: parsed_url.pathname+parsed_url.search,
                    method: meth
                };
                logger.debug("send GET sms with options = " + sys.inspect(options));

                var request = http.request(options, function (res) { // http request

                    if (res.statusCode === 200) { // HTTP answer is ok, but check also respCode
                        res.setEncoding('utf8');
                        var respCode = '';
    
                        res.on('data', function (chunk) { // get response code
                            var temp = chunk.split("<CODICE>");
                            for (var i = 0, el; el = temp[i]; i++) {
                                if (el.indexOf("</CODICE>") !== -1) {
                                    respCode = el.split("</CODICE>")[0];
                                }
                            }
                            
                            if(respCode === "HTTP_00" || parsed_url.hostname.indexOf(SMSHOSTING_URL) === -1) { // all ok, the sms was sent
                                logger.debug("sms was sent to " + destNum);

                            } else { // there was an error
                                logger.error("error in sms sending to " + destNum + ": check config parameters. respCode = " + respCode);
                            }
                        });
                        
                    } else { // error in HTTP answer

                        logger.error("error in sms sending to " + destNum + ": check config parameters. statusCode = " + res.statusCode);
                        var statusCode = res.statusCode;
                    }
                });

                request.on("error", function (e) { // there was an error
                    logger.error("error in sms sending to " + destNum + ": check config parameters. Error: " + e.message);
                });

                request.end(); // send request
            
            } else if(meth === 'POST') {
    
                var user = sms_conf['SMS'].user;
                var pwd = sms_conf['SMS'].password;
                var userEscape = _urlEscape(user);
                var pwdEscape = _urlEscape(pwd);
                var destNumEscape = _urlEscape(destNum);
                var textEscape = _urlEscape(text);
                var httpurl = sms_conf['SMS'].url.replace("$USER",userEscape).replace("$PASSWORD",pwdEscape).replace("$NUMBER",destNumEscape).replace("$TEXT",textEscape);
                var parsed_url = url.parse(httpurl, true);
                var porturl = 80;

                if (parsed_url.port !== undefined) {
                    porturl = parsed_url.port;
                }
                post_data = querystring.stringify(parsed_url.query);
                var options = {
                    host: parsed_url.hostname,
                    port: porturl,
                    path: parsed_url.pathname,
                    method: meth,
                    headers: {
                       'Content-Type': 'application/x-www-form-urlencoded',
                       'Content-Length': post_data.length
                    }
                };
                
                logger.debug("send sms with options = " + sys.inspect(options) + " and post_data = " + post_data);
                
                var request = http.request(options, function (res) { // http request
                    res.setEncoding('utf8');
                    
                    if (res.statusCode === 200) {
                        var respCode = '';
                        res.on('data', function (chunk) {
                            var temp = chunk.split("<CODICE>");
                            // code of the response
                            for (var i = 0, el; el = temp[i]; i++) {
                                if (el.indexOf("</CODICE>") !== -1) {
                                    respCode = el.split("</CODICE>")[0];
                                }
                            }

                            if (respCode === "HTTP_00" || parsed_url.hostname.indexOf(SMSHOSTING_URL) === -1) { // all ok, the sms was sent
                                logger.debug("sms was sent to " + destNum);
                            } else { // there was an error
                                logger.error("error in sms sending to " + destNum + ": check config parameters. statusCode = " + res.statusCode);
                            }
                        });
                    
                    } else { // error in HTTP answer
                        logger.error("error in sms sending from to " + destNum + ": check config parameters. statusCode = " + res.statusCode);
                    }                    
                });
                
                request.write(post_data);
                request.end();
            }

            logger.debug("HTTP [" + meth + "] request for sending SMS to " + destNum + " was sent to: " + parsed_url.host);

        } else if (sms_conf["SMS"].type === "portech") { // PORTECH

            var pathori = SMS_DIR + '/notify' + '-' + destNum;
            var smsFilepath = SMS_DIR + '/notify' + '-' + destNum;
            var res = true;
            var index = 1;
            
            while(res){ // check if the file already exist: if exist it modify file name
                try{
                    fs.statSync(smsFilepath);
                    smsFilepath = pathori + '-' + index;
                    index++;
                } catch (e) {
                    res=false;
                }
            }
            
            fs.writeFile(smsFilepath, text, function(err){
                if(err){
                    logger.error(err + ': there was a problem in creation of sms file "' + smsFilepath + '"');
                } else {
                    logger.debug('created sms file "' + smsFilepath + '"');
                }
            });

        } else {
            logger.error("sms type in server configuration is: " + sms_conf["SMS"].type);
        }

    } catch (err) {
        logger.error('destNum = ' + destNum + ', prefix = ' + prefix + ', text = ' + text + ': ' + err.stack);
    }
}

function _sendSmsAndResponse(extFrom, destNum, text, client) {
    try {

        var prefix = sms_conf['SMS'].prefix;
       
        if (prefix === undefined) {
            logger.warn('send sms: "prefix" not exists in configuration file: set to empty');
            prefix = '';
        }
        if (prefix !== "" && destNum.length <= 10 && destNum.substring(0,1) === '3') {
            destNum = prefix + destNum;
        }

        if (sms_conf["SMS"].type === 'web') {

            if (sms_conf['SMS'].method === undefined) {
                logger.error('send sms: "method" not exists in configuration file');
                return;
            }
            var meth = sms_conf['SMS'].method.toUpperCase();
            if (meth !== 'GET' && meth !== 'POST') {
                logger.error('wrong method "' + meth + '" to send sms: check configuration');
                return;
            }
            if (meth === 'GET') {
                var user = sms_conf['SMS'].user;
                var pwd = sms_conf['SMS'].password;
                var userEscape = _urlEscape(user);
                var pwdEscape = _urlEscape(pwd);
                var destNumEscape = _urlEscape(destNum);
                var textEscape = _urlEscape(text);
                
                if (sms_conf['SMS'].url === undefined) {
                    logger.error('send sms: "url" not exists in configuration file');
                    return;
                }
                
                var httpurl = sms_conf['SMS'].url.replace("$USER",userEscape).replace("$PASSWORD",pwdEscape).replace("$NUMBER",destNumEscape).replace("$TEXT",textEscape);
                var parsed_url = url.parse(httpurl, true);
                var porturl = 80;
                
                if (parsed_url.port !== undefined) {
                    porturl = parsed_url.port;
                }
                
                var options = {
                    host: parsed_url.hostname,
                    port: porturl,
                    path: parsed_url.pathname+parsed_url.search,
                    method: meth
                };
                logger.debug("send GET sms with options = " + sys.inspect(options));

                var request = http.request(options, function (res) { // http request

                    if (res.statusCode === 200) { // HTTP answer is ok, but check also respCode
                        res.setEncoding('utf8');
                        var respCode = '';
    
                        res.on('data', function (chunk) { // get response code
                            var temp = chunk.split("<CODICE>");
                            for (var i = 0, el; el = temp[i]; i++) {
                                if (el.indexOf("</CODICE>") !== -1) {
                                    respCode = el.split("</CODICE>")[0];
                                }
                            }
                            
                            if(respCode === "HTTP_00" || parsed_url.hostname.indexOf(SMSHOSTING_URL) === -1) { // all ok, the sms was sent
                                logger.debug("sms was sent: " + extFrom + " -> " + destNum);
                                
                                // add entry in DB
                                dataCollector.registerSmsSuccess(extFrom, destNum, text, function (res) {
                                    // send ack to client
                                    var mess = new ResponseMessage(client.id, "ack_send_web_sms", '');
                                    client.emit('message',mess);
                                    logger.debug("add entry success into sms database");
                                    logger.debug("RESP 'ack_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                });

                            } else { // there was an error
                                logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. respCode = " + respCode);
                                
                                // add entry in DB
                                dataCollector.registerSmsFailed(extFrom, destNum, text, function (res) {
                                    // send error to client
                                    var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
                                    mess.respCode = respCode;
                                    client.emit('message', mess);
                                    logger.debug("add entry of fail into sms database");
                                    logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                });
                            }
                        });
                        
                    } else { // error in HTTP answer

                        logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. statusCode = " + res.statusCode);
                        var statusCode = res.statusCode;
 
                        // add entry in DB
                        dataCollector.registerSmsFailed(extFrom, destNum, text, function (res) {
                            // send error to client
                            var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
                            mess.statusCode = statusCode;
                            client.emit('message',mess);
                            logger.debug("add entry of fail into sms database");
                            logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                        });
                    }
                });

                request.on("error", function (e) { // there was an error
                    logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. Error: " + e.message);
    
                    // add entry in DB
                    dataCollector.registerSmsFailed(extFrom, destNum, text, function (res) {
                        // send error to client
                        var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
                        client.emit('message',mess);
                        logger.debug("add entry of fail into sms database");
                        logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                    });
                });

                request.end(); // send request
            
            } else if(meth === 'POST') {
    
                var user = sms_conf['SMS'].user;
                var pwd = sms_conf['SMS'].password;
                var userEscape = _urlEscape(user);
                var pwdEscape = _urlEscape(pwd);
                var destNumEscape = _urlEscape(destNum);
                var textEscape = _urlEscape(text);
                var httpurl = sms_conf['SMS'].url.replace("$USER",userEscape).replace("$PASSWORD",pwdEscape).replace("$NUMBER",destNumEscape).replace("$TEXT",textEscape);
                var parsed_url = url.parse(httpurl, true);
                var porturl = 80;

                if (parsed_url.port !== undefined) {
                    porturl = parsed_url.port;
                }
                post_data = querystring.stringify(parsed_url.query);
                var options = {
                    host: parsed_url.hostname,
                    port: porturl,
                    path: parsed_url.pathname,
                    method: meth,
                    headers: {
                       'Content-Type': 'application/x-www-form-urlencoded',
                       'Content-Length': post_data.length
                    }
                };
                
                logger.debug("send sms with options = " + sys.inspect(options) + " and post_data = " + post_data);
                
                var request = http.request(options, function (res) { // http request
                    res.setEncoding('utf8');
                    
                    if (res.statusCode === 200) {
                        var respCode = '';
                        res.on('data', function (chunk) {
                            var temp = chunk.split("<CODICE>");
                            // code of the response
                            for (var i = 0, el; el = temp[i]; i++) {
                                if (el.indexOf("</CODICE>") !== -1) {
                                    respCode = el.split("</CODICE>")[0];
                                }
                            }

                            if (respCode === "HTTP_00" || parsed_url.hostname.indexOf(SMSHOSTING_URL) === -1) { // all ok, the sms was sent
                                logger.debug("sms was sent: " + extFrom + " -> " + destNum);
                                // add entry in DB
                                dataCollector.registerSmsSuccess(extFrom, destNum, text, function(res){
                                   // send ack to client
                                   var mess = new ResponseMessage(client.id, "ack_send_web_sms", '');
                                   client.emit('message',mess);
                                   logger.debug("add entry success into sms database");
                                   logger.debug("RESP 'ack_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                                });
                            } else { // there was an error
                                // add entry in DB
                                dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
                                    // send error to client
                                    var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
                                    mess.respCode = respCode;
                                    client.emit('message',mess);
                                    logger.debug("add entry of fail into sms database");
                                });
                            }
                        });
                    
                    } else { // error in HTTP answer
                        logger.error("error in sms sending from " + extFrom + " -> " + destNum + ": check config parameters. statusCode = " + res.statusCode);
                        var statusCode = res.statusCode;
                        // add entry in DB
                        dataCollector.registerSmsFailed(extFrom, destNum, text, function(res){
                            // send error to client
                            var mess = new ResponseMessage(client.id, "error_send_web_sms", '');
                            mess.statusCode = statusCode;
                            client.emit('message',mess);
                            logger.debug("add entry of fail into sms database");
                            logger.debug("RESP 'error_send_web_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                        });
                    }                    
                });
                
                request.write(post_data);
                request.end();
            }

            logger.debug("HTTP [" + meth + "] request for sending SMS from " + extFrom + " -> " + destNum + " was sent to: " + parsed_url.host);

        } else if (sms_conf["SMS"].type === "portech") { // PORTECH

            var pathori = SMS_DIR+'/'+extFrom+'-'+destNum;
            var smsFilepath = SMS_DIR+'/'+extFrom+'-'+destNum;
            var res = true;
            var index = 1;
            
            while(res){ // check if the file already exist: if exist it modify file name
                try{
                    fs.statSync(smsFilepath);
                    smsFilepath = pathori + '-' + index;
                    index++;
                } catch (e) {
                    res=false;
                }
            }
            
            fs.writeFile(smsFilepath, text, function(err){
                if(err){
                    logger.error(err + ': there was a problem in creation of sms file "' + smsFilepath + '"');
                    // send error to client
                    var mess = new ResponseMessage(client.id, "error_send_sms", '');
                    client.emit('message',mess);
                    logger.debug("RESP 'error_send_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                } else {
                    logger.debug('created sms file "' + smsFilepath + '"');
                    // send ack to client
                    var mess = new ResponseMessage(client.id, "ack_send_sms", '');
                    client.emit('message',mess);
                    logger.debug("RESP 'ack_send_sms' has been sent to [" + extFrom + "] id '" + client.id + "'");
                }
            });

        } else {
            logger.error("sms type in server configuration is: " + sms_conf["SMS"].type);
        }

    } catch (err) {
        logger.error('destNum = ' + destNum + ', prefix = ' + prefix + ', text = ' + text + ': ' + err.stack);
    }
}
