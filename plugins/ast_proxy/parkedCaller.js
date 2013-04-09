/**
* Abstraction of a parked caller.
*
* **It can throw exception.**
*
* @class ParkedCaller
* @param {object} data The caller information object
*   @param {string} data.channel The parked channel
*   @param {string} data.callerNum The caller number
*   @param {string} data.callerName The caller name
*   @param {string} data.parking The parking identifier
*   @param {string} data.timeout The timestamp of waited time elapsed in the parking
* @constructor
* @return {object} The parked caller object.
*/
exports.ParkedCaller = function (data) {
    // check the parameter
    if (!data
        || typeof data.parking    !== 'string'
        || typeof data.channel    !== 'string'
        || typeof data.timeout    !== 'number'
        || typeof data.callerNum  !== 'string'
        || typeof data.callerName !== 'string') {

        throw new Error('wrong parameter');
    }

    /**
    * The caller number.
    *
    * @property num
    * @type {string}
    * @required
    * @private
    */
    var num = data.callerNum;

    /**
    * The caller name.
    *
    * @property name
    * @type {string}
    * @private
    */
    var name = data.callerName;

    /**
    * The caller channel.
    *
    * @property channel
    * @type {string}
    * @private
    */
    var channel = data.channel;

    /**
    * The number of the parking.
    *
    * @property parking
    * @type {string}
    * @private
    */
    var parking = data.parking;

    /**
    * The timestamp of the timeout.
    *
    * @property timeout
    * @type {number}
    * @private
    */
    var timeout = data.timeout;

    /**
    * The number of the extension that has parked the caller. Can be
    * empty on the initial startup of the server for those calls that
    * have already been parked.
    *
    * @property parkedByNum
    * @type {string}
    * @private
    */
    var parkedByNum = '';

    /**
    * The name of the extension that has parked the caller. Can be
    * empty on the initial startup of the server for those calls that
    * have already been parked.
    *
    * @property parkedByName
    * @type {string}
    * @private
    */
    var parkedByName = '';

    /**
    * Return the number of the extension that has parked the caller.
    *
    * @method getParkedByNum
    * @return {string} The number of the extension that has parked the caller.
    */
    function getParkedByNum() { return parkedByNum; }

    /**
    * Sets the number of the extension that has parked the caller.
    *
    * @method setParkedByNum
    * @param {string} num The number of the extension that has parked the caller.
    */
    function setParkedByNum(num) { parkedByNum = num; }

    /**
    * Return the name of the extension that has parked the caller.
    *
    * @method getParkedByName
    * @return {string} The name of the extension that has parked the caller.
    */
    function getParkedByName() { return parkedByName; }

    /**
    * Sets the name of the extension that has parked the caller.
    *
    * @method setParkedByName
    * @param {string} name The name of the extension that has parked the caller.
    */
    function setParkedByName(name) { parkedByName = name; }

    /**
    * Return the timestamp of the timeout.
    *
    * @method getTimeout
    * @return {number} The timestamp of the timeout.
    */
    function getTimeout() { return timeout; }

    /**
    * Return the number of the parking.
    *
    * @method getParking
    * @return {string} The number of the parking.
    */
    function getParking() { return parking; }

    /**
    * Return the caller channel.
    *
    * @method getChannel
    * @return {string} The caller channel.
    */
    function getChannel() { return channel; }

    /**
    * Return the name.
    *
    * @method getName
    * @return {string} The name.
    */
    function getName() { return name; }

    /**
    * Return the number of the caller.
    *
    * @method getNumber
    * @return {string} The number of the caller.
    */
    function getNumber() { return num; }

    /**
    * Return the readable string description of the parked caller.
    *
    * @method toString
    * @return {string} The readable description of the parked caller.
    */
    function toString() { return 'Parked caller: ' + getNumber() + ' in the parking ' + getParking() }

    /**
    * Returns the JSON representation of the object.
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            num:          num,
            name:         name,
            parking:      parking,
            channel:      channel,
            timeout:      timeout,
            parkedByNum:  parkedByNum,
            parkedByName: parkedByName
        }
    }

    // public interface
    return {
        toJSON:      toJSON,
        getName:     getName,
        toString:    toString,
        getNumber:   getNumber,
        getTimeout:  getTimeout,
        getChannel:  getChannel,
        getParking:  getParking,
        setParkedByNum: setParkedByNum,
        getParkedByNum: getParkedByNum,
        setParkedByName: setParkedByName,
        getParkedByName: getParkedByName
    };
}
