/**
* Provides adapter from asterisk DAHDI trunk channel status to status description string.
*
* @class dahdi_trunk_status_adapter_11
* @static
*/
var TRUNK_STATUS_ENUM = require('../trunk').TRUNK_STATUS_ENUM;

/**
* Adapter from asterisk DAHDI trunk channel status to status string.
* The key is the asterisk status description and the value is the adapted status string description.
*
* @property AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER
* @type {object}
* @readOnly
*/
var AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER = {
    'ok':           TRUNK_STATUS_ENUM.ONLINE,
    'none':         TRUNK_STATUS_ENUM.OFFLINE,
    'loopback':     TRUNK_STATUS_ENUM.OFFLINE,
    'not open':     TRUNK_STATUS_ENUM.OFFLINE,
    'red alarm':    TRUNK_STATUS_ENUM.OFFLINE,
    'blue alarm':   TRUNK_STATUS_ENUM.OFFLINE,
    'recovering':   TRUNK_STATUS_ENUM.OFFLINE,
    'yellow alarm': TRUNK_STATUS_ENUM.OFFLINE,
    'unconfigured': TRUNK_STATUS_ENUM.OFFLINE
};

exports.AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER = AST_DAHDI_TRUNK_CH_STATUS_2_STR_ADAPTER;
