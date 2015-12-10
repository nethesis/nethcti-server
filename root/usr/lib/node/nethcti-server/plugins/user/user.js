/**
* Provides the user functions.
*
* @module user
* @main controller_user
*/
var endpointTypes     = require('./endpoint_types');
var EndpointEmail     = require('./endpointEmail').EndpointEmail;
var EndpointJabber    = require('./endpointJabber').EndpointJabber;
var EndpointNethcti   = require('./endpointNethcti').EndpointNethcti;
var EndpointCalendar  = require('./endpointCalendar').EndpointCalendar;
var EndpointExtension = require('./endpointExtension').EndpointExtension;
var EndpointCellphone = require('./endpointCellphone').EndpointCellphone;
var EndpointVoicemail = require('./endpointVoicemail').EndpointVoicemail;

/**
* Abstraction of a user.
*
* **It can throw exceptions.**
*
* @class User
* @param  {string} uname The username of the user
* @param  {string} na    The name of the user
* @param  {string} sur   The surname of the user
* @return {object}       The user object.
* @constructor
*/
exports.User = function (uname, na, sur) {
    // check the parameters
    if (   typeof uname !== 'string'
        || typeof na    !== 'string' || typeof sur !== 'string') {

        throw new Error('wrong parameter');
    }

    /**
    * The username of the user.
    *
    * @property username
    * @type {string}
    * @required
    * @private
    */
    var username = uname;

    /**
    * The name of the user.
    *
    * @property name
    * @type {string}
    * @required
    * @private
    */
    var name = na;

    /**
    * The surname of the user.
    *
    * @property surname
    * @type {string}
    * @required
    * @private
    */
    var surname = sur;

    /**
    * The user authorizations.
    *
    * @property authorizations
    * @private
    * @default {}
    */
    var authorizations = {};

    /**
    * The endpoints of the user. The keys are the endpoint types
    * and the values are objects that contains endpoint identifiers
    * as keys and Endpoint objects as values.
    *
    * @property endpoints
    * @private
    */
    var endpoints = {};
    var type;
    for (type in endpointTypes.TYPES) {
        endpoints[endpointTypes.TYPES[type]] = {};
    }

    /**
    * Returns the username of the user.
    *
    * @method getUsername
    * @return {string} The username
    */
    function getUsername() { return username; }

    /**
    * Returns the name of the user.
    *
    * @method getName
    * @return {string} The name
    */
    function getName() { return name; }

    /**
    * Returns the surname of the user.
    *
    * @method getSurname
    * @return {string} The surname
    */
    function getSurname() { return surname; }

    /**
    * Returns all the user authorizations.
    *
    * @method getAllAuthorizations
    * @return {object} All the user authorizations.
    */
    function getAllAuthorizations() { return authorizations; }

    /**
    * Returns all endpoints of the user.
    *
    * @method getAllEndpoints
    * @return {object} All the user endpoints.
    */
    function getAllEndpoints() { return endpoints; }

    /**
    * Returns all endpoints of the user in JSON format.
    *
    * **It can throw an Exception.**
    *
    * @method getAllEndpointsJSON
    * @return {object} All the user endpoints in JSON format.
    */
    function getAllEndpointsJSON() {

        var result = {}; // object to return
        var id, type, endptTemp;

        // cycle in all endpoints
        for (type in endpointTypes.TYPES) {

            // initialize object to return with endpoint type
            result[endpointTypes.TYPES[type]] = {};

            // it's all the endpoints of one type, e.g. the extension endpoints
            endptTemp = endpoints[endpointTypes.TYPES[type]];

            // cycle in all endpoints of one type, e.g. the extension endpoints
            for (id in endptTemp) {
                // check if the endpoint object has the toJSON function
                if (typeof endptTemp[id].toJSON === 'function') {
                    result[endpointTypes.TYPES[type]][id] = endptTemp[id].toJSON();

                }
            }
        }
        return result;
    }

    /**
    * Adds an endpoint. The function assumes that the specified
    * endpoint type is valid. Otherwise it throws an exception.
    * 
    * **It can throw an Exception.**
    *
    * @method addEndpoint
    * @param {string} type The endpoint type
    * @param {string} id The endpoint identifier
    * @param {object} data The object containing some informations
    *   on endpoint to add
    */
    function addEndpoint(type, id, data) {
        // check parameters
        if (   typeof type !== 'string' || typeof data !== 'object'
            || typeof id   !== 'string' || !endpointTypes.isValidEndpointType(type)) {

            throw new Error('wrong parameters');
        }

        // create new endpoint object
        var newEndpoint;
        if      (type === endpointTypes.TYPES.email)     { newEndpoint = new EndpointEmail(id);     }
        else if (type === endpointTypes.TYPES.jabber)    { newEndpoint = new EndpointJabber(id);    }
        else if (type === endpointTypes.TYPES.nethcti)   { newEndpoint = new EndpointNethcti(id);   }
        else if (type === endpointTypes.TYPES.calendar)  { newEndpoint = new EndpointCalendar(id);  }
        else if (type === endpointTypes.TYPES.extension) { newEndpoint = new EndpointExtension(id); }
        else if (type === endpointTypes.TYPES.cellphone) { newEndpoint = new EndpointCellphone(id); }
        else if (type === endpointTypes.TYPES.voicemail) { newEndpoint = new EndpointVoicemail(id); }

        // add endpoint by its type
        endpoints[type][id] = newEndpoint;
    }

    /**
    * Sets an authorization.
    *
    * @method setAuthorization
    * @param {string} type The type of the authorization
    * @param {string|array} value The value of the autorization. It can be "true" or "false"
    *                              or an array of value as in the case of customer card or
    *                              streaming authorizations.
    */
    function setAuthorization(type, value) {
        // check parameters
        if (typeof type !== 'string' || value === undefined) {
            throw new Error('wrong parameters');
        }

        if (value === 'true') {
            authorizations[type] = true;

        } else if (value === 'false') {
            authorizations[type] = false;

        } else {
            authorizations[type] = {};
            var i;
            for (i = 0; i < value.length; i++) {
                authorizations[type][value[i]] = true;
            }
        }
    }

    /**
    * Gets an authorization.
    *
    * @method getAuthorization
    * @param {string} type The type of the authorization
    * @return {object} The authorization requested. The key is the passed type
    *                  and the value is the authorization or an undefined if it
    *                  doesn't exist.
    */
    function getAuthorization(type) {
        // check parameter
        if (typeof type !== 'string') { throw new Error('wrong parameter'); }

        var obj = {};
        obj[type] = authorizations[type];
        return obj;
    }

    /**
    * Returns the readable string of the user.
    *
    * @method toString
    * @return {string} The readable description of the user
    */
    function toString() { return 'user ' + username; }

    /**
    * Returns the JSON representation of the user.
    *
    *     {
    *         username: "alessandro.polidori" // the username
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            username: username
        }
    }

    // public interface
    return {
        toJSON:               toJSON,
        getName:              getName,
        toString:             toString,
        getSurname:           getSurname,
        getUsername:          getUsername,
        addEndpoint:          addEndpoint,
        getAllEndpoints:      getAllEndpoints,
        setAuthorization:     setAuthorization,
        getAuthorization:     getAuthorization,
        getAllEndpointsJSON:  getAllEndpointsJSON,
        getAllAuthorizations: getAllAuthorizations
    };
}
