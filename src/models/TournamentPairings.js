'use strict'
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
      TournamentPairings.belongsTo(models.tournaments, {
        foreignKey: 'tournament_id',
      })
    }
  }
  TournamentPairings.init(
    {
      round: DataTypes.INTEGER,
      parent_id: DataTypes.INTEGER,
      tournament_id: DataTypes.INTEGER,
      player_fide_id: DataTypes.INTEGER,
      player_name: DataTypes.STRING,
      player_rating: DataTypes.INTEGER,
      player_score: DataTypes.DECIMAL,
      is_withdrawn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
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
