module.exports = function (sequelize, DataTypes) {
  return sequelize.define('pin', {
    extension: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    pin: DataTypes.STRING,
    enabled: DataTypes.INTEGER
  });
}
