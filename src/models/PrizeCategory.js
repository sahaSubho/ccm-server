const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class PrizeCategory extends Model {
  }

  PrizeCategory.init(
    {
      name: DataTypes.STRING,

      // ex: Under 11
      age: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // 0 = less than, ex: under 11
      // 1 = greater than, ex: seniors
      age_operator: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ex: boys, girls, open
      gender: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 10 = equals
      gender_operator: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ex: Under 1400
      rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // 20 = less than
      // 21 = greater than
      rating_operator: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // First prize percentage
      prize1: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Second prize percentage
      prize2: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Third prize percentage
      prize3: {
        type: DataTypes.STRING,
        allowNull: true,
      },

    },
    {
      sequelize,
      modelName: 'prize_category',
      underscored: true,
    }
  )

  return PrizeCategory
}
