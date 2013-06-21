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
    * The Extension name.
    *
    * @property name
    * @type {string}
    * @required
    * @private
    */
    var name = '';

    /**
    * The ip address of the device.
    *
    * @property ip
    * @type {string}
    * @private
    */
    var ip;

    /**
    * The don't disturb status.
    *
    * @property dnd
    * @type {boolean}
    * @private
    */
    var dnd;

    /**
    * The call forward status.
    *
    * @property cf
    * @type {string}
    * @private
    */
    var cf;

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
    * @type string
    * @required
    * @private
    */
    var sipuseragent;

    /**
    * The Extension status.
    *
    * @property status
    * @type string
    * @private
    */
    var status;

    /**
    * The user conversations. The key is the conversation identifier
    * and the value is the _conversation_ object.
    *
    * @property conversations
    * @type object
    * @private
    * @default {}
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
    * Check if the extension is online.
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
    * Return the extension name.
    *
    * @method getName
    * @return {string} The extension name.
    */
    function getName() { return name; }

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
    * Return the specified conversation.
    *
    * @method getConversation
    * @param {string} convid The conversation identifier
    * @return {object} The specified conversation.
    */
    function getConversation(convid) { return conversations[convid]; }

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
    * Set the don't disturb status.
    *
    * @method setDnd
    * @param {boolean} value The status of the don't disturb. True if it's activated, false otherwise.
    */
    function setDnd(value) { dnd = value; }

    /**
    * Get the don't disturb status.
    *
    * @method getDnd
    * @return {boolean} The don't disturb status. True if it's activated, false otherwise.
    */
    function getDnd() { return dnd; }

    /**
    * Set the call forward number.
    *
    * @method setCf
    * @param {string} value The number to set the call forward.
    */
    function setCf(value) { cf = value; }

    /**
    * Get the call forward status.
    *
    * @method getCf
    * @return {string} The number of the call forward. Return an empty string if it's disable.
    */
    function getCf() { return cf; }

    /**
    * Disable the call forward status.
    *
    * @method disableCf
    */
    function disableCf() { cf = ''; }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         ip:           "192.168.5.163",
    *         cf:           "221",                          // the call forward status. If it's disabled, it is an empty string
    *         dnd:          false,                          // it's true if the don't disturb is active
    *         port:         "5062",
    *         name:         "Alessandro",
    *         exten:        "214",
    *         status:       "online",                       // the status can be: "dnd", "busy", "online", "onhold", "offline", "ringing", "busy_ringing"
    *         sipuseragent: "Twinkle/1.4.2",
    *         conversations: { Conversation.toJSON(), ... } // the keys is the conversation identifiers
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {

        var jsonConvs = {};
        var convid;

        // JSON representation of the conversations
        for (convid in conversations) { jsonConvs[convid] = conversations[convid].toJSON(); }

        return {
            ip:            ip,
            cf:            cf,
            dnd:           dnd,
            port:          port,
            name:          name,
            exten:         exten,
            status:        status,
            chanType:      chanType,
            sipuseragent:  sipuseragent,
            conversations: jsonConvs
        }
    }

    // public interface
    return {
        setCf:     setCf,
        getCf:     getCf,
        setIp:     setIp,
        getIp:     getIp,
        toJSON:    toJSON,
        setDnd:    setDnd,
        getDnd:    getDnd,
        getName:   getName,
        setName:   setName,
        setPort:   setPort,
        getPort:   getPort,
        isOnline:  isOnline,
        getExten:  getExten,
        toString:  toString,
        disableCf: disableCf,
        setStatus: setStatus,
        getStatus: getStatus,
        getChanType:            getChanType,
        addConversation:        addConversation,
        setSipUserAgent:        setSipUserAgent,
        getConversation:        getConversation,
        conversationCount:      conversationCount,
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
* @default Equal to the private property STATUS_ENUM
*/
exports.EXTEN_STATUS_ENUM = STATUS_ENUM;
