module.exports = function (sequelize, DataTypes) {
    return sequelize.define('postit', {
        id:       { type: DataTypes.INTEGER, autoIncrement: true },
        date:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        text:     DataTypes.STRING,
        owner:    DataTypes.STRING,
        status:   DataTypes.BOOLEAN,
        assigned: DataTypes.STRING
    });
}
