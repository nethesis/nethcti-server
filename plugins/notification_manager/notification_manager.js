/**
* Provides the notification manager functions.
*
* @module notification_manager
* @main arch_notification_manager
*/
var fs     = require('fs');
var ejs    = require('ejs');
var path   = require('path');
var moment = require('moment');

/**
* Provides the notification manager functionalities.
*
* @class notification_manager
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
* @default [notification_manager]
*/
var IDLOG = '[notification_manager]';

/**
* The default directory of the notification templates.
*
* @property DEFAULT_TEMPLATES_DIR
* @type string
* @private
* @final
* @readOnly
* @default "templates/locales/it"
*/
var DEFAULT_TEMPLATES_DIR = 'templates/locales/it';

/**
* The directory path of the custom templates used by the notification manager. All
* templates in this path are more priority than the default ones.
*
* @property customTemplatesPath
* @type string
* @private
*/
var customTemplatesPath;

/**
* All the ejs templates used for the notifications. The keys are the name of the
* file and the values are their content.
*
* @property ejsTemplates
* @type object
* @private
*/
var ejsTemplates = {};

/**
* The file name of all the ejs templates.
*
* @property EJS_TEMPLATE_FILENAMES
* @type object
* @final
* @readonly
* @private
* @default {
    newPostitSmsBody:         "new_postit_sms_body.ejs",
    newPostitEmailBody:       "new_postit_email_body.ejs",
    newVoicemailSmsBody:      "new_voicemail_sms_body.ejs",
    newVoicemailEmailBody:    "new_voicemail_email_body.ejs",
    newPostitEmailSubject:    "new_postit_email_subject.ejs",
    newVoicemailEmailSubject: "new_voicemail_email_subject.ejs"
}
*/
var EJS_TEMPLATE_FILENAMES = {
    newPostitSmsBody:         'new_postit_sms_body.ejs',
    newPostitEmailBody:       'new_postit_email_body.ejs',
    newVoicemailSmsBody:      'new_voicemail_sms_body.ejs',
    newVoicemailEmailBody:    'new_voicemail_email_body.ejs',
    newPostitEmailSubject:    'new_postit_email_subject.ejs',
    newVoicemailEmailSubject: 'new_voicemail_email_subject.ejs'
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
* The voicemail architect component used for voicemail functions.
*
* @property compVoicemail
* @type object
* @private
*/
var compVoicemail;

/**
* The postit architect component used for postit functions.
*
* @property compPostit
* @type object
* @private
*/
var compPostit;

/**
* The architect component to be used for user functions.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The architect component to be used for mailer functions.
*
* @property compMailer
* @type object
* @private
*/
var compMailer;

/**
* The architect component to be used for sms functions.
*
* @property compSms
* @type object
* @private
*/
var compSms;

/**
* The configuration manager architect component used for configuration functions.
*
* @property compConfigManager
* @type object
* @private
*/
var compConfigManager;

/**
* The architect component to be used for authorization.
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
* Set voicemail architect component used by voicemail functions.
*
* @method setCompVoicemail
* @param {object} comp The voicemail architect component.
*/
function setCompVoicemail(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compVoicemail = comp;
        logger.info(IDLOG, 'set voicemail architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the postit architect component used by postit functions.
*
* @method setCompPostit
* @param {object} comp The postit architect component.
*/
function setCompPostit(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compPostit = comp;
        logger.info(IDLOG, 'set postit architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the mailer architect component.
*
* @method setCompMailer
* @param {object} comp The mailer architect component.
*/
function setCompMailer(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compMailer = comp;
        logger.info(IDLOG, 'set mailer architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the sms architect component.
*
* @method setCompSms
* @param {object} comp The sms architect component.
*/
function setCompSms(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compSms = comp;
        logger.info(IDLOG, 'set sms architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set configuration manager architect component used by configuration functions.
*
* @method setCompConfigManager
* @param {object} comp The configuration manager architect component.
*/
function setCompConfigManager(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compConfigManager = comp;
        logger.info(IDLOG, 'set configuration manager architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = comp;
        logger.log(IDLOG, 'authorization component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set user architect component used for user functions.
*
* @method setCompUser
* @param {object} comp The user architect component.
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compUser = comp;
        logger.info(IDLOG, 'set user architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Configures the module by using the specified JSON configuration file.
*
* @method config
* @param {string} path The path of the JSON configuration file
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check the file existence
        if (!fs.existsSync(path)) {
            logger.error(IDLOG, path + ' doesn\'t exist');
            return;
        }

        var json = require(path);

        // check the configuration file
        if (   typeof json !== 'object' || typeof json.notification_manager    !== 'object'
            || typeof json.notification_manager.custom_templates_notifications !== 'string') {

            logger.error('wrong configuration file ' + path);
            return;
        }

        customTemplatesPath = json.notification_manager.custom_templates_notifications;
        logger.info(IDLOG, 'end configuration by file ' + path);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Creates the server websocket.
*
* @method start
*/
function start() {
    try {
        // set the language to formatting the date
        moment.lang('it');

        // set the listener for the voicemail module
        setVoicemailListeners();

        // set the listener for the postit module
        setPostitListeners();

        // initialize ejs templates
        initEjsTemplates();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initializes the ejs templates used to send notifications. The default templates
* are in the _DEFAULT\_TEMPLATES\_DIR_ but the templates present in _customTemplatesPath_
* are more priority.
*
* @method initEjsTemplates
* @private
*/
function initEjsTemplates() {
    try {
        // get all file names of the custom and default templates
        var customFilenames  = fs.readdirSync(customTemplatesPath);
        var defaultFilenames = fs.readdirSync(path.join(__dirname, DEFAULT_TEMPLATES_DIR));

        // template files to read. The keys are the name of the files
        // and the values are the path of the files
        var filesToRead = {};

        // load all default template files in the filesToRead
        var i;
        var filename;
        var filepath;
        for (i = 0; i < defaultFilenames.length; i++) {

            filename = defaultFilenames[i];
            filepath = path.join(__dirname, DEFAULT_TEMPLATES_DIR, filename);
            filesToRead[filename] = filepath;
        }

        // load all the custom template files in the filesToRead. So this custom files
        // are more priority than the default templates
        for (i = 0; i < customFilenames.length; i++) {

            filename = customFilenames[i];
            filepath = path.join(customTemplatesPath, filename);
            filesToRead[filename] = filepath;
        }

        // read the content of all the ejs templates
        var content;
        for (filename in filesToRead) {

            filepath = filesToRead[filename];
            content  = fs.readFileSync(filepath, 'utf8');
            ejsTemplates[filename] = content;
            logger.info(IDLOG, 'ejs template ' + filepath + ' has been read');
        }
        logger.info(IDLOG, 'initialized ejs notification templates');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the postit component.
*
* @method setPostitListeners
* @private
*/
function setPostitListeners() {
    try {
        // check postit component object
        if (!compPostit || typeof compPostit.on !== 'function') {
            throw new Error('wrong voicemail object');
        }

        compPostit.on(compPostit.EVT_NEW_POSTIT, newPostitListener);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the event listeners for the voicemail component.
*
* @method setVoicemailListeners
* @private
*/
function setVoicemailListeners() {
    try {
        // check voicemail component object
        if (!compVoicemail || typeof compVoicemail.on !== 'function') {
            throw new Error('wrong voicemail object');
        }

        compVoicemail.on(compVoicemail.EVT_NEW_VOICE_MESSAGE, newVoiceMessageListener);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Manages the new voicemail event emitted by the voicemail component. It sends
* the voicemail notifications to all users who use the voicemail using their
* notification configurations.
*
* @method newVoiceMessageListener
* @param {string} voicemail The voicemail identifier
* @param {array}  list      The list of all new voicemail messages
* @private
*/
function newVoiceMessageListener(voicemail, list) {
    try {
        logger.info(IDLOG, 'received "' + compVoicemail.EVT_NEW_VOICE_MESSAGE + '" event from voicemail "' + voicemail + '": ' + list.length + ' new voice messages');

        // check the event data
        if (typeof voicemail !== 'string' || list === undefined || list instanceof Array === false) {
            throw new Error('wrong voicemails array list');
        }

        // get the list of all the usernames
        var users = compUser.getUsernames();

        // it sends voicemail notifications to only the users who have the voicemail
        // endpoint, who have the voicemail authorization and have the notification
        // configurations enabled
        var i;
        var conf;
        var username;
        for (i = 0; i < users.length; i++) {

            username = users[i];

            // check the user-voicemail endpoint association
            if (compUser.hasVoicemailEndpoint(username, voicemail) === true) {

                logger.info(IDLOG, 'user "' + username + '" has the voicemail endpoint ' + voicemail);

                // check if send email notification to the user
                if (compConfigManager.verifySendVoicemailNotificationByEmail(username) === true) {

                    sendNewVoicemailNotificationEmail(username, voicemail, list, sendNewVoicemailNotificationEmailCb);

                } else {
                    logger.info(IDLOG, 'don\'t send voicemail notification to user "' + username + '" by email');
                }

                // check if send sms notification to the user
                if (compConfigManager.verifySendVoicemailNotificationBySms(username) === true) {

                    sendNewVoicemailNotificationSms(username, voicemail, list, sendNewVoicemailNotificationSmsCb);

                } else {
                    logger.info(IDLOG, 'don\'t send voicemail notification to user "' + username + '" by sms');
                }

            } else {
                logger.info(IDLOG, 'user "' + username + '" hasn\'t the voicemail endpoint ' + voicemail);
            }
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Manages the new post-it event emitted by the postit component. It sends
* the post-it notifications to the recipient user of the post-it using their
* notification configurations.
*
* @method newPostitListener
* @param {string} creator   The creator username of the new post-it
* @param {string} recipient The recipient username of the new post-it
* @param {array}  list      The list of all unread post-it of the recipient user
* @private
*/
function newPostitListener(creator, recipient, list) {
    try {
        logger.info(IDLOG, 'received "' + compPostit.EVT_NEW_POSTIT + '" event: created by "' + creator + '" for "' + recipient + '" : ' + list.length + ' unread post-it for "' + recipient + '"');

        // check the event data
        if (   typeof creator !== 'string'  || typeof recipient      !== 'string'
            || list           === undefined || list instanceof Array === false) {

            throw new Error('wrong data from event "' + compPostit.EVT_NEW_POSTIT + '"');
        }

        // it sends notification to the recipient user of the new post-it message,
        // if he has the post-it authorization and has the notification configurations enabled

        // check the user authorization
        if (   compAuthorization.authorizePostitUser(recipient)      === true
            || compAuthorization.authorizeAdminPostitUser(recipient) === true) {

            logger.info(IDLOG, 'recipient user "' + recipient + '" has the post-it authorization');

            // check if send email notification to the user
            if (compConfigManager.verifySendPostitNotificationByEmail(recipient) === true) {

                sendNewPostitNotificationEmail(creator, recipient, list, sendNewPostitNotificationEmailCb);

            } else {
                logger.info(IDLOG, 'don\'t send new post-it notification to user "' + recipient + '" by email');
            }

            // check if send sms notification to the user
            if (compConfigManager.verifySendPostitNotificationBySms(recipient) === true) {

                sendNewPostitNotificationSms(creator, recipient, list, sendNewPostitNotificationSmsCb);

            } else {
                logger.info(IDLOG, 'don\'t send new post-it notification to user "' + recipient + '" by sms');
            }


        } else {
            logger.info(IDLOG, 'recipient user "' + recipient + '" hasn\'t the post-it authorization: don\'t send any notification to him');
        }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* The callback function of the send notification of a new voicemail message
* by email. It's called at the end of the email dispatch.
*
* @method sendNewVoicemailNotificationEmailCb
* @param {object} err  The error object
* @param {object} resp The response of the action
* @private
*/
function sendNewVoicemailNotificationEmailCb(err, resp) {
    try {
        if (err) { logger.error(IDLOG, 'sending email notification for new voicemail message'); }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* The callback function of the send notification of a new post-it message
* by email. It's called at the end of the email dispatch.
*
* @method sendNewPostitNotificationEmailCb
* @param {object} err  The error object
* @param {object} resp The response of the action
* @private
*/
function sendNewPostitNotificationEmailCb(err, resp) {
    try {
        if (err) { logger.error(IDLOG, 'sending email notification for new post-it message'); }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* The callback function of the send notification of a new voicemail message
* by sms. It's called at the end of the sms dispatch.
*
* @method sendNewVoicemailNotificationSmsCb
* @param {object} err  The error object
* @param {object} resp The response of the action
* @private
*/
function sendNewVoicemailNotificationSmsCb(err, resp) {
    try {
        if (err) { logger.error(IDLOG, 'sending sms notification for new voicemail message'); }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* The callback function of the send notification of a new post-it message
* by sms. It's called at the end of the sms dispatch.
*
* @method sendNewPostitNotificationSmsCb
* @param {object} err  The error object
* @param {object} resp The response of the action
* @private
*/
function sendNewPostitNotificationSmsCb(err, resp) {
    try {
        if (err) { logger.error(IDLOG, 'sending sms notification for new post-it message'); }
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sends a voicemail notification to the user by email.
*
* @method sendNewVoicemailNotificationEmail
* @param {string}   username  The user identifier
* @param {string}   voicemail The voicemail identifier
* @param {array}    list      The list of all new voice messages of the voicemail
* @param {function} cb        The callback function
* @private
*/
function sendNewVoicemailNotificationEmail(username, voicemail, list, cb) {
    try {
        // check the parameters
        if (   typeof username  !== 'string'
            || typeof voicemail !== 'string' || typeof cb !== 'function'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var to      = compConfigManager.getVoicemailNotificationEmailTo(username);
        var subject = getVmNotificationEmailSubject(username, voicemail, list);
        var body    = getVmNotificationEmailBody(username, voicemail, list);

        logger.info(IDLOG, 'send new voicemail ' + voicemail + ' notification to email ' + to + ' of user "' + username + '"');
        compMailer.send(to, subject, body, function (err, resp) {
            try {
                if (err) {
                    logger.error(IDLOG, 'sending email notification to ' + to + ' of the new voicemail "' + voicemail + '" of the user "' + username + '"');
                    throw err;
                }
                cb(null, resp);

            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sends a new post-it notification to the user by email.
*
* @method sendNewPostitNotificationEmail
* @param {string}   creator   The creator username of the new post-it message
* @param {string}   recipient The recipient username of the new post-it message
* @param {array}    list      The list of all unread post-it of the recipient user
* @param {function} cb        The callback function
* @private
*/
function sendNewPostitNotificationEmail(creator, recipient, list, cb) {
    try {
        // check the parameters
        if (   typeof creator   !== 'string'
            || typeof recipient !== 'string' || typeof cb !== 'function'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var to      = compConfigManager.getPostitNotificationEmailTo(recipient);
        var subject = getPostitNotificationEmailSubject(creator, recipient, list);
        var body    = getPostitNotificationEmailBody(creator, recipient, list);

        logger.info(IDLOG, 'send new post-it notification from creator "' + creator + '" to email ' + to + ' of user "' + recipient + '"');
        compMailer.send(to, subject, body, function (err, resp) {
            try {
                if (err) {
                    logger.error(IDLOG, 'sending email notification to ' + to + ' of the new post-it from "' + creator + '" to user "' + recipient + '"');
                    throw err;
                }
                cb(null, resp);

            } catch (err) {
                logger.error(IDLOG, err.stack);
                cb(err);
            }
        });

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sends a voicemail notification to the user by sms.
*
* @method sendNewVoicemailNotificationSms
* @param {string}   username  The user identifier
* @param {string}   voicemail The voicemail identifier
* @param {array}    list      The list of all new voice messages of the voicemail
* @param {function} cb        The callback function
* @private
*/
function sendNewVoicemailNotificationSms(username, voicemail, list, cb) {
    try {
        // check the parameters
        if (   typeof username  !== 'string'
            || typeof voicemail !== 'string' || typeof cb !== 'function'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var to   = compConfigManager.getVoicemailNotificationSmsTo(username);
        var body = getVmNotificationSmsBody(username, voicemail, list);

        logger.info(IDLOG, 'send new voicemail ' + voicemail + ' notification to sms cellphone ' + to + ' of user "' + username + '"');
        compSms.send(username, to, body, function (err, resp) {
            try {
                if (err) {
                    throw new Error('sending sms notification from "' + username + '" to ' + to + ' of the new voicemail "' + voicemail + '" of the user "' + username + '"');
                }
                cb(null, resp);

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
* Sends a post-it notification to the user by sms.
*
* @method sendNewPostitNotificationSms
* @param {string}   creator   The creator username of the new post-it message
* @param {string}   recipient The recipient username of the new post-it message
* @param {array}    list      The list of all unread post-it of the recipient user
* @param {function} cb        The callback function
* @private
*/
function sendNewPostitNotificationSms(creator, recipient, list, cb) {
    try {
        // check the parameters
        if (   typeof creator   !== 'string'
            || typeof recipient !== 'string' || typeof cb !== 'function'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var to   = compConfigManager.getPostitNotificationSmsTo(recipient);
        var body = getPostitNotificationSmsBody(creator, recipient, list);

        logger.info(IDLOG, 'send new post-it notification from creator "' + creator + '" to sms cellphone ' + to + ' of user "' + recipient + '"');
        compSms.send(creator, to, body, function (err, resp) {
            try {
                if (err) {
                    throw new Error('sending new post-it notification from creator "' + creator + '" to sms cellphone ' + to + ' of user "' + recipient + '"');
                }
                cb(null, resp);

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
* Returns the subject of the email message used to notify new voice messages.
*
* @method getVmNotificationEmailSubject
* @param  {string} username  The username identifier
* @param  {string} voicemail The voicemail identifier
* @param  {array}  list      The list of all new voice messages of the voicemail
* @return {string} The subject of the email message.
* @private
*/
function getVmNotificationEmailSubject(username, voicemail, list) {
    try {
        // check the parameters
        if (   typeof voicemail !== 'string'
            || typeof username  !== 'string'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var template = ejsTemplates[EJS_TEMPLATE_FILENAMES.newVoicemailEmailSubject];
        var subject  = ejs.render(template, {
            username:      username,
            voicemail:     voicemail,
            newVoicemails: list
        });
        return subject;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the subject of the email message used to notify new post-it messages.
*
* @method getPostitNotificationEmailSubject
* @param {string}  creator   The creator username of the new post-it message
* @param {string}  recipient The recipient username of the new post-it message
* @param {array}   list      The list of all unread post-it of the recipient user
* @return {string} The subject of the email message.
* @private
*/
function getPostitNotificationEmailSubject(creator, recipient, list) {
    try {
        // check the parameters
        if (   typeof creator   !== 'string'
            || typeof recipient !== 'string' || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var template = ejsTemplates[EJS_TEMPLATE_FILENAMES.newPostitEmailSubject];
        var subject  = ejs.render(template, {
            creator:       creator,
            recipient:     recipient,
            unreadPostits: list
        });
        return subject;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the body of the email message used to notify new voice messages.
*
* @method getVmNotificationEmailBody
* @param  {string} username  The username identifier
* @param  {string} voicemail The voicemail identifier
* @param  {array}  list      The list of all new voice messages of the voicemail
* @return {string} The body of the email message.
* @private
*/
function getVmNotificationEmailBody(username, voicemail, list) {
    try {
        // check the parameters
        if (   typeof voicemail !== 'string'
            || typeof username  !== 'string'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var lastVoicemail = extractNewVoicemailMostRecent(list);
        lastVoicemail.creationDate = moment(lastVoicemail.creationTimestamp).format('LLLL');

        // add creation date to all the new voice messages
        var i;
        for (i = 0; i < list.length; i++) {
            list[i].creationDate = moment(list[i].creationTimestamp).format('LLLL');
        }

        var template = ejsTemplates[EJS_TEMPLATE_FILENAMES.newVoicemailEmailBody];
        var body     = ejs.render(template, {
            username:      username,
            voicemail:     voicemail,
            lastVoicemail: lastVoicemail,
            newVoicemails: list
        });
        return body;

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the body of the email message used to notify new post-it messages.
*
* @method getPostitNotificationEmailBody
* @param {string}  creator   The creator username of the new post-it message
* @param {string}  recipient The recipient username of the new post-it message
* @param {array}   list      The list of all unread post-it of the recipient user
* @return {string} The body of the email message.
* @private
*/
function getPostitNotificationEmailBody(creator, recipient, list) {
    try {
        // check the parameters
        if (   typeof creator   !== 'string'
            || typeof recipient !== 'string' || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var lastPostit = extractNewPostitMostRecent(list);
        lastPostit.creationDate = moment(lastPostit.creation).format('LLLL');

        // parse creation date to all the unread post-it
        var i;
        for (i = 0; i < list.length; i++) {

            list[i].creationDate = moment(list[i].creation).format('LLLL');
        }

        var template = ejsTemplates[EJS_TEMPLATE_FILENAMES.newPostitEmailBody];
        var body     = ejs.render(template, {
            creator:       creator,
            recipient:     recipient,
            lastPostit:    lastPostit,
            unreadPostits: list
        });
        return body;

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the body of the sms message used to notify new voice messages.
*
* @method getVmNotificationSmsBody
* @param  {string} username  The username identifier
* @param  {string} voicemail The voicemail identifier
* @param  {array}  list      The list of all new voice messages of the voicemail
* @return {string} The body of the sms message.
* @private
*/
function getVmNotificationSmsBody(username, voicemail, list) {
    try {
        // check the parameters
        if (   typeof voicemail !== 'string'
            || typeof username  !== 'string'
            || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }

        var lastVoicemail = extractNewVoicemailMostRecent(list);
        lastVoicemail.creationDate = moment(lastVoicemail.creationTimestamp).format('llll');

        var template = ejsTemplates[EJS_TEMPLATE_FILENAMES.newVoicemailSmsBody];
        var body     = ejs.render(template, {
            username:      username,
            voicemail:     voicemail,
            lastVoicemail: lastVoicemail,
            newVoicemails: list
        });
        return body;

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the body of the sms message used to notify new post-it message.
*
* @method getPostitNotificationSmsBody
* @param {string}  creator   The creator username of the new post-it message
* @param {string}  recipient The recipient username of the new post-it message
* @param {array}   list      The list of all unread post-it of the recipient user
* @return {string} The body of the sms message.
* @private
*/
function getPostitNotificationSmsBody(creator, recipient, list) {
    try {
        // check the parameters
        if (   typeof creator   !== 'string'
            || typeof recipient !== 'string' || list instanceof Array === false) {

            throw new Error('wrong parameters');
        }


        var lastPostit = extractNewPostitMostRecent(list);
        lastPostit.creationDate = moment(lastPostit.creation).format('LLLL');

        var template = ejsTemplates[EJS_TEMPLATE_FILENAMES.newPostitSmsBody];
        var body     = ejs.render(template, {
            creator:       creator,
            lastPostit:    lastPostit,
            unreadPostits: list
        });
        return body;

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the most recent voicemail from the list.
*
* @method extractNewVoicemailMostRecent
* @param  {array}  list The list of all new voice messages of a voicemail
* @return {object} The most recent voicemail.
* @private
*/
function extractNewVoicemailMostRecent(list) {
    try {
        // check parameter
        if (list instanceof Array === false) { throw new Error('wrong parameter'); }

        var i;
        var temp = 0;
        var recentVm;
        for (i = 0; i < list.length; i++) {

            if (temp < list[i].creationTimestamp) {
                temp = list[i].creationTimestamp;
                recentVm = list[i];
            }
        }
        return recentVm;

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the most recent post-it from the list.
*
* @method extractNewPostitMostRecent
* @param  {array}  list The list of all unread post-it messages of a user
* @return {object} The most recent post-it.
* @private
*/
function extractNewPostitMostRecent(list) {
    try {
        // check parameter
        if (list instanceof Array === false) { throw new Error('wrong parameter'); }

        var i;
        var temp = 0;
        var recentPostit;
        var timestamp;

        for (i = 0; i < list.length; i++) {

            timestamp = list[i].creation.getTime();

            if (temp < timestamp) {
                temp = timestamp;
                recentPostit = list[i];
            }
        }
        return recentPostit;

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start                = start;
exports.config               = config;
exports.setLogger            = setLogger;
exports.setCompSms           = setCompSms;
exports.setCompUser          = setCompUser;
exports.setCompMailer        = setCompMailer;
exports.setCompPostit        = setCompPostit;
exports.setCompVoicemail     = setCompVoicemail;
exports.setCompAuthorization = setCompAuthorization;
exports.setCompConfigManager = setCompConfigManager;
