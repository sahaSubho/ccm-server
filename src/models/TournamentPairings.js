const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TournamentPairings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TournamentPairings.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
      TournamentPairings.belongsTo(models.players, {
        targetKey: 'uuid',
        foreignKey: 'player_uuid',
        onDelete: 'CASCADE',
      })
      TournamentPairings.belongsTo(models.ccm_tournament_players, {
        targetKey: 'id',
        foreignKey: 'player_id',
        onDelete: 'CASCADE',
      })
    }
  }
  TournamentPairings.init(
    {
      round: DataTypes.INTEGER,
      parent_id: DataTypes.INTEGER,
      tournament_id: DataTypes.INTEGER,
      player_fide_id: DataTypes.INTEGER,
      player_uuid: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'players',
          key: 'uuid',
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
      player_name: DataTypes.STRING,
      player_rating: DataTypes.INTEGER,
      player_score: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: '0.0',
      },
      result: {
        type: DataTypes.STRING,
        defaultValue: '',
      },
      is_scored: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_withdrawn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_unpaired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'tournament_pairings',
    }
  )
  return TournamentPairings
}
