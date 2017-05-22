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
exports.Parking = function(parkingNum) {
  // check the parameter
  if (typeof parkingNum !== 'string') {
    throw new Error('wrong parameter');
  }

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
   * The parking name.
   *
   * @property name
   * @type {string}
   * @private
   */
  var name = '';

  /**
   * The parked caller. Only one caller at time can be parked in a parking.
   *
   * @property parkedCaller
   * @type {object}
   * @private
   */
  var parkedCaller;

  /**
   * Adds a parked caller.
   *
   * @method addParkedCaller
   * @param {object} pCall The parked caller object.
   */
  function addParkedCaller(pCall) {
    parkedCaller = pCall;
  }

  /**
   * Returns the parked caller.
   *
   * @method getParkedCaller
   * @return {object} The parked caller.
   */
  function getParkedCaller() {
    return parkedCaller;
  }

  /**
   * Remove parked caller.
   *
   * @method removeParkedCaller
   */
  function removeParkedCaller() {
    parkedCaller = undefined;
  }

  /**
   * Set the parking name.
   *
   * @method setName
   * @param {string} pName The parking name
   */
  function setName(pName) {
    name = pName;
  }

  /**
   * Return the parking name.
   *
   * @method getName
   * @return {string} The parking name.
   */
  function getName() {
    return name;
  }

  /**
   * Return the parking number.
   *
   * @method getParking
   * @return {string} The parking number
   */
  function getParking() {
    return parking;
  }

  /**
   * Return the readable string description of the queue.
   *
   * @method toString
   * @return {string} The readable description of the extension
   */
  function toString() {
    return 'PARKING/' + getParking();
  }

  /**
   * Returns the JSON representation of the object.
   *
   * @method toJSON
   * @param  {string} [privacyStr] If it's specified, it hides the last digits of the phone number
   * @return {object} The JSON representation of the object.
   */
  function toJSON(privacyStr) {
    return {
      name: name,
      parking: parking,
      parkedCaller: parkedCaller ? parkedCaller.toJSON(privacyStr) : {}
    };
  }

  // public interface
  return {
    toJSON: toJSON,
    setName: setName,
    getName: getName,
    toString: toString,
    getParking: getParking,
    addParkedCaller: addParkedCaller,
    getParkedCaller: getParkedCaller,
    removeParkedCaller: removeParkedCaller
  };
};
