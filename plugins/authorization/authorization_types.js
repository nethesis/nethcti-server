/**
* Provides the type of the authorizations and some functions for it.
*
* @class authorization_types
* @static
*/

/**
* The list of the authorization types.
*
* @property AUTHORIZATION_TYPES
* @type {object}
* @readOnly
* @default 
*/
var AUTHORIZATION_TYPES = {
    'sms':                 '',
    'call':                '',
    'chat':                '',
    'privacy':             '',
    'redirect':            '',
    'phonebook':           '',
    'recording':           '',
    'voicemail':           '',
    'streaming':           '',
    'customer_card':       '',
    'user_settings':       '',
    'operator_panel':      '',
    'switchboard_history': ''
}

/**
* Check if the authorization type is valid.
*
* @method isValidAuthorizationType
* @param {string} type The type of the authorization
* @return {boolean} Return true if the type is valid, false otherwise.
* @private
*/
function isValidAuthorizationType(type) {
    try {
        // check parameter
        if (typeof type !== 'string') { throw new Error('wrong parameter'); }

        if (AUTHORIZATION_TYPES[type] !== undefined) { return true; }
        return false;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.isValidAuthorizationType = isValidAuthorizationType;
