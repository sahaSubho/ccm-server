const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TeamPairings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TeamPairings.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
      TeamPairings.belongsTo(models.ccm_teams, {
        foreignKey: 'team_id',
      })
    }
  }
  TeamPairings.init(
    {
      team_id: DataTypes.INTEGER,
      tournament_id: DataTypes.INTEGER,
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      round: DataTypes.INTEGER,
      result: DataTypes.STRING,
      match_point: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: '0.0',
      },
      game_point: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: '0.0',
      },
    },
    {
      sequelize,
      modelName: 'ccm_team_pairings',
    }
  )
  return TeamPairings
}
