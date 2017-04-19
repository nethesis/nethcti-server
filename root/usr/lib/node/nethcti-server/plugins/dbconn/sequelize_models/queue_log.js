module.exports = function(sequelize, DataTypes) {
  return sequelize.define('queue_log', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    time: DataTypes.DATE,
    callid: DataTypes.INTEGER,
    queuename: DataTypes.STRING,
    agent: DataTypes.STRING,
    event: DataTypes.STRING,
    action: DataTypes.STRING,
    data1: DataTypes.INTEGER,
    data2: DataTypes.INTEGER,
    period: DataTypes.DATE,
    hold: DataTypes.STRING,
    calls: DataTypes.INTEGER,
    max_hold: DataTypes.FLOAT,
    min_hold: DataTypes.FLOAT,
    avg_hold: DataTypes.FLOAT,
    tot_duration: DataTypes.FLOAT,
    max_duration: DataTypes.FLOAT,
    min_duration: DataTypes.FLOAT,
    avg_duration: DataTypes.FLOAT
  });
};
