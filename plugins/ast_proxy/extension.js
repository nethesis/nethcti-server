/**
* Abstraction of an extension.
*
* **It can throw exceptions.**
*
* @class Extension
* @param {string} extension The extension number
* @param {string} channelType The channel type, SIP, IAX, ...
* @constructor
* @return {object} The extension object.
*/
exports.Extension = function (extension, channelType) {
    // check parameters
    if (typeof extension !== 'string'
        || typeof channelType !== 'string') {

        throw new Error('wrong parameters');
    }

    /**
    * The Extension number.
    *
    * @property exten
    * @type {string}
    * @required
    * @private
    */
    var exten = extension;

    /**
    * The channel type.
    *
    * @property chanType
    * @type {string}
    * @required
    * @private
    */
    var chanType = channelType;

    /**
    * Return the extension number.
    *
    * @method getExten
    * @return {string} The extension number
    */
    function getExten() { return exten; }

    /**
    * Return the readable string of the extension.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return getChanType() + '/' + getExten(); }

    /**
    * Return the channel type.
    *
    * @method getChanType
    * @return {string} The channel type
    */
    function getChanType() { return chanType; }

    // public interface
    return {
        getExten: getExten,
        toString: toString,
        chanType: getChanType
    };
}
