const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TournamentStandings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TournamentStandings.belongsTo(models.cc_tournament_chessmasters, {
        targetKey: 'id',
        foreignKey: 'tournament_id',
      })
      TournamentStandings.belongsTo(models.ccm_tournament_players, {
        targetKey: 'id',
        foreignKey: 'player_id',
      })
    }
  }
  TournamentStandings.init(
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
      player_name: DataTypes.STRING,
      player_rating: DataTypes.INTEGER,
      point: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: '0.0',
      },
      tie_breaks: DataTypes.JSONB,
      version: {
        type: DataTypes.INTEGER,
        enum: [0, 1],
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: 'ccm_tournament_standings',
    }
  )
  return TournamentStandings
}
