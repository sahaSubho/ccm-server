const { Model } = require('sequelize')
const config = require('../config/config')

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
      tiebreaks: {
        type: DataTypes.JSONB,
        defaultValue: '["BH-C1", "BH", "SB"]',
      },
      tiebreak_settings: {
        type: DataTypes.JSONB,
      },
      sorting: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      sorting_type: {
        type: DataTypes.STRING,
        defaultValue: 'nat',
      },
      pairings: {
        type: DataTypes.STRING,
        defaultValue: '1,1/2,0',
      },
      bye_point: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: '1.0',
      },
      color: {
        type: DataTypes.STRING,
        defaultValue: 'white',
      },
    },
    {
      sequelize,
      modelName: (config.simulate ? 'temp_' : '')+'ccm_tournament_configurations',
    }
  )
  return TournamentConfiguration
}
