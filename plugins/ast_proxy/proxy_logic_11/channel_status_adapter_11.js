/**
* Provides adapter from asterisk channel status code to 
* status description string.
*
* @class channel_status_adapter_11
* @static
*/

/**
* Adapter from asterisk channel status code to status string
* for _Channel_ object. The key is the status code and the value
* is the status string description.
*
* @property AST_CHANNEL_STATE_2_STRING_ADAPTER
* @type {object}
* @readOnly
* @private
*/
var AST_CHANNEL_STATE_2_STRING_ADAPTER = {
    0: 'down',
    1: 'reserved',
    2: 'offhook',
    3: 'dialing', 
    4: 'ring',
    5: 'ringing',
    6: 'up',
    7: 'busy',
    8: 'dialing_offhook',
    9: 'prering'
}

exports.AST_CHANNEL_STATE_2_STRING_ADAPTER = AST_CHANNEL_STATE_2_STRING_ADAPTER;
