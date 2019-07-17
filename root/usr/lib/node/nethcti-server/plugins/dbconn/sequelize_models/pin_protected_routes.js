module.exports = function (sequelize, DataTypes) {
  return sequelize.define('pin_protected_routes', {
    route_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    enabled: DataTypes.INTEGER
  });
}
