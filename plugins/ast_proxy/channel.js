/**
* Abstraction of an asterisk channel.
*
* **It can throw exceptions.**
*
* @class Channel
* @param {object} channel The channel object
*   @param {string} channel.channel        The channel identifier
*   @param {string} channel.callerNum      The caller number
*   @param {string} channel.callerName     The caller name
*   @param {string} channel.bridgedNum     The connected number
*   @param {string} channel.bridgedName    The connected name
*   @param {string} channel.bridgedChannel The connected asterisk channel
*   @param {string} channel.status         The status description of the asterisk channel
* @return {object} The channel object.
* @constructor
*/
exports.Channel = function (obj) {
    // check parameter
    if (obj.channel           === undefined
        || obj.status         === undefined
        || obj.uniqueid       === undefined
        || obj.callerNum      === undefined
        || obj.callerName     === undefined
        || obj.bridgedNum     === undefined
        || obj.bridgedName    === undefined
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
    * The unique identifier.
    *
    * @property {string} uniqueid
    * @required
    * @private
    */
    var uniqueid = obj.uniqueid;

    /**
    * The creation time in milliseconds from Jan 1, 1970.
    *
    * @property {number} startTime
    * @private
    */
    var startTime = parseInt(obj.uniqueid.split('.')[0]) * 1000;

    /**
    * The caller number.
    *
    * @property callerNum
    * @type string
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
    // the channel type is calculated using the channel number. The minor
    // number means that the channel is previously created. The channel
    // number is the last part of the channel identifier, e.g. the number
    // of the channel "SIP/211-00000486" is "00000486"
    if (channel.split('-')[1] > bridgedChannel.split('-')[1]) {
        type = TYPE.DEST;
    } else {
        type = TYPE.SOURCE;
    }


    /**
    * Return the channel identifier.
    *
    * @method getChannel
    * @return {string} The channel identifier.
    */
    function getChannel() { return channel; }

    /**
    * Return the unique identifier.
    *
    * @method getUniqueId
    * @return {string} The unique identifier.
    */
    function getUniqueId() { return uniqueid; }

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
    * Return the channel time creation from Jan 1, 1970.
    *
    * @method getStartTime
    * @return {number} The channel creation time from Jan 1, 1970.
    */
    function getStartTime() { return startTime; }

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
    * Returns the JSON representation of the object.
    *
    *     {
    *         type:           "destination",      // the channel type: it can be "destination" or "source"
    *         channel:        "SIP/214-0000034f"  // the channel identifier
    *         callerNum:      "214"
    *         startTime:      1365600403000       // the starting call timestamp
    *         callerName:     "sip214ale"
    *         bridgedNum:     "221"               // the number of the connected caller/called
    *         bridgedName:    "sip221ale"         // the name of the connected caller/called
    *         bridgedChannel: "SIP/221-0000034e", // the connected channel identifier
    *     }
    *
    * @method toJSON
    * @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
    * @return {object} The JSON representation of the object.
    */
    function toJSON(privacyStr) {

        return {
            type:           type,
            channel:        channel,
            callerNum:      privacyStr ? ( callerNum.slice(0, -privacyStr.length) + privacyStr ) : callerNum,
            callerName:     callerName,
            bridgedNum:     privacyStr ? ( bridgedNum.slice(0, -privacyStr.length) + privacyStr ) : bridgedNum,
            bridgedName:    bridgedName,
            channelStatus:  channelStatus,
            bridgedChannel: bridgedChannel
        };
    }

    // public interface
    return {
        toJSON:              toJSON,
        toString:            toString,
        isSource:            isSource,
        getChannel:          getChannel,
        getUniqueId:         getUniqueId,
        getStartTime:        getStartTime,
        getCallerNum:        getCallerNum,
        getCallerName:       getCallerName,
        getBridgedNum:       getBridgedNum,
        getBridgedName:      getBridgedName,
        getChannelStatus:    getChannelStatus,
        getBridgedChannel:   getBridgedChannel,
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
