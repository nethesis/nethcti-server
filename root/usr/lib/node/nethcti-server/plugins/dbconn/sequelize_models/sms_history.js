module.exports = function (sequelize, DataTypes) {
    return sequelize.define('sms_history', {
        id:           { type: DataTypes.INTEGER, autoIncrement: true },
        date:         { type: DataTypes.DATE, allowNull: false },
        text:         DataTypes.STRING,
        status:       DataTypes.BOOLEAN,
        sender:       DataTypes.STRING,
        destination:  DataTypes.STRING
    });
}