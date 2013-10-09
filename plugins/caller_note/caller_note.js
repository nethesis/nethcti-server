/**
* Abstraction of a caller note.
*
* **It can throw exceptions.**
*
* @class CallerNote
* @param {object} data
*   @param {string} data.number      The caller/called number that is associated with the note
*   @param {string} data.creator     The creator of the caller note
*   @param {string} data.text        The text of the note
*   @param {string} data.reservation The reservation option. If the creator has booked the callback from
*                                    the expressed number
*   @param {string} data.visibility  It can be "private" or "public"
*   @param {string} data.expiration  It's the expiration date of the note. It must use the YYYYMMDD format,
*                                    e.g. to express the date of "12 june 2013" you must use 20130612
* @constructor
* @return {object} The caller note object.
*/
exports.CallerNote = function (data) {
    // check the parameter
    if (typeof data                !== 'object'
        || typeof data.creator     !== 'string' || typeof data.number     !== 'string'
        || typeof data.reservation !== 'string' || typeof data.expiration !== 'string'
        || typeof data.visibility  !== 'string' || typeof data.text       !== 'string'
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
    * The reservation status of the note.
    *
    * @property reservation
    * @type {boolean}
    * @private
    */
    var reservation = data.reservation === 'true' ? true : false;

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
    *         text:        "example of text", // the message
    *         number:      "214",             // the number associated with the note
    *         creator:     "221",             // the user creator
    *         expiration:  "20131001",        // the expiration date of the note
    *         visibility:  "private",         // the visibility of the note
    *         reservation: false              // the reservation status
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            text:        text,
            number:      number,
            creator:     creator,
            expiration:  expiration,
            visibility:  visibility,
            reservation: reservation
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
