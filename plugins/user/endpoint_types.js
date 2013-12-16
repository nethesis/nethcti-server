/**
* Provides the type of the endpoints and some functions for it.
*
* **It can throw Exceptions.**
*
* @class endpoint_types
* @static
*/

/**
* The public list of the endpoint types.
*
* @property TYPES
* @type {object}
* @readOnly
* @default {
    email:     "email",
    jabber:    "jabber",
    nethcti:   "nethcti",
    calendar:  "calendar",
    extension: "extension",
    cellphone: "cellphone",
    voicemail: "voicemail"
}
*/
var TYPES = {
    email:     'email',
    jabber:    'jabber',
    nethcti:   'nethcti',
    calendar:  'calendar',
    extension: 'extension',
    cellphone: 'cellphone',
    voicemail: 'voicemail'
}

/**
* The list of the nethcti endpoint status.
*
* @property ENDPOINT_NETHCTI_STATUS
* @type {object}
* @readOnly
* @default {
    busy:    "busy",
    away:    "away",
    online:  "online",
    offline: "offline"
}
*/
var ENDPOINT_NETHCTI_STATUS = {
    busy:    'busy',
    away:    'away',
    online:  'online',
    offline: 'offline'
};

/**
* The list of the nethcti endpoint status.
*
* @property ENDPOINT_NETHCTI_DEVICE_TYPE
* @type {object}
* @readOnly
* @default
*/
var ENDPOINT_NETHCTI_DEVICE_TYPE = {
    mobile:  'mobile',
    desktop: 'desktop'
};

/**
* Checks if the nethcti endpoint status is valid.
*
* @method isValidEndpointNethctiStatus
* @param  {string}  status The status of the nethcti endpoint
* @return {boolean} Return true if the nethcti endpoint status is valid, false otherwise.
*/
function isValidEndpointNethctiStatus(status) {
    // check parameter
    if (typeof status !== 'string') { throw new Error('wrong parameter'); }

    if (ENDPOINT_NETHCTI_STATUS[status] !== undefined) { return true; }
    return false;
}

/**
* Checks if the device type used for nethcti is valid.
*
* @method isValidEndpointNethctiDevice
* @param  {string}  type The device type used for nethcti
* @return {boolean} Return true if the type is valid, false otherwise.
*/
function isValidEndpointNethctiDevice(type) {
    // check parameter
    if (typeof type !== 'string') { throw new Error('wrong parameter'); }

    if (ENDPOINT_NETHCTI_DEVICE_TYPE[type] !== undefined) { return true; }
    return false;
}

/**
* Checks if the endpoint type is valid.
*
* @method isValidEndpointType
* @param  {string}  type The type of the endpoint
* @return {boolean} Return true if the type is valid, false otherwise.
*/
function isValidEndpointType(type) {
    // check parameter
    if (typeof type !== 'string') { throw new Error('wrong parameter'); }

    if (TYPES[type] !== undefined) { return true; }
    return false;
}

// public interface
exports.TYPES                        = TYPES;
exports.isValidEndpointType          = isValidEndpointType;
exports.ENDPOINT_NETHCTI_STATUS      = ENDPOINT_NETHCTI_STATUS;
exports.isValidEndpointNethctiStatus = isValidEndpointNethctiStatus;
exports.isValidEndpointNethctiDevice = isValidEndpointNethctiDevice;
