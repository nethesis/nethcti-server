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
    * The average talk time.
    *
    * @property avgTalkTime
    * @type {string}
    * @private
    */
    var avgTalkTime;

    /**
    * The number of completed calls.
    *
    * @property completedCallsCount
    * @type {number}
    * @private
    */
    var completedCallsCount;

    /**
    * The number of abandoned calls.
    *
    * @property abandonedCallsCount
    * @type {number}
    * @private
    */
    var abandonedCallsCount;

    /**
    * The members of the queue. The key is the member number and
    * the value is a _QueueMember_ object.
    *
    * @property members
    * @type {object}
    * @private
    */
    var members = {};

    /**
    * Returns all the members.
    *
    * @method getAllMembers
    * @return {object} All the members.
    */
    function getAllMembers() { return members; }

    /**
    * Adds the queue member to the private _members_ object property.
    * If the queue member already exists, it will be overwritten.
    *
    * **It can throw an Exception.**
    *
    * @method addMember
    * @param {object} m A _QueueMember_ object.
    */
    function addMember(m) {
        // check the parameter
        if (typeof m !== 'object') { throw new Error('wrong parameter'); }
        members[m.getMember()] = m;
    }

    /**
    * Removes the queue member from the private _members_ object property.
    *
    * **It can throw an Exception.**
    *
    * @method removeMember
    * @param {string} m The queue member number identifier.
    */
    function removeMember(m) {
        // check the parameter
        if (typeof m !== 'string') { throw new Error('wrong parameter'); }
        delete members[m];
    }

    /**
    * Return the number of completed calls.
    *
    * @method getCompletedCallsCount
    * @return {number} The number of completed calls.
    */
    function getCompletedCallsCount() { return completedCallsCount; }

    /**
    * Set the number of completed calls.
    *
    * @method setCompletedCallsCount
    * @param {number} num The number of completed calls.
    */
    function setCompletedCallsCount(num) { completedCallsCount = num; }

    /**
    * Return the number of abandoned calls.
    *
    * @method getAbandonedCallsCount
    * @return {number} The number of abandoned calls.
    */
    function getAbandonedCallsCount() { return abandonedCallsCount; }

    /**
    * Set the number of abandoned calls.
    *
    * @method setAbandonedCallsCount
    * @param {number} num The number of abandoned calls.
    */
    function setAbandonedCallsCount(num) { abandonedCallsCount = num; }

    /**
    * Return the average talk time.
    *
    * @method getAvgTalkTime
    * @return {string} The average talk time.
    */
    function getAvgTalkTime() { return avgTalkTime; }

    /**
    * Set the average talk time.
    *
    * @method setAvgTalkTime
    * @param {string} time The time in seconds.
    */
    function setAvgTalkTime(time) { avgTalkTime = time; }

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
    * Returns the JSON representation of the object.
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {

        var jsonMembers = {};
        var m;

        // JSON representation of the members
        for (m in members) { jsonMembers[m] = members[m].toJSON(); }

        return {
            name:                name,
            queue:               queue,
            members:             jsonMembers,
            avgHoldTime:         avgHoldTime,
            avgTalkTime:         avgTalkTime,
            completedCallsCount: completedCallsCount,
            abandonedCallsCount: abandonedCallsCount
        }
    }

    // public interface
    return {
        toJSON:         toJSON,
        setName:        setName,
        getName:        getName,
        getQueue:       getQueue,
        toString:       toString,
        addMember:      addMember,
        removeMember:           removeMember,
        getAllMembers:          getAllMembers,
        getAvgHoldTime:         getAvgHoldTime,
        setAvgHoldTime:         setAvgHoldTime,
        getAvgTalkTime:         getAvgTalkTime,
        setAvgTalkTime:         setAvgTalkTime,
        getCompletedCallsCount: getCompletedCallsCount,
        setCompletedCallsCount: setCompletedCallsCount,
        getAbandonedCallsCount: getAbandonedCallsCount,
        setAbandonedCallsCount: setAbandonedCallsCount
    };
}
