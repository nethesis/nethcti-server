var endpointTypes = require('./endpoint_types');

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
    * The type of the device used for nethcti.
    *
    * @property deviceType
    * @type {string}
    * @private
    */
    var deviceType;

    /**
    * The nethcti presence status.
    *
    * @property status
    * @type string
    * @private
    * @default "offline"
    */
    var status = endpointTypes.ENDPOINT_NETHCTI_STATUS.offline;

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
    * @method getStatus
    * @return {string} The nethcti presence status.
    */
    function getStatus() { return status; }

    /**
    * Sets the nethcti endpoint status.
    *
    * @method setStatus
    * @param {string} value The nethcti endpoint status
    */
    function setStatus(value) {
        // check parameter
        if (typeof value !== 'string' || !endpointTypes.isValidEndpointNethctiStatus(value)) {
            throw new Error('wrong parameter');
        }
        status = value;
    }

    /**
    * Sets the device type used for nethcti.
    *
    * @method setDeviceType
    * @param {string} value The device type used for nethcti.
    */
    function setDeviceType(value) {
        // check parameter
        if (typeof value !== 'string' || !endpointTypes.isValidEndpointNethctiDevice(value)) {
            throw new Error('wrong parameter');
        }
        deviceType = value;
    }

    /**
    * Returns the type of the device used for nethcti.
    *
    * @method getDeviceType
    * @return {string} The device type used for nethcti.
    */
    function getDeviceType() { return deviceType; }

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
            id:         id,
            status:     status,
            deviceType: deviceType
        }
    }

    // public interface
    return {
        getId:         getId,
        toJSON:        toJSON,
        toString:      toString,
        setStatus:     setStatus,
        getStatus:     getStatus,
        getDeviceType: getDeviceType,
        setDeviceType: setDeviceType
    };
}
