const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class LichessProfile extends Model {
    static associate(models) {
      // define association here
    }
  }

  try {
    LichessProfile.init(
      {
        lichess_id: DataTypes.STRING,
        lichess_username: DataTypes.STRING,
        lichess_token: DataTypes.STRING,
      },
      {
        sequelize,
        modelName: 'LichessProfile',
        tableName: 'cc_lichess_profile',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    )
  } catch (e) {
    console.log(e)
    throw e
  }
  return LichessProfile
}
