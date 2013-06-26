/**
* Abstraction of a NethCTI endpoint. It show the NethCTI presence
* of a user.
*
* **It can throw exception.**
*
* @class EndpointNethcti
* @param {object} userid The user identifier
* @constructor
* @return {object} The EndpointNethcti object.
*/
exports.EndpointNethcti = function (userid) {
    // check the parameter
    if (typeof userid !== 'string') { throw new Error('wrong parameter'); }

    /**
    * The NethCTI user identifier.
    *
    * @property id
    * @type {string}
    * @required
    * @private
    */
    var id = userid;

    /**
    * The NethCTI logged in status. If it's true the user has
    * logged in into the NethCTI.
    *
    * @property loggedIn
    * @type boolean
    * @required
    * @private
    * @default false
    */
    var loggedIn = false;

    /**
    * Returns the user identifier.
    *
    * @method getId
    * @return {string} The user identifier.
    */
    function getId() { return id; }

    /**
    * Returns the NethCTI logged in status of the user.
    *
    * @method loggedIn
    * @return {boolean} True if the user is logged in into the NethCTI.
    */
    function loggedIn() { return loggedIn; }

    /**
    * Return the readable string description of the NethCTI endpoint.
    *
    * @method toString
    * @return {string} The readable description of the NethCTI endpoint.
    */
    function toString() { return 'Endpoint NethCTI of ' + id }

    /**
    * Returns the JSON representation of the object.
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            id:       id,
            loggedIn: loggedIn
        }
    }

    // public interface
    return {
        getId:    getId,
        toJSON:   toJSON,
        toString: toString
    };
}
