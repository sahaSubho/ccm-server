'use strict'
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
      // define association here
    }
  }
  Players.init(
    {
      name: DataTypes.STRING,
      uuid: DataTypes.STRING,
      fide_id: DataTypes.INTEGER,
      rating: DataTypes.INTEGER,
      age: DataTypes.INTEGER,
      gender: DataTypes.STRING,
      mobile: DataTypes.STRING,
      upi_id: DataTypes.STRING,
      created_by: DataTypes.ENUM([userRoles.ORGANIZER, 'self']),
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
