var ENDPOINT_TYPES    = require('./endpoint_types').TYPES;
var EndpointJabber    = require('./endpointJabber').EndpointJabber;
var EndpointCalendar  = require('./endpointCalendar').EndpointCalendar;
var EndpointExtension = require('./endpointExtension').EndpointExtension;
var EndpointCellphone = require('./endpointCellphone').EndpointCellphone;

/**
* Abstraction of a user.
*
* **It can throw exceptions.**
*
* @class User
* @param {string} name The name of the user
* @constructor
* @return {object} The user object.
*/
exports.User = function (name) {
    // check the parameter
    if (typeof name !== 'string') { throw new Error('wrong parameter'); }

    /**
    * The name of the user.
    *
    * @property username
    * @type {string}
    * @required
    * @private
    */
    var username = name;

    /**
    * The user authorizations.
    *
    * @property authorizations
    * @private
    * @default {}
    */
    var authorizations = {};

    /**
    * The extension endpoints of the user. The keys are the endpoint
    * identifier and the value is the endpoint object.
    *
    * @property endpointExtension
    * @private
    * @default {}
    */
    var endpointExtension = {};

    /**
    * The jabber endpoints of the user. The keys are the endpoint
    * identifier and the value is the endpoint object.
    *
    * @property endpointJabber
    * @private
    * @default {}
    */
    var endpointJabber = {};

    /**
    * The cellphone endpoints of the user. The keys are the endpoint
    * identifier and the value is the endpoint object.
    *
    * @property endpointCellphone
    * @private
    * @default {}
    */
    var endpointCellphone = {};

    /**
    * The nethcti endpoints of the user. The keys are the endpoint
    * identifier and the value is the endpoint object.
    *
    * @property endpointNethcti
    * @private
    * @default {}
    */
    var endpointNethcti = {};

    /**
    * The calendar endpoints of the user. The keys are the endpoint
    * identifier and the value is the endpoint object.
    *
    * @property endpointCalendar
    * @private
    * @default {}
    */
    var endpointCalendar = {};

    /**
    * The user configurations.
    *
    * @property configurations
    * @private
    * @default {}
    */
    var configurations = {};

    /**
    * Return the user configurations.
    *
    * @method getConfigurations
    * @return {object} The configuration of the user
    */
    function getConfigurations() { return configurations; }

    /**
    * Sets the user configurations.
    *
    * **It can throw an Exception.**
    *
    * @method setConfigurations
    * @return {object} The configuration of the user
    */
    function setConfigurations(c) {
        // check parameter
        if (typeof c !== 'object') { throw new Error('wrong parameter'); }
        configurations = c;
    }

    /**
    * Return the name of the user.
    *
    * @method getUsername
    * @return {string} The username
    */
    function getUsername() { return username; }

    /**
    * Return all the user authorizations.
    *
    * @method getAllAuthorizations
    * @return {object} All the user authorizations.
    */
    function getAllAuthorizations() { return authorizations; }

    /**
    * Add an endpoint. Actually the _obj_ object passed is
    * empty, but it maybe used in the future. The function
    * assumes that the specified endpoint type is valid. 
    * Otherwise it throws an exception.
    * 
    * **It can throw an Exception.**
    *
    * @method addEndpoint
    * @param {string} type The endpoint type
    * @param {string} id The endpoint identifier
    * @param {object} data The object containing some informations
    *                      on endpoint to add. Actually it's empty
    */
    function addEndpoint(type, id, data) {
        // check parameters
        if (typeof type  !== 'string'
            || typeof id !== 'string' || typeof data !== 'object') {

            throw new Error('wrong parameters');
        }

        // add endpoint by its type
        var id, newEndpoint;
        if (type === ENDPOINT_TYPES.EXTENSION) {

            newEndpoint = new EndpointExtension(id);
            endpointExtension[id] = newEndpoint;
            
        } else if (type === ENDPOINT_TYPES.CELLPHONE) {

            newEndpoint = new EndpointCellphone(id);
            endpointCellphone[id] = newEndpoint;

        } else if (type === ENDPOINT_TYPES.JABBER) {

            newEndpoint = new EndpointJabber(id);
            endpointJabber[id] = newEndpoint;

        } else if (type === ENDPOINT_TYPES.CALENDAR) {

            newEndpoint = new EndpointCalendar(id);
            endpointCalendar[id] = newEndpoint;

        } else {
            throw new Error('invalid endpoint type "' + type + '"');
        }
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
    *                  doesn't exists.
    */
    function getAuthorization(type) {
        // check parameter
        if (typeof type !== 'string') { throw new Error('wrong parameter'); }

        var obj = {};
        obj[type] = authorizations[type];
        return obj;
    }

    /**
    * Return the extension endpoint of the user.
    *
    * @method getEndpointExtensions
    * @return {object} The extension endpoint.
    */
    function getEndpointExtensions() { return endpointExtension; }

    /**
    * Return the readable string of the user.
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
        toJSON:                toJSON,
        toString:              toString,
        getUsername:           getUsername,
        addEndpoint:           addEndpoint,
        setAuthorization:      setAuthorization,
        getAuthorization:      getAuthorization,
        getConfigurations:     getConfigurations,
        setConfigurations:     setConfigurations,
        getAllAuthorizations:  getAllAuthorizations,
        getEndpointExtensions: getEndpointExtensions
    };
}
