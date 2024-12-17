const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Teams extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Teams.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
      Teams.hasMany(models.ccm_team_pairings, {
        foreignKey: 'team_id',
      })
    }
  }
  Teams.init(
    {
      name: DataTypes.STRING,
      tournament_id: DataTypes.INTEGER,
      player_uuids: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: 'ccm_teams',
    }
  )
  return Teams
}
