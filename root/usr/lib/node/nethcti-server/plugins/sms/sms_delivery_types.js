/**
* Provides the sms delivery types.
*
* @class sms_delivery_types
* @static
*/

/**
* The list of the endpoint types.
*
* @property TYPES
* @type {object}
* @readOnly
* @default {
    'portech':    'portech',
    'webservice': 'webservice'
}
*/
var TYPES = {
    'portech':    'portech',
    'webservice': 'webservice'
}

/**
* Check if the sms delivery type is valid.
*
* @method isValidDeliveryType
* @param {string} type The type of the endpoint
* @return {boolean} Return true if the type is valid, false otherwise.
* @private
*/
function isValidDeliveryType(type) {
    try {
        // check parameter
        if (typeof type !== 'string') { throw new Error('wrong parameter'); }

        if (TYPES[type] !== undefined) { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return false;
    }
}

// public interface
exports.TYPES               = TYPES;
exports.isValidDeliveryType = isValidDeliveryType;
