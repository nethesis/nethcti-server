/**
 * Abstraction of an extension endpoint.
 *
 * **It can throw exceptions.**
 *
 * @class EndpointExtension
 * @param {string} identifier The extension identifier
 * @constructor
 * @return {object} The extension endpoint object.
 */
exports.EndpointExtension = function(identifier) {
  // check the parameter
  if (typeof identifier !== 'string') {
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
    toString: toString
  };
};
