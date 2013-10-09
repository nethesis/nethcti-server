module.exports = function (sequelize, DataTypes) {
    return sequelize.define('caller_note', {
        id:           { type: DataTypes.INTEGER, autoIncrement: true },
        text:         DataTypes.STRING,
        number:       DataTypes.STRING,
        public:       { type: DataTypes.BOOLEAN, defaultValue: false },
        creator:      DataTypes.STRING,
        reservation:  { type: DataTypes.BOOLEAN, defaultValue: false },
        datecreation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });
}
