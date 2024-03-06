const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class PrizeCategory extends Model {
    static associate(models) {
      PrizeCategory.hasMany(models.tournament_prize_mappings, {
        foreignKey: 'category_id',
      })
    }
  }

  PrizeCategory.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM('age', 'rating'),
        allowNull: false,
      },
      // -1 = less than, ex: under 11
      // 0 = equal to, ex: equal to 11
      // 1 = greater than, ex: seniors
      operator: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // ex: Under 11
      value: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // ex: M, F
      gender: {
        type: DataTypes.ENUM('M', 'F', 'B'),
        allowNull: false,
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
