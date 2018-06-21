module.exports = function(sequelize, DataTypes) {
  return sequelize.define('queue_log', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    queuename: DataTypes.STRING
  });
};
