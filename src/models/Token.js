const { Model } = require('sequelize')
const User = require('./User')

module.exports = (sequelize, DataTypes) => {
  class Token extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      //  User.belongsTo(models.agency, { foreignKey: 'agency_id', targetKey: 'id' });
      Token.belongsTo(models.users, { foreignKey: 'user_id' })
    }
  }

  Token.init(
    {
      token: DataTypes.STRING,
      user_id: DataTypes.INTEGER,
      type: DataTypes.STRING,
      expires: DataTypes.DATE,
      blacklisted: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'user_tokens',
      underscored: true,
    }
  )

  return Token
}
