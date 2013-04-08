/**
* Abstraction of a parking.
*
* **It can throw exception.**
*
* @class Parking
* @param {string} parkingNum The parking number
* @constructor
* @return {object} The parking object.
*/
exports.Parking = function (parkingNum) {
    // check the parameter
    if (typeof parkingNum !== 'string') { throw new Error('wrong parameter'); }

    /**
    * The parking number.
    *
    * @property parking
    * @type {string}
    * @required
    * @private
    */
    var parking = parkingNum;

    /**
    * The parkingNum name.
    *
    * @property name
    * @type {string}
    * @private
    */
    var name = '';

    /**
    * Set the parking name.
    *
    * @method setName
    * @param {string} pName The parking name
    */
    function setName(pName) { name = pName; }

    /**
    * Return the parking name.
    *
    * @method getName
    * @return {string} The parking name.
    */
    function getName() { return name; }

    /**
    * Return the parking number.
    *
    * @method getParking
    * @return {string} The parking number
    */
    function getParking() { return parking; }

    /**
    * Return the readable string description of the queue.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return 'PARKING/' + getParking(); }

    /**
    * Returns the JSON representation of the object.
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            name:                name,
            parking:             parking,
        }
    }

    // public interface
    return {
        toJSON:     toJSON,
        setName:    setName,
        getName:    getName,
        toString:   toString,
        getParking: getParking
    };
}
