const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TournamentPlayers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TournamentPlayers.belongsTo(models.cc_tournament_chessmasters, {
        foreignKey: 'tournament_id',
      })
      TournamentPlayers.hasMany(models[(config.simulate ? 'temp_' : 'ccm_')+'tournament_pairings'], {
        foreignKey: 'player_id',
      })
    }
  }
  TournamentPlayers.init(
    {
      name: DataTypes.STRING,
      tournament_id: DataTypes.INTEGER,
      title: DataTypes.STRING,
      fide_id: DataTypes.INTEGER,
      rating: DataTypes.INTEGER,
      age: DataTypes.INTEGER,
      gender: DataTypes.STRING,
      mobile: DataTypes.STRING,
      upi_id: DataTypes.STRING,
      entry_fee_category: DataTypes.STRING,
      registered_from: DataTypes.STRING,
      is_withdrawn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cc_userid: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'ccm_tournament_players',
    }
  )
  return TournamentPlayers
}
