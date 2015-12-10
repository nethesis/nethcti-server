module.exports = function (sequelize, DataTypes) {
    return sequelize.define('voicemessages', {
        id:  { type: DataTypes.INTEGER, autoIncrement: true },
        dir: DataTypes.STRING,
    });
}
