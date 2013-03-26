/**
* Abstraction of an asterisk channel.
*
* **It can throw exceptions.**
*
* @class Channel
* @param {object} channel The channel object
*   @param {string} channel.channel The channel identifier
*   @param {string} channel.callerNum The caller number
*   @param {string} channel.callerName The caller name
*   @param {string} channel.bridgedNum The connected number
*   @param {string} channel.bridgedName The connected name
*   @param {string} channel.bridgedChannel The connected asterisk channel
*   @param {string} channel.channelStatus The status description of the asterisk channel
* @return {object} The channel object.
* @constructor
*/
exports.Channel = function (obj) {
    // check parameter
    if (!obj.channel 
        || !obj.type
        || !obj.status
        || !obj.duration
        || !obj.callerNum
        || !obj.callerName
        || !obj.bridgedNum
        || !obj.bridgedName
        || obj.bridgedChannel === undefined) {

        throw new Error('wrong parameter');
    }

    /**
    * The channel identifier.
    *
    * @property {string} channel
    * @required
    * @private
    */
    var channel = obj.channel;

    /**
    * The time since channel creation.
    *
    * @property {string} duration
    * @required
    * @private
    */
    var duration = obj.duration;

    /**
    * The caller number.
    *
    * @property {string} callerNum
    * @required
    * @private
    */
    var callerNum = obj.callerNum;

    /**
    * The caller name.
    *
    * @property {string} callerName
    * @required
    * @private
    */
    var callerName = obj.callerName;

    /**
    * The connected number.
    *
    * @property {string} bridgedNum
    * @required
    * @private
    */
    var bridgedNum = obj.bridgedNum;

    /**
    * The connected name.
    *
    * @property {string} bridgedName
    * @required
    * @private
    */
    var bridgedName = obj.bridgedName;

    /**
    * The connected channel.
    *
    * @property {string} bridgedChannel
    * @required
    * @private
    */
    var bridgedChannel = obj.bridgedChannel;

    /**
    * The status description of the asterisk channel.
    *
    * @property {string} channelStatus
    * @required
    * @private
    */
    var channelStatus = obj.channelStatus;

    /**
    * The type of the channel can be source or destination.
    *
    * @property {string} type
    * @required
    * @private
    */
    var type = obj.type;

    /**
    * Return the channel identifier.
    *
    * @method getChannel
    * @return {string} The channel identifier.
    */
    function getChannel() { return channel; }

    /**
    * Return the time elapsed since the channel creation.
    *
    * @method getDuration
    * @return {string} The elapsed time.
    */
    function getDuration() { return duration; }

    /**
    * Return the caller number.
    *
    * @method getCallerNum
    * @return {string} The caller number
    */
    function getCallerNum() { return callerNum; }

    /**
    * Return the caller name.
    *
    * @method getCallerName
    * @return {string} The caller name.
    */
    function getCallerName() { return callerName; }

    /**
    * Return the connected number.
    *
    * @method getBridgedNum
    * @return {string} The connected number.
    */
    function getBridgedNum() { return bridgedNum; }

    /**
    * Return the connected name.
    *
    * @method getBridgedName
    * @return {string} The connected name
    */
    function getBridgedName() { return bridgedName; }

    /**
    * Return the connected channel identifier.
    *
    * @method getBridgedChannel
    * @return {string} The connected channel identifier.
    */
    function getBridgedChannel() { return bridgedChannel; }
    
    /**
    * Return the channel status description.
    *
    * @method getChannelStatus
    * @return {string} The channel status description.
    */
    function getChannelStatus() { return channelStatus; }

    /**
    * Return the readable string of the extension.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return 'Channel ' + channel; }

    /**
    * Check if the channel is the source.
    *
    * @method isSource
    * @return {boolean} Return true if the channel is the source, false otherwise.
    */
    function isSource() {
        if (type === TYPE.SOURCE) { return true; }
        return false;
    }

    /**
    * Returns an object literal representation of the object
    * without any methods.
    *
    * @method marshallObjLiteral
    * @return {object} The object literal representation of the object.
    */
    function marshallObjLiteral() {
        return {
            type:           type,
            channel:        channel,
            duration:       duration,
            callerNum:      callerNum,
            callerName:     callerName,
            bridgedNum:     bridgedNum,
            bridgedName:    bridgedName,
            channelStatus:  channelStatus,
            bridgedChannel: bridgedChannel
        };
    }

    // public interface
    return {
        toString:            toString,
        isSource:            isSource,
        getChannel:          getChannel,
        getDuration:         getDuration,
        getCallerNum:        getCallerNum,
        getCallerName:       getCallerName,
        getBridgedNum:       getBridgedNum,
        getBridgedName:      getBridgedName,
        getChannelStatus:    getChannelStatus,
        getBridgedChannel:   getBridgedChannel,
        marshallObjLiteral:  marshallObjLiteral
    };
}

/**
* The possible values for channel type.
*
* @property {object} TYPE
* @private
* @default DESTINATION | SOURCE
*/
var TYPE = {
    DEST:   'dest',
    SOURCE: 'source'
};

/**
* The possible values for channel type.
*
* @property {object} CHAN_TYPE
* @default Has the same values as private TYPE property.
*/
exports.CHAN_TYPE = TYPE;
