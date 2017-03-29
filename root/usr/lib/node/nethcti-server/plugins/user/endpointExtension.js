/**
 * Abstraction of an extension endpoint.
 *
 * **It can throw exceptions.**
 *
 * @class EndpointExtension
 * @param {string} identifier The extension identifier
 * @param {object} data
 *  @param {string} data.type The type of the extension ("physical" | "webrtc" | "webrtc_mobile")
 *  @param {string} [data.web_user] The username of the physical phone to be used to invoke HTTP apis
 *  @param {string} [data.web_password] The password of the physical phone to be used to invoke HTTP apis
 *  @param {string} [data.username] The username of the sip extension. It is present with webrtc type
 *  @param {string} [data.password] The password of the sip extension. It is present with webrtc type
 * @return {object} The extension endpoint object.
 * @constructor
 */
exports.EndpointExtension = function(identifier, data) {
  // check the parameter
  if (typeof identifier !== 'string' || typeof data !== 'object' ||
    (data.type !== 'physical' && data.type !== 'webrtc' && data.type !== 'webrtc_mobile')) {

    throw new Error('wrong parameters: ' + JSON.stringify(arguments));
  }

  /**
   * The extension identifier.
   *
   * @property id
   * @type {string}
   * @required
   * @private
   */
  var id = identifier;

  /**
   * The extension type.
   *
   * @property type
   * @type {string}
   * @required
   * @private
   */
  var type = data.type;

   /**
   * The username of the sip phone used to register extension into asterisk.
   * Usually used by clients to register WebRTC phone.
   *
   * @property sipUser
   * @type {string}
   * @private
   */
  var sipUser = data.user ? data.user : '';

  /**
   * The password of the sip phone used to register extension into asterisk.
   * Usually used by clients to register WebRTC phone.
   *
   * @property sipPassword
   * @type {string}
   * @private
   */
  var sipPassword = data.password ? data.password : '';

  /**
   * The username of the physical phone to be used to invoke HTTP apis.
   *
   * @property webApiUser
   * @type {string}
   * @private
   */
  var webApiUser = data.web_user ? data.web_user : '';

  /**
   * The password of the physical phone to be used to invoke HTTP apis.
   *
   * @property webApiPassword
   * @type {string}
   * @private
   */
  var webApiPassword = data.web_password ? data.web_password : '';

  /**
   * Check if the extension is of webrtc or webrtc_mobile type.
   *
   * @method isWebrtc
   * @return {string} True if the phone is of webrtc or webrtc_mobile type.
   */
  function isWebrtc() {
    return (type === 'webrtc' || type === 'webrtc_mobile');
  }

  /**
   * Return the phone username to be used to invoke HTTP apis.
   *
   * @method getWebApiUser
   * @return {string} The phone username to be used to invoke HTTP apis.
   */
  function getWebApiUser() {
    return webApiUser;
  }

  /**
   * Return the phone password to be used to invoke HTTP apis.
   *
   * @method getWebApiPassword
   * @return {string} The phone password to be used to invoke HTTP apis.
   */
  function getWebApiPassword() {
    return webApiPassword;
  }

  /**
   * Return the sip phone password.
   *
   * @method getSipPassword
   * @return {string} The sip phone password.
   */
  function getSipPassword() {
    return sipPassword;
  }

  /**
   * Return the sip phone username.
   *
   * @method getSipUser
   * @return {string} The sip phone username.
   */
  function getSipUser() {
    return sipUser;
  }

  /**
   * Return the extension identifier.
   *
   * @method getId
   * @return {string} The extension identifier
   */
  function getId() {
    return id;
  }

  /**
   * Return the readable string of the extension endpoint.
   *
   * @method toString
   * @return {string} The readable description of the extension endpoint.
   */
  function toString() {
    return 'Extension "' + getId() + '"';
  }

  /**
   * Returns the JSON representation of the object. If the extension type
   * is of WebRTC type, it returns also the sip extension secret.
   *
   *     {
   *         "id": "214",
   *         "type": "physical"
   *     }
   *
   *     {
   *         "id": "214",
   *         "type": "webrtc",
   *         "secret": "sip password",
   *         "username": "sip username"
   *     }
   *
   *     {
   *         "id": "214",
   *         "type": "webrtc_mobile",
   *         "secret": "sip password",
   *         "username": "sip username"
   *     }
   *
   * @method toJSON
   * @return {object} The JSON representation of the object.
   */
  function toJSON() {
    var obj= {
      id: id,
      type: type
    };

    if (type === 'webrtc' || type === 'webrtc_mobile') {
      obj.secret = sipPassword;
      obj.username = sipUser;
    }

    return obj;
  }

  // public interface
  return {
    getId: getId,
    toJSON: toJSON,
    isWebrtc: isWebrtc,
    toString: toString,
    getSipUser: getSipUser,
    getWebApiUser: getWebApiUser,
    getSipPassword: getSipPassword,
    getWebApiPassword: getWebApiPassword
  };
};
