// Abstraction of an extension
exports.Extension = function (extension, channelType) {
    try {
        var exten    = extension;
        var chanType = channelType;

        function toString()    { return getChanType() + '/' + getExten(); }

        return {
            exten:    exten,
            chanType: chanType,
            toString: toString
        };

    } catch (err) {
        console.log(err.stack);
    }
}
