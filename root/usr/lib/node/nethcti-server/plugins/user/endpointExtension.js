/**
 * Abstraction of an extension endpoint.
 *
 * **It can throw exceptions.**
 *
 * @class EndpointExtension
 * @param {string} identifier The extension identifier
 * @param {object} [data]
 *  @param {string} [data.web_user] The username of the physical phone to be used to invoke HTTP apis
 *  @param {string} [data.web_password] The password of the physical phone to be used to invoke HTTP apis
 * @return {object} The extension endpoint object.
 * @constructor
 */
exports.EndpointExtension = function(identifier, data) {
  // check the parameter
  if (typeof identifier !== 'string' ||
    (data && typeof data !== 'object')) {

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
   * The username of the physical phone to be used to invoke HTTP apis.
   *
   * @property webApiUser
   * @type {string}
   * @private
   */
  var webApiUser = (data && data.web_user) ? data.web_user : '';

  /**
   * The password of the physical phone to be used to invoke HTTP apis.
   *
   * @property webApiPassword
   * @type {string}
   * @private
   */
  var webApiPassword = (data && data.web_password) ? data.web_password : '';

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
   * Returns the JSON representation of the object.
   *
   *     {
   *         id: "214"
   *     }
   *
   * @method toJSON
   * @return {object} The JSON representation of the object.
   */
  function toJSON() {
    return {
      id: id
    };
  }

  // public interface
  return {
    getId: getId,
    toJSON: toJSON,
    toString: toString,
    getWebApiUser: getWebApiUser,
    getWebApiPassword: getWebApiPassword
  };
};
