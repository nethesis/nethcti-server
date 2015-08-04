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
    'spy':               'spy',
    'dnd':               'dnd',
    'cdr':               'cdr',
    'sms':               'sms',
    'chat':              'chat',
    'no_spy':            'no_spy',
    'postit':            'postit',
    'trunks':            'trunks',
    'queues':            'queues',
    'offhour':           'offhour',
    'intrude':           'intrude',
    'privacy':           'privacy',
    'parkings':          'parkings',
    'admin_cdr':         'admin_cdr',
    'streaming':         'streaming',
    'admin_sms':         'admin_sms',
    'recording':         'recording',
    'phonebook':         'phonebook',
    'extensions':        'extensions',
    'admin_call':        'admin_call',
    'admin_queues':      'admin_queues',
    'admin_pickup':      'admin_pickup',
    'admin_postit':      'admin_postit',
    'admin_hangup':      'admin_hangup',
    'admin_offhour':     'admin_offhour',
    'pickup_groups':     'pickup_groups',
    'customer_card':     'customer_card',
    'admin_transfer':    'admin_transfer',
    'phone_redirect':    'phone_redirect',
    'operator_groups':   'operator_groups',
    'admin_recording':   'admin_recording',
    'attended_transfer': 'attended_transfer'
};

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
exports.TYPES                    = AUTHORIZATION_TYPES;
exports.isValidAuthorizationType = isValidAuthorizationType;
