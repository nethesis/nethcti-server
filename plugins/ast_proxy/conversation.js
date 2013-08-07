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
    * The timestamp of the starting time. This is necessary to
    * update the duration value.
    *
    * @property startime
    * @type {number}
    * @private
    */
    var startime = chSource ? chSource.getStartTime() : chDest.getStartTime();

    /**
    * The duration of the conversation in seconds.
    *
    * @property duration
    * @type {number}
    * @private
    */
    var duration;

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
    * Return the duration of the conversation.
    *
    * @method getDuration
    * @return {number} The conversation duration expressed in seconds.
    */
    function getDuration() {
        updateDuration();
        return duration;
    }

    /**
    * Update the duration in seconds.
    *
    * @method updateDuration
    * @private
    */
    function updateDuration() {
        var d = new Date();
        var diff = d.getTime() - startime;
        duration = Math.floor(diff / 1000);
    }

    /**
    * Returns the JSON representation of the object. If the conversation isn't
    * connected, one between the source channel and the destination channel can be null.
    *
    *     {
    *         id:        "SIP/214-000002f4>SIP/209-000002f5",
    *         chDest:    Channel.toJSON(),                    // the source channel of the call
    *         chSource:  Channel.toJSON(),                    // the destination channel of the call
    *         recording: false                                // it's true if the conversation is recording, false otherwise
    *     }
    *
    * @method toJSON
    * @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
    * @return {object} The JSON representation of the object.
    */
    function toJSON(privacyStr) {

        updateDuration();

        return {
            id:        id,
            chDest:    chDest   ? chDest.toJSON(privacyStr)   : null,
            chSource:  chSource ? chSource.toJSON(privacyStr) : null,
            duration:  duration,
            recording: recording
        };
    }

    // public interface
    return {
        getId:                 getId,
        toJSON:                toJSON,
        toString:              toString,
        getDuration:           getDuration,
        isRecording:           isRecording,
        setRecording:          setRecording,
        getSourceChannel:      getSourceChannel,
        getDestinationChannel: getDestinationChannel
    };
}
