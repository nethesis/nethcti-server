/**
* Abstraction of a queue waiting caller.
*
* **It can throw exception.**
*
* @class QueueWaitingCaller
* @param {object} data The caller information object
*   @param {string} data.callerNum The caller number
*   @param {string} data.callerName The caller name
*   @param {string} data.position The caller position in the queue
*   @param {string} data.wait The timestamp of the elapsed time in wht queue
* @constructor
* @return {object} The queue waiting caller object.
*/
exports.QueueWaitingCaller = function (data) {
    // check the parameter
    if (!data
        || typeof data.wait       !== 'number'
        || typeof data.queue      !== 'string'
        || typeof data.channel    !== 'string'
        || typeof data.position   !== 'string'
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
    * The queue in which the caller waiting.
    *
    * @property queue
    * @type {string}
    * @private
    */
    var queue = data.queue;

    /**
    * The caller channel
    *
    * @property channel
    * @type {string}
    * @private
    */
    var channel = data.channel;

    /**
    * The waiting timestamp.
    *
    * @property waiting
    * @type {number}
    * @private
    */
    var waiting = data.wait;

    /**
    * The position in the queue.
    *
    * @property position
    * @type {number}
    * @private
    */
    var position = data.position;

    /**
    * Return the queue in which the caller waiting.
    *
    * @method getQueue
    * @return {string} The queue identifier
    */
    function getQueue() { return queue; }

    /**
    * Return the caller number.
    *
    * @method getNumber
    * @return {string} The caller number
    */
    function getNumber() { return num; }

    /**
    * Return the caller name.
    *
    * @method getName
    * @return {string} The caller name.
    */
    function getName() { return name; }

    /**
    * Return the channel.
    *
    * @method getChannel
    * @return {string} The channel.
    */
    function getChannel() { return channel; }

    /**
    * Return the waiting timestamp.
    *
    * @method getWaiting
    * @return {string} The timestamp of value of the time waited.
    */
    function getWaiting() { return waiting; }

    /**
    * Return the position in the queue.
    *
    * @method getPosition
    * @return {String} The position in the queue.
    */
    function getPosition() { return position; }

    /**
    * Return the readable string description of the waiting caller.
    *
    * @method toString
    * @return {string} The readable description of the waiting caller
    */
    function toString() { return 'Waiting caller: ' + getNumber() + ' in the queue ' + getQueue(); }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         num:      "214",
    *         name:     "Alessandro",
    *         queue:    "401",
    *         channel:  "IAX2/214-2273",
    *         waiting:  1365590637976,   // the timestamp of the starting waiting time
    *         position: "1"              // the position in the queue
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            num:      num,
            name:     name,
            queue:    queue,
            waiting:  waiting,
            channel:  channel,
            position: position
        }
    }

    // public interface
    return {
        toJSON:      toJSON,
        getName:     getName,
        getQueue:    getQueue,
        toString:    toString,
        getNumber:   getNumber,
        getChannel:  getChannel,
        getWaiting:  getWaiting,
        getPosition: getPosition
    };
}
