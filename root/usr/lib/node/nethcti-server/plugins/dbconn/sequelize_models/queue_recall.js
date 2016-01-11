module.exports = function (sequelize, DataTypes) {
    return sequelize.define('queue_recall', {
        time:      DataTypes.DATE,
        direction: DataTypes.STRING,
        queuename: DataTypes.STRING,
        action:    DataTypes.STRING,
        position:  DataTypes.INTEGER,
        duration:  DataTypes.INTEGER,
        hold:      DataTypes.INTEGER,
        cid:       DataTypes.STRING,
        agent:     DataTypes.STRING
    });
}
