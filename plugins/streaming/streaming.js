/**
* Abstraction of a streaming source.
*
* **It can throw exceptions.**
*
* @class Streaming
* @param {object} data The streaming information
*   @param {object} data.id         The streaming identifier
*   @param {object} data.url        The HTTP url of the streaming
*   @param {object} data.type       The streaming type
*   @param {object} data.exten      The streaming extension
*   @param {object} data.descr      The streaming description
*   @param {object} data.open       The command to open the streaming device
*   @param {object} data.user       The streaming username
*   @param {object} data.secret     The streaming password
*   @param {object} data.frame-rate The frame rate of the streaming images
* @constructor
* @return {object} The streaming object.
*/
exports.Streaming = function (data) {
    // check the parameter
    if (   typeof data               !== 'object' || typeof data.secret !== 'string'
        || typeof data.id            !== 'string' || typeof data.descr  !== 'string'
        || typeof data.url           !== 'string' || typeof data.type   !== 'string'
        || typeof data.exten         !== 'string' || typeof data.open   !== 'string'
        || typeof data['frame-rate'] !== 'string' || typeof data.user   !== 'string') {
        
        throw new Error('wrong parameter');
    }

    /**
    * The streaming identifier.
    *
    * @property id
    * @type {string}
    * @required
    * @private
    */
    var id = data.id;

    /**
    * The streaming description.
    *
    * @property description
    * @type {string}
    * @required
    * @private
    */
    var description = data.descr;

    /**
    * The HTTP url of the video source.
    *
    * @property url
    * @type {string}
    * @required
    * @private
    */
    var url = data.url;

    /**
    * The streaming type.
    *
    * @property type
    * @type {string}
    * @required
    * @private
    */
    var type = data.type;

    /**
    * The streaming extension identifier.
    *
    * @property extension
    * @type {string}
    * @required
    * @private
    */
    var extension = data.exten;

    /**
    * The command to open the streaming device.
    *
    * @property cmdOpen
    * @type {string}
    * @required
    * @private
    */
    var cmdOpen = data.open;

    /**
    * The frame rate of the video streaming.
    *
    * @property frameRate
    * @type {string}
    * @required
    * @private
    */
    var frameRate = data['frame-rate'];

    /**
    * The username for authenticate streaming source.
    *
    * @property user
    * @type {string}
    * @required
    * @private
    */
    var user = data.user;

    /**
    * The password for authenticate streaming source.
    *
    * @property password
    * @type {string}
    * @required
    * @private
    */
    var password = data.secret;

    /**
    * Returns the streaming source.
    *
    * @method getUrl
    * @return {string} The streaming source.
    */
    function getUrl() { return url; }

    /**
    * Returns the command to open the streaming device.
    *
    * @method getOpenCommand
    * @return {string} The command to open the streaming device
    */
    function getOpenCommand() { return cmdOpen; }

    /**
    * Returns the extension associated with the streaming source.
    *
    * @method getExtension
    * @return {string} The extension of the streaming source.
    */
    function getExtension() { return extension; }

    /**
    * Return the readable string of the streaming source.
    *
    * @method toString
    * @return {string} The readable description of the streaming source.
    */
    function toString() { return 'streaming "' + id + '" from ' + url; }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         id:          "door",                           // the identifier
    *         url:         "http://192.168.5.224/image.jpg", // the HTTP url of the streaming source
    *         type:        "helios",                         // the streaming type
    *         user:        "root",                           // the username
    *         cmdOpen:     "0*",                             // the DMTF code to open the streaming device
    *         password:    "password",                       // the password
    *         frameRate:   "1000",                           // the frame rate of the streaming images
    *         extension:   "301",                            // the streaming extension
    *         description: "The door",                       // the streaming description
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            id:          id,
            url:         url,
            type:        type,
            user:        user,
            cmdOpen:     cmdOpen,
            password:    password,
            frameRate:   frameRate,
            extension:   extension,
            description: description
        }
    }

    // public interface
    return {
        getUrl:         getUrl,
        toJSON:         toJSON,
        toString:       toString,
        getExtension:   getExtension,
        getOpenCommand: getOpenCommand
    };
}
