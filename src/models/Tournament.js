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
      entry_fee: DataTypes.INTEGER,
      address: DataTypes.STRING,
      state: DataTypes.STRING,
      country: DataTypes.STRING,
      brochure: DataTypes.STRING,
      display_pic: DataTypes.STRING,
      player_fide_ids: DataTypes.STRING,
      created_by: DataTypes.INTEGER,
      is_active: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'tournaments',
      underscored: true,
    }
  )

  return Tournament
}
