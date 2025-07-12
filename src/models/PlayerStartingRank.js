const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class PlayerStartingRank extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PlayerStartingRank.belongsTo(models.cc_tournament_chessmasters, {
        targetKey: 'id',
        foreignKey: 'tournament_id',
      })
      PlayerStartingRank.belongsTo(models.ccm_tournament_players, {
        targetKey: 'id',
        foreignKey: 'player_id',
        as: 'players',
      })
    }
  }
  PlayerStartingRank.init(
    {
      round: DataTypes.INTEGER,
      rank: DataTypes.INTEGER,
      tournament_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'cc_tournament_chessmasters',
          key: 'id',
        },
      },
      player_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'ccm_tournament_players',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'ccm_players_starting_ranks',
    }
  )
  return PlayerStartingRank
}
