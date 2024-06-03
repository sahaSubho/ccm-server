const { Model } = require('sequelize')
const { userRoles } = require('../config/constant')

module.exports = (sequelize, DataTypes) => {
  class Players extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Players.hasMany(models.tournament_pairings, {
        foreignKey: 'player_uuid',
      })
    }
  }
  Players.init(
    {
      name: DataTypes.STRING,
      uuid: {
        type: DataTypes.UUID,
        unique: true,
      },
      title: DataTypes.STRING,
      w_title: DataTypes.STRING,
      o_title: DataTypes.STRING,
      foa_title: DataTypes.STRING,
      fide_id: DataTypes.INTEGER,
      rating: DataTypes.INTEGER,
      rapid_rating: DataTypes.INTEGER,
      blitz_rating: DataTypes.INTEGER,
      age: DataTypes.INTEGER,
      gender: DataTypes.STRING,
      mobile: DataTypes.STRING,
      upi_id: DataTypes.STRING,
      created_by: DataTypes.ENUM([userRoles.ORGANIZER, 'self']),
      entry_fee_category: DataTypes.STRING,
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'players',
    }
  )
  return Players
}
