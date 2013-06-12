module.exports = function (sequelize, DataTypes) {
    return sequelize.define('caller_note', {
        id:           { type: DataTypes.INTEGER, autoIncrement: true },
        text:         DataTypes.STRING,
        number:       DataTypes.STRING,
        callid:       DataTypes.STRING,
        public:       { type: DataTypes.BOOLEAN, defaultValue: false },
        creator:      DataTypes.STRING,
        booking:      { type: DataTypes.BOOLEAN, defaultValue: false },
        datecreation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });
}
