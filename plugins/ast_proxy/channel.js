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
*   @param {string} channel.channelStateDesc The status description of the asterisk channel
* @return {object} The channel object.
* @constructor
*/
exports.Channel = function (obj) {
    // check parameter
    if (!obj.channel 
        || !obj.duration
        || !obj.callerNum
        || !obj.callerName
        || !obj.bridgedNum
        || !obj.bridgedName
        || !obj.bridgedChannel
        || !obj.channelStateDesc) {

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
    * @property {string} channelStateDesc
    * @required
    * @private
    */
    var channelStateDesc = obj.channelStateDesc;

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
    * @method getChannelStateDesc
    * @return {string} The channel status description.
    */
    function getChannelStateDesc() { return channelStateDesc; }

    /**
    * Return the readable string of the extension.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return 'Channel ' + channel; }

    // public interface
    return {
        toString:            toString,
        getChannel:          getChannel,
        getCallerNum:        getCallerNum,
        getCallerName:       getCallerName,
        getBridgedNum:       getBridgedNum,
        getBridgedName:      getBridgedName,
        getBridgedChannel:   getBridgedChannel,
        getChannelStateDesc: getChannelStateDesc
    };
}
