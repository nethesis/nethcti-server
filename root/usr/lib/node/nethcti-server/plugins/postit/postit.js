/**
* Abstraction of a post-it message.
*
* **It can throw exceptions.**
*
* @class Postit
* @param {string} msg The text of the message
* @param {string} creat The creator
* @param {string} rec The recipient of the post-it
* @constructor
* @return {object} The postit object.
*/
exports.Postit = function (msg, creat, rec) {
    // check the parameters
    if (typeof msg !== 'string' || typeof creat !== 'string' || typeof rec !== 'string') {
        throw new Error('wrong parameters');
    }

    /**
    * The post-it creator.
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
    * The recipient user.
    *
    * @property recipient
    * @type {string}
    * @private
    */
    var recipient = rec;

    /**
    * Return the readable string of the post-it.
    *
    * @method toString
    * @return {string} The readable description of the post-it
    */
    function toString() { return 'post-it by ' + creator + ' to recipient ' + recipient; }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         text:       "example of text", // the message
    *         creator:    "221",             // the user creator
    *         recipient:  "214"              // the user recipient
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            text:      text,
            creator:   creator,
            recipient: recipient
        }
    }

    // public interface
    return {
        toJSON:    toJSON,
        toString:  toString
    };
}
