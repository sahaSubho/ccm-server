const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TournamentConfiguration extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TournamentConfiguration.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
    }
  }
  TournamentConfiguration.init(
    {
      tournament_id: DataTypes.INTEGER,
      tiebreaks: DataTypes.JSONB,
      tiebreak_settings: DataTypes.JSONB,
      sorting: DataTypes.BOOLEAN,
      sorting_type: DataTypes.STRING,
      pairings: DataTypes.STRING,
      bye_point: DataTypes.DECIMAL(10, 2),
      color: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'ccm_tournament_configuration',
    }
  )
  return TournamentConfiguration
}
