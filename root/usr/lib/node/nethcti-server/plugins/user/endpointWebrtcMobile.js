/**
 * Abstraction of a mobile webrtc extension endpoint.
 *
 * **It can throw exceptions.**
 *
 * @class EndpointWebrtcMobile
 * @param {string} identifier The mobile webrtc extension identifier
 * @param {string} pwd The secret of the extension
 * @return {object} The mobile webrtc extension endpoint object.
 * @constructor
 */
exports.EndpointWebrtcMobile = function(identifier, pwd) {
  // check the parameter
  if (typeof identifier !== 'string' || typeof pwd !== 'string') {
    throw new Error('wrong parameters');
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
   * The extension secret.
   *
   * @property secret
   * @type {string}
   * @required
   * @private
   */
  var secret = pwd;

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
   * Return the readable string of the mobile webrct extension endpoint.
   *
   * @method toString
   * @return {string} The readable description of the mobile webrct extension endpoint.
   */
  function toString() {
    return 'Mobile WebRTC Extension "' + getId() + '"';
  }

  /**
   * Returns the JSON representation of the object.
   *
   *     {
   *         "id": "214",
   *         "secret": "xyz"
   *     }
   *
   * @method toJSON
   * @return {object} The JSON representation of the object.
   */
  function toJSON() {
    return {
      id: id,
      secret: secret
    };
  }

  // public interface
  return {
    getId: getId,
    toJSON: toJSON,
    toString: toString
  };
};
