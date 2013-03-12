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
exports.Extension = function (ext, chType) {
    // check the parameters
    if (!ext || !chType || typeof ext !== 'string' || typeof chType !== 'string') {

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
    var exten = ext;

    /**
    * The ip address of the device.
    *
    * @property ip
    * @type {string}
    * @private
    */
    var ip;

    /**
    * The port of the device.
    *
    * @property port
    * @type {string}
    * @private
    */
    var port;

    /**
    * The channel type.
    *
    * @property chanType
    * @type {string}
    * @required
    * @private
    */
    var chanType = chType;

    /**
    * The sip user agent.
    *
    * @property sipuseragent
    * @type {string}
    * @required
    * @private
    */
    var sipuseragent;

    /**
    * The Extension status.
    *
    * @property status
    * @type {string}
    * @private
    */
    var status;

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

    /**
    * Check if the extension in online.
    *
    * @method isOnline
    * @return {boolean} True if the extension is online, false otherwise.
    */
    function isOnline() {
        if (status === STATUS_ENUM.ONLINE) { return true; }
        else { return false; }
    }

    /**
    * Set the extension ip address.
    *
    * @method setIp
    * @param {string} ipAddr The ip address
    */
    function setIp(ipAddr) { ip = ipAddr; }

    /**
    * Set the extension ip port.
    *
    * @method setPort
    * @param {string} ipPort The ip port
    */
    function setPort(ipPort) { port = ipPort; }

    /**
    * Set the extension name.
    *
    * @method setName
    * @param {string} extName The extension name
    */
    function setName(extName) { name = extName; }

    /**
    * Set the extension sip user agent.
    *
    * @method setSipUserAgent
    * @param {string} ua The extension sip user agent
    */
    function setSipUserAgent(ua) { sipuseragent = ua; }

    /**
    * Set the extension status.
    *
    * @method setStatus
    * @param {string} extStatus The extension status must be one
    * of _STATUS\_ENUM_ property.
    *
    * **It can throw exception**.
    */
    function setStatus(extStatus) {
        var key;
        for (key in STATUS_ENUM) {
            if (extStatus == STATUS_ENUM[key]) {
                status = extStatus
                return true;
            }
        }
        throw new Error('wrong parameter extStatus');
    }

    // public interface
    return {
        setIp:           setIp,
        setName:         setName,
        setPort:         setPort,
        getExten:        getExten,
        toString:        toString,
        chanType:        getChanType,
        setStatus:       setStatus,
        setOnline:       setOnline,
        setOffline:      setOffline,
        isOnline:        isOnline,
        setSipUserAgent: setSipUserAgent
    };
}

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
* The Extension status enumeration. It's the same of
* private _STATUS\_ENUM_.
*
* @property EXT_STATUS_ENUM
* @type {object}
* @final
* @default ONLINE | OFFLINE
*/
exports.EXTEN_STATUS_ENUM = STATUS_ENUM;
