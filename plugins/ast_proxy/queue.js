/**
* Abstraction of a queue.
*
* **It can throw exception.**
*
* @class Queue
* @param {string} queueNum The queue number
* @constructor
* @return {object} The queue object.
*/
exports.Queue = function (queueNum) {
    // check the parameter
    if (typeof queueNum !== 'string') { throw new Error('wrong parameter'); }

    /**
    * The queue number.
    *
    * @property queue
    * @type {string}
    * @required
    * @private
    */
    var queue = queueNum;

    /**
    * The queue name.
    *
    * @property name
    * @type {string}
    * @private
    */
    var name = '';

    /**
    * The average hold time.
    *
    * @property avgHoldTime
    * @type {string}
    * @private
    */
    var avgHoldTime;

    /**
    * Return the average hold time.
    *
    * @method getAvgHoldTime
    * @return {string} The average hold time.
    */
    function getAvgHoldTime() { return avgHoldTime; }

    /**
    * Set the average hold time.
    *
    * @method setAvgHoldTime
    * @param {string} time The time in seconds.
    */
    function setAvgHoldTime(time) { avgHoldTime = time; }

    /**
    * Set the queue name.
    *
    * @method setName
    * @param {string} qName The queue name
    */
    function setName(qName) { name = qName; }

    /**
    * Return the queue name.
    *
    * @method getName
    * @return {string} The queue name.
    */
    function getName() { return name; }

    /**
    * Return the queue number.
    *
    * @method getQueue
    * @return {string} The queue number
    */
    function getQueue() { return queue; }

    /**
    * Return the readable string description of the queue.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return 'QUEUE/' + getQueue(); }

    /**
    * Returns an object literal representation of the object
    * without any methods.
    *
    * @method marshallObjLiteral
    * @return {object} The object literal representation of the object.
    */
    function marshallObjLiteral() {
        return {
            name:        name,
            queue:       queue,
            avgHoldTime: svgHoldTime
        }
    }

    // public interface
    return {
        setName:   setName,
        getName:   getName,
        getQueue:  getQueue,
        toString:  toString,
        getAvgHoldTime: getAvgHoldTime,
        setAvgHoldTime: setAvgHoldTime,
        marshallObjLiteral: marshallObjLiteral
    };
}
