module.exports = function(sequelize, DataTypes) {
    return sequelize.define('user_nethlink', {
      user: DataTypes.STRING,
      extension: DataTypes.STRING,
      timestamp: DataTypes.DATE,
    });
  };
