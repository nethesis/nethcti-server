/**
* Provides the type of the endpoints and some functions for it.
*
* @class endpoint_types
* @static
*/

/**
* The list of the endpoint types.
*
* @property ENDPOINT_TYPES
* @type {object}
* @readOnly
* @default {
    'jabber':    '',
    'nethcti':   '',
    'calendar':  '',
    'extension': '',
    'cellphone': ''
}
*/
var ENDPOINT_TYPES = {
    'jabber':    '',
    'nethcti':   '',
    'calendar':  '',
    'extension': '',
    'cellphone': ''
}

/**
* The public list of the endpoint types.
*
* @property TYPES
* @type {object}
* @readOnly
*/
var TYPES = {
    JABBER:    'jabber',
    NETHCTI:   'nethcti',
    CALENDAR:  'calendar',
    EXTENSION: 'extension',
    CELLPHONE: 'cellphone'
}

/**
* Check if the endpoint type is valid.
*
* @method isValidEndpointType
* @param {string} type The type of the endpoint
* @return {boolean} Return true if the type is valid, false otherwise.
* @private
*/
function isValidEndpointType(type) {
    try {
        // check parameter
        if (typeof type !== 'string') { throw new Error('wrong parameter'); }

        if (ENDPOINT_TYPES[type] !== undefined) { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.TYPES               = TYPES;
exports.isValidEndpointType = isValidEndpointType;
