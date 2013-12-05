/**
* Abstraction of a queue member.
*
* **It can throw exception.**
*
* @class QueueMember
* @param {string} memberNum The member number
* @param {string} queueId   The name of the queue membership
* @constructor
* @return {object} The queue member object.
*/
exports.QueueMember = function (memberNum, queueId) {
    // check the parameter
    if (typeof memberNum !== 'string' || typeof queueId !== 'string') {
        throw new Error('wrong parameter');
    }

    /**
    * The member number.
    *
    * @property member
    * @type {string}
    * @required
    * @private
    */
    var member = memberNum;

    /**
    * The member name.
    *
    * @property name
    * @type {string}
    * @private
    */
    var name = '';

    /**
    * The identifier of queue membership.
    *
    * @property queue
    * @type {string}
    * @private
    */
    var queue = queueId;

    /**
    * The member typology.
    *
    * @property type
    * @type {string}
    * @private
    */
    var type;

    /**
    * The pause status of the member.
    *
    * @property paused
    * @type {boolean}
    * @private
    */
    var paused;

    /**
    * The number of the taken calls.
    *
    * @property callsTakenCount
    * @type {number}
    * @private
    */
    var callsTakenCount;

    /**
    * The timestamp of the last taken call.
    *
    * @property lastCallTimestamp
    * @type {number}
    * @private
    */
    var lastCallTimestamp;

    /**
    * Return the timestamp of the last taken call.
    *
    * @method getLastCallTimestamp
    * @return {number} The timestamp of the last taken call.
    */
    function getLastCallTimestamp() { return lastCallTimestamp; }

    /**
    * Set the timestamp of the last taken call.
    *
    * **It can throw an Exception**.
    *
    * @method setLastCallTimestamp
    * @param {number} num The timestamp number.
    */
    function setLastCallTimestamp(num) {
        // check the parameter
        if (typeof num !== 'number') { throw new Error('wrong parameter'); }

        lastCallTimestamp = num;
    }

    /**
    * Return the number of the taken calls.
    *
    * @method getCallsTakenCount
    * @return {number} The number of the taken calls.
    */
    function getCallsTakenCount() { return callsTakenCount; }

    /**
    * Set the number of the taken calls.
    *
    * @method setCallsTakenCount
    * @param {number} num The number of the taken calls.
    */
    function setCallsTakenCount(num) { callsTakenCount = num; }

    /**
    * Set the member type.
    *
    * @method setType
    * @param {string} type The member type
    */
    function setType(value) { type = value; }

    /**
    * Set the paused status of the member.
    *
    * @method setPaused
    * @param {string} type The member type
    */
    function setPaused(value) { paused = value; }

    /**
    * Return the type of the member.
    *
    * @method getType
    * @return {string} The type of the member.
    */
    function getType() { return type; }

    /**
    * Return the name of the queue membership.
    *
    * @method getQueue
    * @return {string} The name of the queue membership.
    */
    function getQueue() { return queue; }

    /**
    * Set the member name.
    *
    * @method setName
    * @param {string} memberName The member name
    */
    function setName(memberName) { name = memberName; }

    /**
    * Return the member name.
    *
    * @method getName
    * @return {string} The member name.
    */
    function getName() { return name; }

    /**
    * Return the member number.
    *
    * @method getMember
    * @return {string} The member number
    */
    function getMember() { return member; }

    /**
    * Return the readable string description of the member.
    *
    * @method toString
    * @return {string} The readable description of the extension
    */
    function toString() { return 'Queue member: ' + getMember(); }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         type:              "static",
    *         name:              "Alessandro",
    *         queue:             "401",
    *         member:            "214",
    *         paused:            true,         // the paused status
    *         callsTakenCount:   "0",          // the number of taken calls
    *         lastCallTimestamp: 1365590191    // the timestamp of the last taken call
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            type:              type,
            name:              name,
            queue:             queue,
            member:            member,
            paused:            paused,
            callsTakenCount:   callsTakenCount,
            lastCallTimestamp: lastCallTimestamp
        }
    }

    // public interface
    return {
        toJSON:               toJSON,
        setName:              setName,
        getName:              getName,
        getType:              getType,
        setType:              setType,
        getQueue:             getQueue,
        toString:             toString,
        setPaused:            setPaused,
        getMember:            getMember,
        setCallsTakenCount:   setCallsTakenCount,
        getCallsTakenCount:   getCallsTakenCount,
        setLastCallTimestamp: setLastCallTimestamp,
        getLastCallTimestamp: getLastCallTimestamp
    };
}
