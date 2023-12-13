/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
      allowNull: false,
    })
    await queryInterface.addColumn('prize_categories', 'value', {
      type: Sequelize.INTEGER,
      allowNull: false,
    })
  },
}
