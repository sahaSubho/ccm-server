'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cc_tournament_chessmasters', 'rated', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'rated', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    })
  },
}
