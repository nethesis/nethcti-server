module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ampusers', {
    username: DataTypes.STRING,
    password_sha1: DataTypes.STRING
  });
};
