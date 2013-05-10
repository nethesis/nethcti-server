module.exports = function (sequelize, DataTypes) {
    return sequelize.define('postit', {
        id:           { type: DataTypes.INTEGER, autoIncrement: true },
        text:         DataTypes.STRING,
        creator:      DataTypes.STRING,
        dateread:     { type: DataTypes.DATE, allowNull: true },
        recipient:    DataTypes.STRING,
        datecreation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });
}
