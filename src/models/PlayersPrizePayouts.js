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
      PlayersPrizePayouts.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
      PlayersPrizePayouts.belongsTo(models.payout_transactions, {
        foreignKey: 'transaction_id',
      })
    }
  }
  PlayersPrizePayouts.init(
    {
      tournament_id: DataTypes.INTEGER,
      prize_name: DataTypes.STRING,
      name: DataTypes.STRING,
      mobile_number: DataTypes.STRING,
      upi_id: DataTypes.STRING,
      amount: DataTypes.INTEGER,
      status: DataTypes.STRING,
      transaction_id: DataTypes.STRING,
      fulfillment_id: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'players_prize_payouts',
    }
  )
  return PlayersPrizePayouts
}
