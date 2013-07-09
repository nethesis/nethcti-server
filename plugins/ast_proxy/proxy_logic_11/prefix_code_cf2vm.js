/**
* Provides functions related to the prefixes used in the call forward
* to voicemail property in the asterisk database. This is useful for
* those command plugins that get and set the call forward property. E.g.
* the call forward and the call forward to voicemail use the same database
* key (CF), but the second adds a prefix to the destination number.
*
* @class prefix_code_cf2vm
* @static
*/

/**
* Prefixes used to set the call forward to voicemail property in the
* asterisk database. This is because both call forward and the call
* forward to voicemail uses the same CF property of the asterisk database.
*
* @property PREFIX_CODE
* @type {object}
* @readOnly
* @default {
    "*":   "*",
    "vmu": "vmu"
}
*/
var PREFIX_CODE = {
    '*':   '*',
    'vmu': 'vmu'
}

exports.PREFIX_CODE = PREFIX_CODE;
