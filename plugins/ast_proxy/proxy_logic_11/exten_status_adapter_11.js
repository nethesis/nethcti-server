/**
* Provides adapter from asterisk extensions status code to 
* status description string.
*
* @class exten_status_adapter_11
* @static
*/
var EXTEN_STATUS_ENUM = require('../extension').EXTEN_STATUS_ENUM;

/**
* Adapter from asterisk extension status code to status string
* for _Extension_ object. The key is the status code and the value
* is the status string description.
*
* @property AST_EXTEN_STATUS_2_STR_ADAPTER
* @type {object}
* @readOnly
*/
var AST_EXTEN_STATUS_2_STR_ADAPTER = {
    '0':  EXTEN_STATUS_ENUM.ONLINE,       // Idle
    '1':  EXTEN_STATUS_ENUM.BUSY,         // In Use
    '2':  EXTEN_STATUS_ENUM.DND,          // Busy
    '4':  EXTEN_STATUS_ENUM.OFFLINE,      // Unavailable
    '8':  EXTEN_STATUS_ENUM.RINGING,      // Ringing
    '9':  EXTEN_STATUS_ENUM.BUSY_RINGING, // In Use & Ringing
    '16': EXTEN_STATUS_ENUM.ONHOLD        // On Hold
}

exports.AST_EXTEN_STATUS_2_STR_ADAPTER = AST_EXTEN_STATUS_2_STR_ADAPTER;
