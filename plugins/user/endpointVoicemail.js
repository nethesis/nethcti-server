/**
* Abstraction of a voicemail endpoint of an extension.
*
* **It can throw exception.**
*
* @class EndpointVoicemail
* @param {object} data The voicemail data used to create the EndpointVoicemail object
*   @param {string} data.id The voicemail identifier
*   @param {string} data.owner The owner name
*   @param {string} data.context The voicemail context
*   @param {string} data.email The email address
*   @param {string} data.maxMessageCount Maximum number of the voice messages
*   @param {string} data.maxMessageLength Maximum length of a voice message
* @constructor
* @return {object} The EndpointVoicemail object.
*/
exports.EndpointVoicemail = function (data) {
    // check the parameter
    if (   typeof data                  !== 'object'
        || typeof data.owner            !== 'string' || typeof data.context         !== 'string'
        || typeof data.email            !== 'string' || typeof data.maxMessageCount !== 'string'
        || typeof data.maxMessageLength !== 'string' || typeof data.id              !== 'string') {

        throw new Error('wrong parameter');
    }

    /**
    * The voicemail identifier.
    *
    * @property id
    * @type {string}
    * @required
    * @private
    */
    var id = data.id;

    /**
    * The name of the voicemail owner.
    *
    * @property owner
    * @type string
    * @required
    * @private
    */
    var owner = data.owner;

    /**
    * The context of the voicemail
    *
    * @property context
    * @type string
    * @required
    * @private
    */
    var context = data.context;

    /**
    * The email of the voicemail.
    *
    * @property email
    * @type {string}
    * @private
    */
    var email = data.email;

    /**
    * The maximum number of messages of the voicemail.
    *
    * @property maxMessageCount
    * @type string
    * @private
    */
    var maxMessageCount = data.maxMessageCount;

    /**
    * The maximum lenght of the voicemail messages.
    *
    * @property maxMessageLength
    * @type string
    * @private
    */
    var maxMessageLength = data.maxMessageLength;

    /**
    * Returns the voicemail identifier.
    *
    * @method getId
    * @return {string} The voicemail identifier.
    */
    function getId() { return id; }

    /**
    * Returns the owner of the voicemail.
    *
    * @method getOwner
    * @return {string} The owner of the voicemail.
    */
    function getOwner() { return owner; }

    /**
    * Return the readable string description of the queue.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return 'VOICEMAIL of ' + id + ' ' + name }

    /**
    * Returns the JSON representation of the object.
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            id:               id,
            owner:            owner,
            email:            email,
            maxMessageCount:  maxMessageCount,
            maxMessageLength: maxMessageLength
        }
    }

    // public interface
    return {
        getId:    getId,
        toJSON:   toJSON,
        getOwner: getOwner,
        toString: toString
    };
}
