module.exports = function (sequelize, DataTypes) {
    return sequelize.define('caller_note', {
        id:           { type: DataTypes.INTEGER, autoIncrement: true },
        text:         DataTypes.STRING,
        number:       DataTypes.STRING,
        public:       DataTypes.BOOLEAN,
        creator:      DataTypes.STRING,
        creation:     { type: DataTypes.DATE, allowNull: false },
        expiration:   DataTypes.DATE,
        reservation:  DataTypes.BOOLEAN
    });
}
