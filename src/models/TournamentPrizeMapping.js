const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TournamentPrizeMapping extends Model {
    static associate(models) {
        TournamentPrizeMapping.belongsTo(models.prize_category, {
            foreignKey: 'category_id',
        })
        TournamentPrizeMapping.belongsTo(models.tournaments, {
            foreignKey: 'tournament_id',
        })
    }
  }

  TournamentPrizeMapping.init(
    {
      // optional name, otherwise to be inherited 
      // from the prize category table already
      name: DataTypes.STRING,

      // Tournament that has this prize category
      // @deprecate, this is a static category definition across tournaments
      tournament_id: DataTypes.INTEGER,

      category_id: DataTypes.INTEGER,

      // First prize percentage
      prize1: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Second prize percentage
      prize2: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Third prize percentage
      prize3: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'tournament_prize_mappings',
      underscored: true,
    }
  )

  return TournamentPrizeMapping
}
