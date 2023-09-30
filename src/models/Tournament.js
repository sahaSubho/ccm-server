const { Model } = require('sequelize')
const User = require('./User')

module.exports = (sequelize, DataTypes) => {
  class Tournament extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Tournament.belongsTo(models.users, { foreignKey: 'created_by' })
      Tournament.hasMany(models.tournament_pairings, {
        foreignKey: 'tournament_id',
      })
      Tournament.hasMany(models.players_prize_payouts, {
        foreignKey: 'tournament_id',
      })
    }
  }

  Tournament.init(
    {
      name: DataTypes.STRING,
      organizer: DataTypes.STRING,
      federation: DataTypes.STRING,
      director: DataTypes.STRING,
      arbiter: DataTypes.STRING,
      time_control: DataTypes.STRING,
      tournament_type: DataTypes.STRING,
      start_date: DataTypes.DATE,
      end_date: DataTypes.DATE,
      rating: DataTypes.INTEGER,
      rounds: DataTypes.INTEGER,
      /*
      This is per category basis, needs to be
      moved to another table
      */
      entry_fee: DataTypes.JSONB,
      address: DataTypes.STRING,
      state: DataTypes.STRING,
      country: DataTypes.STRING,
      brochure: DataTypes.STRING,
      display_pic: DataTypes.STRING,
      category: DataTypes.STRING,
      player_fide_ids: {
        type: DataTypes.STRING(20000),
        allowNull: true,
      },
      withdrawn_uuid: {
        type: DataTypes.STRING(20000),
        allowNull: true,
      },
      current_round: DataTypes.INTEGER,
      /*
      Net cash inflow expected from the tournament
       */
      registration_inflow: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 100000,
      },
      created_by: DataTypes.INTEGER,
      is_active: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'cc_tournament_chessmasters',
      underscored: true,
    }
  )

  return Tournament
}
