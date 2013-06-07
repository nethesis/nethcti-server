/**
* Abstraction of a group of extensions in the operator panel.
*
* **It can throw exceptions.**
*
* @class Group
* @param {string} groupName The group name
* @constructor
* @return {object} The group object.
*/
exports.Group = function (groupName) {
    // check the parameter
    if (typeof groupName !== 'string') { throw new Error('wrong parameter'); }

    /**
    * The group name.
    *
    * @property name
    * @type {string}
    * @required
    * @private
    */
    var name = groupName;

    /**
    * The list of the extensions that belongs to the group. The keys
    * are the extension identifiers. The value is not used. It uses an
    * object instead of an array for convenience of code.
    *
    * @property extensions
    * @type {object}
    * @default {}
    * @private
    */
    var extensions = {};

    /**
    * Return the group name.
    *
    * @method getName
    * @return {string} The name of the group
    */
    function getName() { return name; }

    /**
    * Return the number of the extension members.
    *
    * @method extenCount
    * @return {number} The number of the extension members.
    */
    function extenCount() { return Object.keys(extensions).length; }

    /**
    * Adds extensions to the group.
    *
    * @method addExtensions
    * @param {array} arr The list of extensions identifier as strings
    */
    function addExtensions(arr) {
        // check parameter
        if (!(arr instanceof Array)) { throw new Error('wrong parameter'); }

        // add all extensions to extensions property
        var i;
        for (i = 0; i < arr.length; i++) { extensions[arr[i]] = ''; }
    }

    /**
    * Return the list of the extensions of the group.
    *
    * @method getExtensionList
    * @return {array} The list of the extensions of the group.
    */
    function getExtensionList() { return Object.keys(extensions); }

    /**
    * Return the readable string of the group.
    *
    * @method toString
    * @return {string} The readable description of the group
    */
    function toString() { return 'Opertor panel group "' + getName() + '": ' + extenCount() + ' extension members'; }

    /**
    * Returns the JSON representation of the object.
    *
    *     {
    *         name: "Developer"          // the group name
    *         extensions: ["214", "221"] // the list of the extensions that belongs to the group
    *     }
    *
    * @method toJSON
    * @return {object} The JSON representation of the object.
    */
    function toJSON() {
        return {
            name: name,
            extensions: Object.keys(extensions)
        }
    }

    // public interface
    return {
        toJSON:           toJSON,
        getName:          getName,
        toString:         toString,
        extenCount:       extenCount,
        addExtensions:    addExtensions,
        getExtensionList: getExtensionList
    };
}
