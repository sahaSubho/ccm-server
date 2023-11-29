/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Dropping column which are not needed
    await queryInterface.removeColumn('prize_categories', 'age')
    await queryInterface.removeColumn('prize_categories', 'age_operator')
    await queryInterface.removeColumn('prize_categories', 'gender_operator')
    await queryInterface.removeColumn('prize_categories', 'rating')
    await queryInterface.removeColumn('prize_categories', 'rating_operator')
    await queryInterface.removeColumn('prize_categories', 'prize1')
    await queryInterface.removeColumn('prize_categories', 'prize2')
    await queryInterface.removeColumn('prize_categories', 'prize3')

    // Changing Column gender
    await queryInterface.changeColumn('prize_categories', 'gender', {
      type: Sequelize.STRING,
      validate: {
        isIn: [['M', 'F']],
      },
      allowNull: false,
    })
    // Adding columns
    await queryInterface.addColumn('prize_categories', 'type', {
      type: Sequelize.STRING,
      validate: {
        isIn: [['age', 'rating']],
      },
      allowNull: false,
    })
    await queryInterface.addColumn('prize_categories', 'operator', {
      type: Sequelize.INTEGER,
      validate: {
        isIn: [[-1, 0, 1]],
      },
      allowNull: false,
    })
    await queryInterface.addColumn('prize_categories', 'value', {
      type: Sequelize.INTEGER,
      allowNull: false,
    })
  },
}
