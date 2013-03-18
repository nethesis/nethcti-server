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

    // public interface
    return {
        getId:                 getId,
        toString:              toString,
        getSourceChannel:      getSourceChannel,
        getDestinationChannel: getDestinationChannel
    };
}
