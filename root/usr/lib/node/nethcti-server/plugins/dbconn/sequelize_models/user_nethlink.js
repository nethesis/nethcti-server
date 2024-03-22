module.exports = function(sequelize, DataTypes) {
    return sequelize.define('user_nethlink', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user: DataTypes.STRING,
      extension: DataTypes.STRING,
      timestamp: DataTypes.DATE,
    });
  };
