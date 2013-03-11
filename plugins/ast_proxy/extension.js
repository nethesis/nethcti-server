/**
* Abstraction of an extension.
*
* **It can throw exceptions.**
*
* @class Extension
* @param {object} obj The object with all informations about extension
*   @param {string} obj.name The name of the extension
*   @param {string} obj.ip The ip address of the device
*   @param {string} obj.port The port of the device
*   @param {string} obj.exten The extension number
*   @param {string} obj.chantype The channel type, SIP, IAX, ...
*   @param {string} obj.status The status
*   @param {string} obj.sipuseragent The user agent of the extension
* @constructor
* @return {object} The extension object.
*/
exports.Extension = function (obj) {
    // check parameter
    if (!obj || obj.sipuseragent === undefined
        || obj.ip    === undefined || obj.port     === undefined
        || obj.name  === undefined || obj.status   === undefined
        || obj.exten === undefined || obj.chantype === undefined ) {

        throw new Error('wrong parameter');
    }

    /**
    * The Extension number.
    *
    * @property exten
    * @type {string}
    * @required
    * @private
    */
    var exten = obj.exten;

    /**
    * The ip address of the device.
    *
    * @property ip
    * @type {string}
    * @private
    */
    var ip = obj.ip;

    /**
    * The port of the device.
    *
    * @property port
    * @type {string}
    * @private
    */
    var port = obj.port;

    /**
    * The channel type.
    *
    * @property chanType
    * @type {string}
    * @required
    * @private
    */
    var chanType = obj.chantype;

    /**
    * The sip user agent.
    *
    * @property sipuseragent
    * @type {string}
    * @required
    * @private
    */
    var sipuseragent = obj.sipuseragent;

    /**
    * The Extension status enumeration.
    *
    * @property STATUS_ENUM
    * @type {object}
    * @private
    * @final
    * @default ONLINE | OFFLINE
    */
    var STATUS_ENUM = { ONLINE: 'online', OFFLINE: 'offline' };

    /**
    * The Extension status.
    *
    * @property status
    * @type {string}
    * @private
    */
    var status = obj.status;

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

    /**
    * Set the extension status to online.
    *
    * @method setOnline
    */
    function setOnline() { status = STATUS_ENUM.ONLINE; }

    /**
    * Set the extension status to online.
    *
    * @method setOffline
    */
    function setOffline() { status = STATUS_ENUM.OFFLINE; }

    // public interface
    return {
        getExten: getExten,
        toString: toString,
        chanType: getChanType
    };
}
