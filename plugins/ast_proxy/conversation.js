/**
* Abstraction of a phone conversation.
*
* **It can throw exceptions.**
*
* @class Conversation
* @constructor
* @return {object} The conversation object.
*/
exports.Conversation = function (ownerId, sourceChan, destChan, queue) {
    // check parameters
    if (    typeof ownerId  !== 'string'
        || (typeof destChan !== 'object' && typeof sourceChan !== 'object') ) {

        throw new Error('wrong parameters');
    }

    /**
    * The owner of the channel.
    *
    * @property owner
    * @type {string}
    * @private
    */
    var owner = ownerId;

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
    * The queue identifier if the conversation has gone through a queue,
    * undefined otherwise.
    *
    * @property queueId
    * @type {string}
    * @optional
    * @private
    */
    var queueId = queue;

    /**
    * The recordig status. It can be one of the "RECORDING_STATUS" property.
    *
    * @property recording
    * @type {string}
    * @default RECORDING_STATUS.FALSE
    * @private
    */
    var recording = RECORDING_STATUS.FALSE;

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
    * The conversation direction.
    *
    * @property direction
    * @type {string}
    * @private
    */
    var direction;
    if (chSource && chSource.isExtension(owner) === true) {
        direction = DIRECTION.OUT;
    } else {
        direction = DIRECTION.IN;
    }

    /**
    * True if the conversation has gone through a queue.
    *
    * @property throughQueue
    * @type {boolean}
    * @private
    */
    var throughQueue;
    if (   (chSource && (chSource.getChannel().indexOf('from-queue') !== -1 || chSource.getBridgedChannel().indexOf('from-queue') !== -1))
        || (chDest   && (chDest.getChannel().indexOf('from-queue')   !== -1 || chDest.getBridgedChannel().indexOf('from-queue')   !== -1))
       ) {

        throughQueue = true;

    } else { throughQueue = false; }

    /**
    * The number of the counterpart.
    *
    * @property counterpartNum
    * @type {string}
    * @private
    */
    // "chSource" and "chDest" are always present at runtime. Instead,
    // during the boot, if there are some ringing calls, they may be lack
    var counterpartNum;
    if (chSource && chSource.isExtension(owner) === true) {
        counterpartNum = chSource.getBridgedNum();

    } else if (chSource) {
        counterpartNum = chSource.getCallerNum();

    } else if (chDest && chDest.isExtension(owner) === true) {
        counterpartNum = chDest.getBridgedNum();

    } else if (chDest) {
        counterpartNum = chDest.getCallerNum();
    }

    /**
    * The name of the counterpart.
    *
    * @property counterpartName
    * @type {string}
    * @private
    */
    // "chSource" and "chDest" are always present at runtime. Instead,
    // during the boot, if there are some ringing calls, they may be lack
    var counterpartName;
    if (chSource && chSource.isExtension(owner) === true) {
        counterpartName = chSource.getBridgedName();

    } else if (chSource) {
        counterpartName = chSource.getCallerName();

    } else if (chDest && chDest.isExtension(owner) === true) {
        counterpartName = chDest.getBridgedName();

    } else if (chDest) {
        counterpartName = chDest.getCallerName();
    }
    if (counterpartName.substring(0, 4) === 'CID:') { counterpartName = ''; }

    /**
    * Return the source channel.
    *
    * @method getSourceChannel
    * @return {Channel} The source channel object.
    */
    function getSourceChannel() { return chSource; }

    /**
    * Returns the queue identifier if the conversation involves the queue,
    * undefined otherwise.
    *
    * @method getQueueId
    * @return {Channel} The queue identifier.
    */
    function getQueueId() { return queueId; }

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
    * Returns the counterpart number.
    *
    * @method getCounterpartNum
    * @return {string} The number of the counterpart.
    */
    function getCounterpartNum() { return counterpartNum; }

    /**
    * Returns true if the conversation is recording or is in mute recording.
    *
    * @method isRecording
    * @return {booelan} true if the conversation is recording or is in mute recording, false otherwise.
    */
    function isRecording() {
        if (recording === RECORDING_STATUS.FALSE) { return false; }
        return true;
    }

    /**
    * Sets the recording status.
    *
    * **It can throw an Exception.**
    *
    * @method setRecording
    * @param {boolean} value The value for the recording status.
    */
    function setRecording(value) {
        if (typeof value !== 'boolean') { throw new Error('wrong parameter'); }

        if (value) { recording = RECORDING_STATUS.TRUE;  }
        else       { recording = RECORDING_STATUS.FALSE; }
    }

    /**
    * Sets the recording status to mute.
    *
    * **It can throw an Exception.**
    *
    * @method setRecordingMute
    */
    function setRecordingMute() {
        recording = RECORDING_STATUS.MUTE;
    }

    /**
    * Returns true if the conversation is incoming.
    *
    * @method isIncoming
    * @return {boolean} True if the conversation is incoming.
    */
    function isIncoming(value) {
        if (direction === DIRECTION.IN) { return true;  }
        else                            { return false; }
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
    *         id:              "SIP/214-000002f4>SIP/209-000002f5",
    *         owner:           "214",
    *         chDest:          Channel.toJSON(),                    // the source channel of the call
    *         queueId:         "401",                               // the queue identifier if the conversation has gone through a queue
    *         chSource:        Channel.toJSON(),                    // the destination channel of the call
    *         duration:        26,
    *         recording:       "false",                             // it's "true" or "mute" if the conversation is recording, "false" otherwise
    *         direction:       "in",
    *         throughQueue:    true,                               // if the call has gone through a queue
    *         counterpartNum:  "209",
    *         counterpartName: "user"
    *     }
    *
    * @method toJSON
    * @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
    * @return {object} The JSON representation of the object.
    */
    function toJSON(privacyStr) {

        updateDuration();

        return {
            id:              id,
            owner:           owner,
            chDest:          chDest   ? chDest.toJSON(privacyStr)   : null,
            queueId:         queueId,
            chSource:        chSource ? chSource.toJSON(privacyStr) : null,
            duration:        duration,
            recording:       recording,
            direction:       direction,
            throughQueue:    throughQueue,
            counterpartNum:  privacyStr ? ( counterpartNum.slice(0, -privacyStr.length) + privacyStr ) : counterpartNum,
            counterpartName: privacyStr ? ( counterpartName.slice(0, -privacyStr.length) + privacyStr ) : counterpartName
        };
    }

    // public interface
    return {
        getId:                 getId,
        toJSON:                toJSON,
        toString:              toString,
        getQueueId:            getQueueId,
        isIncoming:            isIncoming,
        getDuration:           getDuration,
        isRecording:           isRecording,
        setRecording:          setRecording,
        setRecordingMute:      setRecordingMute,
        getSourceChannel:      getSourceChannel,
        getCounterpartNum:     getCounterpartNum,
        getDestinationChannel: getDestinationChannel
    };
}

/**
* The possible values for conversation direction.
*
* @property {object} DIRECTION
* @private
* @default {
    IN:  "in",
    OUT: "out"
}
*/
var DIRECTION = {
    IN:  'in',
    OUT: 'out'
};

/**
* The possible values for conversation recording.
*
* @property {object} RECORDING_STATUS
* @private
* @default {
    "MUTE":  "mute",
    "TRUE":  "true",
    "FALSE": "false"
}
*/
var RECORDING_STATUS = {
    MUTE:  'mute',
    TRUE:  'true',
    FALSE: 'false'
};
