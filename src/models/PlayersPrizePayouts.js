'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class PlayersPrizePayouts extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PlayersPrizePayouts.belongsTo(models.tournaments, {
        foreignKey: 'tournament_id',
      })
    }
  }
  PlayersPrizePayouts.init(
    {
      tournament_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      mobile_number: DataTypes.STRING,
      upi_id: DataTypes.STRING,
      amount: DataTypes.INTEGER,
      transaction_id: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'players_prize_payouts',
    }
  )
  return PlayersPrizePayouts
}
