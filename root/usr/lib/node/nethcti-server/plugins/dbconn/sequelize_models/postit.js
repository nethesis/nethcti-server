module.exports = function (sequelize, DataTypes) {
    return sequelize.define('postit', {
        id:        { type: DataTypes.INTEGER, autoIncrement: true },
        text:      DataTypes.STRING,
        creator:   DataTypes.STRING,
        readdate:  { type: DataTypes.DATE, allowNull: true },
        creation:  { type: DataTypes.DATE, allowNull: false },
        recipient: DataTypes.STRING
    });
}
