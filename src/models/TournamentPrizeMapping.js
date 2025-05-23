const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TournamentPrizeMapping extends Model {
    static associate(models) {
      TournamentPrizeMapping.belongsTo(models.prize_categories, {
        foreignKey: 'category_id',
      })
      TournamentPrizeMapping.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
    }
  }

  TournamentPrizeMapping.init(
    {
      // optional name, otherwise to be inherited
      name: DataTypes.STRING,

      tournament_id: DataTypes.INTEGER,

      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // First prize percentage
      prizes: {
        type: DataTypes.JSONB,
        allowNull: false,
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
