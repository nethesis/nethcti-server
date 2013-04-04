/**
* Abstraction of an extension.
*
* **It can throw exceptions.**
*
* @class Extension
* @param {string} ext The extension number
* @param {string} chType The channel type, e.g. sip, iax
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
    * The user conversations. The key is the conversation identifier
    * and the value is the _conversation_ object.
    *
    * @property conversations
    * @type {object}
    * @private
    */
    var conversations = {};

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
    * Get the extension ip address.
    *
    * @method getIp
    * @return {string} The ip address.
    */
    function getIp(ipAddr) { return ip; }

    /**
    * Set the extension ip port.
    *
    * @method setPort
    * @param {string} ipPort The ip port
    */
    function setPort(ipPort) { port = ipPort; }

    /**
    * Get the extension ip port.
    *
    * @method getPort
    * @return {string} The ip port.
    */
    function getPort(ipPort) { return port; }

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
        if (STATUS_ENUM[extStatus.toUpperCase()]) {
            status = extStatus;
            return true;
        }
        throw new Error('wrong parameter extStatus');
    }

    /**
    * Get the extension status.
    *
    * @method getStatus
    * @return {string} The extension status.
    */
    function getStatus(extStatus) { return status; }

    /**
    * Sets the conversation. If it already exists it will be overwritten.
    *
    * @method addConversation
    * @param {object} conv The _conversation_ object.
    */
    function addConversation(conv) {
        // check parameter
        if (!conv || typeof conv !== 'object') { throw new Error('wrong parameter'); }

        // add the conversation. If it already exists it will be overwritten
        conversations[conv.getId()] = conv;
    }

    /**
    * Return the conversation number.
    *
    * @method conversationCount
    * @return {number} The conversation number.
    */
    function conversationCount() { return Object.keys(conversations).length; }

    /**
    * Return the conversation list.
    *
    * @method getAllConversations
    * @return {object} All conversations of the extension.
    */
    function getAllConversations() { return conversations; }

    /**
    * Removes the specified conversation.
    *
    * @method removeConversation
    * @param {string} The conversation identifier
    */
    function removeConversation(convid) { delete conversations[convid]; }

    /**
    * Removes all conversations.
    *
    * @method removeAllConversations
    */
    function removeAllConversations() { conversations = {}; }

    /**
    * Returns an object literal representation of the object
    * without any methods.
    *
    * @method marshallObjLiteral
    * @return {object} The object literal representation of the object.
    */
    function marshallObjLiteral() {
        var convs = {};
        var convid;

        // conversations marshalling
        for (convid in conversations) { convs[convid] = conversations[convid].marshallObjLiteral(); }

        return {
            ip:            ip,
            port:          port,
            exten:         exten,
            status:        status,
            chanType:      chanType,
            sipuseragent:  sipuseragent,
            conversations: convs
        }
    }

    // public interface
    return {
        setIp:     setIp,
        getIp:     getIp,
        setName:   setName,
        setPort:   setPort,
        getPort:   getPort,
        isOnline:  isOnline,
        getExten:  getExten,
        toString:  toString,
        chanType:  getChanType,
        setStatus: setStatus,
        getStatus: getStatus,
        addConversation:        addConversation,
        setSipUserAgent:        setSipUserAgent,
        conversationCount:      conversationCount,
        marshallObjLiteral:     marshallObjLiteral,
        removeConversation:     removeConversation,
        getAllConversations:    getAllConversations,
        removeAllConversations: removeAllConversations
    };
}

/**
* The Extension status enumeration.
*
* @property STATUS_ENUM
* @type {object}
* @private
* @final
* @default DND | BUSY | ONLINE | ONHOLD | OFFLINE | RINGING | BUSY_RINGING
*/
var STATUS_ENUM = {
    DND:          'dnd',         // Busy
    BUSY:         'busy',        // In Use
    ONLINE:       'online',      // Idle
    ONHOLD:       'onhold',
    OFFLINE:      'offline',     // Unavailable
    RINGING:      'ringing',     // Ringing
    BUSY_RINGING: 'busy_ringing' // In Use & Ringin
};

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
