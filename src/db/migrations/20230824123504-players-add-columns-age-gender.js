'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('players', 'age', {
      type: Sequelize.INTEGER,
    })
    await queryInterface.addColumn('players', 'gender', {
      type: Sequelize.STRING,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players', 'age')
    await queryInterface.removeColumn('players', 'gender')
  },
}
