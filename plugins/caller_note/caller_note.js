/**
* Abstraction of a caller note.
*
* **It can throw exceptions.**
*
* @class CallerNote
* @param {string} msg The text of the message
* @param {string} creat The creator
* @param {string} num The number associated with the note
* @constructor
* @return {object} The caller note object.
*/
exports.CallerNote = function (data) {
    // check the parameter
    if (typeof data               !== 'object' || typeof data.text       !== 'string'
        || typeof data.creator    !== 'string' || typeof data.number     !== 'string'
        || typeof data.booking    !== 'string' || typeof data.expiration !== 'string'
        || typeof data.visibility !== 'string' || typeof data.callid     !== 'string'
        || isValidVisibility(data.visibility) === false) {

        throw new Error('wrong parameter');
    }

    /**
    * The caller note creator.
    *
    * @property creator
    * @type {string}
    * @required
    * @private
    */
    var creator = creat;

    /**
    * The text of the message.
    *
    * @property text
    * @type {string}
    * @required
    * @private
    */
    var text = msg;

    /**
    * The number associated with the note.
    *
    * @property number
    * @type {string}
    * @private
    */
    var number = num;

    /**
    * The booking status of the note.
    *
    * @property booking
    * @type {boolean}
    * @private
    */
    var booking = data.booking === 'true' ? true : false;

    /**
    * The expiration date of the note. It's use the YYYYMMDD format.
    *
    * @property expiration
    * @type {string}
    * @private
    */
    var expiration = data.expiration;

    /**
    * The visibility type.
    *
    * @property visibility
    * @type {string}
    * @private
    */
    var visibility = data.visibility;

    /**
    * The indentifier of the call. In the asterisk scenario can be the
    * "uniqueid" field of the "asteriskcdrdb.cdr" database table.
    *
    * @property callid
    * @type {string}
    * @private
    */
    var callid = data.callid;

    /**
    * Return the readable string of the caller note.
    *
    * @method toString
    * @return {string} The readable description of the caller note
    */
    function toString() { return 'caller note of "' + creator + '" associated with number ' + number; }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         text:       "example of text", // the message
    *         number:     "214",             // the number associated with the note
    *         callid:     "123456",          // the identifier of the call
    *         creator:    "221",             // the user creator
    *         booking:    false,             // the booking status
    *         expiration: "20131001",        // the expiration date of the note
    *         visibility: "private"          // the visibility of the note
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            text:       text,
            number:     number,
            callid:     callid,
            creator:    creator,
            booking:    booking,
            expiration: expiration,
            visibility: visibility
        }
    }

    // public interface
    return {
        toJSON:    toJSON,
        toString:  toString
    };
}

/**
* The visibility types of the caller note.
*
* @property VISIBILITY
* @type object
* @private
* @default {
    PUBLIC:  'public',
    PRIVATE: 'private'
}
*/
var VISIBILITY = {
    'public':  'public',
    'private': 'private'
}

/**
* Check if the specified visibility is correct.
*
* @method isValidVisibility
* @param {string} visibility
* @return {boolean} True if the visibility is correct
*/
function isValidVisibility(visibility) {
    // check parameter
    if (typeof visibility !== 'string') { return false; }

    if (VISIBILITY[visibility] !== undefined) { return true; }
    return false;
}

// public interface
exports.VISIBILITY        = VISIBILITY;
exports.isValidVisibility = isValidVisibility;
