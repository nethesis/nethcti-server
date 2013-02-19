/**
* Abstraction of an extension.
*
* @class Extension
* @constructor
*/
exports.Extension = function (extension, channelType) {
    try {

        /**
        * The Extension number.
        *
        * @property {string}
        * @required
        * @private
        */
        var exten = extension;

        /**
        * The channel type.
        *
        * @property {string}
        * @required
        * @private
        */
        var chanType = channelType;

        /**
        * Return the extension number.
        *
        * @method getExten
        * @return {string} The extension number
        */
        function getExten() { return exten; }

        /**
        * Return the readable string of the extension.
        *
        * @method toString
        * @return {string} The readable description of the extension
        */
        function toString() { return getChanType() + '/' + getExten(); }

        /**
        * Return the channel type.
        *
        * @method getChanType
        * @return {string} The channel type
        */
        function getChanType() { return chanType; }

        // public interface
        return {
            getExten: getExten,
            toString: toString,
            chanType: getChanType
        };

    } catch (err) {
        console.log(err.stack);
    }
}
