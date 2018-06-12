module.exports = function(sequelize, DataTypes) {
  return sequelize.define('queue_log', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    queuename: DataTypes.STRING,
    tot: DataTypes.INTEGER,
    tot_processed: DataTypes.INTEGER,
    processed_less_sla: DataTypes.INTEGER,
    tot_null: DataTypes.INTEGER,
    tot_failed_inqueue: DataTypes.INTEGER,
    failed_inqueue_noagents: DataTypes.INTEGER,
    failed_inqueue_withkey: DataTypes.INTEGER,
    failed_inqueue_timeout: DataTypes.INTEGER,
    failed_inqueue_abandon: DataTypes.INTEGER
  });
};
