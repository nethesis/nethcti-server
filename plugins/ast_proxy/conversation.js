/**
* Abstraction of a phone conversation.
*
* **It can throw exceptions.**
*
* @class Conversation
* @constructor
* @return {object} The conversation object.
*/
exports.Conversation = function (sourceChan, destChan) {
    // check parameters
    if (typeof sourceChan !== 'object' && typeof destChan !== 'object') {
        throw new Error('wrong parameters');
    }

    /**
    * The source channel.
    *
    * @property chSource
    * @type {Channel}
    * @private
    */
    var chSource = sourceChan;

    /**
    * The destination channel.
    *
    * @property chDest
    * @type {Channel}
    * @private
    */
    var chDest = destChan;

    /**
    * The recordig status.
    *
    * @property recording
    * @type {boolean}
    * @private
    */
    var recording = false;

    /**
    * The conversation identifier.
    *
    * @property id
    * @type {string}
    * @private
    */
    var id;
    if (chSource && chDest) { id = chSource.getChannel() + '>' + chDest.getChannel(); }
    else if ( chSource && !chDest) { id = chSource.getChannel() + '>'; }
    else if (!chSource &&  chDest) { id = '>' + chDest.getChannel(); }

    /**
    * Return the source channel.
    *
    * @method getSourceChannel
    * @return {Channel} The source channel object.
    */
    function getSourceChannel() { return chSource; }

    /**
    * Return the destination channel.
    *
    * @method getDestinationChannel
    * @return {Channel} The destination channel object.
    */
    function getDestinationChannel() { return chDest; }

    /**
    * Return the string representation of the conversation.
    *
    * @method toString
    * @return {string} The representation of the conversation.
    */
    function toString() { return id; }

    /**
    * Return the conversation identification.
    *
    * @method getId
    * @return {string} The conversation identification.
    */
    function getId() { return id; }

    /**
    * Return the recording status.
    *
    * @method isRecording
    * @return {booelan} true if the conversation is recording, false otherwise.
    */
    function isRecording() { return recording; }

    /**
    * Set the recording status.
    *
    * **It can throw an Exception.**
    *
    * @method setRecording
    * @param {boolean} value The value for the recording status.
    */
    function setRecording(value) {
        if (typeof value !== 'boolean') { throw new Error('wrong parameter'); }
        recording = value;
    }

    /**
    * Returns the JSON representation of the object. If the conversation isn't
    * connected, one between the source channel and the destination channel can be null.
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            id:        id,
            chDest:    chDest   ? chDest.toJSON()   : null,
            chSource:  chSource ? chSource.toJSON() : null,
            recording: recording
        };
    }

    // public interface
    return {
        getId:                 getId,
        toJSON:                toJSON,
        toString:              toString,
        isRecording:           isRecording,
        setRecording:          setRecording,
        getSourceChannel:      getSourceChannel,
        getDestinationChannel: getDestinationChannel
    };
}
