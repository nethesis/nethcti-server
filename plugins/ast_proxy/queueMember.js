/**
* Abstraction of a queue member.
*
* **It can throw exception.**
*
* @class QueueMember
* @param {string} memberNum The member number
* @constructor
* @return {object} The queue member object.
*/
exports.QueueMember = function (memberNum) {
    // check the parameter
    if (typeof memberNum !== 'string') { throw new Error('wrong parameter'); }

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
    * The member typology.
    *
    * @property type
    * @type {string}
    * @private
    */
    var type;

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
    * @method setLastCallTimestamp
    * @param {number} num The timestamp number.
    */
    function setLastCallTimestamp(num) { lastCallTimestamp = num; }

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
    * Return the type of the member.
    *
    * @method getType
    * @return {string} The type of the member.
    */
    function getType() { return type; }

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
    * Returns an object literal representation of the object
    * without any methods.
    *
    * @method marshallObjLiteral
    * @return {object} The object literal representation of the object.
    */
    function marshallObjLiteral() {
        return {
            type:              type,
            name:              name,
            member:            member,
            callsTakenCount:   callsTakenCount,
            lastCallTimestamp: lastCallTimestamp
        }
    }

    // public interface
    return {
        setName:              setName,
        getName:              getName,
        getType:              getType,
        setType:              setType,
        toString:             toString,
        getMember:            getMember,
        setCallsTakenCount:   setCallsTakenCount,
        getCallsTakenCount:   getCallsTakenCount,
        setLastCallTimestamp: setLastCallTimestamp,
        getLastCallTimestamp: getLastCallTimestamp
    };
}
