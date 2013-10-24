module.exports = function (sequelize, DataTypes) {
    return sequelize.define('caller_note', {
        id:           { type: DataTypes.INTEGER, autoIncrement: true },
        text:         DataTypes.STRING,
        number:       DataTypes.STRING,
        public:       DataTypes.BOOLEAN,
        creator:      DataTypes.STRING,
        expiration:   DataTypes.DATE,
        reservation:  DataTypes.BOOLEAN,
        datecreation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });
}
