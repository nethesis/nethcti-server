/**
* Abstraction of a meetme conference.
*
* **It can throw exceptions.**
*
* @class MeetmeConference
* @param {string} extOwner The identifier of the extension owner
* @constructor
* @return {object} The meetme conference object.
*/
exports.MeetmeConference = function (extOwner) {
    // check the parameter
    if (typeof extOwner !== 'string') {
        throw new Error('wrong parameter');
    }

    /**
    * The Extension owner id.
    *
    * @property id
    * @type {string}
    * @required
    * @private
    */
    var id = extOwner;

    /**
    * The user of the conference. They are extensions. Keys are user
    * identifiers and the values are the _MeetmeConfUser_ object.
    *
    * @property users
    * @type object
    * @private
    * @default {}
    */
    var users = {};

    /**
    * Returns the identifier of the extension owner.
    *
    * @method getId
    * @return {string} The identifier of the extension owner
    */
    function getId() { return id; }

    /**
    * Returns the number of participating users.
    *
    * @method getUsersCount
    * @return {number} The number of participating users.
    */
    function getUsersCount() { return Object.keys(users).length; }

    /**
    * Adds a user to the conference.
    *
    * @method addUser
    * @param {object} obj A _MeetmeConfUser_ object
    */
    function addUser(obj) { users[obj.getId()] = obj; }

    /**
    * Removes a user from the conference.
    *
    * @method removeUser
    * @param {string} id The user identifier
    */
    function removeUser(id) { delete users[id]; }

    /**
    * Returns the readable string of the conference.
    *
    * @method toString
    * @return {string} The readable description of the conference
    */
    function toString() { return 'MeetMe conference - owner "' + getOwnerId() + '" with ' + getUsersNum() + ' users'; }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         id: "202",
    *         users: { MeetmeConfUser.toJSON(), ... } // the keys is the meetme conference user identifiers
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {

        var jsonUsers = {};
        var u;

        // JSON representation of the users
        for (u in users) { jsonUsers[u] = users[u].toJSON(); }

        return {
            id: id,
            users: jsonUsers
        };
    }

    // public interface
    return {
        getId: getId,
        toJSON: toJSON,
        addUser: addUser,
        toString: toString,
        removeUser: removeUser,
        getUsersCount: getUsersCount
    };
};
