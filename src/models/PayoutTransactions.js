const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class PayoutTransactions extends Model {
    static associate(models) {
      PayoutTransactions.hasOne(models.players_prize_payouts, {
        foreignKey: 'transaction_id',
      })
    }
  }

  PayoutTransactions.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING,
      },
      orderid: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: { type: DataTypes.INTEGER },
      responseMessage: {
        type: DataTypes.STRING,
      },
      preferredMethodList: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      fulfillmentMethod: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      beneficiaryDetails: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      fulfillmentId: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'payout_transactions',
    }
  )

  return PayoutTransactions
}
