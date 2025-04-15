const { Model } = require('sequelize')
const { userRoles } = require('../config/constant')

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.user_tokens, { foreignKey: 'user_id' })
      User.hasMany(models.cc_tournament_chessmasters, {
        foreignKey: 'created_by',
      })
    }
  }

  User.init(
    {
      first_name: DataTypes.STRING,
      last_name: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      role: DataTypes.ENUM(...Object.values(userRoles)),
      phone_number: DataTypes.STRING,
      country_code: DataTypes.STRING,
      active: DataTypes.INTEGER,
      lic_name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'users',
      underscored: true,
    }
  )
  return User
}
