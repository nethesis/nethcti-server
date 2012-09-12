var fs = require("fs")
var path = require('path');
var sys = require("sys")
var mail = require('./mailModule');
var iniparser = require("./lib/node-iniparser/lib/node-iniparser")
var log4js = require('./lib/log4js-node/lib/log4js')()
var logger = log4js.getLogger('[NotificationManager]');
var _dataCollector;
var _unreadNotifications;
var _defaultEmptyNotifications = { unreadPostit: [] };
var _mailModule, _sms;
var _notifModality = {
    never: 'never',
    always: 'always',
    onrequest: 'onrequest'
};

// Constructor
exports.NotificationManager = function(){
    _initModule();
    this.setLogger = function(logfile,level) {
        log4js.addAppender(log4js.fileAppender(logfile), '[NotificationManager]'); logger.setLevel(level);
        _mailModule.setLogger(logfile, loglevel);
    }
    this.setDataCollector = function (dc) { _setDataCollector(dc); }
    this.setSmsModule = function (module) { _setSmsModule(module); }
    this.updateUnreadNotificationsList = function () { _updateUnreadNotificationsList(); }
    this.getNotificationsByExt = function (ext) { return _getNotificationsByExt(ext); }
    this.updateUnreadNotificationsListForExt = function (ext, cb) { _updateUnreadNotificationsListForExt(ext, cb); }
    this.storeNotificationCellphoneAndEmail = function (ext, notificationsInfo, cb) { _storeNotificationCellphoneAndEmail(ext, notificationsInfo, cb); }
    this.updateCellphoneNotificationsModalityForAll = function (ext, value, cb) { _updateCellphoneNotificationsModalityForAll(ext, value, cb); }
    this.updateEmailNotificationsModalityForAll = function (ext, value, cb) { _updateEmailNotificationsModalityForAll(ext, value, cb); }
    this.notifyNewVoicemailToUser = function (ext) { _notifyNewVoicemailToUser(ext); }
    this.notifyNewPostitToUser = function (ext, note, clientNotifSettings) { _notifyNewPostitToUser(ext, note, clientNotifSettings); }
    this.getCellphoneNotificationsModalityForAll = function (ext, cb) { _getCellphoneNotificationsModalityForAll(ext, cb); }
    this.saveNotificationsSettings = function (ext, settings, cb) { _saveNotificationsSettings(ext, settings, cb); }
    this.getNotificationsSettings = function (ext, cb) { _getNotificationsSettings(ext, cb); }
    this.getPostitNotificationsSettingsForAllExt = function (cb) { _getPostitNotificationsSettingsForAllExt(cb); }
}

function _getPostitNotificationsSettingsForAllExt(cb) {
    try {
        _dataCollector.getPostitNotificationsSettingsForAllExt(cb);
    } catch (err) {
       logger.error(err.stack);
    }
}

function _getNotificationsSettings(ext, cb) {
    try {
        _dataCollector.getNotificationsSettings(ext, cb);
    } catch (err) {
        logger.error(err.stack);
    }
}

function _saveNotificationsSettings(ext, settings, cb) {
    try {
        _dataCollector.saveNotificationsSettings(ext, settings, cb);
    } catch (err) {
        logger.error(err.stack);
    }
}

function _getCellphoneNotificationsModalityForAll(ext, cb) {
    try {
        _dataCollector.getCellphoneNotificationsModalityForAll(ext, cb);
    } catch (err) {
        logger.error(err.stack);
    }
}

function _setSmsModule(module) {
    try {
        _sms = module;
    } catch (err) {
        logger.error(err.stack);
    }
}

function _notifyNewPostitToUser(ext, note, clientNotifSettings) {
    try {
        _dataCollector.getNotificationModalityNote(ext, function (result) {
            if (result.length === 0) {
                logger.debug('no entry in DB for extension ' + ext + ' to notify new postit');
            } else {
                var entry = result[0];
                var modalityEmail = entry.notif_note_email;
                var modalityCellphone = entry.notif_note_cellphone;
                var phoneNumber = entry.notif_cellphone;
                var toAddr = entry.notif_email;

                // check to send notification via SMS
                if (modalityCellphone === _notifModality.always) {
                    _sendCellphoneSmsNotificationNote(phoneNumber, ext, note);
                } else if (modalityCellphone === _notifModality.onrequest &&
                           clientNotifSettings.postitNotifCellphoneModality === _notifModality.onrequest &&
                           clientNotifSettings.postitNotifCellphoneValue === true) { 
                
                    _sendCellphoneSmsNotificationNote(phoneNumber, ext, note);

                } else if (modalityCellphone === _notifModality.never) {
                    logger.debug('postit notification modality cellphone for "' + ext + '" is "' + modalityCellphone + '": so don\'t notify');
                } else {
                    logger.warn('notification modality cellphone "' + modalityCellphone + '" to notify new postit to "' + ext + '" not recognized');
                }

                // check to send notification via e-mail
                if (modalityEmail === _notifModality.always) {
                    _sendEmailNotificationNote(toAddr, ext, note);

                } else if (modalityEmail === _notifModality.onrequest &&
                           clientNotifSettings.postitNotifEmailModality === _notifModality.onrequest &&
                           clientNotifSettings.postitNotifEmailValue === true) {

                    _sendEmailNotificationNote(toAddr, ext, note);
                
                } else if (modalityEmail === _notifModality.never) {
                    logger.debug('postit notification modality e-mail for "' + ext + '" is "' + modalityEmail + '": so don\'t notify');
                } else {
                    logger.warn('notification modality e-mail "' + modalityEmail + '" to notify new postit to "' + ext + '" not recognized');
                }
            }
        });
    } catch (err) {
        logger.error(err.stack);
    }
}

function _notifyNewVoicemailToUser(ext) {
    try {
        _dataCollector.getNotificationModalityVoicemail(ext, function (result) {
            if (result.length === 0) {
                logger.debug('no entry in DB for extension ' + ext + ' to notify new voicemail');
            } else {
                var entry = result[0];
                var modalityEmail = entry.notif_voicemail_email;
                var modalityCellphone = entry.notif_voicemail_cellphone;

                // check to send notification via SMS
                if (modalityCellphone === _notifModality.always || modalityCellphone === _notifModality.onrequest) {
                    var phoneNumber = entry.notif_cellphone;
                    _sendCellphoneSmsNotificationVoicemail(phoneNumber, ext);
                } else if (modalityCellphone === _notifModality.never) {
                    logger.debug('voicemail notification modality cellphone for "' + ext + '" is "' + modalityCellphone + '": so don\'t notify');
                } else {
                    logger.warn('notification modality cellphone "' + modalityCellphone + '" to notify new voicemail to "' + ext + '" not recognized');
                }

                // check to send notification via e-mail
                if (modalityEmail === _notifModality.always || modalityEmail === _notifModality.onrequest) {
                    var toAddr = entry.notif_email;
                    _sendEmailNotificationVoicemail(toAddr, ext);
                } else if (modalityEmail === _notifModality.never) {
                    logger.debug('voicemail notification modality e-mail for "' + ext + '" is "' + modalityEmail + '": so don\'t notify');
                } else {
                    logger.warn('notification modality e-mail "' + modalityEmail + '" to notify new voicemail to "' + ext + '" not recognized');
                }
            }
        });
    } catch (err) {
        logger.error(err.stack);
    }
}

function _initModule() {
    try {
        _mailModule = new mail.MailModule();
    } catch (err) {
        logger.error(err.stack);
    }
}

function _sendCellphoneSmsNotificationNote(phoneNumber, ext, note) {
    try {
        var prologue = new Date().toLocaleString() + '. New POST-IT from "' + ext + '" - ';
        var prologue = 'NethCTI - New POST-IT from "' + ext + '" - ' + new Date().toLocaleString() + ' - Message: ';
        var rest = 256 - prologue.length - 4;
        var body = '';
        if (note.length > rest) {
            body = prologue + note.substring(0, rest) + '...';
        } else {
            body = prologue + note;
        }
        _sms.sendSms(phoneNumber, body);
    } catch (err) {
        logger.error(err.stack);
    }
}

function _sendCellphoneSmsNotificationVoicemail(phoneNumber, extVoicemail, cb) {
    try {
        var body = 'NethCTI - You have received new message in voicemail "' + extVoicemail + '" - ' + new Date().toLocaleString();
       _sms.sendSms(phoneNumber, body);
    } catch (err) {
        logger.error(err.stack);
    }
}

function _sendEmailNotificationNote(toAddress, ext, note) {
    try {
        var subject = 'NethCTI - New POST-IT from "' + ext;
        var body = 'New POST-IT from "' + ext + '".\n\n' +
                   'Date: ' + new Date().toLocaleString() + '\n' +
                   'Message:\n' + note;

        _mailModule.sendCtiMailFromLocal(toAddress, subject, body, function (error, response) {
            if (error) {
                logger.error(error);
            } else {
                logger.debug("e-mail notification for new POST-IT from " + ext + " has been sent succesfully to " + toAddress);
            }
        }); 
    } catch (err) {
        logger.error('toAddress = ' + toAddress + ', ext = ' + ext + ': ' + err.stack);
    }                
}

function _sendEmailNotificationVoicemail(toAddress, extVoicemail, cb) {
    try {
        var subject = 'NethCTI - New message in voicemail "' + extVoicemail + '"';
        var body = 'You have received new message in voicemail "' + extVoicemail + '"\n' +
                   'Date: ' + new Date().toLocaleString();

        _mailModule.sendCtiMailFromLocal(toAddress, subject, body, function (error, response) {
            if (error) {
                logger.error(error);
            } else {
                logger.debug("e-mail notification for new voicemail has been sent succesfully to " + toAddress + " for voicemail " + extVoicemail);
            }
        }); 
    } catch (err) {
        logger.error('toAddress = ' + toAddress + ', extVoicemail = ' + extVoicemail + ': ' + err.stack);
    }                
}

function _updateEmailNotificationsModalityForAll(ext, value, cb) {
    try {
        _dataCollector.updateEmailNotificationsModalityForAll(ext, value, cb);
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _updateCellphoneNotificationsModalityForAll(ext, value, cb) {
    try {
        _dataCollector.updateCellphoneNotificationsModalityForAll(ext, value, cb);
    } catch (err) {
        logger.error('ext = ' + ext + ', value = ' + value + ': ' + err.stack);
    }
}

function _storeNotificationCellphoneAndEmail(ext, notificationsInfo, cb) {
    try {
        var DEFAULT_VALUE = _notifModality.never;
        if (notificationsInfo.notificationsCellphone === undefined) { notificationsInfo.notificationsCellphone = ''; }
        if (notificationsInfo.notificationsEmail === undefined) { notificationsInfo.notificationsEmail = ''; }
        if (notificationsInfo.notificationsVoicemailCell === undefined) { notificationsInfo.notificationsVoicemailCell = DEFAULT_VALUE; }
        if (notificationsInfo.notificationsVoicemailEmail === undefined) { notificationsInfo.notificationsVoicemailEmail = DEFAULT_VALUE; }
        if (notificationsInfo.notificationsNoteCell === undefined) { notificationsInfo.notificationsNoteCell = DEFAULT_VALUE; }
        if (notificationsInfo.notificationsNoteEmail === undefined) { notificationsInfo.notificationsNoteEmail = DEFAULT_VALUE; }

       _dataCollector.storeNotificationCellphoneAndEmail(ext, notificationsInfo, cb);

    } catch (err) {
       logger.error('ext = ' + ext + ', cellphone = ' + cellphone + ', email = ' + email + ': ' + err.stack);
    }
}

function _getNotificationsByExt(ext) {
    try {
        if (_unreadNotifications[ext] === undefined) {
            return _defaultEmptyNotifications;
        }
        return _unreadNotifications[ext];
    } catch (err) {
        logger.error('ext = ' + ext + ': ' + err.stack);
    }
}



function _updateUnreadNotificationsList() {
    _initUnreadNotificationsList();
}

// It can be optimized to update only part for ext extension
function _updateUnreadNotificationsListForExt(ext, cb) {
    try {
        _unreadNotifications = {};
        _dataCollector.getAllUnreadPostit(function (res) {
            try {
                var i, assigned;
                for (i = 0; i < res.length; i++) {
                    assigned = res[i].assigned;
                    if (_unreadNotifications[assigned] === undefined) {
                        _unreadNotifications[assigned] = { unreadPostit: [] };
                    }
                    _unreadNotifications[assigned].unreadPostit.push(res[i]);
                }
                logger.debug('notification list initialized: ' + res.length + ' unread postit elements');
                var not = _unreadNotifications[ext];
                if (not === undefined) {
                    not = _defaultEmptyNotifications;
                }
                cb(not);
            } catch (err) {
                logger.error(err.stack);
            }
        });
    } catch (err) {
        logger.error(err.stack);
    }
}

function _initUnreadNotificationsList() {
    try {
        _unreadNotifications = {};
        _dataCollector.getAllUnreadPostit(function (res) {
            try {
                var i, assigned;
                for (i = 0; i < res.length; i++) {
                    assigned = res[i].assigned;
                    if (_unreadNotifications[assigned] === undefined) {
                        _unreadNotifications[assigned] = { unreadPostit: [] };
                    }
                    _unreadNotifications[assigned].unreadPostit.push(res[i]);
                }
                logger.debug('notification list initialized: ' + res.length + ' unread postit elements');        
            } catch (err) {
                logger.error(err.stack);
            }
        });
    } catch (err) {
        logger.error(err.stack);
    }
}


function _setDataCollector(dc) {
    _dataCollector = dc;
    logger.debug("dataCollector added");
    _initUnreadNotificationsList();
}
