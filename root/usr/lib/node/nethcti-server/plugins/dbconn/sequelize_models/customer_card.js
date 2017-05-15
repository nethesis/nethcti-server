module.exports = function(sequelize, DataTypes) {
  return sequelize.define('customer_card', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    creation: DataTypes.DATE,
    query: DataTypes.STRING,
    template: DataTypes.STRING,
    dbconn_id: DataTypes.INTEGER
  });
};
